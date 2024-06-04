import { DateTime, Zone } from 'luxon'

export default function parseDateTime(value: string, format: string | undefined, timezone: string | Zone | undefined) {
  if (format) {
    return DateTime.fromFormat(value, format, { zone: timezone })
  }

  return DateTime.fromISO(value, { zone: timezone }) ||
    DateTime.fromRFC2822(value, { zone: timezone })
}
