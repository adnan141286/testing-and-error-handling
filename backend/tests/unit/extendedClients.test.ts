import nock from 'nock';
import { CoinGeckoClient } from '../../src/services/providers/coingecko.client';
import { EthRpcClient } from '../../src/services/providers/ethRpc.client';
import { MemoryCache } from '../../src/services/cache/memoryCache';
import { CacheManager } from '../../src/services/cache/cacheManager';

describe('CoinGecko & EthRpc Extended Client Methods', () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  afterAll(() => {
    nock.restore();
  });

  it('fetches market chart prices from CoinGecko', async () => {
    const memCache = new MemoryCache();
    const cacheManager = new CacheManager({ memory: memCache });
    const client = new CoinGeckoClient({
      cacheManager,
      baseUrl: 'https://api.coingecko.com/api/v3',
    });

    nock('https://api.coingecko.com')
      .get('/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=1')
      .reply(200, {
        prices: [
          [1700000000000, 2500.5],
          [1700000060000, 2510.0],
        ],
      });

    const prices = await client.getMarketChartPrices('ethereum');
    expect(prices).toHaveLength(2);
    expect(prices[0]).toEqual([1700000000000, 2500.5]);
  });

  it('fetches latest block with transactions from Ethereum RPC', async () => {
    const memCache = new MemoryCache();
    const cacheManager = new CacheManager({ memory: memCache });
    const client = new EthRpcClient({
      cacheManager,
      rpcUrl: 'https://rpc.eth.test',
    });

    nock('https://rpc.eth.test')
      .post('/', (body) => body.method === 'eth_getBlockByNumber')
      .reply(200, {
        jsonrpc: '2.0',
        id: 2,
        result: {
          number: '0x10',
          hash: '0xabc',
          timestamp: '0x500',
          transactions: [{ hash: '0x123', from: '0xaaa', value: '0x0' }],
        },
      });

    const block = await client.getLatestBlockTransactions();
    expect(block.number).toBe('0x10');
    expect(block.transactions).toHaveLength(1);
  });
});
