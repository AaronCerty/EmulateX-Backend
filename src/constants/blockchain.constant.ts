export enum CopyTradingEventType {
  UserRegistered = 'UserRegistered',
  FundsDeposited = 'FundsDeposited',
  FundsWithdrawn = 'FundsWithdrawn',
  FeePercentageUpdated = 'FeePercentageUpdated',
  FundsTransferredToWallet = 'FundsTransferredToWallet',
}

export enum HyperliquidBridge2EventType {
  FinalizedWithdrawal = 'FinalizedWithdrawal',
  batchedFinalizeWithdrawals = 'batchedFinalizeWithdrawals',
}
