import { BaseEntity } from './base.entity';
import { Column, Entity } from 'typeorm';

@Entity('latest_block')
export class LatestBlockEntity extends BaseEntity {
  @Column({ type: 'int', name: 'latest_block' })
  latestBlock: number;

  @Column({ type: 'varchar', name: 'service' })
  service: string;
}
