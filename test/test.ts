import { rejects } from 'node:assert'
import { PassThrough } from 'node:stream'
import { getStreamAsArray } from 'get-stream'
import rdf from '@zazuko/env'
import CsvwParser from '../index.js'

describe('rdf-parser-csv', function () {
  it('should handle errors', async function () {
    const input = new PassThrough()
    const parser = new CsvwParser({
      metadata: rdf.dataset(),
    })

    input.write('kzy1,key2\n')
    input.write('value1_1;value2_1\n')
    input.write('value1_2,value2_2\n')
    input.end()

    const result = parser.import(input)

    await rejects(async () => {
      await getStreamAsArray(result)
    })
  })
})
