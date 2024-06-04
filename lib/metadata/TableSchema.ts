/* eslint-disable camelcase */
import URL from 'url'
import difference from 'lodash/difference.js'
import uriTemplate, { URITemplate } from 'uri-templates'
import type { BlankNode, DataFactory, DatasetCore, NamedNode, Quad_Object, Term } from '@rdfjs/types'
import namespace, { NS } from '../namespace.js'
import parseDateTime from '../parseDateTime.js'
import RdfUtils from './RdfUtils.js'

const defaultColumnNames = new Set(['_column', '_sourceColumn', '_row', '_sourceRow', '_name'])

interface Options {
  baseIRI: string
  factory: DataFactory
  timezone?: string
  root?: Term
}

type Row = Record<string, string>

interface Datatype {
  base: NamedNode
  format?: string
}

interface ParsedColumn {
  aboutUrl?: URITemplate
  datatype: Datatype
  language?: URITemplate
  name: string
  nullValue?: string
  defaultValue?: string
  propertyUrl: URITemplate
  suppressOutput?: boolean
  titles: string[]
  virtual?: string
  valueUrl?: URITemplate
}

interface Column {
  subject: NamedNode | BlankNode | null
  property: NamedNode
  value: Quad_Object
}

export default class TableSchema {
  private readonly factory: DataFactory
  private readonly ns: NS
  private readonly dataset: DatasetCore
  private readonly root: Term | undefined
  private readonly baseIRI: string
  private readonly timezone: string | undefined
  private parsedColumns: ParsedColumn[]
  private allColumns: ParsedColumn[] | null
  aboutUrl: (row: Row) => NamedNode | BlankNode
  propertyUrl?: URITemplate

  constructor(dataset: DatasetCore, { root, baseIRI, factory, timezone }: Options) {
    this.factory = factory
    this.ns = namespace(this.factory)
    this.dataset = dataset
    this.root = root || RdfUtils.findNode(this.dataset, null, this.ns.tableSchema)
    this.baseIRI = baseIRI
    this.timezone = timezone

    this.aboutUrl = () => {
      return this.factory.blankNode()
    }

    this.parsedColumns = []
    this.allColumns = null

    if (this.dataset) {
      this.aboutUrl = this.parseAboutUrl() || this.aboutUrl
      this.propertyUrl = this.parsePropertyUrl()
      this.parseColumns()
    }
  }

  parseAboutUrl() {
    const aboutUrl = RdfUtils.findValue(this.dataset, this.root, this.ns.aboutUrl)

    if (!aboutUrl) {
      return
    }

    const aboutUrlTemplate = uriTemplate(aboutUrl)

    return (row: Row) => {
      return this.factory.namedNode(URL.resolve(this.baseIRI, aboutUrlTemplate.fill(row))) // eslint-disable-line n/no-deprecated-api
    }
  }

  parsePropertyUrl() {
    const url = RdfUtils.findValue(this.dataset, this.root, this.ns.propertyUrl)

    if (!url) {
      return
    }

    return uriTemplate(url)
  }

  parseColumns() {
    const columnNode = RdfUtils.findNode(this.dataset, this.root, this.ns.column)

    this.parsedColumns = RdfUtils.parseArray(this.dataset, columnNode).map((node) => {
      const titles = RdfUtils.findValues(this.dataset, node, this.ns.title)
      const name = RdfUtils.findValue(this.dataset, node, this.ns.name) || titles[0]
      const aboutUrl = RdfUtils.findValue(this.dataset, node, this.ns.aboutUrl)
      const language = RdfUtils.findValue(this.dataset, node, this.ns.lang)
      const nullValue = RdfUtils.findValue(this.dataset, node, this.ns.null) || ''
      const defaultValue = RdfUtils.findValue(this.dataset, node, this.ns.default)
      const propertyUrl = RdfUtils.findValue(this.dataset, node, this.ns.propertyUrl)
      const suppressOutput = RdfUtils.findValue(this.dataset, node, this.ns.suppressOutput)
      const virtual = RdfUtils.findValue(this.dataset, node, this.ns.virtual)
      const valueUrl = RdfUtils.findValue(this.dataset, node, this.ns.valueUrl)

      const column: ParsedColumn = {
        datatype: this.parseDatatype(node),
        name,
        nullValue,
        defaultValue,
        propertyUrl: (propertyUrl && uriTemplate(propertyUrl)) || this.propertyUrl || this.defaultPropertyUrl(name),
        suppressOutput: suppressOutput === 'true',
        titles,
        virtual,
      }

      if (aboutUrl) {
        column.aboutUrl = uriTemplate(aboutUrl)
      }
      if (valueUrl) {
        column.valueUrl = uriTemplate(valueUrl)
      }
      if (language) {
        column.language = uriTemplate(language)
      }

      return column
    })
  }

