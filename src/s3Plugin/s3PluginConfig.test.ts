import { describe, expect, it } from 'vitest';

import { s3PluginConfigSchema } from './s3PluginConfig';

describe('s3PluginConfigSchema', () => {
  it('parses valid config with bucket', () => {
    const result = s3PluginConfigSchema.parse({ bucket: 'my-bucket' });
    expect(result.bucket).toBe('my-bucket');
  });

  it('parses empty config (all fields optional)', () => {
    const result = s3PluginConfigSchema.parse({});
    expect(result.bucket).toBeUndefined();
  });

  it('parses config with $VAR bucket (string passthrough)', () => {
    const result = s3PluginConfigSchema.parse({ bucket: '$S3_BUCKET_NAME' });
    expect(result.bucket).toBe('$S3_BUCKET_NAME');
  });

  it('parses config with complex $VAR bucket expression', () => {
    const result = s3PluginConfigSchema.parse({
      bucket: '$MY_BUCKET:default-bucket',
    });
    expect(result.bucket).toBe('$MY_BUCKET:default-bucket');
  });

  it('rejects non-string bucket', () => {
    expect(() => s3PluginConfigSchema.parse({ bucket: 42 })).toThrow();
  });
});
