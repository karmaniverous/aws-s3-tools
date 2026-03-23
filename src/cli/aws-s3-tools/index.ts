/**
 * Standalone CLI for aws-s3-tools.
 *
 * Embeds get-dotenv host with s3Plugin pre-mounted under awsPlugin.
 */

import { createCli } from '@karmaniverous/get-dotenv/cli';
import {
  awsPlugin,
  batchPlugin,
  cmdPlugin,
  initPlugin,
} from '@karmaniverous/get-dotenv/plugins';

import { s3Plugin } from '../../s3Plugin/s3Plugin';

await createCli({
  alias: 'aws-s3-tools',
  compose: (program) =>
    program
      .use(
        cmdPlugin({ asDefault: true, optionAlias: '-c, --cmd <command...>' }),
      )
      .use(batchPlugin())
      .use(awsPlugin().use(s3Plugin()))
      .use(initPlugin()),
})();
