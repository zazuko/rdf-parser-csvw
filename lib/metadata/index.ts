import type {  DatasetCore } from '@rdfjs/types'
import rdf from '@rdfjs/dataset'
import Metadata from './Metadata.js'
import {Factory} from '../Factory.js';

interface Options {
  baseIRI: string
  factory: Factory
  timezone?: string
}

export default function metadata(input: Metadata | DatasetCore | undefined, { baseIRI, factory, timezone }: Options): Metadata {
  if (!input) {
    return new Metadata(rdf.dataset(), { baseIRI, factory, timezone })
  }

  if ('match' in input) {
    return new Metadata(input, { baseIRI, factory, timezone })
  }

  return input
}
