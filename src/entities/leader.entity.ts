import { LeaderType, RiskLevel } from '../constants/leader.constant';
import { PortfolioEntity } from 'src/entities/portfolio.entity';
import { Column, Entity } from 'typeorm';

@Entity('leaders')
export class LeaderEntity extends PortfolioEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'name' })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'avt' })
  avt: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'image_url' })
  imageUrl: string;

  @Column({ type: 'text', nullable: true, name: 'description' })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'telegram_url' })
  telegramUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'x_url' })
  xUrl: string;

  @Column({ type: 'enum', enum: RiskLevel, nullable: true, name: 'risk_level' })
  riskLevel: RiskLevel;

  @Column({ type: 'enum', enum: LeaderType, default: LeaderType.TRADER, name: 'leader_type' })
  leaderType: LeaderType;

  @Column({ type: 'timestamp', nullable: true, name: 'start_trade_time' })
  startTradeTime: Date;

  @Column({ default: 0, name: 'followers_count' })
  followersCount: number;

  @Column({ default: false, name: 'history_synced' })
  historySynced: boolean;
}
