import request from 'supertest';
import express, { Express } from 'express';
import nock from 'nock';
import { createTokenSecurityRouter } from '../../src/routes/tokenSecurity.routes';
import { CacheManager } from '../../src/services/cache/cacheManager';
import { MemoryCache } from '../../src/services/cache/memoryCache';
import {
  mockGoPlusSafeTokenResponse,
  mockGoPlusMaliciousTokenResponse,
} from '../fixtures/goplus.fixture';
import { createErrorHandler } from '../../src/middleware/errorHandler';

describe('Token Security Route', (): void => {
  let app: Express;
  let cacheManager: CacheManager;
  const testAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

  beforeEach(async (): Promise<void> => {
    cacheManager = new CacheManager({
      memory: new MemoryCache(60),
    });
    await cacheManager.clear();
    app = express();
    app.use('/api/token', createTokenSecurityRouter({ cacheManager }));
    app.use(createErrorHandler(true));
    nock.cleanAll();
  });

  afterAll((): void => {
    nock.restore();
  });

  it('rejects missing address with 400 validation error', async (): Promise<void> => {
    const res = await request(app).get('/api/token/security');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('fetches GoPlus security check, returns honeypot flag, buy tax, sell tax, and source', async (): Promise<void> => {
    nock('https://api.gopluslabs.io')
      .get('/api/v1/token_security/1')
      .query({ contract_addresses: testAddress.toLowerCase() })
      .reply(200, mockGoPlusSafeTokenResponse);

    const res = await request(app).get(`/api/token/security?chain=1&address=${testAddress}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.isHoneypot).toBe(false);
    expect(res.body.buyTax).toBe(0);
    expect(res.body.sellTax).toBe(0);
    expect(res.body.source).toBe('GoPlus Security');
  });

  it('correctly flags honeypots and parses taxes for malicious tokens', async (): Promise<void> => {
    const malAddress = '0xbad0000000000000000000000000000000000001';
    nock('https://api.gopluslabs.io')
      .get('/api/v1/token_security/56')
      .query({ contract_addresses: malAddress })
      .reply(200, mockGoPlusMaliciousTokenResponse);

    const res = await request(app).get(`/api/token/security?chain=56&address=${malAddress}`);
    expect(res.status).toBe(200);
    expect(res.body.isHoneypot).toBe(true);
    expect(res.body.buyTax).toBe(10);
    expect(res.body.sellTax).toBe(99);
    expect(res.body.riskLevel).toBe('CRITICAL');
  });

  it('handles Solana GoPlus security requests', async (): Promise<void> => {
    const solAddress = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
    nock('https://api.gopluslabs.io')
      .get('/api/v1/solana/token_security')
      .query({ contract_addresses: solAddress })
      .reply(200, {
        code: 1,
        message: 'OK',
        result: {
          [solAddress]: {
            buy_tax: '0',
            sell_tax: '0',
            is_honeypot: '0',
            is_open_source: '1',
          },
        },
      });

    const res = await request(app).get(`/api/token/security?chain=solana&address=${solAddress}`);
    expect(res.status).toBe(200);
    expect(res.body.isHoneypot).toBe(false);
    expect(res.body.source).toBe('GoPlus Security');
  });

  it('returns 502 when GoPlus upstream fails', async (): Promise<void> => {
    const failingAddress = '0x0000000000000000000000000000000000000002';
    nock('https://api.gopluslabs.io')
      .get('/api/v1/token_security/1')
      .query({ contract_addresses: failingAddress })
      .reply(500);

    const res = await request(app).get(`/api/token/security?chain=1&address=${failingAddress}`);
    expect(res.status).toBe(502);
  });
});
