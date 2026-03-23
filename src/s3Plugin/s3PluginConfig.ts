/**
 * Requirements addressed:
 * - Support safe plugin defaults from get-dotenv config under `plugins['aws/s3']`
 *   using a schema-typed config (no casts required at call sites).
 * - CLI flags override config defaults.
 */

import { z } from '@karmaniverous/get-dotenv/cliHost';

/**
 * Schema for `aws s3` plugin configuration.
 *
 * Loaded from get-dotenv config under `plugins['aws/s3']`.
 */
export const s3PluginConfigSchema = z.object({
  /**
   * Default S3 bucket name.
   *
   * Supports `$VAR` expansion at action time against `{ ...process.env, ...ctx.dotenv }`.
   */
  bucket: z.string().optional(),
});

export type S3PluginConfig = z.output<typeof s3PluginConfigSchema>;
