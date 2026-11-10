import { getDbPool, initDbSchema, closeDbPool } from '../../src/utils/db';

jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
    on: jest.fn(),
    end: jest.fn().mockResolvedValue(undefined),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('Database Pool & Schema', (): void => {
  beforeEach(async (): Promise<void> => {
    await closeDbPool();
    jest.clearAllMocks();
  });

  afterAll(async (): Promise<void> => {
    await closeDbPool();
  });

  it('returns singleton pool instance', (): void => {
    const pool1 = getDbPool();
    const pool2 = getDbPool();
    expect(pool1).toBe(pool2);
  });

  it('initializes database schema successfully', async (): Promise<void> => {
    const pool = getDbPool();
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
    await expect(initDbSchema(pool)).resolves.not.toThrow();
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('catches and logs error when schema query fails', async (): Promise<void> => {
    const pool = getDbPool();
    (pool.query as jest.Mock).mockRejectedValueOnce(new Error('Connection failed'));
    await expect(initDbSchema(pool)).resolves.not.toThrow();
  });

  it('closes pool cleanly and allows re-initialization', async (): Promise<void> => {
    const pool = getDbPool();
    await closeDbPool();
    expect(pool.end).toHaveBeenCalledTimes(1);
    const newPool = getDbPool();
    expect(newPool).toBeDefined();
  });

  it('handles idle client error event listener callback', (): void => {
    let errorHandler: ((err: Error) => void) | undefined;
    const pool = getDbPool();
    const onMock = pool.on as jest.Mock;
    const call = onMock.mock.calls.find((args) => args[0] === 'error');
    if (call) {
      errorHandler = call[1];
    }
    expect(errorHandler).toBeDefined();
    if (errorHandler) {
      expect(() => errorHandler!(new Error('Idle client dropped'))).not.toThrow();
    }
  });
});
