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

'use strict';

const { context, trace } = require('@opentelemetry/api');
const awsCalls = require('./awsS3Test');

const http = require('http');

function pingWebSite() {
    console.log('Ping web site.');

    return new Promise((resolve, reject) => {
        const httpReq = http.get('http://aws.amazon.com', (httpResponse) => {
            console.log('Response status code:', httpResponse.statusCode);
            let data = `XRayTraceID: ${process.env['_X_AMZN_TRACE_ID'] || 'Trace Id not available'}\r\n`;
            httpResponse.on('data', (chunk) => {
                data += chunk;  // Accumulate the chunks of data
            });

            httpResponse.on('end', () => {
                console.log(`Response body: ${data}`);
                resolve(data);
            });
        });

        httpReq.on('error', (error) => {
            console.error(`Error in outgoing-http-call:  ${error.message}`);
            reject(error);
        });
    });
};


// async function doWork(parent, tracer) {
//     // Start another span. In this example, the main method already started a
//     // span, so that'll be the parent span, and this will be a child span.
//     const ctx = trace.setSpan(context.active(), parent);
//     const span = tracer.startSpan('xy-do-Work', undefined, ctx);

//     // simulate some random work.
//     for (let i = 0; i <= Math.floor(Math.random() * 40000000); i += 1) {
//         // empty
//     }

//     // Set attributes to the span.
//     span.setAttribute('color', 'green');

//     // Annotate our span to capture metadata about our operation
//     span.addEvent('invoking doWork');
//     const newContext = trace.setSpan(context.active(), span);
//     await context.with(newContext, async () => {
//         await pingWebSite();
//         await awsCalls.s3Call();
//     });
//     span.end();
// }

module.exports = async function main() {
    const tracer = trace.getTracer('example-basic-tracer-node');
    // Create a span. A span must be closed.
    const rootSpan = tracer.startSpan('NodeJs-OTel-Root-Span');
    // for (let i = 0; i < 1; i += 1) {
    //     await doWork(parentSpan, tracer);
    // }

    const newContext = trace.setSpan(context.active(), rootSpan);
    await context.with(newContext, async () => {
        await pingWebSite();
        await awsCalls.s3Call();
    });

    // Be sure to end the span.
    rootSpan.end();
}

