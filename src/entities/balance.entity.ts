import { BaseEntity } from './base.entity';
import { DecimalColumnTransformer } from 'src/shared/utils/column-transform';
import { Column, Entity } from 'typeorm';

@Entity('balance')
export class BalanceEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({
    type: 'decimal',
    precision: 72,
    scale: 6,
    default: 0,
    name: 'deposited_balance',
    transformer: new DecimalColumnTransformer(),
  })
  depositedBalance: number;

  @Column({
    type: 'decimal',
    precision: 72,
    scale: 6,
    default: 0,
    name: 'available_balance',
    transformer: new DecimalColumnTransformer(),
  })
  availableBalance: number;

  @Column({
    type: 'decimal',
    precision: 72,
    scale: 6,
    default: 0,
    name: 'withdrawn_balance',
    transformer: new DecimalColumnTransformer(),
  })
  withdrawnBalance: number;

  @Column({ type: 'varchar', name: 'balance_wallet_private_key' })
  balanceWalletPrivateKey: string;

  @Column({ type: 'varchar', name: 'balance_wallet_address' })
  balanceWalletAddress: string;
}
