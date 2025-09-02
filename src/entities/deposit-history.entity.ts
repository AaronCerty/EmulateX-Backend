import { BaseEntity } from './base.entity';
import { DecimalColumnTransformer } from 'src/shared/utils/column-transform';
import { Column, Entity } from 'typeorm';

export enum DepositHistoryStatus {
  DEPOSITED_BLOCKCHAIN = 'DEPOSITED_BLOCKCHAIN',
  DEPOSITED_HYPERLIQUID = 'DEPOSITED_HYPERLIQUID',
  DEPOSITED_HYPERLIQUID_FAILED = 'DEPOSITED_HYPERLIQUID_FAILED',
  DONE = 'DONE',
}

@Entity('deposit_history')
export class DepositHistoryEntity extends BaseEntity {
  @Column({ nullable: false, name: 'wallet_address', type: 'varchar' })
  walletAddress: string;

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

  @Column({ nullable: false, name: 'token', type: 'varchar' })
  token: string;

  @Column({ nullable: false, name: 'tx_hash', unique: true, type: 'varchar' })
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

  @Column({ nullable: true, name: 'status', type: 'enum', enum: DepositHistoryStatus })
  status: DepositHistoryStatus;
}