  parseDatatype(node: Term): Datatype {
    const datatype = RdfUtils.findNode(this.dataset, node, this.ns.datatype)

    if (!datatype) {
      return this.defaultDatatype()
    }

    if (datatype.termType === 'NamedNode') {
      return { base: datatype }
    }

    const base = RdfUtils.findValue(this.dataset, datatype, this.ns.base)
    const format = RdfUtils.findValue(this.dataset, datatype, this.ns.format)

    return {
      base: this.factory.namedNode('http://www.w3.org/2001/XMLSchema#' + (base || 'string')),
      format,
    }
  }

  columns({ contentLine, row }: { contentLine: number; row: Row }): Column[] {
    try {
      if (!this.allColumns) {
        this.createAllColumns(row)
      }

      return this.allColumns!.map((column) => {
        const cellData = { ...row, _name: column.name }

        return {
          subject: this.subject(column, cellData),
          property: this.property(column, cellData),
          value: this.value(column, cellData),
        } as Column
      }).filter((column: Column) => {
        return column.value !== undefined
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (cause: any) {
      const err = new Error(`could not parse content line ${contentLine}`)

      err.stack += `\nCaused by: ${cause.stack}`

      throw err
    }
  }

  subject(column: ParsedColumn, row: Row) {
    if (!column.aboutUrl) {
      return null
    }

    return this.factory.namedNode(URL.resolve(this.baseIRI, column.aboutUrl.fill(row))) // eslint-disable-line n/no-deprecated-api
  }

  value(column: ParsedColumn, row: Row) {
    if (column.suppressOutput) {
      return undefined
    }

    if (column.valueUrl) {
      return this.factory.namedNode(column.valueUrl.fill(row))
    }

    let value = column.titles.reduce((value, title) => {
      return value || row[title]
    }, '')

    if (value === '' && column.defaultValue) {
      value = column.defaultValue
    }

    if (typeof value === 'undefined' || value === column.nullValue) {
      return undefined
    }

    if (this.ns.dateTime.equals(column.datatype.base)) {
      return this.factory.literal(parseDateTime(value, column.datatype.format, this.timezone).toISO()!, this.ns.dateTime)
    }

    if (column.datatype.base.value === this.ns.date.value) {
      return this.factory.literal(parseDateTime(value, column.datatype.format, this.timezone).toFormat('yyyy-MM-dd'), this.ns.date)
    }

    if (column.datatype.base) {
      return this.factory.literal(value, (column.language && column.language.fill(row).toLowerCase()) || column.datatype.base)
    }
  }

  property(column: ParsedColumn, row: Row) {
    return this.factory.namedNode(column.propertyUrl.fill(row))
  }

  createAllColumns(row: Row) {
    const titles = this.parsedColumns.reduce<string[]>((titles, column) => {
      return titles.concat(column.titles)
    }, [])

    const undefinedColumns = difference(Object.keys(row), titles).reduce((titles: ParsedColumn[], title): ParsedColumn[] => {
      if (defaultColumnNames.has(title)) return titles

      return [...titles, {
        name: title,
        titles: [title],
        propertyUrl: this.propertyUrl || this.defaultPropertyUrl(title),
        datatype: this.defaultDatatype(),
      }]
    }, [] as ParsedColumn[])

    this.allColumns = this.parsedColumns.concat(undefinedColumns)
  }

  defaultPropertyUrl(name: string) {
    return {
      fill: () => {
        return this.baseIRI + '#' + encodeURI(name)
      },
    } as unknown as URITemplate
  }

  defaultDatatype() {
    return { base: this.ns.string }
  }
}
