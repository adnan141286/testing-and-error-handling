/**
 * GoPlus test fixtures.
 *
 * Types are defined in src/ and re-exported here so test files have a single
 * fixture import point.  No production src/ file may import from tests/.
 */
export type {
  RawGoPlusTokenSecurityData,
  RawGoPlusTokenSecurityResponse,
  RawGoPlusAddressSecurityResponse,
} from '../../src/services/providers/types';

import type {
  RawGoPlusTokenSecurityResponse,
  RawGoPlusAddressSecurityResponse,
} from '../../src/services/providers/types';

/**
 * Sample fixture representing a safe GoPlus token security response.
 */
export const mockGoPlusSafeTokenResponse: RawGoPlusTokenSecurityResponse = {
  code: 1,
  message: 'OK',
  result: {
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
      buy_tax: '0',
      sell_tax: '0',
      is_honeypot: '0',
      is_open_source: '1',
      cannot_sell_all: '0',
      creator_address: '0x0000000000000000000000000000000000000000',
      owner_address: '0x0000000000000000000000000000000000000000',
      is_airdrop_scam: '0',
      lp_holder_count: '250',
      holder_count: '1540000',
    },
  },
};

/**
 * Sample fixture representing a malicious/honeypot GoPlus token security response.
 */
export const mockGoPlusMaliciousTokenResponse: RawGoPlusTokenSecurityResponse = {
  code: 1,
  message: 'OK',
  result: {
    '0xbad0000000000000000000000000000000000001': {
      buy_tax: '0.1',
      sell_tax: '0.99',
      is_honeypot: '1',
      is_open_source: '0',
      cannot_sell_all: '1',
      is_airdrop_scam: '1',
    },
  },
};

/**
 * Sample fixture representing a clean GoPlus address security response.
 */
export const mockGoPlusCleanAddressResponse: RawGoPlusAddressSecurityResponse = {
  code: 1,
  message: 'OK',
  result: {
    phishing_activities: '0',
    stealing_attack: '0',
    blackmail_activities: '0',
    cybercrime: '0',
    sanctioned: '0',
  },
};
