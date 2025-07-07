import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'your-bucket-name';

export const uploadToS3 = async (file: Express.Multer.File): Promise<string> => {
  const key = `profile-images/${Date.now()}-${file.originalname}`;
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3Client.send(command);

  // Generate a signed URL that expires in 1 week
  const getCommand = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 604800 }); // 7 days
  return url;
}; 