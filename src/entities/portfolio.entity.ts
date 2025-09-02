import { BaseEntity } from 'src/entities/base.entity';
import { DecimalColumnTransformer } from 'src/shared/utils/column-transform';
import { Column } from 'typeorm';

export class PortfolioEntity extends BaseEntity {
  // AUM (Assets Under Management) fields for different time ranges
  @Column({
    type: 'decimal',
    precision: 88,
    scale: 18,
    nullable: true,
    default: 0,
    name: 'aum_1d',
    transformer: new DecimalColumnTransformer(),
  })
  aum1d: number;

  @Column({
    type: 'decimal',
    precision: 88,
    scale: 18,
    nullable: true,
    default: 0,
    name: 'aum_7d',
    transformer: new DecimalColumnTransformer(),
  })
  aum7d: number;

  @Column({
    type: 'decimal',
    precision: 88,
    scale: 18,
    nullable: true,
    default: 0,
    name: 'aum_30d',
    transformer: new DecimalColumnTransformer(),
  })
  aum30d: number;

  // PNL fields for different time ranges
  @Column({
    type: 'decimal',
    precision: 88,
    scale: 18,
    nullable: true,
    default: 0,
    name: 'pnl_1d',
    transformer: new DecimalColumnTransformer(),
  })
  pnl1d: number;

  @Column({
    type: 'decimal',
    precision: 88,
    scale: 18,
    nullable: true,
    default: 0,
    name: 'pnl_7d',
    transformer: new DecimalColumnTransformer(),
  })
  pnl7d: number;

  @Column({
    type: 'decimal',
    precision: 88,
    scale: 18,
    nullable: true,
    default: 0,
    name: 'pnl_30d',
    transformer: new DecimalColumnTransformer(),
  })
  pnl30d: number;

  // ROI fields for different time ranges
  @Column({
    type: 'decimal',
    precision: 88,
    scale: 18,
    nullable: true,
    default: 0,
    name: 'roi_1d',
    transformer: new DecimalColumnTransformer(),
  })
  roi1d: number;

  @Column({
    type: 'decimal',
    precision: 88,
    scale: 18,
    nullable: true,
    default: 0,
    name: 'roi_7d',
    transformer: new DecimalColumnTransformer(),
  })
  roi7d: number;

  @Column({
    type: 'decimal',
    precision: 88,
    scale: 18,
    nullable: true,
    default: 0,
    name: 'roi_30d',
    transformer: new DecimalColumnTransformer(),
  })
  roi30d: number;

  // Win rate fields for different time ranges
  @Column({
    type: 'decimal',
    precision: 88,
    scale: 18,
    nullable: true,
    default: 0,
    name: 'win_rate_1d',
    transformer: new DecimalColumnTransformer(),
  })
  winRate1d: number;

  @Column({
    type: 'decimal',
    precision: 88,
    scale: 18,
    nullable: true,
    default: 0,
    name: 'win_rate_7d',
    transformer: new DecimalColumnTransformer(),
  })
  winRate7d: number;

  @Column({
    type: 'decimal',
    precision: 88,
    scale: 18,
    nullable: true,
    default: 0,
    name: 'win_rate_30d',
    transformer: new DecimalColumnTransformer(),
  })
  winRate30d: number;
}
