import { finished } from 'node:stream'
import type { Readable, Writable } from 'node:stream'

export default function waitFor(stream: Readable | Writable) {
  return new Promise<void>((resolve, reject) => {
    finished(stream, (err: unknown) => {
      if (err) {
        return reject(err)
      }

      resolve()
    })
  })
}
