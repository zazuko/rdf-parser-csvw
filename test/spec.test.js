import assert from 'assert'
import fs from 'fs'
import path from 'path'
import fromStream from 'rdf-dataset-ext/fromStream.js'
import toCanonical from 'rdf-dataset-ext/toCanonical.js'
import JsonLdParser from '@rdfjs/parser-jsonld'
import N3Parser from '@rdfjs/parser-n3'
import CsvwParser from '../index.js'
import rdf from './support/factory.js'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

const blackList = new Set([
  'manifest-rdf#test016',
  'manifest-rdf#test023',
  'manifest-rdf#test027',
  'manifest-rdf#test029',
  'manifest-rdf#test030',
  'manifest-rdf#test031',
  'manifest-rdf#test032',
  'manifest-rdf#test033',
  'manifest-rdf#test034',
  'manifest-rdf#test035',
  'manifest-rdf#test036',
  'manifest-rdf#test037',
  'manifest-rdf#test038',
  'manifest-rdf#test039',
  'manifest-rdf#test116',
  'manifest-rdf#test118',
  'manifest-rdf#test121',
  'manifest-rdf#test124',
  'manifest-rdf#test149',
  'manifest-rdf#test158',
  'manifest-rdf#test168',
  'manifest-rdf#test170',
  'manifest-rdf#test171',
  'manifest-rdf#test183',
  // following date and time tests are duplicated and slightly adjusted in our tests
  'manifest-rdf#test188', // date/time
  'manifest-rdf#test189', // time
  'manifest-rdf#test190', // date/time
  'manifest-rdf#test228',
  'manifest-rdf#test229',
  'manifest-rdf#test235',
  'manifest-rdf#test236',
  'manifest-rdf#test237',
  'manifest-rdf#test245',
  'manifest-rdf#test263',
  'manifest-rdf#test264',
  'manifest-rdf#test268',
  'manifest-rdf#test273', // never remove me
  'manifest-rdf#test282',
  'manifest-rdf#test283',
  'manifest-rdf#test284',
  'manifest-rdf#test285',
  'manifest-rdf#test305',
  'manifest-rdf#test306',
  'manifest-rdf#test307',
])

const whiteList = new Set([
])

function datasetFromN3Fs(filename) {
  const parser = new N3Parser({ baseIRI: new String('') }) // eslint-disable-line no-new-wrappers

  return fromStream(rdf.dataset(), parser.import(fs.createReadStream(filename), { factory: rdf }))
}

function datasetFromJsonLdFs(filename) {
  const parser = new JsonLdParser()

  return fromStream(rdf.dataset(), parser.import(fs.createReadStream(filename), { factory: rdf }))
}

function loadTests() {
  const manifestFile = 'test/spec/tests/manifest-rdf.ttl'

  try {
    fs.readFileSync(manifestFile)
  } catch (err) {
    return Promise.resolve([])
  }

  return datasetFromN3Fs(manifestFile).then((manifest) => {
    const tests = [...manifest.match(
      null,
      rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      rdf.namedNode('http://www.w3.org/2013/csvw/tests/vocab#ToRdfTest'),
    )].map((test) => {
      return test.subject
    }).map((test) => {
      const name = [...manifest.match(test, rdf.namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#name'))]
        .map((t) => {
          return t.object.value
        })[0]

      const action = [...manifest.match(test, rdf.namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#action'))]
        .map((t) => {
          return t.object.value
        })[0]

      const result = [...manifest.match(test, rdf.namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#result'))]
        .map((t) => {
          return t.object.value
        })[0]

      const implicit = [...manifest.match(test, rdf.namedNode('http://www.w3.org/2013/csvw/tests/vocab#implicit'))]
        .map((t) => {
          return t.object.value
        })[0]

      const label = name + '<' + test.value + '>'

      const input = path.extname(action) === '.csv' ? action : implicit
      const metadata = input === action ? implicit : action

      return {
        iri: test.value,
        label,
        name,
        input,
        metadata,
        result,
        blacklisted: blackList.has(test.value),
        whitelisted: whiteList.has(test.value),
      }
    })

    return Promise.all(tests.map((test) => {
      if (test.metadata) {
        if (path.extname(test.metadata) === '.json') {
          return datasetFromJsonLdFs(path.join(__dirname, 'spec/tests', test.metadata)).then((metadata) => {
            test.metadata = metadata

            return test
          })
        }
      }

      return test
    }))
  })
}

(async () => {
  const tests = await loadTests()

  describe('W3C spec tests', () => {
    for (const test of tests) {
      let testCase = it
      if (test.blacklisted) {
        testCase = it.skip
      }
      if (test.whitelisted) {
        testCase = it.only
      }

      testCase(test.label, () => {
        const parser = new CsvwParser({ factory: rdf })
        const input = fs.createReadStream('test/spec/tests/' + test.input)
        const stream = parser.import(input, {
          baseIRI: path.basename(test.input),
          metadata: test.metadata,
          strictPropertyEscaping: true,
        })

        return Promise.all([
          datasetFromN3Fs('test/spec/tests/' + test.result),
          fromStream(rdf.dataset(), stream),
        ]).then((results) => {
          const expected = results[0]
          const actual = results[1]

          assert.strictEqual(toCanonical(actual), toCanonical(expected))
        })
      })
    }
  })

  run()
})()
