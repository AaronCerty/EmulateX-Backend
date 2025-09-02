import { BaseEntity } from './base.entity';
import { DecimalColumnTransformer } from 'src/shared/utils/column-transform';
import { Column, Entity } from 'typeorm';

export enum TransactionDirection {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum TransactionType {
  SPOT = 'SPOT',
  PREPETUALS = 'PREPETUALS',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('transactions')
export class TransactionEntity extends BaseEntity {
  @Column({ name: 'chain_id' })
  chainId: number;

  @Column({ nullable: true, type: 'uuid', name: 'leader_id' })
  leaderId: string;

  @Column({ nullable: true, type: 'uuid', name: 'copier_id' })
  copierId: string;

  @Column({ name: 'base' })
  base: string;

  @Column({ name: 'quote' })
  quote: string;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    name: 'amount',
    nullable: true,
    transformer: new DecimalColumnTransformer(),
  })
  amount: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    name: 'price',
    nullable: true,
    transformer: new DecimalColumnTransformer(),
  })
  price: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    name: 'total_value',
    nullable: true,
    transformer: new DecimalColumnTransformer(),
  })
  totalValue: number;

  @Column({
    type: 'enum',
    enum: TransactionDirection,
    name: 'direction',
  })
  direction: TransactionDirection;

  @Column({
    type: 'enum',
    enum: TransactionType,
    name: 'type',
    default: TransactionType.SPOT,
  })
  type: TransactionType;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    name: 'close_pnl',
    nullable: true,
    transformer: new DecimalColumnTransformer(),
  })
  closedPnl: number;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
    name: 'status',
  })
  status: TransactionStatus;

  @Column({ nullable: true, name: 'transaction_hash' })
  transactionHash: string;

  @Column({ nullable: true, name: 'timestamp_ms' })
  timestampMs: string;

  @Column({ nullable: true, name: 'error_message' })
  errorMessage: string;

  @Column({ nullable: true, type: 'uuid', name: 'copy_from_transaction' })
  copyFromTransaction: string;

  @Column({ nullable: true, name: 'hyperliquid_order_id' })
  hyperliquidOrderId: string;

  @Column({ nullable: true, name: 'metadata' })
  metadata: string;
}
