import { DateTime } from 'luxon'

export default function parseDateTime(value: string, format: string | undefined, timezone: string | undefined) {
  let date

  if (format) {
    return DateTime.fromFormat(value, format, { zone: timezone })
  } else {
    date = DateTime.fromISO(value, { zone: timezone }) ||
        DateTime.fromRFC2822(value, { zone: timezone })
  }

  if (!date.isValid) {
    return null
  }

  return date
}
