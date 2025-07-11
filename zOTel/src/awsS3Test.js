/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

async function s3Call() {
    const ret = await handler();
    console.log(`s3Call: ${ret}`);
}

module.exports = {
    s3Call,
}

const handler = async () => {
    let s3CmdSucceeded = true;
    let buckets = '';
    console.log('sdkv3: handling /aws-sdk-call with S3 call.');
    try {
        const s3Client = new S3Client();
        const command = new ListBucketsCommand({});
        await s3Client.send(command)
            .then(function (data) {
                s3CmdSucceeded = true;
                console.log(`${process.env['_X_AMZN_TRACE_ID'] || 'Trace Id not available'}`);
                console.log(data.Buckets);
                buckets = data.Buckets.map((bucket) => bucket.Name).join(', ');
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
        'allBuckets': buckets
    };
}