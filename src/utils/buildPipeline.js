/**
 * Opaque version tag for the Modeler's ingestion + generator pipeline.
 *
 * Bump this whenever the ingestion/generator output format changes in a
 * way that makes previously-built workdir artifacts incompatible. The
 * cache-hit decision in OntologyContext.fetchOntology compares this
 * value against the one stored in build-meta.json; a mismatch forces a
 * full rebuild even if the source commit SHA is unchanged.
 */
export const PIPELINE_VERSION = "v2-1";
