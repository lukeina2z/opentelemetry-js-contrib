'use strict';

const { context, trace, ROOT_CONTEXT } = require('@opentelemetry/api');
const awsCalls = require('./awsS3Test');

async function doWork(parent, tracer) {
    // Start another span. In this example, the main method already started a
    // span, so that'll be the parent span, and this will be a child span.
    const ctx = trace.setSpan(context.active(), parent);
    const span = tracer.startSpan('xy-do-Work', undefined, ctx);

    // simulate some random work.
    for (let i = 0; i <= Math.floor(Math.random() * 40000000); i += 1) {
        // empty
    }

    // Set attributes to the span.
    span.setAttribute('color', 'green');

    // Annotate our span to capture metadata about our operation
    span.addEvent('invoking doWork');
    const newContext = trace.setSpan(context.active(), span);
    await context.with(newContext, async () => {
        await awsCalls.s3Call();
    });

    span.end();
}

module.exports = async function main() {
    const tracer = trace.getTracer('example-basic-tracer-node');
    // Create a span. A span must be closed.
    const parentSpan = tracer.startSpan('main');
    for (let i = 0; i < 1; i += 1) {
        await doWork(parentSpan, tracer);
    }
    // Be sure to end the span.
    parentSpan.end();
}

