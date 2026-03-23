/**
 * Requirements addressed:
 * - Provide `aws s3 presign`.
 * - Accept --bucket (config-composed default: plugin config → $S3_BUCKET_NAME).
 * - Accept --key (required object key).
 * - Accept --method get|put (default: 'get').
 * - Accept --expires-in <seconds> (default: 900).
 * - Accept --content-type (optional, used only for PUT).
 * - Resolve bucket via dotenvExpand against the merged process/ctx env.
 * - Delegate to AwsS3Tools.getPresignedGetUrl or getPresignedPutUrl.
 * - Print the signed URL.
 */

import {
  buildSpawnEnv,
  dotenvExpand,
  toNumber,
} from '@karmaniverous/get-dotenv';
import { readMergedOptions } from '@karmaniverous/get-dotenv/cliHost';
import { getAwsRegion } from '@karmaniverous/get-dotenv/plugins/aws';

import { AwsS3Tools } from '../../s3Tools/AwsS3Tools';
import type { S3PluginApi, S3PluginCli } from './types';

export const registerPresignCommand = ({
  cli,
  plugin,
}: {
  cli: S3PluginCli;
  plugin: S3PluginApi;
}): void => {
  const presign = cli
    .ns('presign')
    .description('Generate a pre-signed S3 URL for GET or PUT.');

  presign
    .addOption(
      plugin.createPluginDynamicOption(
        presign,
        '-b, --bucket <string>',
        (_helpCfg, pluginCfg) =>
          `S3 bucket name (supports $VAR expansion) (default: ${pluginCfg.bucket ?? '$S3_BUCKET_NAME'})`,
      ),
    )
    .requiredOption('-k, --key <string>', 'S3 object key (required)')
    .option(
      '-m, --method <string>',
      'HTTP method: get or put (default: get)',
      'get',
    )
    .option(
      '--expires-in <number>',
      'URL expiry in seconds (default: 900)',
      '900',
    )
    .option(
      '-c, --content-type <string>',
      'content type for PUT requests (optional)',
    )
    .action(async (opts) => {
      const logger = console;
      const ctx = cli.getCtx();
      const bag = readMergedOptions(presign);
      const cfg = plugin.readConfig(presign);

      const envRef = buildSpawnEnv(process.env, ctx.dotenv);

      const bucketRaw = opts.bucket ?? cfg.bucket ?? '$S3_BUCKET_NAME';
      const bucket = dotenvExpand(bucketRaw, envRef);

      if (!bucket) {
        throw new Error(
          'bucket is required. Pass --bucket or set $S3_BUCKET_NAME.',
        );
      }

      const method = opts.method.toLowerCase();
      if (method !== 'get' && method !== 'put') {
        throw new Error(`--method must be 'get' or 'put'. Got: '${method}'.`);
      }

      const expiresIn = toNumber(opts.expiresIn) ?? 900;
      const region = getAwsRegion(ctx);

      const tools = new AwsS3Tools({
        clientConfig: { ...(region ? { region } : {}), logger },
        xray: bag.debug ? 'off' : 'auto',
      });

      let url: string;

      if (method === 'put') {
        url = await tools.getPresignedPutUrl({
          bucket,
          key: opts.key,
          expiresIn,
          ...(opts.contentType ? { contentType: opts.contentType } : {}),
        });
      } else {
        url = await tools.getPresignedGetUrl({
          bucket,
          key: opts.key,
          expiresIn,
        });
      }

      logger.info(url);
    });
};
