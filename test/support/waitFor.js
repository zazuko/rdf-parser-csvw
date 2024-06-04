import { finished } from 'readable-stream'

export default function waitFor(stream) {
  return new Promise((resolve, reject) => {
    finished(stream, err => {
      if (err) {
        return reject(err)
      }

      resolve()
    })
  })
}
