import assert from 'node:assert'
import { PassThrough } from 'node:stream'
import { getStreamAsArray } from 'get-stream'
import CsvParser from '../lib/CsvParser.js'
import waitFor from './support/waitFor.js'

describe('csvParser', function () {
  it('should be a function', function () {
    assert.strictEqual(typeof CsvParser, 'function')
  })

  it('should return a Transform', function () {
    const parser = new CsvParser()

    assert.strictEqual(parser.readable, true)
    assert.strictEqual(parser.writable, true)
  })

  it('should parse CSV with header', function () {
    const input = new PassThrough()
    const parser = new CsvParser()

    input.pipe(parser)

    parser.resume()

    input.write('key0,key1\n')
    input.write('value0,value1\n')
    input.end()

    return waitFor(parser)
  })

  it('should parse CSV with BOM', async function () {
    const input = new PassThrough()
    const parser = new CsvParser()

    input.pipe(parser)

    const output: string[] = []
    const expected = [{
      line: 2,
      row: {
        key0: 'value0',
        key1: 'value1',
      },
    }]

    parser.on('data', (data) => {
      output.push(data)
    })

    input.write('\ufeffkey0,key1\n')
    input.write('value0,value1\n')
    input.end()

    await waitFor(parser)
    assert.deepStrictEqual(output, expected)
  })

  it('should output objects with line number and row data', async function () {
    const input = new PassThrough()
    const parser = new CsvParser()

    input.pipe(parser)

    const output: string[] = []
    const expected = [{
      line: 2,
      row: {
        key0: 'value0',
        key1: 'value1',
      },
    }]

    parser.on('data', (data) => {
      output.push(data)
    })

    input.write('key0,key1\n')
    input.write('value0,value1\n')
    input.end()

    await waitFor(parser)
    assert.deepStrictEqual(output, expected)
  })

  it('should parse lines with alternative delimiter', async function () {
    const input = new PassThrough()
    const parser = new CsvParser({ delimiter: ';' })

    input.pipe(parser)

    const output: string[] = []
    const expected = [{
      line: 2,
      row: {
        key0: 'value0',
        key1: 'value1',
      },
    }]

    parser.on('data', (data) => {
      output.push(data)
    })

    input.write('key0;key1\n')
    input.write('value0;value1\n')
    input.end()

    await waitFor(parser)
    assert.deepStrictEqual(output, expected)
  })

  it('should parse lines with alternative lineTerminator and UTF16LE encoding', async function () {
    const input = new PassThrough()
    const parser = new CsvParser({ lineTerminators: ['\r\n'] })

    input.pipe(parser)

    const output: string[] = []
    const expected = [{
      line: 2,
      row: {
        key0: 'value0',
        key1: 'value1',
      },
    }]

    parser.on('data', (data) => {
      output.push(data)
    })

    input.write(new Uint8Array([0xff, 0xfe]))
    input.write('key0,key1\r\n', 'utf16le')
    input.write('value0,value1\r\n', 'utf16le')
    input.end()

    await waitFor(parser)
    assert.deepStrictEqual(output, expected)
  })

  it('should allow trimming of whitespace in headers', async function () {
    const input = new PassThrough()
    const parser = new CsvParser({ lineTerminators: ['\r\n'], trimHeaders: true })

    input.pipe(parser)

    const output: string[] = []
    const expected = [{
      line: 2,
      row: {
        key0: 'value0',
        key1: 'value1',
        key2: 'value2',
      },
    }]

    parser.on('data', (data) => {
      output.push(data)
    })

    input.write('key0 , key1,"\tkey2\t"\r\n')
    input.write('value0,value1,value2\r\n')
    input.end()

    await waitFor(parser)
    assert.deepStrictEqual(output, expected)
  })

  it('should handle errors', async function () {
    const input = new PassThrough()
    const parser = new CsvParser({ delimiter: ';' })

    input.pipe(parser)
    input.write('kzy1,key2\n')
    input.write('value1_1;value2_1\n')
    input.write('value1_2,value2_2\n')
    input.end()

    await assert.rejects(async () => {
      await getStreamAsArray(parser)
    })
  })
})
