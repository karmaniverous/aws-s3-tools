/**
 * Requirements addressed:
 * - Provide get-dotenv plugin mounted as `aws s3` with commands:
 *   - `aws s3 list`
 *   - `aws s3 presign`
 * - Keep the plugin adapter thin: command registration is decomposed into
 *   dedicated modules; core behavior lives outside this file.
 */

import { definePlugin } from '@karmaniverous/get-dotenv/cliHost';

import { registerListCommand } from './commands/registerListCommand';
import { registerPresignCommand } from './commands/registerPresignCommand';
import { s3PluginConfigSchema } from './s3PluginConfig';

/**
 * get-dotenv plugin that provides `aws s3 list|presign`.
 *
 * Intended usage: mount under `awsPlugin().use(s3Plugin())`.
 */
export const s3Plugin = () => {
  const plugin = definePlugin({
    ns: 's3',
    configSchema: s3PluginConfigSchema,
    setup(cli) {
      cli.description('AWS S3 helpers.');
      registerListCommand({ cli, plugin });
      registerPresignCommand({ cli, plugin });
    },
  });

  return plugin;
};
