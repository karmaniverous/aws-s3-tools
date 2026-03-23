/**
 * Requirements addressed:
 * - Provide `aws s3 list`.
 * - Accept --bucket (config-composed default: plugin config → $S3_BUCKET_NAME).
 * - Accept --prefix (optional key prefix filter).
 * - Use plugin dynamic options for config-composed defaults in help.
 * - Resolve bucket via dotenvExpand against the merged process/ctx env.
 * - Delegate to AwsS3Tools.listAllObjects.
 * - Print results as an aligned table (key, size, lastModified).
 */

import {
  buildSpawnEnv,
  dotenvExpand,
  silentLogger,
} from '@karmaniverous/get-dotenv';
import { readMergedOptions } from '@karmaniverous/get-dotenv/cliHost';
import { getAwsRegion } from '@karmaniverous/get-dotenv/plugins/aws';

import { AwsS3Tools } from '../../s3Tools/AwsS3Tools';
import type { S3PluginApi, S3PluginCli } from './types';

export const registerListCommand = ({
  cli,
  plugin,
}: {
  cli: S3PluginCli;
  plugin: S3PluginApi;
}): void => {
  const list = cli
    .ns('list')
    .description('List all objects in an S3 bucket/prefix.');

  list
    .addOption(
      plugin.createPluginDynamicOption(
        list,
        '-b, --bucket <string>',
        (_helpCfg, pluginCfg) =>
          `S3 bucket name (supports $VAR expansion) (default: ${pluginCfg.bucket ?? '$S3_BUCKET_NAME'})`,
      ),
    )
    .option('-p, --prefix <string>', 'key prefix filter (optional)')
    .action(async (opts) => {
      const logger = console;
      const ctx = cli.getCtx();
      const bag = readMergedOptions(list);
      const cfg = plugin.readConfig(list);

      const envRef = buildSpawnEnv(process.env, ctx.dotenv);

      const bucketRaw = opts.bucket ?? cfg.bucket ?? '$S3_BUCKET_NAME';
      const bucket = dotenvExpand(bucketRaw, envRef);

      if (!bucket) {
        throw new Error(
          'The --bucket option is required. Provide a bucket name via --bucket or set the $S3_BUCKET_NAME environment variable.',
        );
      }

      const region = getAwsRegion(ctx);
      const sdkLogger = bag.debug ? console : silentLogger;

      const tools = new AwsS3Tools({
        clientConfig: { ...(region ? { region } : {}), logger: sdkLogger },
      });

      logger.info(
        `Listing s3://${bucket}${opts.prefix ? `/${opts.prefix}` : ''}...`,
      );

      const objects = await tools.listAllObjects({
        bucket,
        prefix: opts.prefix,
      });

      if (objects.length === 0) {
        logger.info('No objects found.');
        return;
      }

      // Compute column widths
      const keyHeader = 'Key';
      const sizeHeader = 'Size';
      const dateHeader = 'LastModified';

      const rows = objects.map((o) => ({
        key: o.Key ?? '',
        size: String(o.Size ?? 0),
        date: o.LastModified ? o.LastModified.toISOString() : '',
      }));

      const keyWidth = Math.max(
        keyHeader.length,
        ...rows.map((r) => r.key.length),
      );
      const sizeWidth = Math.max(
        sizeHeader.length,
        ...rows.map((r) => r.size.length),
      );
      const dateWidth = Math.max(
        dateHeader.length,
        ...rows.map((r) => r.date.length),
      );

      const pad = (s: string, w: number) => s.padEnd(w);
      const sep = `${'-'.repeat(keyWidth)}  ${'-'.repeat(sizeWidth)}  ${'-'.repeat(dateWidth)}`;

      logger.info(
        `${pad(keyHeader, keyWidth)}  ${pad(sizeHeader, sizeWidth)}  ${pad(dateHeader, dateWidth)}`,
      );
      logger.info(sep);

      for (const row of rows) {
        logger.info(
          `${pad(row.key, keyWidth)}  ${pad(row.size, sizeWidth)}  ${pad(row.date, dateWidth)}`,
        );
      }

      logger.info(`\nTotal: ${String(objects.length)} object(s).`);
    });
};
