/**
 * get-dotenv-backed CLI runner, loaded dynamically by the dependency-free bin
 * launcher so a missing optional peer can be reported cleanly.
 *
 * @packageDocumentation
 */

import { createCli } from '@karmaniverous/get-dotenv/cli';

import { createAwsS3CliOptions } from './cliOptions';

/** Run the standalone AWS S3 CLI. */
export const run = async (): Promise<void> => {
  await createCli(createAwsS3CliOptions(import.meta.url))();
};
