import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import fromStream from 'rdf-dataset-ext/fromStream.js'
import { describe } from 'mocha'
import { glob } from 'glob'
import JsonLdParser from '@rdfjs/parser-jsonld'
import N3Parser from '@rdfjs/parser-n3'
import rdf from '@zazuko/env'
import CsvwParser from '../index.js'

const blackList = [
  '006',
  '007',
  '009',
  '011',
  '012',
  '016',
  '017',
]

function datasetFromN3Fs(filename: string) {
  filename = path.resolve(filename)
  filename = fs.existsSync(filename + '.nt') ? filename + '.nt' : filename + '.ttl'

  try {
    fs.readFileSync(filename)
  }
  catch {
    return Promise.resolve(rdf.dataset())
  }

  const parser = new N3Parser({ baseIRI: '', factory: rdf })

  return fromStream(rdf.dataset(), parser.import(fs.createReadStream(filename)))
}

function datasetFromJsonLdFs(filename: string) {
  const parser = new JsonLdParser({ factory: rdf })

  return fromStream(rdf.dataset(), parser.import(fs.createReadStream(path.resolve(filename))))
}

describe('test-cases', function () {
  let testCases = glob.sync('test/support/test*.csv').map((csvFile) => {
    const basePath = path.dirname(csvFile)
    const baseName = path.basename(csvFile, '.csv')
    const metadataFile = path.join(basePath, baseName + '.csv-metadata.json')
    const outputFile = path.join(basePath, baseName)
    const id = baseName.slice(4, 7)

    return {
      csvFile,
      id,
      baseName,
      metadataFile,
      outputFile,
    }
  })

  describe('test-case', function () {
    testCases.forEach(({ id, baseName, csvFile, metadataFile, outputFile }) => {
      let spec: Mocha.TestFunction | Mocha.PendingTestFunction = it

      if (blackList.indexOf(id) !== -1) {
        spec = it.skip
      }

      spec(baseName, async function () {
        const [metadata, output] = await Promise.all([
          datasetFromJsonLdFs(metadataFile),
          datasetFromN3Fs(outputFile),
        ])

        const parser = new CsvwParser({
          factory: rdf,
          baseIRI: path.basename(csvFile),
          metadata,
          timezone: 'UTC',
          trimHeaders: true,
        })
        const input = fs.createReadStream(csvFile)
        const stream = parser.import(input)

        const actual = await rdf.dataset.fromStream(stream)

        assert.strictEqual(rdf.dataset.toCanonical(actual), rdf.dataset.toCanonical(output))
      })
    })
  })
})
