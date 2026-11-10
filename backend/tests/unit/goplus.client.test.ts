import nock from 'nock';
import RedisMock from 'ioredis-mock';
import { GoPlusClient } from '../../src/services/providers';
import { ResilientHttpClient } from '../../src/services/resilience';
import { CacheManager } from '../../src/services/cache';
import { RedisCache } from '../../src/services/cache/redisCache';
import { MemoryCache } from '../../src/services/cache/memoryCache';
import {
  mockGoPlusSafeTokenResponse,
  mockGoPlusCleanAddressResponse,
} from '../fixtures/goplus.fixture';

describe('GoPlusClient', (): void => {
  const baseUrl = 'https://api.gopluslabs.io';
  let cacheManager: CacheManager;
  let httpClient: ResilientHttpClient;
  let clientWithKey: GoPlusClient;
  let clientWithoutKey: GoPlusClient;

  beforeAll((): void => {
    nock.disableNetConnect();
  });

  afterAll((): void => {
    nock.enableNetConnect();
  });

  beforeEach((): void => {
    const redisMock = new RedisMock();
    const redis = new RedisCache({ client: redisMock });
    const memory = new MemoryCache();
    cacheManager = new CacheManager({ redis, memory });
    httpClient = new ResilientHttpClient({ providerName: 'goplus' });
    clientWithKey = new GoPlusClient({
      baseUrl,
      httpClient,
      cacheManager,
      apiKey: 'goplus-key',
    });
    clientWithoutKey = new GoPlusClient({
      baseUrl,
      httpClient,
      cacheManager,
      apiKey: '',
    });
  });

  afterEach(async (): Promise<void> => {
    nock.cleanAll();
    await cacheManager.clear();
  });

  it('fetches token security analysis and caches the response', async (): Promise<void> => {
    const chainId = '1';
    const contractAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const lowerAddress = contractAddress.toLowerCase();
    const endpoint = `/api/v1/token_security/${chainId}?contract_addresses=${lowerAddress}`;

    const scope = nock(baseUrl, {
      reqheaders: {
        authorization: 'Bearer goplus-key',
      },
    })
      .get(endpoint)
      .reply(200, mockGoPlusSafeTokenResponse);

    const res1 = await clientWithKey.getTokenSecurity(chainId, contractAddress);
    expect(res1.code).toBe(1);
    expect(res1.result[lowerAddress]?.is_honeypot).toBe('0');
    expect(scope.isDone()).toBe(true);

    // Second call served from cache
    const res2 = await clientWithKey.getTokenSecurity(chainId, contractAddress);
    expect(res2).toEqual(mockGoPlusSafeTokenResponse);
  });

  it('fetches token security without apiKey', async (): Promise<void> => {
    const chainId = '56';
    const contractAddress = '0x0000000000000000000000000000000000000001';
    const lowerAddress = contractAddress.toLowerCase();
    const endpoint = `/api/v1/token_security/${chainId}?contract_addresses=${lowerAddress}`;

    const scope = nock(baseUrl).get(endpoint).reply(200, mockGoPlusSafeTokenResponse);

    const res = await clientWithoutKey.getTokenSecurity(chainId, contractAddress);
    expect(res.code).toBe(1);
    expect(scope.isDone()).toBe(true);
  });

  it('fetches address security analysis without apiKey and with default chain', async (): Promise<void> => {
    const address = '0x71C8705a2B88e38f725cD653514e2015B4F1D0c2';
    const lowerAddress = address.toLowerCase();
    const endpoint = `/api/v1/address_security/${lowerAddress}?chain_id=1`;

    const scope = nock(baseUrl).get(endpoint).reply(200, mockGoPlusCleanAddressResponse);

    const res = await clientWithoutKey.getAddressSecurity(address);
    expect(res.code).toBe(1);
    expect(res.result.phishing_activities).toBe('0');
    expect(scope.isDone()).toBe(true);
  });

  it('fetches address security analysis with custom chain', async (): Promise<void> => {
    const address = '0x71C8705a2B88e38f725cD653514e2015B4F1D0c2';
    const lowerAddress = address.toLowerCase();
    const endpoint = `/api/v1/address_security/${lowerAddress}?chain_id=56`;

    const scope = nock(baseUrl).get(endpoint).reply(200, mockGoPlusCleanAddressResponse);

    const res = await clientWithoutKey.getAddressSecurity(address, '56');
    expect(res.code).toBe(1);
    expect(scope.isDone()).toBe(true);
  });

  it('fetches address security with apiKey', async (): Promise<void> => {
    const address = '0x8ba1f109551bD432803012645Ac136ddd64DBA72';
    const lowerAddress = address.toLowerCase();
    const endpoint = `/api/v1/address_security/${lowerAddress}?chain_id=1`;

    const scope = nock(baseUrl, {
      reqheaders: {
        authorization: 'Bearer goplus-key',
      },
    })
      .get(endpoint)
      .reply(200, mockGoPlusCleanAddressResponse);

    const res = await clientWithKey.getAddressSecurity(address);
    expect(res.code).toBe(1);
    expect(scope.isDone()).toBe(true);
  });

  it('initializes with default options without crashing', (): void => {
    const defaultClient = new GoPlusClient();
    expect(defaultClient).toBeInstanceOf(GoPlusClient);
  });
});
