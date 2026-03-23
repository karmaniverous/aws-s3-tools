/**
 * Requirements addressed:
 * - Provide a public tools-style wrapper `AwsS3Tools`.
 * - Package consumers should not need to construct S3Client directly;
 *   they should construct `new AwsS3Tools(...)` and optionally import
 *   AWS SDK Commands for advanced operations.
 * - Expose the fully configured SDK client via `tools.client`.
 * - Support optional AWS X-Ray capture:
 *   - Default "auto": enable only when AWS_XRAY_DAEMON_ADDRESS is set.
 *   - In "auto", if the daemon address is set but aws-xray-sdk is missing,
 *     throw with a clear message.
 * - Enforce the get-dotenv minimal Logger contract (debug/info/warn/error);
 *   validate and throw (no polyfills or proxies).
 * - Provide composite convenience methods only (getPresignedGetUrl,
 *   getPresignedPutUrl, listAllObjects, deleteAllUnderPrefix).
 *   All single-operation calls go through tools.client.send().
 */

import {
  type _Object,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  captureAwsSdkV3Client,
  shouldEnableXray,
  type XrayMode,
  type XrayState,
} from '@karmaniverous/aws-xray-tools';
import { assertLogger, type Logger } from '@karmaniverous/get-dotenv';

/** Options for {@link AwsS3Tools} construction. */
export interface AwsS3ToolsOptions {
  /**
   * AWS SDK v3 S3 client config.
   *
   * Include advanced settings here (region, credentials, retry config, custom
   * endpoint, etc.). If a logger is provided, it must implement
   * debug/info/warn/error.
   */
  clientConfig?: S3ClientConfig;
  /**
   * AWS X-Ray capture mode.
   *
   * - `auto` (default): enable only when `AWS_XRAY_DAEMON_ADDRESS` is set.
   * - `on`: force enable (throws if daemon address is missing).
   * - `off`: disable.
   */
  xray?: XrayMode;
}

/** Options for {@link AwsS3Tools.getPresignedGetUrl}. */
export interface PresignedGetUrlOptions {
  /** S3 bucket name. */
  bucket: string;
  /** S3 object key. */
  key: string;
  /** URL expiry in seconds. Defaults to 900 (15 minutes). */
  expiresIn?: number;
}

/** Options for {@link AwsS3Tools.getPresignedPutUrl}. */
export interface PresignedPutUrlOptions {
  /** S3 bucket name. */
  bucket: string;
  /** S3 object key. */
  key: string;
  /** URL expiry in seconds. Defaults to 900 (15 minutes). */
  expiresIn?: number;
  /** Optional content type for the upload. */
  contentType?: string;
}

/** Options for {@link AwsS3Tools.listAllObjects}. */
export interface ListAllObjectsOptions {
  /** S3 bucket name. */
  bucket: string;
  /** Key prefix filter. */
  prefix?: string;
  /** Maximum total objects to return. When reached, pagination stops. */
  maxKeys?: number;
  /** Maximum number of pages to fetch. Safety valve against runaway requests. */
  maxPages?: number;
}

/** Options for {@link AwsS3Tools.deleteAllUnderPrefix}. */
export interface DeleteAllUnderPrefixOptions {
  /** S3 bucket name. */
  bucket: string;
  /**
   * Key prefix (required). Must be non-empty to prevent accidental
   * bucket-wide deletes.
   */
  prefix: string;
  /**
   * Safety flag. Must be `true` to proceed with deletion. Prevents
   * accidental calls in programmatic contexts.
   */
  force?: boolean;
}

/**
 * X-Ray-enabled AWS S3 wrapper.
 *
 * Provides composite convenience methods for operations that compose multiple
 * SDK calls. All single-operation S3 calls should use
 * {@link AwsS3Tools.client} directly with AWS SDK v3 Command classes.
 */
export class AwsS3Tools {
  /**
   * The effective SDK client (captured when X-Ray is enabled).
   *
   * Import AWS SDK `*Command` classes as needed and call `tools.client.send(...)`.
   */
  public readonly client: S3Client;
  /**
   * The effective client config used to construct the base client.
   *
   * Note: this may contain functions/providers (e.g., credential providers).
   */
  public readonly clientConfig: S3ClientConfig;
  /** The logger used by this wrapper and (when applicable) by the AWS client. */
  public readonly logger: Logger;
  /** Materialized X-Ray state (mode + enabled + daemonAddress when relevant). */
  public readonly xray: XrayState;

