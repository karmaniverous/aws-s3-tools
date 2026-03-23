import { describe, expect, it } from 'vitest';

import {
  isAccessDeniedError,
  isNoSuchBucketError,
  isNoSuchKeyError,
} from './awsError';

describe('awsError', () => {
  describe('isNoSuchKeyError', () => {
    it('returns true for name match', () => {
      expect(isNoSuchKeyError({ name: 'NoSuchKey' })).toBe(true);
    });

    it('returns true for __type match', () => {
      expect(isNoSuchKeyError({ __type: 'NoSuchKey' })).toBe(true);
    });

    it('returns false for non-matching error', () => {
      expect(isNoSuchKeyError({ name: 'NoSuchBucket' })).toBe(false);
    });

    it('returns false for non-objects', () => {
      expect(isNoSuchKeyError('string')).toBe(false);
      expect(isNoSuchKeyError(null)).toBe(false);
      expect(isNoSuchKeyError(undefined)).toBe(false);
    });
  });

  describe('isNoSuchBucketError', () => {
    it('returns true for name match', () => {
      expect(isNoSuchBucketError({ name: 'NoSuchBucket' })).toBe(true);
    });

    it('returns true for __type match', () => {
      expect(isNoSuchBucketError({ __type: 'NoSuchBucket' })).toBe(true);
    });

    it('returns false for other errors', () => {
      expect(isNoSuchBucketError({ name: 'NoSuchKey' })).toBe(false);
    });
  });

  describe('isAccessDeniedError', () => {
    it('returns true for name match', () => {
      expect(isAccessDeniedError({ name: 'AccessDenied' })).toBe(true);
    });

    it('returns true for __type match', () => {
      expect(isAccessDeniedError({ __type: 'AccessDenied' })).toBe(true);
    });

    it('returns false for other errors', () => {
      expect(isAccessDeniedError({ name: 'NoSuchKey' })).toBe(false);
    });
  });
});
