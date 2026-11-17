import { describe, expect, it, vi } from 'vitest';

import { createAwsS3CliOptions } from './cliOptions';

describe('createAwsS3CliOptions', () => {
  it('passes the host importMetaUrl to get-dotenv', () => {
    const importMetaUrl = 'file:///package/dist/cli/run.js';
    const options = createAwsS3CliOptions(importMetaUrl);

    expect(options.alias).toBe('aws-s3-tools');
    expect(options.importMetaUrl).toBe(importMetaUrl);
    expect(options.compose).toBeTypeOf('function');

    const program = { use: vi.fn() };
    program.use.mockReturnValue(program);

    expect(options.compose?.(program as never)).toBe(program);
    expect(program.use).toHaveBeenCalledTimes(4);
    expect(
      program.use.mock.calls.map(([plugin]) => (plugin as { ns?: unknown }).ns),
    ).toEqual(['cmd', 'batch', 'aws', 'init']);
  });
});
