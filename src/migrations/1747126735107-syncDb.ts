import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1747126735107 implements MigrationInterface {
  name = 'SyncDb1747126735107';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "hyperliquid_deposit" ADD "deposit_history_id" uuid`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "hyperliquid_deposit" DROP COLUMN "deposit_history_id"`);
  }
}
