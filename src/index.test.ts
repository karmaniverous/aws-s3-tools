import { describe, expect, it } from 'vitest';

import { AwsS3Tools, s3Plugin } from './index';

describe('public API', () => {
  it('exports AwsS3Tools class', () => {
    expect(AwsS3Tools).toBeTypeOf('function');
  });

  it('exports s3Plugin function', () => {
    expect(s3Plugin).toBeTypeOf('function');
  });
});
