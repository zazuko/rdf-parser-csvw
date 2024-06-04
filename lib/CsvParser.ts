import { Parser } from 'csv-parse'
import { Transform } from 'readable-stream'

interface Options {
  delimiter?: string
  lineTerminators?: string[] | null
  quoteChar?: string | null
  relaxColumnCount?: boolean
  skipLinesWithError?: boolean
}

export default class CsvParser extends Transform {
  parser: Parser

  constructor({ delimiter, lineTerminators, quoteChar, relaxColumnCount, skipLinesWithError }: Options = {}) {
    super({
      readableObjectMode: true,
    })

    this.parser = new Parser({
      columns: true,
      delimiter,
      info: true,
      bom: true,
      quote: quoteChar,
      record_delimiter: lineTerminators || [],
      relax_column_count: relaxColumnCount,
      skipRecordsWithError: skipLinesWithError,
    })

    this.parser.on('error', err => {
      this.destroy(err)
    })

    this.parser.push = data => {
      if (data) {
        this.push({
          line: data.info.lines,
          row: data.record,
        })
      }

      return true
    }
  }

  _transform(chunk: Record<string, string>, encoding: string, callback: () => void) {
    this.parser.write(chunk, encoding, callback)
  }

  _flush(callback: () => void) {
    this.parser.end(callback)
  }
}
