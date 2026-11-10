/**
 * Sample malformed payloads representing edge cases, corruptions, and invalid inputs
 * for tokenizer, transaction, swap event, and security report sanitation pipelines.
 */

export const malformedTokenPairs = [
  // Missing required fields
  {
    chainId: 'ethereum',
  },
  // Negative priceUsd
  {
    chainId: 'ethereum',
    dexId: 'uniswap',
    pairAddress: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
    baseToken: {
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      name: 'USD Coin',
      symbol: 'USDC',
    },
    quoteToken: {
      address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      name: 'Wrapped Ether',
      symbol: 'WETH',
    },
    priceUsd: -2500.5,
    timestamp: 1718000000000,
  },
  // NaN and non-numeric price
  {
    chainId: 'ethereum',
    dexId: 'uniswap',
    pairAddress: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
    baseToken: {
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      name: 'USD Coin',
      symbol: 'USDC',
    },
    quoteToken: {
      address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      name: 'Wrapped Ether',
      symbol: 'WETH',
    },
    priceUsd: 'NaN',
    timestamp: 1718000000000,
  },
  // Malformed EVM address (invalid length and characters)
  {
    chainId: 'ethereum',
    dexId: 'uniswap',
    pairAddress: '0xinvalid_evm_address',
    baseToken: {
      address: '0x000',
      name: 'Token A',
      symbol: 'TKA',
    },
    quoteToken: {
      address: '0x111',
      name: 'Token B',
      symbol: 'TKB',
    },
    priceUsd: 1.0,
    timestamp: 1718000000000,
  },
  // Negative liquidity and volume
  {
    chainId: 'ethereum',
    dexId: 'uniswap',
    pairAddress: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
    baseToken: {
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      name: 'USD Coin',
      symbol: 'USDC',
    },
    quoteToken: {
      address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      name: 'Wrapped Ether',
      symbol: 'WETH',
    },
    priceUsd: 10.0,
    liquidityUsd: -500,
    volume24hUsd: -100,
    timestamp: 1718000000000,
  },
];

export const malformedWalletTransactions = [
  null,
  // Negative value and invalid hash
  {
    hash: '0xbad',
    chainId: 'ethereum',
    fromAddress: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
    toAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    value: -1000,
    timestamp: 1718000000000,
    status: 'confirmed',
    blockNumber: 19000000,
  },
  // NaN value and malformed status
  {
    hash: '0x4f49479e0bf0327fef66b19d41d91456a00c6dc6714a9cd3a17e5a8820f18c57',
    chainId: 'ethereum',
    fromAddress: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
    toAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    value: 'NaN',
    timestamp: 1718000000000,
    status: 'invalid_status_enum',
    blockNumber: -5,
  },
];

export const malformedSwapEvents = [
  // Missing addresses & negative amountIn
  {
    txHash: '0x4f49479e0bf0327fef66b19d41d91456a00c6dc6714a9cd3a17e5a8820f18c57',
    chainId: 'ethereum',
    dexId: 'uniswap',
    amountIn: -100,
    amountOut: 200,
    priceUsd: 2.0,
    timestamp: 1718000000000,
  },
];

export const duplicateBatchRecords = [
  {
    txHash: '0x4f49479e0bf0327fef66b19d41d91456a00c6dc6714a9cd3a17e5a8820f18c57',
    chainId: 'ethereum',
    dexId: 'uniswap',
    pairAddress: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
    sender: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
    tokenIn: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    tokenOut: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    amountIn: '1000000',
    amountOut: '350',
    priceUsd: 3500.0,
    timestamp: 1718000001000,
  },
  {
    txHash: '0x4f49479e0bf0327fef66b19d41d91456a00c6dc6714a9cd3a17e5a8820f18c57',
    chainId: 'ethereum',
    dexId: 'uniswap',
    pairAddress: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
    sender: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
    tokenIn: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    tokenOut: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    amountIn: '1000000',
    amountOut: '350',
    priceUsd: 3500.0,
    timestamp: 1718000002000,
  },
];

export const outOfOrderBatchRecords = [
  {
    txHash: '0x3333333333333333333333333333333333333333333333333333333333333333',
    chainId: 'ethereum',
    dexId: 'uniswap',
    pairAddress: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
    sender: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
    tokenIn: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    tokenOut: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    amountIn: '300',
    amountOut: '100',
    priceUsd: 3000.0,
    timestamp: 1718000030000,
  },
  {
    txHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
    chainId: 'ethereum',
    dexId: 'uniswap',
    pairAddress: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
    sender: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
    tokenIn: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    tokenOut: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    amountIn: '100',
    amountOut: '50',
    priceUsd: 1000.0,
    timestamp: 1718000010000,
  },
  {
    txHash: '0x2222222222222222222222222222222222222222222222222222222222222222',
    chainId: 'ethereum',
    dexId: 'uniswap',
    pairAddress: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
    sender: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
    tokenIn: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    tokenOut: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    amountIn: '200',
    amountOut: '80',
    priceUsd: 2000.0,
    timestamp: 1718000020000,
  },
];
