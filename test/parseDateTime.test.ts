import assert from 'node:assert'
import parseDateTime from '../lib/parseDateTime.js'

describe('parseDateTime', function () {
  it('should be a function', function () {
    assert.strictEqual(typeof parseDateTime, 'function')
  })

  it('should parse a date time string using the format argument', function () {
    const dateTime = parseDateTime('20180101 000000', 'yyyyMMdd HHmmss', 'UTC')

    assert.strictEqual(dateTime?.toUTC().toISO(), '2018-01-01T00:00:00.000Z')
  })
})
