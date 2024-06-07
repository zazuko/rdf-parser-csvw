import E from '@rdfjs/environment'
import DF from '@rdfjs/data-model/Factory.js'
import NamespaceFactory from '@rdfjs/namespace/Factory.js'
import { Environment } from '@rdfjs/environment/Environment.js'
import type { DataFactory } from '@rdfjs/types'
import ClownfaceFactory from 'clownface/Factory.js'

export type Factory = Environment<DataFactory | ClownfaceFactory>

export default new E([DF, ClownfaceFactory, NamespaceFactory])
