const{exec} = require("child_process");
const path = require("path");
const fs = require("fs");
const {} = require('@aws-sdk/client-s3');
const mime = require('mime-types');


const s3Client = new S3Client({ 
    region: '',
    credentials: {
        accessKeyId: '',
        secretAccessKey: ''
    }
});


const PROJECT_ID = process.env.PROJECT_ID


async function init(){
    console.log("Initializing build server...");
    const outDirPath = path.join(__dirname, "output");

    const p = exec(`cd ${outDirPath} && npm install && npm run build`)

    p.stdout.on("data", function(data){
        console.log(data.toString());
    });

    p.stderr.on("error", function(data){
        console.error('Error: ',data.toString());
    });

    p.on("close", async function(code){
        console.log(`Build process exited with code ${code}`);
        const distFolderPath = path.join(__dirname, "output", "dist");
        const distFolderContents = fs.readdirSync(distFolderPath, {recursive: true});

        for (const file of distFolderContents) {
            if (fs.lstatSync(filePath).isDirectory()) continue;
       

            const command = new PutObjectCommand({
                Bucket: '',
                Key: `__outputs/${PROJECT_ID}/${file}`,
                Body: fs.createReadStream(filePath),
                ContentType: mime.lookup(filePath)
            });

            await s3Client.send(command);
        }
        console.log('Done...')
    });
}
