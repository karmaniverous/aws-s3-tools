/**
 * Requirements addressed:
 * - Use get-dotenv public types end-to-end (no casts) for command wiring.
 */

import type { GetDotenvOptions } from '@karmaniverous/get-dotenv';
import type {
  GetDotenvCliPublic,
  PluginWithInstanceHelpers,
} from '@karmaniverous/get-dotenv/cliHost';

import type { S3PluginConfig } from '../s3PluginConfig';

export type S3PluginCli = GetDotenvCliPublic<GetDotenvOptions>;
export type S3PluginApi = PluginWithInstanceHelpers<
  GetDotenvOptions,
  S3PluginConfig
>;
