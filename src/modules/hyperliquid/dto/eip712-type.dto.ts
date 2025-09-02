import { TypedDataDomain } from 'ethers';

export const isMainnet = process.env.IS_MAINNET == 'true';

// ==============
// Data type use for Deposit Permit
// ==============
export const HyperliquidDepositPermitDomain: TypedDataDomain = {
  name: isMainnet ? 'USD Coin' : 'USDC2',
  version: isMainnet ? '2' : '1',
  chainId: isMainnet ? 42161 : 421614,
  verifyingContract: process.env.USDC_CONTRACT_ADDRESS,
};

export const HyperliquidDepositPermitType = {
  Permit: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
};

// ==============
// Data type use for Withdraw
// ==============
export const HyperliquidWithdrawDomain = {
  name: 'HyperliquidSignTransaction',
  version: '1',
  chainId: isMainnet ? 42161 : 421614,
  verifyingContract: '0x0000000000000000000000000000000000000000',
};

export const HyperliquidWithdrawType = {
  'HyperliquidTransaction:Withdraw': [
    { name: 'hyperliquidChain', type: 'string' },
    { name: 'destination', type: 'string' },
    { name: 'amount', type: 'string' },
    { name: 'time', type: 'uint64' },
  ],
};

// ==============
// Data type use for Transfer Spot To Perp
// ==============
export const HyperliquidTransferSpotToPerpDomain = {
  name: 'HyperliquidSignTransaction',
  version: '1',
  chainId: isMainnet ? 42161 : 421614,
  verifyingContract: '0x0000000000000000000000000000000000000000',
};

export const HyperliquidTransferSpotToPerpType = {
  'HyperliquidTransaction:UsdClassTransfer': [
    { name: 'hyperliquidChain', type: 'string' },
    { name: 'amount', type: 'string' },
    { name: 'toPerp', type: 'bool' },
    { name: 'nonce', type: 'uint64' },
  ],
};

// ==============
// Data type use for Transfer Spot To Perp
// ==============
export const HyperliquidUsdSendDomain = {
  name: 'HyperliquidSignTransaction',
  version: '1',
  chainId: isMainnet ? 42161 : 421614,
  verifyingContract: '0x0000000000000000000000000000000000000000',
};

export const HyperliquidUsdSendType = {
  'HyperliquidTransaction:UsdSend': [
    { name: 'hyperliquidChain', type: 'string' },
    { name: 'destination', type: 'string' },
    { name: 'amount', type: 'string' },
    { name: 'time', type: 'uint64' },
  ],
};
export const hyperliquidChain = isMainnet ? 'Mainnet' : 'Testnet';
export const signatureChainId = isMainnet ? '0xa4b1' : '0x66eee'; // 42161 : 421614 in hexa format
