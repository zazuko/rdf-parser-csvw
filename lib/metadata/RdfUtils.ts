import rdf from '@rdfjs/data-model'
import type { DatasetCore, NamedNode, Term } from '@rdfjs/types'

const ns = {
  first: rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#first'),
  nil: rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#nil'),
  rest: rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#rest'),
}

export default class RdfUtils {
  static parseArray(dataset: DatasetCore, root: Term | undefined | null, array?: Term[]) {
    array = array || []

    if (!root) {
      return array
    }

    const current = dataset.match(root)

    const firstTriple = [...current.match(null, ns.first)][0]

    if (firstTriple) {
      array.push(firstTriple.object)

      const restTriple = [...current.match(null, ns.rest)][0]

      if (restTriple && !restTriple.object.equals(ns.nil)) {
        RdfUtils.parseArray(dataset, restTriple.object, array)
      }
    }

    return array
  }

  static findNode(dataset: DatasetCore, root: Term | undefined | null, property: NamedNode) {
    return RdfUtils.findNodes(dataset, root, property).shift()
  }

  static findNodes(dataset: DatasetCore, root: Term | undefined | null, property: NamedNode) {
    if (!dataset) {
      return []
    }

    return [...dataset.match(root, property)].map(q => q.object)
  }

  static findValue(dataset: DatasetCore, root: Term | undefined | null, property: NamedNode) {
    return RdfUtils.findValues(dataset, root, property).shift()
  }

  static findValues(dataset: DatasetCore, root: Term | undefined | null, property: NamedNode) {
    return RdfUtils.findNodes(dataset, root, property).map(n => n.value)
  }
}
