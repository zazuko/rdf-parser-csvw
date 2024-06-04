import type { Readable } from 'stream'
import rdf from '@rdfjs/data-model'
import type { DataFactory, DatasetCore } from '@rdfjs/types'
import CsvParser from './lib/CsvParser.js'
import parseMetadata from './lib/metadata/index.js'
import ObjectParserTransform from './lib/ObjectParserTransform.js'
import Metadata from './lib/metadata/Metadata.js'

export interface Options {
  baseIRI?: string
  metadata: Metadata | DatasetCore
  factory?: DataFactory
  timezone?: string
  relaxColumnCount?: boolean
  skipLinesWithError?: boolean
}

export default class Parser {
  private readonly metadata: Metadata | DatasetCore
  private readonly baseIRI: string
  private readonly factory: DataFactory
  private readonly timezone: string | undefined
  private readonly relaxColumnCount: boolean | undefined
  private readonly skipLinesWithError: boolean | undefined

  constructor({ metadata, baseIRI = '', factory = rdf, timezone, relaxColumnCount, skipLinesWithError }: Options) {
    this.metadata = metadata
    this.baseIRI = baseIRI
    this.factory = factory
    this.timezone = timezone
    this.relaxColumnCount = relaxColumnCount
    this.skipLinesWithError = skipLinesWithError
  }

  import(input: Readable, {
    metadata = this.metadata,
    baseIRI = this.baseIRI,
    factory = this.factory,
    timezone = this.timezone,
    relaxColumnCount = this.relaxColumnCount,
    skipLinesWithError = this.skipLinesWithError,
  }: Partial<Options> = {}) {
    const parsedMetadata = parseMetadata(metadata, { baseIRI, factory, timezone })

    const reader = new CsvParser({
      delimiter: parsedMetadata.delimiter,
      lineTerminators: parsedMetadata.lineTerminators,
      quoteChar: parsedMetadata.quoteChar,
      relaxColumnCount,
      skipLinesWithError,
    })

    const output = new ObjectParserTransform({ baseIRI, factory, metadata: parsedMetadata, timezone })

    input.on('end', () => {
      if (!output.readable) {
        output.end()
      }
    })

    reader.on('error', err => {
      output.destroy(err)
    })

    input.on('error', (err: Error) => {
      output.destroy(err)
    })

    input.pipe(reader).pipe(output)

    return output
  }

  static import(input: Readable, options: Options) {
    return (new Parser(options)).import(input)
  }
}
