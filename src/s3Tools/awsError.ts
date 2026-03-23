/**
 * S3-specific AWS error classification.
 *
 * Follows the pattern from aws-cognito-tools `awsError.ts`.
 * Uses a factory to DRY the repeated name/__type matching pattern.
 */

interface AwsError {
  name?: string;
  __type?: string;
}

const isAwsError = (err: unknown): err is AwsError =>
  typeof err === 'object' && err !== null;

/**
 * Factory for AWS error type guards.
 *
 * Matches against both `err.name` and `err.__type` to handle
 * variations across AWS SDK error shapes.
 */
const isAwsErrorOfType =
  (type: string) =>
  (err: unknown): boolean => {
    if (!isAwsError(err)) return false;
    return err.name === type || err.__type === type;
  };

/**
 * Check if an error is a S3 `NoSuchKey` error.
 *
 * Used for GetObject/HeadObject on missing keys.
 */
export const isNoSuchKeyError = isAwsErrorOfType('NoSuchKey');

/**
 * Check if an error is a S3 `NoSuchBucket` error.
 *
 * Used for operations on non-existent buckets.
 */
export const isNoSuchBucketError = isAwsErrorOfType('NoSuchBucket');

/**
 * Check if an error is an `AccessDenied` error.
 *
 * Used for permission failures.
 */
export const isAccessDeniedError = isAwsErrorOfType('AccessDenied');
