import request from 'supertest';
import express, { Express } from 'express';
import { createVolatilityRouter } from '../../src/routes/volatility.routes';
import { DegradedModeEmitter } from '../../src/volatility/degradedMode';
import { DexScreenerClient } from '../../src/services/providers/dexScreener.client';
import { errorHandlerMiddleware } from '../../src/middleware/errorHandler';

describe('Volatility Routes', (): void => {
  let app: Express;
  let degradedEmitter: DegradedModeEmitter;

  beforeEach((): void => {
    degradedEmitter = new DegradedModeEmitter();
    app = express();
    app.use(express.json());
    app.use('/api/volatility', createVolatilityRouter({ degradedEmitter }));
  });

  describe('POST /api/volatility/check', (): void => {
    it('returns priceImpact=1.0 on zero liquidity', async (): Promise<void> => {
      const res = await request(app)
        .post('/api/volatility/check')
        .send({ liquidity: 0, tradeSize: 1000, prices: [100, 101, 102] });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.priceImpact).toBe(1.0);
    });

    it('detects no outlier for a stable price series', async (): Promise<void> => {
      const res = await request(app)
        .post('/api/volatility/check')
        .send({ liquidity: 1000000, tradeSize: 100, prices: [100, 101, 100, 99, 100] });
      expect(res.status).toBe(200);
      expect(res.body.outlier.isOutlier).toBe(false);
    });

    it('detects outlier for a price spike', async (): Promise<void> => {
      const res = await request(app)
        .post('/api/volatility/check')
        .send({ liquidity: 1000000, tradeSize: 100, prices: [100, 101, 100, 500] });
      expect(res.status).toBe(200);
      expect(res.body.outlier.isOutlier).toBe(true);
    });

    it('handles comma-separated price string', async (): Promise<void> => {
      const res = await request(app)
        .post('/api/volatility/check')
        .send({ liquidity: 500000, tradeSize: 50, prices: '100,101,99,102' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('handles empty prices array gracefully', async (): Promise<void> => {
      const res = await request(app)
        .post('/api/volatility/check')
        .send({ liquidity: 100000, tradeSize: 50, prices: [] });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/volatility/events', (): void => {
    it('returns empty events initially', async (): Promise<void> => {
      const res = await request(app).get('/api/volatility/events');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.events)).toBe(true);
      expect(res.body.events).toHaveLength(0);
    });

    it('returns killSwitchActive=false when no degraded events', async (): Promise<void> => {
      const res = await request(app).get('/api/volatility/events');
      expect(res.body.killSwitchActive).toBe(false);
    });
  });

  describe('DELETE /api/volatility/events', (): void => {
    it('clears events and returns success', async (): Promise<void> => {
      const res = await request(app).delete('/api/volatility/events');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/volatility/check-live', (): void => {
    it('returns live volatility analysis for valid pair', async (): Promise<void> => {
      const mockDex = {
        searchPairs: jest.fn().mockResolvedValue({
          pairs: [
            {
              priceUsd: '150.00',
              liquidity: { usd: 1000000 },
            },
          ],
        }),
      };
      const testApp = express();
      testApp.use(express.json());
      testApp.use(
        '/api/volatility',
        createVolatilityRouter({
          degradedEmitter,
          dexScreenerClient: mockDex as unknown as DexScreenerClient,
        }),
      );
      testApp.use(errorHandlerMiddleware);

      const res = await request(testApp).post('/api/volatility/check-live?symbol=SOL');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.symbol).toBe('SOL');
      expect(res.body.price).toBe(150);
      expect(res.body.liquidity).toBe(1000000);
    });

    it('rejects with 400 when no market pair exists', async (): Promise<void> => {
      const mockDex = {
        searchPairs: jest.fn().mockResolvedValue({ pairs: [] }),
      };
      const testApp = express();
      testApp.use(express.json());
      testApp.use(
        '/api/volatility',
        createVolatilityRouter({
          degradedEmitter,
          dexScreenerClient: mockDex as unknown as DexScreenerClient,
        }),
      );
      testApp.use(errorHandlerMiddleware);

      const res = await request(testApp).post('/api/volatility/check-live?symbol=UNKNOWN');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
