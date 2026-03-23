/**
 * This is the main entry point for the library.
 *
 * @packageDocumentation
 */

/**
 * Requirements addressed:
 * - Export a public `AwsS3Tools`.
 * - Export the get-dotenv `s3Plugin` for mounting under `aws`.
 */

// Layer 1 — Runtime (used by Lambda handlers)
export {
  AwsS3Tools,
  type AwsS3ToolsOptions,
  type DeleteAllUnderPrefixOptions,
  type ListAllObjectsOptions,
  type PresignedGetUrlOptions,
  type PresignedPutUrlOptions,
} from './s3Tools/AwsS3Tools';

// Layer 2 — Plugin (used by smoz CLI composition)
export { s3Plugin } from './s3Plugin/s3Plugin';
