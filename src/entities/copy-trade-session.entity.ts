import { BaseEntity } from './base.entity';
import { DecimalColumnTransformer } from 'src/shared/utils/column-transform';
import { Column, Entity } from 'typeorm';

export enum CopyTradeSessionStatus {
  CREATING = 'CREATING', // User created copy trade session, wait for smart contract to send USDC to funding wallet
  FUNDING = 'FUNDING', // Smart contract sent USDC to funding wallet, wait for deposit to hyperliquid
  HYPERLIQUID_DEPOSIT = 'HYPERLIQUID_DEPOSIT', // Deposited to hyperliquid, wait for copy trade to running
  RUNNING = 'RUNNING', // Deposit to hyperliquid, wait for copy trade to complete
  COMPLETED = 'COMPLETED', // Copy trade completed
  FAILED = 'FAILED', // Copy trade failed
}
@Entity('copy_trade_session')
export class CopyTradeSessionEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'leader_id' })
  leaderId: string;

  @Column({ type: 'uuid', name: 'copier_id' })
  copierId: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'allocation_amount',
    transformer: new DecimalColumnTransformer(),
  })
  amount: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'amount_after_stop',
    nullable: true,
    transformer: new DecimalColumnTransformer(),
  })
  amountAfterStop: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'fixed_amount_per_trade',
    transformer: new DecimalColumnTransformer(),
  })
  fixedAmountPerTrade: number;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 1,
    name: 'slippage',
    transformer: new DecimalColumnTransformer(),
  })
  slippage: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'scale_factor',
    transformer: new DecimalColumnTransformer(),
  })
  scaleFactor: number;

  @Column({
    type: 'timestamp',
    name: 'start_copy_trade_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  startCopyTradeAt: Date;

  @Column({ type: 'timestamp', name: 'stop_copy_trade_at', nullable: true })
  stopCopyTradeAt: Date;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'stop_loss_trigger_percentage',
    transformer: new DecimalColumnTransformer(),
  })
  stopLossTriggerPercentage: number; // will stop copytrade if amount is lost more than this percentage

  @Column({ type: 'enum', enum: CopyTradeSessionStatus, default: CopyTradeSessionStatus.CREATING })
  status: CopyTradeSessionStatus;

  @Column({ type: 'boolean', default: false, name: 'confirm_sharing' })
  confirmSharing: boolean;

  @Column({ type: 'boolean', default: false, name: 'agree_service_terms' })
  agreeServiceTerms: boolean;
}
