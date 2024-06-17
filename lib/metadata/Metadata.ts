import type { DatasetCore } from '@rdfjs/types'
import namespace, { NS } from '../namespace.js'
import { Factory } from '../Factory.js'
import TableSchema from './TableSchema.js'

interface Options {
  baseIRI: string
  factory: Factory
  timezone?: string
  strictPropertyEscaping?: boolean
}

export default class Metadata {
  factory: Factory
  dataset: DatasetCore
  baseIRI: string
  timezone?: string
  delimiter: string
  quoteChar: string | null
  lineTerminators: string[] | null
  strictPropertyEscaping: boolean
  ns: NS
  tableSchemas: TableSchema[] = []

  constructor(dataset: DatasetCore, { baseIRI, factory, timezone, strictPropertyEscaping = false }: Options) {
    this.factory = factory
    this.dataset = dataset
    this.baseIRI = baseIRI
    this.timezone = timezone
    this.strictPropertyEscaping = strictPropertyEscaping
    this.delimiter = ','
    this.quoteChar = '"'
    this.lineTerminators = null

    this.ns = namespace(this.factory)

    this.parse()
  }

  parse() {
    this.parseDialect()

    this.tableSchemas = [new TableSchema(this.dataset, {
      baseIRI: this.baseIRI,
      factory: this.factory,
      timezone: this.timezone,
      strictPropertyEscaping: this.strictPropertyEscaping,
    })]
  }

  parseDialect() {
    if (!this.dataset) {
      return
    }

    const dialectQuad = [...this.dataset.match(null, this.ns.dialect)][0]

    if (!dialectQuad) {
      return
    }

    const delimiterQuad = [...this.dataset.match(dialectQuad.object, this.ns.delimiter)][0]

    if (delimiterQuad) {
      this.delimiter = delimiterQuad.object.value
    }

    const lineTerminatorsQuads = [...this.dataset.match(dialectQuad.object, this.ns.lineTerminators)]

    if (lineTerminatorsQuads.length > 0) {
      this.lineTerminators = lineTerminatorsQuads.map(q => q.object.value)
    }

    const quoteCharQuad = [...this.dataset.match(dialectQuad.object, this.ns.quoteChar)][0]

    if (quoteCharQuad) {
      if (quoteCharQuad.object.termType === 'Literal' && quoteCharQuad.object.datatype.equals(this.ns.boolean) && quoteCharQuad.object.value === 'false') {
        this.quoteChar = null
      } else {
        this.quoteChar = quoteCharQuad.object.value
      }
    }
  }
}
