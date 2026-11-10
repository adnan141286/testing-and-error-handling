import request from 'supertest';
import { createApp } from '../../src/app';
import { env } from '../../src/config/env';
import { EthRpcClient } from '../../src/services/providers/ethRpc.client';
import { QuarantineManager } from '../../src/sanitizers/quarantine';
import { createExtendedSanitizeRouter } from '../../src/routes/sanitizeExtended.routes';
import express from 'express';

describe('Extended Sanitize Routes', () => {
  it('sanitizes transactions from latest Ethereum block', async () => {
    const mockRpcClient = {
      getLatestBlockTransactions: jest.fn().mockResolvedValue({
        number: '0x100',
        hash: '0xabcdef',
        timestamp: '0x60000000',
        transactions: [
          {
            hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            from: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
            to: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
            value: '0xde0b6b3a7640000',
            gas: '0x5208',
            gasPrice: '0x4a817c800',
          },
          {
            hash: 'invalid',
            from: 'invalid',
            to: null,
            value: 'invalid',
          },
        ],
      }),
    } as unknown as EthRpcClient;

    const router = createExtendedSanitizeRouter({
      ethRpcClient: mockRpcClient,
      quarantineManager: new QuarantineManager(),
    });

    const app = express();
    app.use(express.json());
    app.use('/api/sanitize', router);

    const res = await request(app).post('/api/sanitize/eth-block');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total).toBe(2);
    expect(res.body.accepted).toBe(1);
    expect(res.body.quarantined).toBe(1);
  });

  it('returns 400 when Birdeye is not configured', async () => {
    const app = createApp(env, { enableRateLimiting: false });
    const res = await request(app).post('/api/sanitize/birdeye-wallet?wallet=0x123');
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Birdeye: not configured');
  });
});
