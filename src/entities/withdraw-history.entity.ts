import { BaseEntity } from './base.entity';
import { DecimalColumnTransformer } from 'src/shared/utils/column-transform';
import { Column, Entity } from 'typeorm';

export enum WithdrawHistoryStatus {
  PENDING_HYPERLIQUID = 'PENDING_HYPERLIQUID',
  PENDING_BLOCKCHAIN = 'PENDING_BLOCKCHAIN',
  DONE = 'DONE',
  FAILED = 'FAILED',
}

@Entity('withdraw_history')
export class WithdrawHistoryEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

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

  @Column({
    nullable: true,
    name: 'fee',
    type: 'decimal',
    precision: 72,
    scale: 6,
    default: 0,
    transformer: new DecimalColumnTransformer(),
  })
  fee: number;

  @Column({ nullable: false, name: 'token', type: 'varchar' })
  token: string;

  @Column({ nullable: true, name: 'tx_hash', unique: true, type: 'varchar' })
  txHash: string;

  @Column({
    nullable: true,
    name: 'block_number',
    type: 'decimal',
    precision: 20,
    scale: 0,
    default: 0,
    transformer: new DecimalColumnTransformer(),
  })
  blockNumber: number;

  @Column({ nullable: false, name: 'status', type: 'enum', enum: WithdrawHistoryStatus })
  status: WithdrawHistoryStatus;

  @Column({
    nullable: false,
    name: 'nonce',
    type: 'decimal',
    precision: 20,
    scale: 0,
    unique: true,
    transformer: new DecimalColumnTransformer(),
  })
  nonce: number;
}
