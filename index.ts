import type { Readable } from 'stream'
import type { DatasetCore } from '@rdfjs/types'
import CsvParser from './lib/CsvParser.js'
import parseMetadata from './lib/metadata/index.js'
import ObjectParserTransform from './lib/ObjectParserTransform.js'
import Metadata from './lib/metadata/Metadata.js'
import rdf, { Factory } from './lib/Factory.js'

export interface Options {
  baseIRI?: string
  metadata: Metadata | DatasetCore
  factory?: Factory
  timezone?: string
  relaxColumnCount?: boolean
  skipLinesWithError?: boolean
  trimHeaders?: boolean
  skipEmptyLines?: boolean
  strictPropertyEscaping?: boolean
}

export default class Parser {
  private readonly metadata: Metadata | DatasetCore
  private readonly baseIRI: string
  private readonly factory: Factory
  private readonly timezone: string | undefined
  private readonly relaxColumnCount: boolean | undefined
  private readonly skipLinesWithError: boolean | undefined
  private readonly trimHeaders: boolean | undefined
  private readonly skipEmptyLines: boolean | undefined
  private readonly strictPropertyEscaping: boolean | undefined

  constructor({ metadata, baseIRI = '', factory = rdf, timezone, relaxColumnCount, skipLinesWithError, trimHeaders, skipEmptyLines, strictPropertyEscaping }: Options) {
    this.metadata = metadata
    this.baseIRI = baseIRI
    this.factory = factory
    this.timezone = timezone
    this.relaxColumnCount = relaxColumnCount
    this.skipLinesWithError = skipLinesWithError
    this.trimHeaders = trimHeaders
    this.skipEmptyLines = skipEmptyLines
    this.strictPropertyEscaping = strictPropertyEscaping
  }

  import(input: Readable, {
    metadata = this.metadata,
    baseIRI = this.baseIRI,
    factory = this.factory,
    timezone = this.timezone,
    relaxColumnCount = this.relaxColumnCount,
    skipLinesWithError = this.skipLinesWithError,
    trimHeaders = this.trimHeaders,
    skipEmptyLines = this.skipEmptyLines,
    strictPropertyEscaping = this.strictPropertyEscaping,
  }: Partial<Options> = {}) {
    const parsedMetadata = parseMetadata(metadata, {
      baseIRI,
      factory,
      timezone,
      strictPropertyEscaping,
    })

    const reader = new CsvParser({
      delimiter: parsedMetadata.delimiter,
      lineTerminators: parsedMetadata.lineTerminators,
      quoteChar: parsedMetadata.quoteChar,
      relaxColumnCount,
      skipLinesWithError,
      trimHeaders,
      skipEmptyLines,
    })

    const output = new ObjectParserTransform({
      baseIRI,
      factory,
      metadata: parsedMetadata,
      timezone,
    })

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
