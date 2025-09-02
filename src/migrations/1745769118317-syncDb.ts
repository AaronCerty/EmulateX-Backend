import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1745769118317 implements MigrationInterface {
  name = 'SyncDb1745769118317';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "transactions" ADD "hyperliquid_order_id" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "hyperliquid_order_id"`);
  }
}
