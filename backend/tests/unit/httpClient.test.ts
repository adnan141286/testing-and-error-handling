import nock from 'nock';
import {
  ResilientHttpClient,
  sendRawRequest,
  CircuitBreaker,
  TokenBucket,
} from '../../src/services/resilience';
import { CircuitOpenError, ProviderError } from '../../src/errors';

describe('ResilientHttpClient', (): void => {
  beforeAll((): void => {
    nock.disableNetConnect();
  });

  afterAll((): void => {
    nock.enableNetConnect();
  });

  afterEach((): void => {
    nock.cleanAll();
    jest.clearAllMocks();
  });

  it('proves: a 429 triggers backoff then succeeds', async (): Promise<void> => {
    const baseUrl = 'https://api.dexscreener.com';
    const endpoint = '/latest/dex/pairs/ethereum/0x123';
    const sleepMock = jest.fn().mockResolvedValue(undefined);

    nock(baseUrl)
      .get(endpoint)
      .reply(429, { error: 'Rate limit exceeded' }, { 'retry-after': '2' });

    nock(baseUrl)
      .get(endpoint)
      .reply(200, { pair: { baseToken: { symbol: 'WETH' }, priceUsd: '3500' } });

    const client = new ResilientHttpClient({
      providerName: 'dexscreener',
      backoffOptions: { maxRetries: 3, sleepFn: sleepMock },
    });

    const response = await client.get<{ pair: { priceUsd: string } }>(`${baseUrl}${endpoint}`);

    expect(response.status).toBe(200);
    expect(response.data.pair.priceUsd).toBe('3500');
    expect(sleepMock).toHaveBeenCalledTimes(1);
    expect(sleepMock).toHaveBeenCalledWith(2000);
  });

  it('proves: repeated failures open the circuit', async (): Promise<void> => {
    const baseUrl = 'https://public-api.birdeye.so';
    const endpoint = '/defi/price';
    const sleepMock = jest.fn().mockResolvedValue(undefined);

    const circuitBreaker = new CircuitBreaker({
      serviceName: 'birdeye',
      failureThreshold: 2,
      resetTimeoutMs: 15000,
    });

    const client = new ResilientHttpClient({
      providerName: 'birdeye',
      circuitBreaker,
      backoffOptions: { maxRetries: 0, sleepFn: sleepMock },
    });

    nock(baseUrl).get(endpoint).reply(500, { message: 'Internal Server Error' });
    nock(baseUrl).get(endpoint).reply(503, { message: 'Service Temporarily Down' });

    await expect(client.get(`${baseUrl}${endpoint}`)).rejects.toBeInstanceOf(ProviderError);
    expect(circuitBreaker.getState()).toBe('CLOSED');

    await expect(client.get(`${baseUrl}${endpoint}`)).rejects.toBeInstanceOf(ProviderError);
    expect(circuitBreaker.getState()).toBe('OPEN');

    await expect(client.get(`${baseUrl}${endpoint}`)).rejects.toBeInstanceOf(CircuitOpenError);
  });

  it('should support POST requests and JSON payload serialization', async (): Promise<void> => {
    const baseUrl = 'https://api.gopluslabs.io';
    const endpoint = '/api/v1/token_security';

    nock(baseUrl)
      .post(endpoint, { chainId: '1', address: '0xabc' })
      .reply(200, { result: { is_honeypot: false } });

    const client = new ResilientHttpClient({ providerName: 'goplus' });
    const response = await client.post<{ result: { is_honeypot: boolean } }>(
      `${baseUrl}${endpoint}`,
      { chainId: '1', address: '0xabc' },
    );

    expect(response.status).toBe(200);
    expect(response.data.result.is_honeypot).toBe(false);
  });

  it('should integrate TokenBucket rate limiting and default options', async (): Promise<void> => {
    const baseUrl = 'https://api.dexscreener.com';
    const endpoint = '/rate-limited-endpoint';

    nock(baseUrl).get(endpoint).reply(200, { ok: true });

    const tokenBucket = new TokenBucket({ capacity: 10, refillRatePerSecond: 5 });
    const consumeSpy = jest.spyOn(tokenBucket, 'consume');

    const defaultClient = new ResilientHttpClient();
    expect(defaultClient.providerName).toBe('unknown_provider');

    const client = new ResilientHttpClient({
      providerName: 'dexscreener',
      tokenBucket,
    });

    const response = await client.get<{ ok: boolean }>(`${baseUrl}${endpoint}`);
    expect(response.status).toBe(200);
    expect(consumeSpy).toHaveBeenCalledTimes(1);
  });

  it('should parse non-JSON responses gracefully in sendRawRequest', async (): Promise<void> => {
    const baseUrl = 'https://api.dexscreener.com';
    const endpoint = '/text-endpoint';

    nock(baseUrl).get(endpoint).reply(200, 'Plain text response', { 'content-type': 'text/plain' });

    const response = await sendRawRequest<string>(`${baseUrl}${endpoint}`);
    expect(response.status).toBe(200);
    expect(response.data).toBe('Plain text response');
  });

  it('should handle request timeouts cleanly', async (): Promise<void> => {
    const baseUrl = 'https://api.dexscreener.com';
    const endpoint = '/timeout-endpoint';

    nock(baseUrl).get(endpoint).delayConnection(200).reply(200, { ok: true });

    await expect(sendRawRequest(`${baseUrl}${endpoint}`, { timeoutMs: 20 })).rejects.toThrow(
      'timed out',
    );
  });

  it('should not retry on non-retryable errors', async (): Promise<void> => {
    const baseUrl = 'https://api.dexscreener.com';
    const endpoint = '/fatal-endpoint';
    const sleepMock = jest.fn().mockResolvedValue(undefined);

    const client = new ResilientHttpClient({
      providerName: 'dexscreener',
      backoffOptions: { maxRetries: 3, sleepFn: sleepMock },
    });

    jest
      .spyOn(client.circuitBreaker, 'execute')
      .mockRejectedValueOnce(new Error('Fatal connection fault'));

    await expect(client.get(`${baseUrl}${endpoint}`)).rejects.toThrow('Fatal connection fault');
    expect(sleepMock).not.toHaveBeenCalled();
  });

  it('should not retry on non-retryable errors', async (): Promise<void> => {
    const baseUrl = 'https://api.dexscreener.com';
    const endpoint = '/fatal-endpoint';
    const sleepMock = jest.fn().mockResolvedValue(undefined);

    const client = new ResilientHttpClient({
      providerName: 'dexscreener',
      backoffOptions: { maxRetries: 3, sleepFn: sleepMock },
    });

    jest
      .spyOn(client.circuitBreaker, 'execute')
      .mockRejectedValueOnce(new Error('Fatal connection fault'));

    await expect(client.get(`${baseUrl}${endpoint}`)).rejects.toThrow('Fatal connection fault');
    expect(sleepMock).not.toHaveBeenCalled();
  });
});
