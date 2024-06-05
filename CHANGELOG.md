# @zazuko/rdf-parser-csvw

## 0.16.0

### Minor Changes

- ce15e5b: Update code to ESM
- 3f35bad: By default, the parser now skip empty lines (re zazuko/cube-creator#1495). This behavior can be configured with a new option `skipEmptyLines`

### Patch Changes

- 9555d76: Version forked from rdf-ext
- 9607d66: Invalid literals would have sometimes been produced where a datatype URI was used a language tag
- ce15e5b: Added TypeScript declarations
- 26e76ec: Add an option to trim column names (re zazuko/cube-creator#1232)
- ce15e5b: Update RDF/JS data model to v2
- ce15e5b: Updated readable-stream to v4
