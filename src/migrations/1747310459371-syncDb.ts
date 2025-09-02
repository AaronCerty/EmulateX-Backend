import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1747310459371 implements MigrationInterface {
  name = 'SyncDb1747310459371';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "copy_trade_session" ADD "amount_after_stop" numeric(10,2) DEFAULT '0'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "copy_trade_session" DROP COLUMN "amount_after_stop"`);
  }
}
