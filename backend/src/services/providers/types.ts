/**
 * Canonical raw provider response type definitions.
 *
 * These interfaces describe the exact shapes returned by external APIs.
 * They live in src/ so production code can import them without reaching
 * into the tests/ directory.  Test fixtures import from here and add
 * sample data on top.
 */

// ─── DexScreener ────────────────────────────────────────────────────────────

/** A single trading pair returned by DexScreener. */
export interface RawDexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  volume?: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  liquidity?: {
    usd: number;
    base: number;
    quote: number;
  };
  txns?: {
    m5?: { buys: number; sells: number };
    h1?: { buys: number; sells: number };
    h6?: { buys: number; sells: number };
    h24?: { buys: number; sells: number };
  };
  info?: {
    imageUrl?: string;
    openGraph?: string;
  };
  pairCreatedAt?: number;
  timestamp?: number;
}

/** Top-level DexScreener response envelope. */
export interface RawDexScreenerResponse {
  schemaVersion: string;
  pairs: RawDexScreenerPair[] | null;
}

// ─── Birdeye ─────────────────────────────────────────────────────────────────

/** Birdeye token price data payload. */
export interface RawBirdeyePriceData {
  value: number;
  updateUnixTime: number;
  updateHumanTime: string;
  priceChange24h: number;
}

/** Birdeye price response envelope. */
export interface RawBirdeyePriceResponse {
  success: boolean;
  data: RawBirdeyePriceData;
}

/** Birdeye token overview payload. */
export interface RawBirdeyeOverviewData {
  address: string;
  decimals: number;
  symbol: string;
  name: string;
  price: number;
  liquidity: number;
  v24hUSD: number;
  mc: number;
}

/** Birdeye overview response envelope. */
export interface RawBirdeyeOverviewResponse {
  success: boolean;
  data: RawBirdeyeOverviewData;
}

// ─── GoPlus ──────────────────────────────────────────────────────────────────

/** GoPlus token security fields. */
export interface RawGoPlusTokenSecurityData {
  buy_tax?: string;
  sell_tax?: string;
  is_honeypot?: string;
  is_open_source?: string;
  cannot_sell_all?: string;
  creator_address?: string;
  owner_address?: string;
  is_airdrop_scam?: string;
  lp_holder_count?: string;
  holder_count?: string;
}

/** GoPlus token security response envelope. */
export interface RawGoPlusTokenSecurityResponse {
  code: number;
  message: string;
  result: Record<string, RawGoPlusTokenSecurityData>;
}

/** GoPlus address security analysis response. */
export interface RawGoPlusAddressSecurityResponse {
  code: number;
  message: string;
  result: {
    phishing_activities?: string;
    stealing_attack?: string;
    blackmail_activities?: string;
    cybercrime?: string;
    sanctioned?: string;
  };
}
