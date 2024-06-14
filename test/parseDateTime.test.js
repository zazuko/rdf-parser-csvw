import assert from 'assert'
import parseDateTime from '../lib/parseDateTime.js'

describe('parseDateTime', () => {
  it('should be a function', () => {
    assert.strictEqual(typeof parseDateTime, 'function')
  })

  it('should parse a date time string using the format argument', () => {
    const dateTime = parseDateTime('20180101 000000', 'yyyyMMdd HHmmss', 'UTC')

    assert.strictEqual(dateTime.toUTC().toISO(), '2018-01-01T00:00:00.000Z')
  })
})
