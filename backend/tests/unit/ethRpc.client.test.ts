import nock from 'nock';
import { EthRpcClient } from '../../src/services/providers/ethRpc.client';
import { CacheManager } from '../../src/services/cache/cacheManager';
import { MemoryCache } from '../../src/services/cache/memoryCache';

describe('EthRpcClient Provider', (): void => {
  let client: EthRpcClient;
  let cacheManager: CacheManager;
  const rpcUrl = 'https://ethereum-rpc.publicnode.com';

  beforeEach(async (): Promise<void> => {
    nock.cleanAll();
    cacheManager = new CacheManager({ memory: new MemoryCache(60) });
    await cacheManager.clear();
    client = new EthRpcClient({ rpcUrl, cacheManager });
  });

  afterAll((): void => {
    nock.restore();
  });

  it('fetches and converts hex gas price to Gwei', async (): Promise<void> => {
    // 0x2cb417800 = 12,000,000,000 wei = 12 Gwei
    nock('https://ethereum-rpc.publicnode.com').post('/').reply(200, {
      jsonrpc: '2.0',
      id: 1,
      result: '0x2cb417800',
    });

    const res = await client.getGasPriceGwei();
    expect(res.gwei).toBe(12);
    expect(res.rawWei).toBe('12000000000');
  });

  it('serves cached gas price on repeated calls', async (): Promise<void> => {
    nock('https://ethereum-rpc.publicnode.com').post('/').once().reply(200, {
      jsonrpc: '2.0',
      id: 1,
      result: '0x2540be400', // 10 Gwei
    });

    const first = await client.getGasPriceGwei();
    expect(first.gwei).toBe(10);

    const second = await client.getGasPriceGwei();
    expect(second.gwei).toBe(10);
  });

  it('throws ProviderError on invalid JSON-RPC response format', async (): Promise<void> => {
    nock('https://ethereum-rpc.publicnode.com')
      .post('/')
      .reply(200, {
        jsonrpc: '1.0',
        error: { code: -32000, message: 'Invalid method' },
      });

    await expect(client.getGasPriceGwei()).rejects.toThrow('Invalid JSON-RPC gas response');
  });
});
