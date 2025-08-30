"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToS3 = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});
const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'your-bucket-name';
const uploadToS3 = async (file) => {
    const key = `profile-images/${Date.now()}-${file.originalname}`;
    const command = new client_s3_1.PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
    });
    await s3Client.send(command);
    // Generate a signed URL that expires in 1 week
    const getCommand = new client_s3_1.PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });
    const url = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, getCommand, { expiresIn: 604800 }); // 7 days
    return url;
};
exports.uploadToS3 = uploadToS3;