  /**
   * Construct an `AwsS3Tools` instance.
   *
   * @throws If `clientConfig.logger` is provided but does not implement
   * `debug`, `info`, `warn`, and `error`.
   * @throws If X-Ray capture is enabled but `aws-xray-sdk` is not installed.
   * @throws If X-Ray capture is requested but `AWS_XRAY_DAEMON_ADDRESS` is not set.
   */
  constructor({
    clientConfig = {},
    xray: xrayMode = 'auto',
  }: AwsS3ToolsOptions = {}) {
    const logger = assertLogger(clientConfig.logger ?? console);

    const effectiveClientConfig: S3ClientConfig = {
      ...clientConfig,
      logger,
    };

    const base = new S3Client(effectiveClientConfig);
    const daemonAddress = process.env.AWS_XRAY_DAEMON_ADDRESS;
    const enabled = shouldEnableXray(xrayMode, daemonAddress);
    const xrayState: XrayState = {
      mode: xrayMode,
      enabled,
      ...(enabled && daemonAddress ? { daemonAddress } : {}),
    };

    const effectiveClient = enabled
      ? captureAwsSdkV3Client(base, {
          mode: xrayMode,
          logger,
          daemonAddress,
        })
      : base;

    this.client = effectiveClient;
    this.clientConfig = effectiveClientConfig;
    this.logger = logger;
    this.xray = xrayState;
  }

  /**
   * Generate a pre-signed URL for GetObject (download).
   *
   * @param opts - Bucket, key, and optional expiry in seconds (default 900).
   * @returns Signed URL string.
   */
  async getPresignedGetUrl(opts: PresignedGetUrlOptions): Promise<string> {
    const { bucket, key, expiresIn = 900 } = opts;
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Generate a pre-signed URL for PutObject (upload).
   *
   * @param opts - Bucket, key, optional expiry in seconds (default 900),
   *   and optional content type.
   * @returns Signed URL string.
   */
  async getPresignedPutUrl(opts: PresignedPutUrlOptions): Promise<string> {
    const { bucket, key, expiresIn = 900, contentType } = opts;
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ...(contentType ? { ContentType: contentType } : {}),
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * List all objects under a prefix with auto-pagination and guardrails.
   *
   * @param opts - Options including guardrails: `maxKeys`, `maxPages`.
   * @returns Array of S3 `_Object` items.
   */
  async listAllObjects(opts: ListAllObjectsOptions): Promise<_Object[]> {
    const { bucket, prefix, maxKeys, maxPages } = opts;
    const allObjects: _Object[] = [];
    let continuationToken: string | undefined;
    let pageNumber = 0;

    do {
      pageNumber++;

      if (maxPages && pageNumber > maxPages) {
        this.logger.debug(
          `Reached maxPages limit (${String(maxPages)}). Stopping pagination.`,
        );
        break;
      }

      const res = await this.client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          ...(prefix ? { Prefix: prefix } : {}),
          ...(continuationToken
            ? { ContinuationToken: continuationToken }
            : {}),
        }),
      );

      const pageObjects = res.Contents ?? [];

      for (const obj of pageObjects) {
        allObjects.push(obj);
        if (maxKeys && allObjects.length >= maxKeys) {
          this.logger.debug(
            `Reached maxKeys limit (${String(maxKeys)}). Stopping pagination.`,
          );
          return allObjects;
        }
      }

      continuationToken = res.NextContinuationToken;
    } while (continuationToken);

    return allObjects;
  }

  /**
   * Delete all objects under a key prefix in batches.
   *
   * Lists all objects via {@link listAllObjects}, then batches through
   * DeleteObjectsCommand (max 1000 per call).
   *
   * @param opts - Bucket, prefix (must be non-empty), and force flag.
   * @returns Total number of objects deleted.
   *
   * @throws If `prefix` is an empty string (safety guard).
   * @throws If `force` is not `true`.
   */
  async deleteAllUnderPrefix(
    opts: DeleteAllUnderPrefixOptions,
  ): Promise<number> {
    const { bucket, prefix, force } = opts;

    if (!prefix) {
      throw new Error(
        'prefix must be a non-empty string to prevent accidental bucket-wide deletes.',
      );
    }

    if (!force) {
      throw new Error('force must be true to proceed with deletion.');
    }

    this.logger.info(`Listing objects under s3://${bucket}/${prefix}...`);

    const objects = await this.listAllObjects({ bucket, prefix });

    if (objects.length === 0) {
      this.logger.info('No objects found. Nothing to delete.');
      return 0;
    }

    this.logger.info(
      `Deleting ${String(objects.length)} object(s) under s3://${bucket}/${prefix}...`,
    );

    const BATCH_SIZE = 1000;
    let deleted = 0;

    for (let i = 0; i < objects.length; i += BATCH_SIZE) {
      const batch = objects.slice(i, i + BATCH_SIZE);
      const identifiers = batch
        .filter((o) => o.Key !== undefined)
        .map((o) => ({ Key: o.Key! }));

      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: identifiers },
        }),
      );

      deleted += identifiers.length;
      this.logger.info(
        `  Deleted batch of ${String(identifiers.length)} object(s). Total: ${String(deleted)}.`,
      );
    }

    this.logger.info(`Delete complete. ${String(deleted)} object(s) removed.`);
    return deleted;
  }
}
