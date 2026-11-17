import { describe, expect, it } from 'vitest';

import { assertLogger, AwsS3Tools } from './index';

describe('public API', () => {
  it('exports AwsS3Tools class', () => {
    expect(AwsS3Tools).toBeTypeOf('function');
  });

  it('exports the local logger validator', () => {
    expect(assertLogger).toBeTypeOf('function');
  });
});
