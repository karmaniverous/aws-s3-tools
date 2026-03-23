/**
 * Requirements addressed:
 * - Provide get-dotenv plugin mounted as `aws s3`.
 */

import { definePlugin } from '@karmaniverous/get-dotenv/cliHost';

/**
 * get-dotenv plugin that provides `aws s3` commands.
 *
 * Intended usage: mount under `awsPlugin().use(s3Plugin())`.
 */
export const s3Plugin = () => {
  const plugin = definePlugin({
    ns: 's3',
    setup(cli) {
      cli.description('AWS S3 helpers.');
    },
  });

  return plugin;
};
