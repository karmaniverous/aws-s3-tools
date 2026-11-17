/**
 * Main package entry, independent of the optional get-dotenv peer.
 *
 * @packageDocumentation
 */

export { assertLogger, type Logger } from './logger';
export type { ProcessEnv } from './processEnv';
export {
  AwsS3Tools,
  type AwsS3ToolsOptions,
  type DeleteAllUnderPrefixOptions,
  type ListAllObjectsOptions,
  type PresignedGetUrlOptions,
  type PresignedPutUrlOptions,
} from './s3Tools/AwsS3Tools';
