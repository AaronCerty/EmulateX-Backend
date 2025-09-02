import { BaseEntity } from 'src/entities/base.entity';
import { Column, Entity } from 'typeorm';

export enum LockAddressStatus {
  AVAILABLE = 'AVAILABLE',
  UNAVAILABLE = 'UNAVAILABLE',
}

@Entity('lock_address')
export class LockAddressEntity extends BaseEntity {
  @Column({ nullable: false, name: 'address', type: 'varchar', unique: true })
  address: string;

  @Column({ nullable: false, name: 'status', type: 'enum', enum: LockAddressStatus })
  status: LockAddressStatus;
}
