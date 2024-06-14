import { DateTime } from 'luxon'

export default function parseDateTime(original: string, format: string, zone: string | undefined) {
  let date
  let value = original

  if (format.toLowerCase() === 'rfc2822') {
    date = DateTime.fromRFC2822(value, { zone })
  } else {
    const timezoneMarkerMatched = /(?<format>[^Xx]+)(?: ?(?<timezoneMarker>(X{1,3}|x{1,3})))$/.exec(format)
    if (timezoneMarkerMatched?.groups) {
      if (timezoneMarkerMatched.groups.timezoneMarker) {
        format = format.replace(timezoneMarkerMatched.groups.timezoneMarker, 'ZZZ')
        value = value.replace(/Z$/, '+00:00')
      }
    }

    if (!zone) {
      const offset = value
        .replace(/.*([+-])(\d{2})(:?)(\d{2})?$/, '$1$2:$4')

      if (offset !== value) {
        zone = `UTC${offset}`
      }
    }
    if (!zone) {
      zone = 'UTC'
    }

    date = DateTime.fromFormat(value, format, { zone })
    if (!date.isValid) {
      date = DateTime.fromFormat(value, format.replace('ZZZ', 'Z'), { zone })
    }

    if (!zone && !original.match(/(Z|[+-]\d{2}:?(\d{2})?)$/)) {
      const offset = value
        .replace(/.*([+-])(\d{2})(:?(\d{2})?)$/, '$1$2')

      date = date.setZone(`UTC${offset}`)
    }
  }

  if (!date.isValid) {
    return null
  }

  return date
}
