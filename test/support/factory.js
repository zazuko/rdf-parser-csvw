import Environment from '@rdfjs/environment'
import DataModelFactory from '@rdfjs/data-model/Factory.js'
import DatasetFactory from '@rdfjs/dataset/Factory.js'

export default new Environment([DataModelFactory, DatasetFactory])
