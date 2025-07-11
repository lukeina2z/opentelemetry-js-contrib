const opentelemetry = require('@opentelemetry/api');
const {
    MeterProvider,
    PeriodicExportingMetricReader,
    ConsoleMetricExporter,
} = require('@opentelemetry/sdk-metrics');

const {
    defaultResource,
    resourceFromAttributes,
} = require('@opentelemetry/resources');

const {
    ATTR_SERVICE_NAME,
    ATTR_SERVICE_VERSION,
} = require('@opentelemetry/semantic-conventions');

const resource = defaultResource().merge(
    resourceFromAttributes({
        [ATTR_SERVICE_NAME]: 'service-name-here',
        [ATTR_SERVICE_VERSION]: '0.1.0',
    }),
);

const metricReader = new PeriodicExportingMetricReader({
    exporter: new ConsoleMetricExporter(),

    // Default is 60000ms (60 seconds). Set to 10 seconds for demonstrative purposes only.
    exportIntervalMillis: 10000,
});

const myServiceMeterProvider = new MeterProvider({
    resource: resource,
    readers: [metricReader],
});

// Set this MeterProvider to be global to the app being instrumented.
opentelemetry.metrics.setGlobalMeterProvider(myServiceMeterProvider);
