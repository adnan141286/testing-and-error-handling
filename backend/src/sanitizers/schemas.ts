import { z } from 'zod';
import { normalizeAddress, normalizeBigNumber, normalizeTimestamp } from './normalizers';

const validatedAddress = z.preprocess(
  (val) => {
    const norm = normalizeAddress(val);
    return norm ? norm.address : val;
  },
  z.string().refine((val) => normalizeAddress(val) !== null, {
    message: 'Invalid EVM or Solana address format',
  }),
);

const positiveBigNumber = z.preprocess(
  (val) => normalizeBigNumber(val),
  z
    .string()
    .min(1, { message: 'Value must be a valid, positive, non-NaN BigNumber representation' }),
);

const validatedTimestamp = z.preprocess(
  (val) => normalizeTimestamp(val),
  z.number().int().positive({
    message: 'Invalid timestamp format; must resolve to a valid Unix millisecond integer',
  }),
);

const finitePositiveNumber = z.preprocess(
  (val) => (typeof val === 'string' ? Number(val) : val),
  z.number().positive().finite(),
);

const finiteNonNegativeNumber = z.preprocess(
  (val) => (typeof val === 'string' ? Number(val) : val),
  z.number().min(0).finite(),
);

/**
 * Zod validation and normalization schema for Token Pairs.
 */
export const tokenPairSchema = z.object({
  chainId: z.string().min(1),
  dexId: z.string().min(1),
  pairAddress: validatedAddress,
  baseToken: z.object({
    address: validatedAddress,
    name: z.string().min(1),
    symbol: z.string().min(1),
    decimals: z.number().int().min(0).max(36).default(18),
  }),
  quoteToken: z.object({
    address: validatedAddress,
    name: z.string().min(1),
    symbol: z.string().min(1),
    decimals: z.number().int().min(0).max(36).default(18),
  }),
  priceUsd: finitePositiveNumber,
  liquidityUsd: finiteNonNegativeNumber.default(0),
  volume24hUsd: finiteNonNegativeNumber.default(0),
  priceChange24h: z.preprocess(
    (val) => (typeof val === 'string' ? Number(val) : val),
    z.number().finite().default(0),
  ),
  timestamp: validatedTimestamp,
});

export type TokenPair = z.infer<typeof tokenPairSchema>;

/**
 * Zod validation and normalization schema for Wallet Transactions.
 */
export const walletTransactionSchema = z.object({
  hash: z.string().min(10),
  chainId: z.string().min(1),
  fromAddress: validatedAddress,
  toAddress: validatedAddress,
  value: positiveBigNumber,
  gasUsed: z.preprocess(
    (val) => (val !== undefined ? normalizeBigNumber(val) : undefined),
    z.string().optional(),
  ),
  gasPrice: z.preprocess(
    (val) => (val !== undefined ? normalizeBigNumber(val) : undefined),
    z.string().optional(),
  ),
  timestamp: validatedTimestamp,
  status: z.enum(['confirmed', 'failed', 'pending']),
  blockNumber: z.preprocess(
    (val) => (typeof val === 'string' ? Number(val) : val),
    z.number().int().positive(),
  ),
});

export type WalletTransaction = z.infer<typeof walletTransactionSchema>;

/**
 * Zod validation and normalization schema for Swap Events.
 */
export const swapEventSchema = z.object({
  txHash: z.string().min(10),
  chainId: z.string().min(1),
  dexId: z.string().min(1),
  pairAddress: validatedAddress,
  sender: validatedAddress,
  tokenIn: validatedAddress,
  tokenOut: validatedAddress,
  amountIn: positiveBigNumber,
  amountOut: positiveBigNumber,
  priceUsd: finitePositiveNumber,
  timestamp: validatedTimestamp,
  orderIndex: z.preprocess(
    (val) => (typeof val === 'string' ? Number(val) : val),
    z.number().int().min(0).optional(),
  ),
});

export type SwapEvent = z.infer<typeof swapEventSchema>;

/**
 * Zod validation and normalization schema for Security Reports.
 */
export const securityReportSchema = z.object({
  targetAddress: validatedAddress,
  chainId: z.string().min(1),
  isHoneypot: z.preprocess((val) => val === '1' || val === 1 || val === true, z.boolean()),
  isBlacklisted: z.preprocess((val) => val === '1' || val === 1 || val === true, z.boolean()),
  isOpenSource: z.preprocess((val) => val === '1' || val === 1 || val === true, z.boolean()),
  buyTax: z.preprocess(
    (val) => (typeof val === 'string' ? Number(val) : val),
    z.number().min(0).max(100),
  ),
  sellTax: z.preprocess(
    (val) => (typeof val === 'string' ? Number(val) : val),
    z.number().min(0).max(100),
  ),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  threatFlags: z.array(z.string()).default([]),
  timestamp: validatedTimestamp,
});

export type SecurityReport = z.infer<typeof securityReportSchema>;

/**
 * Zod validation schema for CoinGecko simple price responses.
 */
export const coinGeckoPriceSchema = z.record(
  z.string(),
  z.object({
    usd: finitePositiveNumber,
    last_updated_at: z.number().optional(),
  }),
);

export type CoinGeckoPriceRecord = z.infer<typeof coinGeckoPriceSchema>;

/**
 * Zod validation schema for Ethereum RPC gas price response.
 */
export const ethGasPriceSchema = z.object({
  jsonrpc: z.literal('2.0'),
  result: z.string().regex(/^0x[0-9a-fA-F]+$/),
  id: z.union([z.number(), z.string(), z.null()]).optional(),
});

export type EthGasPriceResponse = z.infer<typeof ethGasPriceSchema>;
