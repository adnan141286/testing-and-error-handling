import { Router, Request, Response } from 'express';
import { QuarantineManager } from '../sanitizers/quarantine';
import { walletTransactionSchema } from '../sanitizers/schemas';
import { EthRpcClient } from '../services/providers/ethRpc.client';
import { BirdeyeClient } from '../services/providers/birdeye.client';
import { EnvConfig, env } from '../config/env';
import { isBirdeyeConfigured } from './tokenPrice.constants';
import { eventLogger } from '../utils/eventLogger';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError } from '../errors/ValidationError';

export interface ExtendedSanitizeRouterOptions {
  quarantineManager?: QuarantineManager;
  ethRpcClient?: EthRpcClient;
  birdeyeClient?: BirdeyeClient;
  config?: EnvConfig;
}

/**
 * Creates extended sanitation routes (Ethereum Block and Birdeye Wallet).
 *
 * @param options - Injected dependencies
 * @returns Configured Express router
 */
export const createExtendedSanitizeRouter = (
  options: ExtendedSanitizeRouterOptions = {},
): Router => {
  const router = Router();
  const quarantineManager = options.quarantineManager ?? new QuarantineManager();
  const ethRpcClient = options.ethRpcClient ?? new EthRpcClient();
  const birdeyeClient = options.birdeyeClient ?? new BirdeyeClient();
  const config = options.config ?? env;

  router.post(
    '/eth-block',
    asyncHandler(async (_req: Request, res: Response): Promise<void> => {
      const block = await ethRpcClient.getLatestBlockTransactions();
      const transactions = block.transactions ?? [];
      const accepted: unknown[] = [];
      const initialCount = quarantineManager.getStats().totalQuarantined;

      for (const tx of transactions) {
        const rawWei =
          typeof tx.value === 'string' && tx.value.startsWith('0x')
            ? BigInt(tx.value).toString()
            : (tx.value ?? '0');
        const rawGas =
          typeof tx.gas === 'string' && tx.gas.startsWith('0x')
            ? BigInt(tx.gas).toString()
            : tx.gas;
        const rawGasPrice =
          typeof tx.gasPrice === 'string' && tx.gasPrice.startsWith('0x')
            ? BigInt(tx.gasPrice).toString()
            : tx.gasPrice;

        const record = {
          hash: tx.hash,
          chainId: '1',
          fromAddress: tx.from,
          toAddress: tx.to ?? '0x0000000000000000000000000000000000000000',
          value: rawWei,
          gasUsed: rawGas,
          gasPrice: rawGasPrice,
          timestamp:
            typeof block.timestamp === 'string' && block.timestamp.startsWith('0x')
              ? Number(BigInt(block.timestamp)) * 1000
              : Date.now(),
          status: 'confirmed',
          blockNumber:
            typeof block.number === 'string' && block.number.startsWith('0x')
              ? Number(BigInt(block.number))
              : 1,
        };

        const sanitized = quarantineManager.sanitizeRecord(
          record,
          walletTransactionSchema,
          'eth-rpc-block',
        );
        if (sanitized !== null) {
          accepted.push(sanitized);
        }
      }

      const quarantinedCount = transactions.length - accepted.length;
      const newlyQuarantined = quarantineManager.getStats().totalQuarantined - initialCount;
      const quarantinedDetails = quarantineManager.getQuarantinedRecords().slice(-newlyQuarantined);

      eventLogger.addEvent(
        'ETH_BLOCK_SANITIZED',
        `Sanitized latest Ethereum block ${block.number}: ${accepted.length} accepted, ${quarantinedCount} quarantined`,
        { blockNumber: block.number, total: transactions.length, accepted: accepted.length },
      );

      res.status(200).json({
        success: true,
        blockNumber: block.number,
        blockHash: block.hash,
        total: transactions.length,
        accepted: accepted.length,
        quarantined: quarantinedCount,
        acceptedRecords: accepted.slice(0, 50),
        quarantinedRecords: quarantinedDetails,
      });
    }),
  );

  router.post(
    '/birdeye-wallet',
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      if (!isBirdeyeConfigured(config)) {
        res.status(400).json({
          success: false,
          configured: false,
          message: 'Birdeye: not configured',
        });
        return;
      }

      const wallet = typeof req.query.wallet === 'string' ? req.query.wallet.trim() : '';
      if (!wallet) {
        throw new ValidationError('Query parameter "wallet" is required');
      }

      const txHistory = await birdeyeClient.getWalletTransactions(wallet);
      res.status(200).json({
        success: true,
        configured: true,
        wallet,
        data: txHistory,
      });
    }),
  );

  return router;
};
