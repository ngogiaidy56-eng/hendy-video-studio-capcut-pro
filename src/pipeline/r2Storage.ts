import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || '',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export async function uploadToR2Cloud(fileName: string, fileBuffer: Buffer, mimeType: string): Promise<string> {
  const bucketName = process.env.R2_BUCKET_NAME || 'capcut-media-vault';
  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: fileBuffer,
      ContentType: mimeType,
    })
  );
  return `${process.env.R2_PUBLIC_DOMAIN}/${fileName}`;
}
