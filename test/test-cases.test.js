import assert from 'assert'
import fs from 'fs'
import path from 'path'
import fromStream from 'rdf-dataset-ext/fromStream.js'
import toCanonical from 'rdf-dataset-ext/toCanonical.js'
import { glob } from 'glob'
import JsonLdParser from '@rdfjs/parser-jsonld'
import N3Parser from '@rdfjs/parser-n3'
import CsvwParser from '../index.js'
import rdf from './support/factory.js'

const blackList = [
  '006',
  '007',
  '009',
  '011',
  '012',
  '016',
  '017',
]

function datasetFromN3Fs(filename) {
  filename = path.resolve(filename)
  filename = fs.existsSync(filename + '.nt') ? filename + '.nt' : filename + '.ttl'

  try {
    fs.readFileSync(filename)
  } catch (err) {
    return Promise.resolve(rdf.dataset())
  }

  const parser = new N3Parser({ baseIRI: new String(''), factory: rdf }) // eslint-disable-line no-new-wrappers

  return fromStream(rdf.dataset(), parser.import(fs.createReadStream(filename)))
}

function datasetFromJsonLdFs(filename) {
  const parser = new JsonLdParser({ factory: rdf })

  return fromStream(rdf.dataset(), parser.import(fs.createReadStream(path.resolve(filename))))
}

describe('test-cases', () => {
  glob.sync('test/support/test*.csv').forEach((csvFile) => {
    const basePath = path.dirname(csvFile)
    const baseName = path.basename(csvFile, '.csv')
    const metadataFile = path.join(basePath, baseName + '.csv-metadata.json')
    const outputFile = path.join(basePath, baseName)
    const id = baseName.slice(4, 7)

    if (blackList.indexOf(id) !== -1) {
      return
    }

    it(baseName, () => {
      return Promise.all([
        datasetFromJsonLdFs(metadataFile),
        datasetFromN3Fs(outputFile),
      ]).then(([metadata, output]) => {
        const parser = new CsvwParser({
          factory: rdf,
          baseIRI: path.basename(csvFile),
          metadata,
          timezone: 'UTC',
          trimHeaders: true,
        })
        const input = fs.createReadStream(csvFile)
        const stream = parser.import(input)

        return fromStream(rdf.dataset(), stream).then((actual) => {
          assert.strictEqual(toCanonical(actual), toCanonical(output))
        })
      })
    })
  })
})
