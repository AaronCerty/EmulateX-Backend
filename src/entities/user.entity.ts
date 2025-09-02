import { BaseEntity } from './base.entity';
import { Column, Entity } from 'typeorm';

@Entity('users')
export class UserEntity extends BaseEntity {
  @Column({ nullable: true, name: 'username' })
  username: string;

  @Column({ unique: true, name: 'wallet_address' })
  walletAddress: string;
}
