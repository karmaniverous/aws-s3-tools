/**
 * Standalone bin entry. The get-dotenv-backed runner is dynamically imported
 * so the optional peer can fail with an actionable installation hint.
 *
 * @packageDocumentation
 */

import { launch } from './launcher';

await launch(() => import('./run'), {
  bin: 'aws-s3-tools',
  pkg: '@karmaniverous/aws-s3-tools',
});
