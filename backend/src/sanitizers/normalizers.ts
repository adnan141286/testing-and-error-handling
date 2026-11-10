import { keccak256 } from './keccak';
import { decodeBase58 } from './base58';

/**
 * Validates whether an input represents a syntactically valid EVM address (40 hex chars).
 *
 * @param address - Value to check
 * @returns True if the value is a 40-character hex string with optional 0x prefix
 */
export function isValidEvmAddress(address: unknown): boolean {
  if (typeof address !== 'string') {
    return false;
  }
  return /^0x[0-9a-fA-F]{40}$/.test(address) || /^[0-9a-fA-F]{40}$/.test(address);
}

/**
 * Normalizes an EVM address to its EIP-55 checksummed mixed-case format.
 *
 * @param address - Raw EVM address string
 * @returns Checksummed 0x address, or null if invalid
 */
export function toChecksumEvmAddress(address: unknown): string | null {
  if (!isValidEvmAddress(address) || typeof address !== 'string') {
    return null;
  }

  const clean = address.toLowerCase().replace(/^0x/, '');
  const hash = keccak256(clean);
  let checksummed = '0x';

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i] ?? '';
    const hashByte = parseInt(hash[i] ?? '0', 16);
    checksummed += hashByte >= 8 ? char.toUpperCase() : char.toLowerCase();
  }

  return checksummed;
}

/**
 * Validates whether an input represents a valid Solana public key (32 bytes base58).
 *
 * @param address - Candidate address string
 * @returns True if valid Solana base58 public key
 */
export function isValidSolanaAddress(address: unknown): boolean {
  if (typeof address !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
    return false;
  }
  const decoded = decodeBase58(address);
  return decoded !== null && decoded.length === 32;
}

/**
 * Normalizes a candidate Solana address, trimming whitespace and confirming validity.
 *
 * @param address - Raw candidate Solana address
 * @returns Valid base58 address string, or null
 */
export function normalizeSolanaAddress(address: unknown): string | null {
  if (typeof address !== 'string') {
    return null;
  }
  const trimmed = address.trim();
  return isValidSolanaAddress(trimmed) ? trimmed : null;
}

/**
 * Normalizes an address string for either EVM or Solana chains.
 *
 * @param address - Raw address
 * @returns Normalized address and chain classification, or null
 */
export function normalizeAddress(
  address: unknown,
): { address: string; chainType: 'evm' | 'solana' } | null {
  const evm = toChecksumEvmAddress(address);
  if (evm) {
    return { address: evm, chainType: 'evm' };
  }
  const solana = normalizeSolanaAddress(address);
  if (solana) {
    return { address: solana, chainType: 'solana' };
  }
  return null;
}

/**
 * Normalizes BigNumber-like representations into a validated numeric string.
 *
 * @param value - Value to normalize (string, number, or bigint)
 * @param allowNegative - Whether negative values are permissible
 * @returns String representation of the number, or null if invalid or NaN
 */
export function normalizeBigNumber(value: unknown, allowNegative = false): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'bigint') {
    return !allowNegative && value < 0n ? null : value.toString();
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Number.isNaN(value) || (!allowNegative && value < 0)) {
      return null;
    }
    return value.toString();
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.toLowerCase() === 'nan') {
      return null;
    }
    if (/^0x[0-9a-fA-F]+$/.test(trimmed)) {
      try {
        const bi = BigInt(trimmed);
        return !allowNegative && bi < 0n ? null : bi.toString();
      } catch {
        return null;
      }
    }
    if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) {
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
        return null;
      }
      return !allowNegative && (trimmed.startsWith('-') || parsed < 0) ? null : trimmed;
    }
  }

  return null;
}

/**
 * Normalizes various timestamp formats into a Unix timestamp in milliseconds.
 *
 * @param value - Candidate timestamp (seconds, ms, ISO string, Date)
 * @returns Milliseconds integer or null if invalid
 */
export function normalizeTimestamp(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  let ms: number;
  if (value instanceof Date) {
    ms = value.getTime();
  } else if (typeof value === 'number') {
    if (!Number.isFinite(value) || Number.isNaN(value) || value <= 0) {
      return null;
    }
    ms = value < 10000000000 ? Math.floor(value * 1000) : Math.floor(value);
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      return normalizeTimestamp(Number(trimmed));
    }
    const parsed = Date.parse(trimmed);
    if (Number.isNaN(parsed)) {
      return null;
    }
    ms = parsed;
  } else {
    return null;
  }

  // Bounds check: Between Year 2000 and Year 2100
  return ms >= 946684800000 && ms <= 4102444800000 ? ms : null;
}
