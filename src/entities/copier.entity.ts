import { BaseEntity } from './base.entity';
import { PortfolioEntity } from 'src/entities/portfolio.entity';
import { DecimalColumnTransformer } from 'src/shared/utils/column-transform';
import { Column, Entity } from 'typeorm';

@Entity('copiers')
export class CopierEntity extends PortfolioEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'total_balance',
    transformer: new DecimalColumnTransformer(),
  })
  totalBalance: number;

  @Column({ type: 'varchar', name: 'fund_wallet_private_key' })
  fundWalletPrivateKey: string;

  @Column({ type: 'varchar', name: 'fund_wallet_address' })
  fundWalletAddress: string;

  @Column({ default: false, name: 'history_synced' })
  historySynced: boolean;
}
