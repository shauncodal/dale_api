import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../lib/config';

function getS3Client(): S3Client | null {
  if (!config.s3RecordingsBucket) return null;
  return new S3Client({
    region: config.awsRegion,
    ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {}
      : { credentials: undefined }), // Uses default credential chain (env, IAM role, etc.)
  });
}

/**
 * Upload a recording to S3 at path: {tenantId}/{userId}/{coachId}/{filename}
 */
export async function uploadRecording(
  buffer: Buffer,
  key: string,
  contentType = 'video/webm'
): Promise<{ bucket: string; key: string } | null> {
  const client = getS3Client();
  if (!client || !config.s3RecordingsBucket) return null;

  await client.send(
    new PutObjectCommand({
      Bucket: config.s3RecordingsBucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return { bucket: config.s3RecordingsBucket, key };
}

/**
 * Generate a presigned URL for playback (expires in 1 hour).
 */
export async function getRecordingPlaybackUrl(
  bucket: string,
  key: string,
  expiresIn = 3600
): Promise<string | null> {
  const client = getS3Client();
  if (!client) return null;

  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const url = await getSignedUrl(client, command, { expiresIn });
  return url;
}

export function buildRecordingKey(
  tenantId: string,
  userId: string,
  coachId: string,
  sessionId: string,
  extension = 'webm'
): string {
  const timestamp = Date.now();
  const safeId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${tenantId}/${userId}/${coachId}/${safeId}-${timestamp}.${extension}`;
}
