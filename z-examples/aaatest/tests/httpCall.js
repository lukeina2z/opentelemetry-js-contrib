const http = require('http');

function pingWebSite() {
    console.log(`Ping web site.`);

    return new Promise((resolve, reject) => {
        const httpReq = http.get('http://aws.amazon.com', (httpResponse) => {
            console.log('Response status code:', httpResponse.statusCode);
            let data = `XRayTraceID: ${process.env["_X_AMZN_TRACE_ID"] || "Trace Id not available"}\r\n`;
            httpResponse.on('data', (chunk) => {
                data += chunk;  // Accumulate the chunks of data
            });

            httpResponse.on('end', () => {
                console.log(`Response body: ${data}`);
                resolve(data);
            });
        });

        httpReq.on('error', (error) => {
            console.error(`Error in outgoing-http-call:  ${err.message}`);
            reject(error);
        });
    });
};

module.exports = { pingWebSite };
