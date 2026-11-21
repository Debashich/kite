const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const mime = require("mime-types");

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  ...(process.env.AWS_ENDPOINT_URL && {
    endpoint: process.env.AWS_ENDPOINT_URL,
    forcePathStyle: true,
  }),
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const PROJECT_ID = process.env.PROJECT_ID;
const GIT_REPOSITORY__URL = process.env.GIT_REPOSITORY__URL;

async function init() {
  console.log("Initializing build server...");
  const outDirPath = path.join(__dirname, "output");

  const p = exec(
    `rm -rf ${outDirPath} && git clone ${GIT_REPOSITORY__URL} ${outDirPath} && cd ${outDirPath} && npm install && npm run build`
  );

  p.stdout.on("data", function (data) {
    console.log(data.toString());
  });

  p.stderr.on("data", function (data) {
    console.error("Build Log:", data.toString());
  });

  p.on("close", async function (code) {
    console.log(`Build process exited with code ${code}`);
    if (code !== 0) {
      process.exit(code);
    }

    const distFolderPath = path.join(__dirname, "output", "dist");
    const distFolderContents = fs.readdirSync(distFolderPath, { recursive: true });

    for (const file of distFolderContents) {
      const filePath = path.join(distFolderPath, file);
      if (fs.lstatSync(filePath).isDirectory()) continue;

      console.log(`Uploading ${file} to S3...`);
      const command = new PutObjectCommand({
        Bucket: "kite",
        Key: `__outputs/${PROJECT_ID}/${file}`,
        Body: fs.createReadStream(filePath),
        ContentType: mime.lookup(filePath) || "application/octet-stream",
      });

      await s3Client.send(command);
      console.log(`Uploaded ${file} to S3 successfully.`);
    }
    console.log("Done...");
  });
}

init();
