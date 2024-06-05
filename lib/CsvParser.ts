import { Parser } from 'csv-parse'
import { Transform } from 'readable-stream'

interface Options {
  delimiter?: string
  lineTerminators?: string[] | null
  quoteChar?: string | null
  relaxColumnCount?: boolean
  skipLinesWithError?: boolean
  skipEmptyLines?: boolean
  trimHeaders?: boolean
}

export default class CsvParser extends Transform {
  parser: Parser

  constructor({ delimiter, lineTerminators, quoteChar, relaxColumnCount, skipLinesWithError, skipEmptyLines = true, trimHeaders }: Options = {}) {
    super({
      readableObjectMode: true,
    })

    const columns = trimHeaders
      ? (header: string[]) => header.map(column => column.trim())
      : true

    this.parser = new Parser({
      columns,
      delimiter,
      info: true,
      bom: true,
      quote: quoteChar,
      record_delimiter: lineTerminators || [],
      relax_column_count: relaxColumnCount,
      skipRecordsWithError: skipLinesWithError,
      skip_empty_lines: skipEmptyLines,
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
