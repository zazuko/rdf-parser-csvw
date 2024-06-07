import { Transform } from 'readable-stream'
import type { BlankNode, DatasetCore, NamedNode, Quad } from '@rdfjs/types'
import parseMetadata from './metadata/index.js'
import namespace, { NS } from './namespace.js'
import TableSchema from './metadata/TableSchema.js'
import Metadata from './metadata/Metadata.js'
import rdf, { Factory } from './Factory.js'

interface Options {
  baseIRI?: string
  factory?: Factory
  metadata?: Metadata | DatasetCore
  tableSchema?: TableSchema
  timezone?: string
}

export default class ObjectParserTransform extends Transform {
  private readonly baseIRI: string
  private readonly factory: Factory
  private readonly timezone: string | undefined
  private ns: NS
  private contentLine: number
  private tableGroupNode: NamedNode | BlankNode
  private tableNode: NamedNode | BlankNode
  private tableSchema: TableSchema
  private parsedMetadata: Metadata

  constructor({ baseIRI = '', factory = rdf, metadata, tableSchema, timezone }: Options = {}) {
    super({
      objectMode: true,
    })

    this.baseIRI = baseIRI
    this.factory = factory
    this.timezone = timezone
    this.ns = namespace(this.factory)
    this.parsedMetadata = parseMetadata(metadata, {
      baseIRI: this.baseIRI,
      factory: this.factory,
      timezone: this.timezone,
    })
    this.tableSchema = tableSchema || this.parsedMetadata.tableSchemas[0]

    this.contentLine = 0
    this.tableGroupNode = this.factory.blankNode()
    this.tableNode = this.factory.blankNode()

    this.processTableGroup()
    this.processTable()
  }

  _transform(obj: { line: number; row: Record<string, string> }, encoding: string, done: () => void) {
    this.processRow(obj.line, obj.row).then(done).catch(done)
  }

  processTableGroup() {
    this.push(this.factory.quad(
      this.tableGroupNode,
      this.ns.type,
      this.ns.TableGroup,
    ))
  }

  processTable() {
    this.push(this.factory.quad(
      this.tableGroupNode,
      this.ns.table,
      this.tableNode,
    ))

    this.push(this.factory.quad(
      this.tableNode,
      this.ns.type,
      this.ns.Table,
    ))

    this.push(this.factory.quad(
      this.tableNode,
      this.ns.url,
      this.factory.namedNode(this.baseIRI),
    ))

    if (this.parsedMetadata.dataset) {
      const urlQuad = [...this.parsedMetadata.dataset.match(null, this.ns.url)][0]

      if (urlQuad) {
        this.copySubgraph([...this.parsedMetadata.dataset.match(urlQuad.subject)].filter((quad) => {
          return quad.predicate.value.slice(0, 26) !== 'http://www.w3.org/ns/csvw#'
        }), this.tableNode)
      }
    }
  }

  processRow(line: number, row: Record<string, string>) {
    this.contentLine++

    const rowNode = this.factory.blankNode()

    this.push(this.factory.quad(
      this.tableNode,
      this.ns.row,
      rowNode,
    ))

    this.push(this.factory.quad(
      rowNode,
      this.ns.type,
      this.ns.Row,
    ))

    const rowData = {
      ...row,
      _row: `${this.contentLine}`,
      _sourceRow: `${line}`,
    }

    // describes

    const describesNode = this.tableSchema.aboutUrl(rowData)

    this.push(this.factory.quad(
      rowNode,
      this.ns.describes,
      describesNode,
    ))

    this.tableSchema.columns({ contentLine: this.contentLine, row: rowData }).forEach((column) => {
      this.push(this.factory.quad(
        column.subject || describesNode,
        column.property,
        column.value,
      ))
    })

    // rownum

    this.push(this.factory.quad(
      rowNode,
      this.ns.rownum,
      this.factory.literal(this.contentLine.toString(), this.ns.integer),
    ))

    // url

    const rowUrl = this.factory.namedNode(this.baseIRI + '#row=' + line)

    this.push(this.factory.quad(
      rowNode,
      this.ns.url,
      rowUrl,
    ))

    return Promise.resolve()
  }

  copySubgraph(quads: Quad[], subject?: NamedNode | BlankNode) {
    quads.forEach((quad) => {
      this.push(this.factory.quad(
        subject || quad.subject,
        quad.predicate,
        quad.object,
      ))

      if (quad.object.termType === 'BlankNode') {
        this.copySubgraph([...this.parsedMetadata.dataset.match(quad.object)])
      }
    })
  }
}
