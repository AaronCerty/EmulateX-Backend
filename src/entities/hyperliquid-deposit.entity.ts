import { BaseEntity } from './base.entity';
import { DecimalColumnTransformer } from 'src/shared/utils/column-transform';
import { Column, Entity } from 'typeorm';

export enum HyperliquidDepositStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('hyperliquid_deposit')
export class HyperliquidDepositEntity extends BaseEntity {
  @Column({ name: 'user_wallet_address' })
  userWalletAddress: string;

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

  @Column({ nullable: false, name: 'status', type: 'enum', enum: HyperliquidDepositStatus })
  status: HyperliquidDepositStatus;

  @Column({ nullable: true, name: 'tx_hash', unique: true, type: 'varchar' })
  txHash: string;

  @Column({
    nullable: false,
    name: 'block_number',
    type: 'decimal',
    precision: 20,
    scale: 0,
    default: 0,
    transformer: new DecimalColumnTransformer(),
  })
  blockNumber: number;

  @Column({ type: 'uuid', name: 'deposit_history_id', nullable: true })
  depositHistoryId: string;
}
