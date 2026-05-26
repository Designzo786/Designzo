import { S3Client, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";

async function testR2() {
  try {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      throw new Error("Missing R2 environment variables");
    }

    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    console.log(`Testing connection to bucket: ${bucketName}`);

    // Try listing objects
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 5
    });

    const listRes = await client.send(listCommand);
    console.log("SUCCESS: Connection established and bucket listed.");
    console.log(`Found ${listRes.Contents?.length || 0} objects.`);
    
    // Test uploading a small file
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: "test-file.txt",
      Body: "Hello R2!",
      ContentType: "text/plain"
    });
    
    await client.send(putCommand);
    console.log("SUCCESS: Test file uploaded successfully.");
    
    process.exit(0);
  } catch (error) {
    console.error("ERROR testing R2:", error);
    process.exit(1);
  }
}

testR2();
