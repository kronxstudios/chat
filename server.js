const AWS = require('aws-sdk');
require('dotenv').config();

const s3 = new AWS.S3({
  endpoint: process.env.S3_ENDPOINT,
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
  region: process.env.S3_REGION || 'auto',
  s3ForcePathStyle: true,
  signatureVersion: 'v4'
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'securechat-files';

async function uploadFile(buffer, key) {
  await s3.upload({ Bucket: BUCKET_NAME, Key: key, Body: buffer }).promise();
  return key;
}

async function getFile(key) {
  const data = await s3.getObject({ Bucket: BUCKET_NAME, Key: key }).promise();
  return data.Body;
}

module.exports = { uploadFile, getFile };
