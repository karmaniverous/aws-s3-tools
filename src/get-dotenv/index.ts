/**
 * get-dotenv integration entry point. Import this optional-peer boundary from
 * `@karmaniverous/aws-s3-tools/get-dotenv`.
 *
 * @packageDocumentation
 */

export { s3Plugin } from '../s3Plugin/s3Plugin';
export {
  type S3PluginConfig,
  s3PluginConfigSchema,
} from '../s3Plugin/s3PluginConfig';
