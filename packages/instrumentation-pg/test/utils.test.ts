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

import { context, trace } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import {
  InstrumentationConfig,
  SemconvStability,
} from '@opentelemetry/instrumentation';
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import * as assert from 'assert';
import * as pg from 'pg';
import { PgInstrumentationConfig } from '../src';
import { AttributeNames } from '../src/enums/AttributeNames';
import { PgClientExtended, PgPoolOptionsParams } from '../src/internal-types';
import * as utils from '../src/utils';
import { ATTR_SERVER_PORT } from '@opentelemetry/semantic-conventions';

const memoryExporter = new InMemorySpanExporter();

const CONFIG = {
  user: process.env.POSTGRES_USER || 'postgres',
  database: process.env.POSTGRES_DB || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT
    ? parseInt(process.env.POSTGRES_PORT, 10)
    : 54320,
};

const getLatestSpan = () => {
  const spans = memoryExporter.getFinishedSpans();
  return spans[spans.length - 1];
};

describe('utils.ts', () => {
  const client = new pg.Client(CONFIG) as PgClientExtended;
  let contextManager: AsyncLocalStorageContextManager;
  const provider = new BasicTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(memoryExporter)],
  });
  const tracer = provider.getTracer('external');

  const instrumentationConfig: PgInstrumentationConfig & InstrumentationConfig =
    {};

  beforeEach(() => {
    contextManager = new AsyncLocalStorageContextManager().enable();
    context.setGlobalContextManager(contextManager);
  });

  afterEach(() => {
    memoryExporter.reset();
    context.disable();
  });

  describe('.getQuerySpanName()', () => {
    const dummyQuery = {
      text: 'SELECT $1',
      values: ['hello'],
      name: 'select-placeholder-val',
    };

    it('uses prepared statement name when given, over query text', () => {
      assert.strictEqual(
        utils.getQuerySpanName('dbName', dummyQuery),
        'pg.query:select-placeholder-val dbName'
      );
    });

    it('falls back to parsing query text when no (valid) name is available', () => {
      assert.strictEqual(
        utils.getQuerySpanName('dbName', { ...dummyQuery, name: undefined }),
        'pg.query:SELECT dbName'
      );
    });

    it('normalizes operation names parsed from query text', () => {
      const queryUpperCase = { text: dummyQuery.text.toUpperCase() };
      const queryLowerCase = { text: dummyQuery.text.toLowerCase() };

      assert.strictEqual(
        utils.getQuerySpanName('dbName', queryUpperCase),
        utils.getQuerySpanName('dbName', queryLowerCase)
      );
    });

    it('ignores trailing semicolons when parsing operation names', () => {
      assert.strictEqual(
        utils.getQuerySpanName('dbName', { text: 'COMMIT;' }),
        'pg.query:COMMIT dbName'
      );
    });

    it('omits db name if missing', () => {
      assert.strictEqual(
        utils.getQuerySpanName(undefined, dummyQuery),
        'pg.query:select-placeholder-val'
      );
    });

    it('should omit all info if the queryConfig is invalid', () => {
      assert.strictEqual(
        utils.getQuerySpanName('db-name-ignored', undefined),
        'pg.query'
      );
    });
  });

  describe('.shouldSkipInstrumentation()', () => {
    it('returns false when requireParentSpan=false', async () => {
      assert.strictEqual(
        utils.shouldSkipInstrumentation(instrumentationConfig),
        false
      );
    });

    it('returns false requireParentSpan=true and there is a parent span', async () => {
      const parent = tracer.startSpan('parentSpan');
      context.with(trace.setSpan(context.active(), parent), () => {
        assert.strictEqual(
          utils.shouldSkipInstrumentation({
            ...instrumentationConfig,
            requireParentSpan: true,
          }),
          false
        );
      });
    });

    it('returns true when requireParentSpan=true and there is no parent span', async () => {
      assert.strictEqual(
        utils.shouldSkipInstrumentation({
          ...instrumentationConfig,
          requireParentSpan: true,
        }),
        true
      );
    });
  });

  describe('.handleConfigQuery()', () => {
    const queryConfig = {
      text: 'SELECT $1::text',
      values: ['0'],
    };

    it('does not track pg.values by default', async () => {
      const querySpan = utils.handleConfigQuery.call(
        client,
        tracer,
        instrumentationConfig,
        SemconvStability.STABLE,
        queryConfig
      );
      querySpan.end();

      const readableSpan = getLatestSpan();

      const pgValues = readableSpan.attributes[AttributeNames.PG_VALUES];
      assert.strictEqual(pgValues, undefined);
    });

    it('tracks pg.values if enabled explicitly', async () => {
      const extPluginConfig: PgInstrumentationConfig & InstrumentationConfig = {
        ...instrumentationConfig,
        enhancedDatabaseReporting: true,
      };
      const querySpan = utils.handleConfigQuery.call(
        client,
        tracer,
        extPluginConfig,
        SemconvStability.STABLE,
        queryConfig
      );
      querySpan.end();

      const readableSpan = getLatestSpan();

      const pgValues = readableSpan.attributes[AttributeNames.PG_VALUES];
      assert.deepStrictEqual(pgValues, ['0']);
    });
  });

  describe('.getSemanticAttributesFromConnection()', () => {
    it('should set port attribute to undefined when port is not an integer', () => {
      assert.strictEqual(
        utils.getSemanticAttributesFromConnection(
          {
            port: Infinity,
          },
          SemconvStability.STABLE
        )[ATTR_SERVER_PORT],
        undefined
      );
      assert.strictEqual(
        utils.getSemanticAttributesFromConnection(
          {
            port: -Infinity,
          },
          SemconvStability.STABLE
        )[ATTR_SERVER_PORT],
        undefined
      );
      assert.strictEqual(
        utils.getSemanticAttributesFromConnection(
          {
            port: NaN,
          },
          SemconvStability.STABLE
        )[ATTR_SERVER_PORT],
        undefined
      );
      assert.strictEqual(
        utils.getSemanticAttributesFromConnection(
          {
            port: 1.234,
          },
          SemconvStability.STABLE
        )[ATTR_SERVER_PORT],
        undefined
      );
    });

    it('should set port attribute when port is an integer', () => {
      assert.strictEqual(
        utils.getSemanticAttributesFromConnection(
          {
            port: 1234,
          },
          SemconvStability.STABLE
        )[ATTR_SERVER_PORT],
        1234
      );
      assert.strictEqual(
        utils.getSemanticAttributesFromConnection(
          {
            port: Number.MAX_VALUE,
          },
          SemconvStability.STABLE
        )[ATTR_SERVER_PORT],
        Number.MAX_VALUE
      );
    });
  });

  describe('.getPoolName()', () => {
    it('creation of pool name based on pool config', () => {
      const dummyPool: PgPoolOptionsParams = {
        host: 'host_name',
        port: 1234,
        user: 'username',
        database: 'database_name',
        namespace: 'database_namespace',
        idleTimeoutMillis: 10,
        maxClient: 5,
        max: 5,
        maxUses: 5,
        allowExitOnIdle: true,
        maxLifetimeSeconds: 10,
      };

      assert.strictEqual(
        utils.getPoolName(dummyPool),
        'host_name:1234/database_name'
      );
    });
  });

  describe('.parseAndMaskConnectionString()', () => {
    it('should remove all auth information from connection string', () => {
      const connectionString =
        'postgresql://user:password123@localhost:5432/dbname';
      assert.strictEqual(
        utils.parseAndMaskConnectionString(connectionString),
        'postgresql://localhost:5432/dbname'
      );
    });

    it('should remove username when no password is present', () => {
      const connectionString = 'postgresql://user@localhost:5432/dbname';
      assert.strictEqual(
        utils.parseAndMaskConnectionString(connectionString),
        'postgresql://localhost:5432/dbname'
      );
    });

    it('should preserve connection string when no auth is present', () => {
      const connectionString = 'postgresql://localhost:5432/dbname';
      assert.strictEqual(
        utils.parseAndMaskConnectionString(connectionString),
        'postgresql://localhost:5432/dbname'
      );
    });

    it('should preserve query parameters while removing auth', () => {
      const connectionString =
        'postgresql://user:pass@localhost/dbname?sslmode=verify-full&application_name=myapp';
      assert.strictEqual(
        utils.parseAndMaskConnectionString(connectionString),
        'postgresql://localhost/dbname?sslmode=verify-full&application_name=myapp'
      );
    });

    it('should handle invalid connection string', () => {
      const connectionString = 'not-a-valid-url';
      assert.strictEqual(
        utils.parseAndMaskConnectionString(connectionString),
        'postgresql://localhost:5432/'
      );
    });
  });
});
