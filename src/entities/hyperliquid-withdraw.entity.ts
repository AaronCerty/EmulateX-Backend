import { BaseEntity } from './base.entity';
import { DecimalColumnTransformer } from 'src/shared/utils/column-transform';
import { Column, Entity } from 'typeorm';

@Entity('hyperliquid_withdraw')
export class HyperliquidWithdrawEntity extends BaseEntity {
  @Column({ name: 'balance_wallet_address' })
  balanceWalletAddress: string;

  @Column({ name: 'fund_wallet_address' })
  fundWalletAddress: string;

  @Column({
    nullable: false,
    name: 'amount',
    type: 'decimal',
    precision: 72,
    scale: 6,
    default: 0,
    transformer: new DecimalColumnTransformer(),
  })
  amount: number;

  @Column({ nullable: true, name: 'tx_hash', unique: true, type: 'varchar' })
  txHash: string;
}
