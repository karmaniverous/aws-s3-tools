import { AwsS3Tools, s3Plugin } from './index';

describe('scaffolding', () => {
  it('exports expected public API symbols', () => {
    expect(AwsS3Tools).toBeTypeOf('function');
    expect(s3Plugin).toBeTypeOf('function');
  });
});
