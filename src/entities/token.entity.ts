import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('token')
export class TokenEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'slug', nullable: true })
  slug: string;

  @Column({ name: 'address', nullable: true })
  address: string;

  @Column({ name: 'chain_id', nullable: true })
  chainId: number;

  @Column({ name: 'logo_img', nullable: true })
  logoImg: string;

  @Column({ name: 'name', nullable: true })
  name: string;

  @Column({ name: 'symbol', nullable: true })
  symbol: string;
}
