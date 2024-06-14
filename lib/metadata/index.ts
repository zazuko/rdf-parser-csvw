import type { DatasetCore } from '@rdfjs/types'
import rdf from '@rdfjs/dataset'
import { Factory } from '../Factory.js'
import Metadata from './Metadata.js'

interface Options {
  baseIRI: string
  factory: Factory
  timezone?: string
  strictPropertyEscaping?: boolean
}

export default function metadata(input: Metadata | DatasetCore | undefined, { baseIRI, factory, timezone, strictPropertyEscaping }: Options): Metadata {
  if (!input) {
    return new Metadata(rdf.dataset(), { baseIRI, factory, timezone, strictPropertyEscaping })
  }

  if ('match' in input) {
    return new Metadata(input, { baseIRI, factory, timezone, strictPropertyEscaping })
  }

  return input
}
