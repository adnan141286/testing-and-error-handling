import request from 'supertest';
import express, { Express } from 'express';
import nock from 'nock';
import { createGasRouter } from '../../src/routes/gas.routes';
import { CacheManager } from '../../src/services/cache/cacheManager';
import { MemoryCache } from '../../src/services/cache/memoryCache';
import { EthRpcClient } from '../../src/services/providers/ethRpc.client';
import { createErrorHandler } from '../../src/middleware/errorHandler';

describe('Gas Route (GET /api/gas)', (): void => {
  let app: Express;
  let cacheManager: CacheManager;
  let ethRpcClient: EthRpcClient;
  const rpcUrl = 'https://ethereum-rpc.publicnode.com';

  beforeEach(async (): Promise<void> => {
    nock.cleanAll();
    cacheManager = new CacheManager({ memory: new MemoryCache(60) });
    await cacheManager.clear();
    ethRpcClient = new EthRpcClient({ rpcUrl, cacheManager });

    app = express();
    app.use('/api/gas', createGasRouter({ ethRpcClient, cacheManager }));
    app.use(createErrorHandler());
  });

  afterAll((): void => {
    nock.restore();
  });

  it('fetches fresh gas price and returns formatted Gwei', async (): Promise<void> => {
    nock(rpcUrl).post('/').reply(200, {
      jsonrpc: '2.0',
      id: 1,
      result: '0x2cb417800', // 12 Gwei
    });

    const res = await request(app).get('/api/gas');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.gwei).toBe(12);
    expect(res.body.formatted).toBe('12 Gwei');
    expect(res.body.cached).toBe(false);
    expect(res.body.stale).toBe(false);
    expect(res.body.source).toBe('Ethereum RPC');
  });

  it('serves cached gas price on second request', async (): Promise<void> => {
    nock(rpcUrl).post('/').once().reply(200, {
      jsonrpc: '2.0',
      id: 1,
      result: '0x2cb417800',
    });

    const first = await request(app).get('/api/gas');
    expect(first.body.cached).toBe(false);

    const second = await request(app).get('/api/gas');
    expect(second.status).toBe(200);
    expect(second.body.cached).toBe(true);
    expect(second.body.gwei).toBe(12);
  });

  it('falls back to stale cache when upstream RPC fails', async (): Promise<void> => {
    // Populate cache first
    await cacheManager.set('network:gas:eth', { gwei: 15, rawWei: '15000000000' }, -1); // expired = stale

    nock(rpcUrl).post('/').reply(500);

    const res = await request(app).get('/api/gas');
    expect(res.status).toBe(200);
    expect(res.body.stale).toBe(true);
    expect(res.body.gwei).toBe(15);
    expect(res.body.source).toBe('Ethereum RPC (Stale)');
  });
});
