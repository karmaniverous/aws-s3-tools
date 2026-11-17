/**
 * Builds the get-dotenv host options for the standalone S3 CLI.
 *
 * @packageDocumentation
 */

import type { CreateCliOptions } from '@karmaniverous/get-dotenv/cli';
import {
  awsPlugin,
  batchPlugin,
  cmdPlugin,
  initPlugin,
} from '@karmaniverous/get-dotenv/plugins';

import { s3Plugin } from '../../s3Plugin/s3Plugin';

/** Create CLI options with this package's host identity. */
export const createAwsS3CliOptions = (
  importMetaUrl: string,
): CreateCliOptions => ({
  alias: 'aws-s3-tools',
  importMetaUrl,
  compose: (program) =>
    program
      .use(
        cmdPlugin({ asDefault: true, optionAlias: '-c, --cmd <command...>' }),
      )
      .use(batchPlugin())
      .use(awsPlugin().use(s3Plugin()))
      .use(initPlugin()),
});
