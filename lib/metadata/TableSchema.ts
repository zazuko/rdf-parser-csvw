/* eslint-disable camelcase */
import URL from 'url'
import difference from 'lodash/difference.js'
import uriTemplate, { URITemplate } from 'uri-templates'
import type { BlankNode, DatasetCore, NamedNode, Quad_Object, Term } from '@rdfjs/types'
import type { GraphPointer } from 'clownface'
import namespace, { NS } from '../namespace.js'
import parseDateTime from '../parseDateTime.js'
import { Factory } from '../Factory.js'

const defaultColumnNames = new Set(['_column', '_sourceColumn', '_row', '_sourceRow', '_name'])

interface Options {
  baseIRI: string
  factory: Factory
  timezone?: string
  root?: Term | GraphPointer
  strictPropertyEscaping?: boolean
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

const xsd = 'http://www.w3.org/2001/XMLSchema#'
const rdfs = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
const builtInTypes = new Map<string | undefined, string>([
  ['number', `${xsd}double`],
  ['binary', `${xsd}base64Binary`],
  ['datetime', `${xsd}dateTime`],
  ['any', `${xsd}anyAtomicType`],
  ['xml', `${rdfs}XMLLiteral`],
  ['html', `${rdfs}HTML`],
  ['json', 'http://www.w3.org/ns/csvw#JSON'],
])

export default class TableSchema {
  private readonly factory: Factory
  private readonly ns: NS
  private readonly root: GraphPointer | undefined
  private readonly baseIRI: string
  private readonly timezone: string | undefined
  private parsedColumns: ParsedColumn[]
  private allColumns: ParsedColumn[] | null
  aboutUrl: (row: Row) => NamedNode | BlankNode
  propertyUrl?: URITemplate
  private readonly strictPropertyEscaping: boolean | undefined

  constructor(dataset: DatasetCore, { root, baseIRI, factory, timezone, strictPropertyEscaping }: Options) {
    const graph = factory.clownface({ dataset })

    this.factory = factory
    this.ns = namespace(this.factory)
    this.root = root ? graph.node(root) : graph.has(this.ns.tableSchema).out(this.ns.tableSchema).toArray().shift()
    this.baseIRI = baseIRI
    this.timezone = timezone
    this.strictPropertyEscaping = strictPropertyEscaping

    this.aboutUrl = () => {
      return this.factory.blankNode()
    }

    this.parsedColumns = []
    this.allColumns = null

    if (dataset) {
      this.aboutUrl = this.parseAboutUrl() || this.aboutUrl
      this.propertyUrl = this.parsePropertyUrl()
      this.parseColumns()
    }
  }

  parseAboutUrl() {
    const aboutUrl = this.root?.out(this.ns.aboutUrl).value

    if (!aboutUrl) {
      return
    }

    const aboutUrlTemplate = uriTemplate(aboutUrl)

    return (row: Row) => {
      return this.factory.namedNode(URL.resolve(this.baseIRI, aboutUrlTemplate.fill(row))) // eslint-disable-line n/no-deprecated-api
    }
  }

  parsePropertyUrl() {
    const url = this.root?.out(this.ns.propertyUrl).value

    if (!url) {
      return
    }

    return uriTemplate(url)
  }

  parseColumns() {
    const columnNodes = [...this.root?.out(this.ns.column).list() || []]

    this.parsedColumns = columnNodes.map((node: GraphPointer) => {
      const titles = node.out(this.ns.title).values
      const name = node.out(this.ns.name).value || titles[0]
      const aboutUrl = node.out(this.ns.aboutUrl).value
      const language = node.out(this.ns.lang).value
      const nullValue = node.out(this.ns.null).value || ''
      const defaultValue = node.out(this.ns.default).value
      const propertyUrl = node.out(this.ns.propertyUrl).value
      const suppressOutput = node.out(this.ns.suppressOutput).value
      const virtual = node.out(this.ns.virtual).value
      const valueUrl = node.out(this.ns.valueUrl).value

      const column: ParsedColumn = {
        datatype: this.parseDatatype(node.term),
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
    const datatype = this.root?.node(node).out(this.ns.datatype)

    if (!datatype) {
      return this.defaultDatatype()
    }

    if (datatype.term?.termType === 'NamedNode') {
      return { base: datatype.term }
    }

    const baseString = datatype.out(this.ns.base).value
    const format = datatype.out(this.ns.format).value

    let base = builtInTypes.get(baseString)
    if (!base) {
      base = xsd + (baseString || 'string')
    }

    return {
      base: this.factory.namedNode(base),
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

    let value: string | undefined = column.titles.reduce((value, title) => {
      return value || row[title]
    }, '')

    if (value === '') {
      value = column.defaultValue
    }

    if (typeof value === 'undefined' || value === column.nullValue) {
      return undefined
    }

    if (column.datatype.format) {
      let literal:string | undefined

      const date = parseDateTime(value, column.datatype.format, this.timezone)
      switch (column.datatype.base.value) {
        case this.ns.dateTimeStamp.value:
        case this.ns.dateTime.value:
          literal = date?.toISO({ suppressMilliseconds: true })
          break
        case this.ns.date.value:
          literal = date?.toISODate()
          break
        case this.ns.time.value:
          literal = date?.toISOTime({ suppressMilliseconds: true })
          break
      }

      return this.factory.literal(literal || value, column.datatype.base)
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
    let columnFragment = encodeURIComponent(name)

    if (this.strictPropertyEscaping) {
      columnFragment = columnFragment.replace(/-/g, '%2D')
    }

    return {
      fill: () => {
        return this.baseIRI + '#' + columnFragment
      },
    } as unknown as URITemplate
  }

  defaultDatatype() {
    return { base: this.ns.string }
  }
}
