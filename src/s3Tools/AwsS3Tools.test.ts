import {
  type _Object,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AwsS3Tools } from './AwsS3Tools';

const noopLogger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

// Mock aws-xray-tools
vi.mock('@karmaniverous/aws-xray-tools', () => ({
  captureAwsSdkV3Client: vi.fn((client: unknown) => client),
  shouldEnableXray: vi.fn(() => false),
}));

// Mock s3-request-presigner
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(() =>
    Promise.resolve('https://mock-presigned-url.example.com'),
  ),
}));

describe('AwsS3Tools', () => {
  describe('constructor', () => {
    it('creates instance with default options (auto xray, console logger)', () => {
      const tools = new AwsS3Tools({
        clientConfig: { logger: noopLogger },
      });
      expect(tools.client).toBeDefined();
      expect(tools.clientConfig).toBeDefined();
      expect(tools.logger).toBeDefined();
      expect(tools.xray).toBeDefined();
      expect(tools.xray.mode).toBe('auto');
      expect(tools.xray.enabled).toBe(false);
    });

    it('creates instance with xray: off — client is plain S3Client', () => {
      const tools = new AwsS3Tools({
        clientConfig: { logger: noopLogger },
        xray: 'off',
      });
      expect(tools.xray.mode).toBe('off');
      expect(tools.xray.enabled).toBe(false);
    });

    it('creates instance with xray: on and daemon address — client is captured', async () => {
      const xrayTools = await import('@karmaniverous/aws-xray-tools');
      vi.mocked(xrayTools.shouldEnableXray).mockReturnValueOnce(true);
      vi.mocked(xrayTools.captureAwsSdkV3Client).mockImplementationOnce(
        (client: object) => client,
      );
      process.env.AWS_XRAY_DAEMON_ADDRESS = '127.0.0.1:2000';

      const tools = new AwsS3Tools({
        clientConfig: { logger: noopLogger },
        xray: 'on',
      });
      expect(tools.xray.mode).toBe('on');
      expect(tools.xray.enabled).toBe(true);
      expect(tools.xray.daemonAddress).toBe('127.0.0.1:2000');
      expect(xrayTools.captureAwsSdkV3Client).toHaveBeenCalled();

      delete process.env.AWS_XRAY_DAEMON_ADDRESS;
    });

    it('passes custom clientConfig through to effectiveClientConfig', () => {
      const tools = new AwsS3Tools({
        clientConfig: { logger: noopLogger, region: 'eu-west-1' },
      });
      expect(tools.clientConfig.region).toBe('eu-west-1');
      expect(tools.clientConfig.logger).toBe(tools.logger);
    });

    it('uses console when no logger provided in clientConfig', () => {
      const tools = new AwsS3Tools({});
      expect(tools.logger).toBeDefined();
      expect(typeof tools.logger.info).toBe('function');
    });
  });

  describe('getPresignedGetUrl', () => {
    let tools: AwsS3Tools;
    let mockSend: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      tools = new AwsS3Tools({ clientConfig: { logger: noopLogger } });
      mockSend = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      (tools.client as any).send = mockSend;
    });

    it('returns presigned GET URL with default expiry (900s)', async () => {
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      vi.mocked(getSignedUrl).mockResolvedValueOnce(
        'https://get-url.example.com',
      );

      const url = await tools.getPresignedGetUrl({
        bucket: 'my-bucket',
        key: 'path/to/file.txt',
      });

      expect(url).toBe('https://get-url.example.com');
      expect(getSignedUrl).toHaveBeenCalledWith(
        tools.client,
        expect.any(GetObjectCommand),
        { expiresIn: 900 },
      );
    });

    it('returns presigned GET URL with custom expiry', async () => {
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      vi.mocked(getSignedUrl).mockResolvedValueOnce(
        'https://get-url.example.com',
      );

      await tools.getPresignedGetUrl({
        bucket: 'my-bucket',
        key: 'path/to/file.txt',
        expiresIn: 3600,
      });

      expect(getSignedUrl).toHaveBeenCalledWith(
        tools.client,
        expect.any(GetObjectCommand),
        { expiresIn: 3600 },
      );
    });

    it('returns presigned PUT URL with default expiry (900s)', async () => {
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      vi.mocked(getSignedUrl).mockResolvedValueOnce(
        'https://put-url.example.com',
      );

      const url = await tools.getPresignedPutUrl({
        bucket: 'my-bucket',
        key: 'path/to/upload.txt',
      });

      expect(url).toBe('https://put-url.example.com');
      expect(getSignedUrl).toHaveBeenCalledWith(
        tools.client,
        expect.any(PutObjectCommand),
        { expiresIn: 900 },
      );
    });

    it('returns presigned PUT URL with contentType', async () => {
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      vi.mocked(getSignedUrl).mockResolvedValueOnce(
        'https://put-url.example.com',
      );

      await tools.getPresignedPutUrl({
        bucket: 'my-bucket',
        key: 'path/to/upload.txt',
        contentType: 'image/jpeg',
      });

      const callArgs = vi.mocked(getSignedUrl).mock.calls.at(-1);
      expect(callArgs?.[1]).toBeInstanceOf(PutObjectCommand);
      const cmd = callArgs?.[1] as PutObjectCommand;
      expect(cmd.input.ContentType).toBe('image/jpeg');
    });
  });

  describe('listAllObjects', () => {
    let tools: AwsS3Tools;
    let mockSend: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      tools = new AwsS3Tools({ clientConfig: { logger: noopLogger } });
      mockSend = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      (tools.client as any).send = mockSend;
    });

    it('returns all objects from a single page (no ContinuationToken)', async () => {
      mockSend.mockResolvedValueOnce({
        Contents: [{ Key: 'file1.txt' }, { Key: 'file2.txt' }] as _Object[],
      });

      const objects = await tools.listAllObjects({ bucket: 'my-bucket' });
      expect(objects).toHaveLength(2);
      expect(mockSend).toHaveBeenCalledOnce();
      expect(mockSend.mock.calls[0]?.[0]).toBeInstanceOf(ListObjectsV2Command);
    });

    it('paginates across multiple pages using ContinuationToken', async () => {
      mockSend
        .mockResolvedValueOnce({
          Contents: [{ Key: 'file1.txt' }] as _Object[],
          NextContinuationToken: 'token-1',
        })
        .mockResolvedValueOnce({
          Contents: [{ Key: 'file2.txt' }] as _Object[],
        });

      const objects = await tools.listAllObjects({ bucket: 'my-bucket' });
      expect(objects).toHaveLength(2);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('respects maxKeys cap and stops early', async () => {
      mockSend.mockResolvedValueOnce({
        Contents: [
          { Key: 'file1.txt' },
          { Key: 'file2.txt' },
          { Key: 'file3.txt' },
        ] as _Object[],
        NextContinuationToken: 'token-1',
      });

      const objects = await tools.listAllObjects({
        bucket: 'my-bucket',
        maxKeys: 2,
      });
      expect(objects).toHaveLength(2);
      // Should not fetch next page
      expect(mockSend).toHaveBeenCalledOnce();
    });

    it('respects maxPages cap and stops early', async () => {
      mockSend
        .mockResolvedValueOnce({
          Contents: [{ Key: 'file1.txt' }] as _Object[],
          NextContinuationToken: 'token-1',
        })
        .mockResolvedValueOnce({
          Contents: [{ Key: 'file2.txt' }] as _Object[],
          NextContinuationToken: 'token-2',
        });

      const objects = await tools.listAllObjects({
        bucket: 'my-bucket',
        maxPages: 2,
      });
      expect(objects).toHaveLength(2);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('returns empty array for empty bucket', async () => {
      mockSend.mockResolvedValueOnce({ Contents: [] });

      const objects = await tools.listAllObjects({ bucket: 'my-bucket' });
      expect(objects).toHaveLength(0);
      expect(mockSend).toHaveBeenCalledOnce();
    });
  });

  describe('deleteAllUnderPrefix', () => {
    let tools: AwsS3Tools;
    let mockSend: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      tools = new AwsS3Tools({ clientConfig: { logger: noopLogger } });
      mockSend = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      (tools.client as any).send = mockSend;
    });

    it('deletes objects across multiple batches', async () => {
      // First call is listAllObjects (single page with 3 objects)
      mockSend
        .mockResolvedValueOnce({
          Contents: [
            { Key: 'prefix/file1.txt' },
            { Key: 'prefix/file2.txt' },
            { Key: 'prefix/file3.txt' },
          ] as _Object[],
        })
        // DeleteObjects
        .mockResolvedValueOnce({ Deleted: [] });

      const count = await tools.deleteAllUnderPrefix({
        bucket: 'my-bucket',
        prefix: 'prefix/',
        force: true,
      });
      expect(count).toBe(3);
      const deleteCalls = mockSend.mock.calls.filter(
        (call: unknown[]) => call[0] instanceof DeleteObjectsCommand,
      );
      expect(deleteCalls).toHaveLength(1);
    });

    it('throws when prefix is empty string', async () => {
      await expect(
        tools.deleteAllUnderPrefix({
          bucket: 'my-bucket',
          prefix: '',
          force: true,
        }),
      ).rejects.toThrow('prefix must be a non-empty string');
    });

    it('returns 0 when no objects found under prefix', async () => {
      mockSend.mockResolvedValueOnce({ Contents: [] });

      const count = await tools.deleteAllUnderPrefix({
        bucket: 'my-bucket',
        prefix: 'empty/',
        force: true,
      });
      expect(count).toBe(0);
      const deleteCalls = mockSend.mock.calls.filter(
        (call: unknown[]) => call[0] instanceof DeleteObjectsCommand,
      );
      expect(deleteCalls).toHaveLength(0);
    });

    it('throws when force is not true', async () => {
      await expect(
        tools.deleteAllUnderPrefix({
          bucket: 'my-bucket',
          prefix: 'prefix/',
          force: false,
        }),
      ).rejects.toThrow('force must be true');
    });
  });
});
