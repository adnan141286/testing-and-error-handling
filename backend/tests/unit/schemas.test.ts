import {
  tokenPairSchema,
  walletTransactionSchema,
  swapEventSchema,
  securityReportSchema,
} from '../../src/sanitizers';
import {
  malformedTokenPairs,
  malformedWalletTransactions,
  malformedSwapEvents,
} from '../fixtures/malformed.fixture';

describe('Zod Validation Schemas', (): void => {
  describe('tokenPairSchema', (): void => {
    it('validates and normalizes a compliant EVM token pair', (): void => {
      const valid = {
        chainId: 'ethereum',
        dexId: 'uniswap',
        pairAddress: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
        baseToken: {
          address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6,
        },
        quoteToken: {
          address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
          name: 'Wrapped Ether',
          symbol: 'WETH',
        },
        priceUsd: '3500.25',
        liquidityUsd: '5000000',
        volume24hUsd: '1000000',
        timestamp: 1718000000000,
      };

      const result = tokenPairSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pairAddress).toBe('0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640');
        expect(result.data.priceUsd).toBe(3500.25);
        expect(result.data.quoteToken.decimals).toBe(18); // Default
      }
    });

    it('rejects all malformed token pair variations', (): void => {
      for (const malformed of malformedTokenPairs) {
        const result = tokenPairSchema.safeParse(malformed);
        expect(result.success).toBe(false);
      }
    });
  });

  describe('walletTransactionSchema', (): void => {
    it('validates a compliant wallet transaction payload', (): void => {
      const valid = {
        hash: '0x4f49479e0bf0327fef66b19d41d91456a00c6dc6714a9cd3a17e5a8820f18c57',
        chainId: 'ethereum',
        fromAddress: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
        toAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        value: '1000000000000000000',
        timestamp: '2026-06-10T08:00:00.000Z',
        status: 'confirmed',
        blockNumber: 19500000,
      };

      const result = walletTransactionSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.value).toBe('1000000000000000000');
        expect(result.data.timestamp).toBe(1781078400000);
      }
    });

    it('rejects malformed wallet transactions', (): void => {
      for (const malformed of malformedWalletTransactions) {
        const result = walletTransactionSchema.safeParse(malformed);
        expect(result.success).toBe(false);
      }
    });
  });

  describe('swapEventSchema', (): void => {
    it('validates a compliant swap event', (): void => {
      const valid = {
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
        timestamp: 1718000000000,
      };

      const result = swapEventSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects malformed swap events', (): void => {
      for (const malformed of malformedSwapEvents) {
        const result = swapEventSchema.safeParse(malformed);
        expect(result.success).toBe(false);
      }
    });
  });

  describe('securityReportSchema', (): void => {
    it('validates a security report and coerces numeric string flags', (): void => {
      const valid = {
        targetAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        chainId: '1',
        isHoneypot: '0',
        isBlacklisted: '0',
        isOpenSource: '1',
        buyTax: '0.05',
        sellTax: '0.05',
        riskLevel: 'LOW',
        threatFlags: [],
        timestamp: 1718000000000,
      };

      const result = securityReportSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isHoneypot).toBe(false);
        expect(result.data.isOpenSource).toBe(true);
        expect(result.data.riskLevel).toBe('LOW');
      }
    });

    it('rejects reports with out-of-bounds taxes or invalid risk levels', (): void => {
      const invalidTax = {
        targetAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        chainId: '1',
        isHoneypot: false,
        isBlacklisted: false,
        isOpenSource: true,
        buyTax: 150, // Exceeds 100%
        sellTax: -5,
        riskLevel: 'INVALID_RISK',
        timestamp: 1718000000000,
      };

      const result = securityReportSchema.safeParse(invalidTax);
      expect(result.success).toBe(false);
    });
  });
});
