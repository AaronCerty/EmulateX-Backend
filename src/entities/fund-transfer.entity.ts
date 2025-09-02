import { BaseEntity } from './base.entity';
import { DecimalColumnTransformer } from 'src/shared/utils/column-transform';
import { Column, Entity, Index } from 'typeorm';

export enum FundTransferType {
  SMART_CONTRACT_TO_FUND_WALLET = 'SMART_CONTRACT_TO_FUND_WALLET',
  FUND_WALLET_TO_SMART_CONTRACT = 'FUND_WALLET_TO_SMART_CONTRACT',
}

export enum FundTransferStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('fund_transfer')
export class FundTransferEntity extends BaseEntity {
  @Column({ nullable: false, name: 'copy_trade_session_id', type: 'varchar' })
  copyTradeSessionId: string;

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

  @Column({ nullable: false, name: 'status', type: 'enum', enum: FundTransferStatus })
  status: FundTransferStatus;

  @Column({ nullable: false, name: 'type', type: 'enum', enum: FundTransferType })
  type: FundTransferType;

  @Column({ nullable: true, name: 'tx_hash', unique: true, type: 'varchar' })
  txHash: string;

  @Column({
    nullable: true,
    name: 'gas_fee',
    type: 'decimal',
    precision: 72,
    scale: 0,
    default: 0,
    transformer: new DecimalColumnTransformer(),
  })
  gasFee: number;

  @Column({
    nullable: true,
    name: 'block_number',
    type: 'decimal',
    precision: 20,
    scale: 0,
    transformer: new DecimalColumnTransformer(),
  })
  blockNumber: number;

  @Column({ nullable: true, name: 'block_timestamp', type: 'timestamp' })
  blockTimestamp: Date;
}
