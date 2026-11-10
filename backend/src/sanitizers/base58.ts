/**
 * Base58 decoding implementation for Solana public key validation.
 */

const SOLANA_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const SOLANA_ALPHABET_MAP = new Map<string, bigint>();
for (let i = 0; i < SOLANA_ALPHABET.length; i++) {
  const char = SOLANA_ALPHABET[i];
  if (char) {
    SOLANA_ALPHABET_MAP.set(char, BigInt(i));
  }
}

/**
 * Decodes a Base58 string into a Buffer.
 *
 * @param str - Base58 string
 * @returns Decoded Buffer or null if invalid characters are present
 */
export function decodeBase58(str: string): Buffer | null {
  if (str.length === 0) {
    return null;
  }

  let num = 0n;
  for (let i = 0; i < str.length; i++) {
    const char = str[i] ?? '';
    const val = SOLANA_ALPHABET_MAP.get(char);
    if (val === undefined) {
      return null;
    }
    num = num * 58n + val;
  }

  const hex = num.toString(16);
  const paddedHex = hex.length % 2 === 0 ? hex : `0${hex}`;
  const rawBytes = Buffer.from(paddedHex, 'hex');

  let leadingZeros = 0;
  for (let i = 0; i < str.length && str[i] === '1'; i++) {
    leadingZeros++;
  }

  const result = Buffer.alloc(leadingZeros + rawBytes.length);
  rawBytes.copy(result, leadingZeros);
  return result;
}
