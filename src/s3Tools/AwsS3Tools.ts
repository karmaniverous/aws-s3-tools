/**
 * Layer 1 — Runtime wrapper.
 *
 * Minimal scaffolding implementation to keep build/lint/typecheck happy.
 * Full functionality will be implemented in later checkpoints.
 */

import {
  GetObjectCommand,
  type GetObjectCommandInput,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  captureAwsSdkV3Client,
  type Logger,
  type XrayMode,
} from '@karmaniverous/aws-xray-tools';

export type AwsS3ToolsOptions = {
  clientConfig?: S3ClientConfig;
  logger?: Logger;
  xray?: {
    mode?: XrayMode;
    daemonAddress?: string;
  };
};

export class AwsS3Tools {
  public readonly client: S3Client;
  public readonly logger: Logger;
  public readonly xray: {
    mode: XrayMode;
    daemonAddress?: string;
  };

  public constructor(options: AwsS3ToolsOptions = {}) {
    const { clientConfig, logger, xray } = options;

    this.logger = logger ?? console;
    this.xray = {
      mode: xray?.mode ?? 'auto',
      daemonAddress: xray?.daemonAddress,
    };

    const baseClient = new S3Client({
      region: 'us-east-1',
      ...clientConfig,
    });

    this.client = captureAwsSdkV3Client(baseClient, {
      mode: this.xray.mode,
      daemonAddress: this.xray.daemonAddress,
      logger: this.logger,
    });
  }

  /**
   * Generate a pre-signed URL for GetObject.
   */
  public async signGetObjectUrl(
    input: GetObjectCommandInput,
    opts: { expiresIn?: number } = {},
  ): Promise<string> {
    const command = new GetObjectCommand(input);

    return getSignedUrl(this.client, command, {
      expiresIn: opts.expiresIn ?? 3600,
    });
  }
}
