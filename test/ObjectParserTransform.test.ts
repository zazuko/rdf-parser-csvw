import assert from 'node:assert'
import { PassThrough } from 'node:stream'
import { expect } from 'chai'
import rdf from '@zazuko/env'
import fromStream from 'rdf-dataset-ext/fromStream.js'
import ObjectParserTransform from '../lib/ObjectParserTransform.js'
import waitFor from './support/waitFor.js'

const ns = {
  csvw: {
    Row: rdf.namedNode('http://www.w3.org/ns/csvw#Row'),
    Table: rdf.namedNode('http://www.w3.org/ns/csvw#Table'),
    TableGroup: rdf.namedNode('http://www.w3.org/ns/csvw#TableGroup'),
    describes: rdf.namedNode('http://www.w3.org/ns/csvw#describes'),
    row: rdf.namedNode('http://www.w3.org/ns/csvw#row'),
    rownum: rdf.namedNode('http://www.w3.org/ns/csvw#rownum'),
    table: rdf.namedNode('http://www.w3.org/ns/csvw#table'),
    url: rdf.namedNode('http://www.w3.org/ns/csvw#url'),
  },
  rdf: {
    type: rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
  },
  xsd: {
    integer: rdf.namedNode('http://www.w3.org/2001/XMLSchema#integer'),
  },
}

describe('ObjectParserTransform', function () {
  it('should be a constructor', function () {
    assert.strictEqual(typeof ObjectParserTransform, 'function')
  })

  it('should have a Transform interface', function () {
    const parser = new ObjectParserTransform()

    assert.strictEqual(parser.readable, true)
    assert.strictEqual(parser.writable, true)
  })

  it('should parse object', function () {
    const input = new PassThrough({ objectMode: true })
    const parser = new ObjectParserTransform()

    input.pipe(parser)

    parser.resume()

    input.write({
      line: 2,
      row: {
        key0: 'value0',
        key1: 'value1',
      },
    })

    input.end()

    return waitFor(parser)
  })

  it('should output RDF objects', async function () {
    const input = new PassThrough({ objectMode: true })
    const parser = new ObjectParserTransform({ factory: rdf })

    input.pipe(parser)

    const tableGroup = rdf.blankNode()
    const table = rdf.blankNode()
    const row = rdf.blankNode()
    const object = rdf.blankNode()

    const expected = rdf.dataset()

    expected.add(rdf.quad(tableGroup, ns.rdf.type, ns.csvw.TableGroup))
    expected.add(rdf.quad(tableGroup, ns.csvw.table, table))

    expected.add(rdf.quad(table, ns.rdf.type, ns.csvw.Table))
    expected.add(rdf.quad(table, ns.csvw.url, rdf.namedNode('')))
    expected.add(rdf.quad(table, ns.csvw.row, row))

    expected.add(rdf.quad(row, ns.rdf.type, ns.csvw.Row))
    expected.add(rdf.quad(row, ns.csvw.describes, object))
    expected.add(rdf.quad(row, ns.csvw.rownum, rdf.literal('1', ns.xsd.integer)))
    expected.add(rdf.quad(row, ns.csvw.url, rdf.namedNode('#row=2')))

    expected.add(rdf.quad(object, rdf.namedNode('#key0'), rdf.literal('value0')))
    expected.add(rdf.quad(object, rdf.namedNode('#key1'), rdf.literal('value1')))

    input.write({
      line: 2,
      row: {
        key0: 'value0',
        key1: 'value1',
      },
    })

    input.end()

    const actual = await rdf.dataset.fromStream(parser)

    assert.strictEqual(rdf.dataset.toCanonical(actual), rdf.dataset.toCanonical(expected))
  })

  it('should output date/time at face value', async function () {
    const input = new PassThrough({ objectMode: true })
    const metadata = rdf.clownface()
      .blankNode()
      .addOut(rdf.ns.csvw.tableSchema, (table) => {
        const column = table.blankNode()
        column
          .addOut(rdf.ns.csvw.title, 'key1')
          .addOut(rdf.ns.csvw.datatype, (dt) => {
            dt.addOut(rdf.ns.csvw.base, 'dateTime')
          })
        table.addList(rdf.ns.csvw.column, [column])
      })
    const parser = new ObjectParserTransform({
      metadata: metadata.dataset,
      factory: rdf,
    })

    input.pipe(parser)

    input.write({
      line: 2,
      row: {
        key0: 'value0',
        key1: 'not a date',
      },
    })

    input.end()

    const dataset = await fromStream(rdf.dataset(), parser)
    const [{ object }] = dataset.match(null, rdf.namedNode('#key1'))
    assert(object.equals(rdf.literal('not a date', rdf.ns.xsd.dateTime)))
  })

  it('should try to parse date/time when given format', async function () {
    const input = new PassThrough({ objectMode: true })
    const metadata = rdf.clownface()
      .blankNode()
      .addOut(rdf.ns.csvw.tableSchema, (table) => {
        const column = table.blankNode()
        column
          .addOut(rdf.ns.csvw.title, 'key1')
          .addOut(rdf.ns.csvw.datatype, (dt) => {
            dt.addOut(rdf.ns.csvw.base, 'date')
            dt.addOut(rdf.ns.csvw.format, 'yyyy')
          })
        table.addList(rdf.ns.csvw.column, [column])
      })
    const parser = new ObjectParserTransform({
      metadata: metadata.dataset,
      factory: rdf,
    })

    input.pipe(parser)

    input.write({
      line: 2,
      row: {
        key0: 'value0',
        key1: '2000',
      },
    })

    input.end()

    const dataset = await fromStream(rdf.dataset(), parser)
    const [{ object }] = dataset.match(null, rdf.namedNode('#key1'))
    expect(object).to.deep.equals(rdf.literal('2000-01-01', rdf.ns.xsd.date))
  })
})
