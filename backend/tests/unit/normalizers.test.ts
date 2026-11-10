import {
  toChecksumEvmAddress,
  isValidEvmAddress,
  isValidSolanaAddress,
  normalizeSolanaAddress,
  normalizeAddress,
  normalizeBigNumber,
  normalizeTimestamp,
  keccak256,
} from '../../src/sanitizers';

describe('Data Normalizers', (): void => {
  describe('Keccak-256 and EVM Address Normalization', (): void => {
    it('computes correct Keccak-256 for standard vectors', (): void => {
      expect(keccak256('')).toBe(
        'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470',
      );
    });

    it('validates and checksums EVM addresses accurately according to EIP-55', (): void => {
      const lower = '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed';
      const expected = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';

      expect(isValidEvmAddress(lower)).toBe(true);
      expect(toChecksumEvmAddress(lower)).toBe(expected);
      expect(toChecksumEvmAddress('5aaeb6053f3e94c9b9a09f33669435e7ef1beaed')).toBe(expected);

      // Second EIP-55 test vector
      expect(toChecksumEvmAddress('0xfb6916095ca1df60bb79ce92ce3ea74c37c5d359')).toBe(
        '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359',
      );
    });

    it('returns null and false for invalid EVM addresses', (): void => {
      expect(isValidEvmAddress('0x123')).toBe(false);
      expect(isValidEvmAddress(null)).toBe(false);
      expect(isValidEvmAddress(12345)).toBe(false);
      expect(toChecksumEvmAddress('0xnothexcharactersnothexcharactersnothex12')).toBeNull();
      expect(toChecksumEvmAddress(null)).toBeNull();
    });
  });

  describe('Solana Base58 Address Normalization', (): void => {
    const validSol = 'So11111111111111111111111111111111111111112';

    it('validates and normalizes valid Solana addresses', (): void => {
      expect(isValidSolanaAddress(validSol)).toBe(true);
      expect(normalizeSolanaAddress(`  ${validSol}  `)).toBe(validSol);
    });

    it('rejects invalid Solana addresses and illegal Base58 characters', (): void => {
      // Contains '0' and 'O' which are forbidden in base58
      expect(isValidSolanaAddress('0o11111111111111111111111111111111111111112')).toBe(false);
      expect(isValidSolanaAddress('')).toBe(false);
      expect(isValidSolanaAddress(12345678)).toBe(false);
      expect(normalizeSolanaAddress('0xinvalid')).toBeNull();
      expect(normalizeSolanaAddress(null)).toBeNull();
    });
  });

  describe('Multi-Chain Address Normalization', (): void => {
    it('identifies and formats EVM and Solana addresses respectively', (): void => {
      const evm = normalizeAddress('0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed');
      expect(evm).toEqual({
        address: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
        chainType: 'evm',
      });

      const sol = normalizeAddress('So11111111111111111111111111111111111111112');
      expect(sol).toEqual({
        address: 'So11111111111111111111111111111111111111112',
        chainType: 'solana',
      });

      expect(normalizeAddress('unknown_bad_string')).toBeNull();
      expect(normalizeAddress(null)).toBeNull();
    });
  });

  describe('BigNumber Normalization', (): void => {
    it('normalizes bigints, numbers, hex, and valid numeric strings', (): void => {
      expect(normalizeBigNumber(1000000000000000000n)).toBe('1000000000000000000');
      expect(normalizeBigNumber(12345.67)).toBe('12345.67');
      expect(normalizeBigNumber('9876543210987654321')).toBe('9876543210987654321');
      expect(normalizeBigNumber('0x10')).toBe('16');
      expect(normalizeBigNumber('1e6')).toBe('1e6');
    });

    it('rejects negative numbers when allowNegative is false', (): void => {
      expect(normalizeBigNumber(-500)).toBeNull();
      expect(normalizeBigNumber('-500')).toBeNull();
      expect(normalizeBigNumber(-500n)).toBeNull();
      expect(normalizeBigNumber(-500, true)).toBe('-500');
    });

    it('rejects null, NaN, empty strings, and non-numeric inputs', (): void => {
      expect(normalizeBigNumber(null)).toBeNull();
      expect(normalizeBigNumber(undefined)).toBeNull();
      expect(normalizeBigNumber(NaN)).toBeNull();
      expect(normalizeBigNumber('NaN')).toBeNull();
      expect(normalizeBigNumber('   ')).toBeNull();
      expect(normalizeBigNumber('abc_not_a_number')).toBeNull();
      expect(normalizeBigNumber(Infinity)).toBeNull();
    });
  });

  describe('Timestamp Normalization', (): void => {
    it('normalizes Date instances, Unix seconds, milliseconds, and ISO strings', (): void => {
      const fixedMs = 1718000000000;
      const fixedSec = 1718000000;
      const iso = new Date(fixedMs).toISOString();

      expect(normalizeTimestamp(new Date(fixedMs))).toBe(fixedMs);
      expect(normalizeTimestamp(fixedSec)).toBe(fixedMs);
      expect(normalizeTimestamp(fixedMs)).toBe(fixedMs);
      expect(normalizeTimestamp(iso)).toBe(fixedMs);
      expect(normalizeTimestamp(String(fixedSec))).toBe(fixedMs);
    });

    it('rejects null, negative, NaN, out-of-bounds, or invalid date strings', (): void => {
      expect(normalizeTimestamp(null)).toBeNull();
      expect(normalizeTimestamp(-100)).toBeNull();
      expect(normalizeTimestamp(NaN)).toBeNull();
      expect(normalizeTimestamp('invalid-date-string')).toBeNull();
      // Year 1970 ms (< year 2000 boundary)
      expect(normalizeTimestamp(1000)).toBeNull();
      // Far future (> year 2100)
      expect(normalizeTimestamp(5000000000000)).toBeNull();
    });
  });
});
