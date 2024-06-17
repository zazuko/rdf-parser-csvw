# @zazuko/rdf-parser-csvw

## 0.17.0

### Minor Changes

- 815e65d: This version attempts to improve the support for date/time formats
- fc3547d: Require the RDF/JS factory to be an environment with `clownface`
- 815e65d: When producing `xsd:dateTime(Offset)` literals, will remove the milliseconds
- 815e65d: Dates in the RFC2822 format are no longer implicitly supported. Use custom datatype `format = 'RFC2822'` to interpret cell values as timestamps in that format

## 0.16.5

### Patch Changes

- e63e327: Given an invalid date, the would produce unexpected literals `"Invalid Date"^^xsd:dateTime`

## 0.16.4

### Patch Changes

- b539998: Include types for `uri-templates`

## 0.16.3

### Patch Changes

- 320b4e0: Allow `DatasetCore` passed to `ObjectParserTransform`

## 0.16.2

### Patch Changes

- 36d0da8: `skipEmptyLines` was still not there

## 0.16.1

### Patch Changes

- 6ef1200: The `skipEmptyLines` parameter was missing at the top interface level

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
