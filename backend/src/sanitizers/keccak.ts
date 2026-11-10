/**
 * Pure TypeScript implementation of the Keccak-256 cryptographic hash function
 * conforming to Ethereum EIP-55 specification without external native dependencies.
 */

const RHO = [
  0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14,
];

const PI = [
  0, 10, 20, 5, 15, 16, 1, 11, 21, 6, 7, 17, 2, 12, 22, 23, 8, 18, 3, 13, 14, 24, 9, 19, 4,
];

const RC = [
  0x0000000000000001n,
  0x0000000000008082n,
  0x800000000000808an,
  0x8000000080008000n,
  0x000000000000808bn,
  0x0000000080000001n,
  0x8000000080008081n,
  0x8000000000008009n,
  0x000000000000008an,
  0x0000000000000088n,
  0x0000000080008009n,
  0x000000008000000an,
  0x000000008000808bn,
  0x800000000000008bn,
  0x8000000000008089n,
  0x8000000000008003n,
  0x8000000000008002n,
  0x8000000000000080n,
  0x000000000000800an,
  0x800000008000000an,
  0x8000000080008081n,
  0x8000000000008080n,
  0x0000000080000001n,
  0x8000000080008008n,
];

function rotl64(x: bigint, n: number): bigint {
  const shift = BigInt(n);
  return ((x << shift) | (x >> (64n - shift))) & 0xffffffffffffffffn;
}

function keccakF1600(state: BigUint64Array): void {
  const C = new BigUint64Array(5);
  const D = new BigUint64Array(5);
  const B = new BigUint64Array(25);

  for (let round = 0; round < 24; round++) {
    for (let x = 0; x < 5; x++) {
      C[x] =
        (state[x] ?? 0n) ^
        (state[x + 5] ?? 0n) ^
        (state[x + 10] ?? 0n) ^
        (state[x + 15] ?? 0n) ^
        (state[x + 20] ?? 0n);
    }
    for (let x = 0; x < 5; x++) {
      D[x] = (C[(x + 4) % 5] ?? 0n) ^ rotl64(C[(x + 1) % 5] ?? 0n, 1);
    }
    for (let i = 0; i < 25; i++) {
      state[i] = (state[i] ?? 0n) ^ (D[i % 5] ?? 0n);
    }
    for (let i = 0; i < 25; i++) {
      B[PI[i] ?? 0] = rotl64(state[i] ?? 0n, RHO[i] ?? 0);
    }
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        const idx = x + 5 * y;
        const b1 = B[((x + 1) % 5) + 5 * y] ?? 0n;
        const b2 = B[((x + 2) % 5) + 5 * y] ?? 0n;
        state[idx] = (B[idx] ?? 0n) ^ (~b1 & b2);
      }
    }
    state[0] = (state[0] ?? 0n) ^ (RC[round] ?? 0n);
  }
}

/**
 * Computes the Keccak-256 hash of a string or buffer.
 *
 * @param msg - Input string or Buffer
 * @returns 64-character lowercase hex string
 */
export function keccak256(msg: string | Buffer): string {
  const buf = Buffer.isBuffer(msg) ? msg : Buffer.from(msg, 'utf8');
  const rate = 136; // 1088 / 8
  const state = new BigUint64Array(25);
  const padLen = rate - (buf.length % rate);
  const padded = Buffer.alloc(buf.length + padLen);

  buf.copy(padded, 0);
  padded[buf.length] = 0x01;
  const lastIndex = padded.length - 1;
  padded[lastIndex] = (padded[lastIndex] ?? 0) | 0x80;

  for (let offset = 0; offset < padded.length; offset += rate) {
    for (let i = 0; i < rate; i += 8) {
      const word = padded.readBigUInt64LE(offset + i);
      state[i / 8] = (state[i / 8] ?? 0n) ^ word;
    }
    keccakF1600(state);
  }

  const out = Buffer.alloc(32);
  for (let i = 0; i < 4; i++) {
    out.writeBigUInt64LE(state[i] ?? 0n, i * 8);
  }

  return out.toString('hex');
}
