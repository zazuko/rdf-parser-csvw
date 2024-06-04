import { DateTime } from 'luxon'

export default function parseDateTime(value: string, format: string | undefined, timezone: string | undefined) {
  if (format) {
    return DateTime.fromFormat(value, format, { zone: timezone })
  }

  return DateTime.fromISO(value, { zone: timezone }) ||
    DateTime.fromRFC2822(value, { zone: timezone })
}
