import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1745767606197 implements MigrationInterface {
  name = 'SyncDb1745767606197';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "copy_trade_session" DROP COLUMN "tp"`);
    await queryRunner.query(`ALTER TABLE "copy_trade_session" DROP COLUMN "sl"`);
    await queryRunner.query(`ALTER TABLE "transactions" ADD "close_pnl" numeric(18,8)`);
    await queryRunner.query(`ALTER TABLE "copy_trade_session" ADD "stop_copy_trade_at" TIMESTAMP`);
    await queryRunner.query(
      `ALTER TABLE "copy_trade_session" ADD "stop_loss_trigger_percentage" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "copy_trade_session" DROP COLUMN "stop_loss_trigger_percentage"`);
    await queryRunner.query(`ALTER TABLE "copy_trade_session" DROP COLUMN "stop_copy_trade_at"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "close_pnl"`);
    await queryRunner.query(`ALTER TABLE "copy_trade_session" ADD "sl" numeric(10,2) NOT NULL DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "copy_trade_session" ADD "tp" numeric(10,2) NOT NULL DEFAULT '0'`);
  }
}
