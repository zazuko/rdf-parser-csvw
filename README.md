# rdf-parser-csvw

A CSV on the Web parser with [RDFJS Stream interface](https://github.com/rdfjs/representation-task-force/).

⛓️‍💥 Fork of rdf-ext/rdf-parser-csvw converted to ESM, including some tweaks and fixes
    
## Usage

The package exports the parser as a class, so an instance must be created before it can be used.
The `.import` method, as defined in the [RDFJS specification](http://rdf.js.org/#sink-interface), must be called to do the actual parsing.
It expects a stream of strings.
The method will return a stream which emits the parsed quads.

The constructor accepts an `options` object with the following optional keys:

- `metadata`: Use the metadata to convert the CSV to RDF.
  The metadata must be given as a Dataset using the CSV on the Web ontology.
  This options is required.
- `baseIRI`: Use the IRI to create Named Nodes.
  The value must be a String.
  This options is required.
- `factory`: Use an alternative RDFJS data factory.
  By default the [reference implementation](https://github.com/rdfjs/data-model/) us used.
- `timezone`: Use an alternative timezone to parse date and time values.
  The value must be given as a String as defined in the [Luxon documentation](https://moment.github.io/luxon/docs/manual/zones.html#specifying-a-zone).
  By default `local` will be used.
- `relaxColumnCount`: Don't throw an error if a row has a column count which doesn't match the headers column count.
- `skipLinesWithError`: Skip lines with error instead of throwing an error and stop parsing.
  This is mainly useful for debugging and should not be used in production environments.
- `skipEmptyLines`: Ignore empty lines in the CSV file.
- `trimHeaders`: Remove whitespace from the beginning and end of the column names.

It's also possible to pass options as second argument to the `.import` method.
The options from the constructor and the `.import` method will be merged together.

## Compliance with the CSVW specification

### Dates and times

- Date/Time formats are generally supported with possible issues around the timezone specifier `X` and the exact formatting of the timezone offset.
- [RFC2822 dates](https://datatracker.ietf.org/doc/html/rfc2822#page-14) are supported via explict 'RFC2822' datatype format (case insensitive).
- Time formats are implemented but the output will always be normalised to UTC. 
