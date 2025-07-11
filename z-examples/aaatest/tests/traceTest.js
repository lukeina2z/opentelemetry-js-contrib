const { context, diag, trace, DiagConsoleLogger, DiagLogLevel, SpanStatusCode } = require('@opentelemetry/api');

function createSpanWithException(tracer, context, SpanStatusCode) {
    const exSpan = tracer.startSpan("X-Exception-X-Span", context.active());
    try {
        throw new Error("This is a test error");
    } catch (ex) {
        if (ex instanceof Error) {
            exSpan.recordException(ex);
        }
        exSpan.setStatus({ code: SpanStatusCode.ERROR });
    }
    finally {
        exSpan.end();
    }
}

async function logWithSpan() {
    const otelLogs = require("@opentelemetry/api-logs");
    const logger = otelLogs.logs.getLogger('xyxyxy-span-logger', '1.0.0');

    await logger.emit({
        severityNumber: otelLogs.SeverityNumber.TRACE,
        severityText: 'TRACE',
        body: 'xyxyxy: log with span data'
    });
}

async function traceTestFn() {
    const tracer = trace.getTracer('my-service');
    await tracer.startActiveSpan(
        'XXX-ROOT',
        // undefined, // span options like kind or attributes could go here
        async (rootSpan) => {

            const myCtxRoot = context.active();
            // logWithSpan();
            const logTestFn = require('./logTest');
            logTestFn();

            createSpanWithException(tracer, context, SpanStatusCode);
            const topSpan = tracer.startSpan(
                'XXX-TOP-GUN',
                undefined, // span options like kind or attributes could go here
                context.active() // sets the parent context
            );

            await context.with(trace.setSpan(context.active(), topSpan), async () => {
                const basicTraceTest = require('./basicTrace');
                await basicTraceTest();
                console.log(`End of auto-inst testing.`);
            });

            topSpan.end();
            rootSpan.end();
            console.log(`End of span with call.`);
        }
    );
    console.log(`End of traceTestFn.`);
}

module.exports = traceTestFn;

