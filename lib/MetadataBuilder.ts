import fs from 'fs'

export default class MetadataBuilder {
  static readFirstLine(filename: string): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream: any = fs.createReadStream(filename)
    const chunks: Uint8Array[] = []

    return new Promise((resolve, reject) => {
      const next = () => {
        if (stream.closed) {
          return reject(new Error('reached end of file before line break'))
        }

        const chunk = stream.read()

        if (chunk === null) {
          return setTimeout(next, 10)
        }

        chunks.push(chunk)

        if (chunk.toString().indexOf('\n') !== -1) {
          return resolve(Buffer.concat(chunks).toString().split('\n')[0])
        }

        setTimeout(next, 10)
      }

      next()
    })
  }

  static detectDelimiter(line: string) {
    const commaCount = line.split(',').length
    const tabCount = line.split('\t').length

    return commaCount > tabCount ? ',' : '\t'
  }

  static extractHeaders(line: string, delimiter: string) {
    return line.split(delimiter).map(header => {
      return header.split('"').join('').trim()
    })
  }

  static build(baseIri: string | undefined, headers: string[], { aboutUrl, delimiter = ',', propertyBaseIri = baseIri }: { aboutUrl?: string; delimiter?: string; propertyBaseIri?: string} = {}) {
    const metadata: {
      dialect?: {
        delimiter: string
      }
      tableSchema?: {
        aboutUrl: string
        columns: {
          titles: string
          propertyUrl: string
        }[]
      }
      '@context': string
    } = { '@context': 'http://www.w3.org/ns/csvw' }

    if (delimiter !== ',') {
      metadata.dialect = {
        delimiter,
      }
    }

    aboutUrl = aboutUrl || `${baseIri}{${encodeURIComponent(headers[0])}}`

    const columns = headers.map(header => {
      return {
        titles: header,
        propertyUrl: `${propertyBaseIri}${encodeURIComponent(header)}`,
      }
    })

    metadata.tableSchema = {
      aboutUrl,
      columns,
    }

    return metadata
  }

  static fromHeaderLine(firstLine: string, { aboutUrl, baseIri, delimiter, headers, propertyBaseIri }: { aboutUrl?: string; baseIri?: string; delimiter?: string; headers?: string[]; propertyBaseIri?: string } = {}) {
    delimiter = delimiter || MetadataBuilder.detectDelimiter(firstLine)
    headers = headers || MetadataBuilder.extractHeaders(firstLine, delimiter)

    return MetadataBuilder.build(baseIri, headers, { aboutUrl, delimiter, propertyBaseIri })
  }

  static fromFile(filename: string, { aboutUrl, baseIri = `file:///${filename}/`, delimiter, headers, propertyBaseIri }: { aboutUrl?: string; baseIri?: string; delimiter?: string; headers?: string[]; propertyBaseIri?: string } = {}) {
    return MetadataBuilder.readFirstLine(filename).then(firstLine => {
      return MetadataBuilder.fromHeaderLine(firstLine, { aboutUrl, baseIri, delimiter, headers, propertyBaseIri })
    })
  }
}
