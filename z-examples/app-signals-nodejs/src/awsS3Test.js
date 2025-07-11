const { S3Client, ListBucketsCommand } = require("@aws-sdk/client-s3");

async function s3Call() {
    const ret = await handler();
    console.log(`s3Call: ${ret}`);
}

module.exports = {
    s3Call,
}

const handler = async () => {
    let s3CmdSucceeded = true;
    let buckets = "";
    console.log(`sdkv3: handling /aws-sdk-call with S3 call.`);
    try {
        const s3Client = new S3Client();
        const command = new ListBucketsCommand({});
        await s3Client.send(command)
            .then(function (data) {
                s3CmdSucceeded = true;
                console.log(`${process.env["_X_AMZN_TRACE_ID"] || "Trace Id not available"}`);
                console.log(data.Buckets);
                buckets = data.Buckets.map((bucket) => bucket.Name).join(", ");
            })
            .catch(function (err) {
                console.error(`Error in aws-sdk-call:  ${err.message}`);
                s3CmdSucceeded = false;
            });
    }
    catch (err) {
        console.error(`error found in S3 call: ${err?.message || err}`);
        s3CmdSucceeded = false;
    }
    return {
        'response': s3CmdSucceeded,
        "allBuckets": buckets
    };
}