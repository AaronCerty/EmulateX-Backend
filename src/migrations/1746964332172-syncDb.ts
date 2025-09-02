import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1746964332172 implements MigrationInterface {
  name = 'SyncDb1746964332172';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "copiers" ADD "pnl_7d" numeric(20,2) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "copiers" ADD "pnl_30d" numeric(20,2) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "copiers" ADD "pnl_90d" numeric(20,2) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "copiers" ADD "pnl_180d" numeric(20,2) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "copiers" ADD "roi_7d" numeric(10,2) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "copiers" ADD "roi_30d" numeric(10,2) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "copiers" ADD "roi_90d" numeric(10,2) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "copiers" ADD "roi_180d" numeric(10,2) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "copiers" ADD "apy_7d" numeric(10,2) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "copiers" ADD "apy_30d" numeric(10,2) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "copiers" ADD "apy_90d" numeric(10,2) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "copiers" ADD "apy_180d" numeric(10,2) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "copiers" ADD "win_rate_7d" numeric(5,2) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "copiers" ADD "win_rate_30d" numeric(5,2) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "copiers" ADD "win_rate_90d" numeric(5,2) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "copiers" ADD "win_rate_180d" numeric(5,2) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "copiers" ADD "sharpe_ratio_7d" numeric(10,2) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "copiers" ADD "sharpe_ratio_30d" numeric(10,2) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "copiers" ADD "sharpe_ratio_90d" numeric(10,2) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "copiers" ADD "sharpe_ratio_180d" numeric(10,2) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "copiers" ADD "drawdown_7d" numeric(10,2) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "copiers" ADD "drawdown_30d" numeric(10,2) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "copiers" ADD "drawdown_90d" numeric(10,2) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "copiers" ADD "drawdown_180d" numeric(10,2) DEFAULT '0'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "copiers" DROP COLUMN "drawdown_180d"`);
    await queryRunner.query(`ALTER TABLE "copiers" DROP COLUMN "drawdown_90d"`);
    await queryRunner.query(`ALTER TABLE "copiers" DROP COLUMN "drawdown_30d"`);
    await queryRunner.query(`ALTER TABLE "copiers" DROP COLUMN "drawdown_7d"`);
    await queryRunner.query(`ALTER TABLE "copiers" DROP COLUMN "sharpe_ratio_180d"`);
    await queryRunner.query(`ALTER TABLE "copiers" DROP COLUMN "sharpe_ratio_90d"`);
    await queryRunner.query(`ALTER TABLE "copiers" DROP COLUMN "sharpe_ratio_30d"`);
    await queryRunner.query(`ALTER TABLE "copiers" DROP COLUMN "sharpe_ratio_7d"`);
    await queryRunner.query(`ALTER TABLE "copiers" DROP COLUMN "win_rate_180d"`);
    await queryRunner.query(`ALTER TABLE "copiers" DROP COLUMN "win_rate_90d"`);
    await queryRunner.query(`ALTER TABLE "copiers" DROP COLUMN "win_rate_30d"`);
    await queryRunner.query(`ALTER TABLE "copiers" DROP COLUMN "win_rate_7d"`);
    await queryRunner.query(`ALTER TABLE "copiers" DROP COLUMN "apy_180d"`);
    await queryRunner.query(`ALTER TABLE "copiers" DROP COLUMN "apy_90d"`);
    await queryRunner.query(`ALTER TABLE "copiers" DROP COLUMN "apy_30d"`);
    await queryRunner.query(`ALTER TABLE "copiers" DROP COLUMN "apy_7d"`);
    await queryRunner.query(`ALTER TABLE "copiers" DROP COLUMN "roi_180d"`);
    await queryRunner.query(`ALTER TABLE "copiers" DROP COLUMN "roi_90d"`);
    await queryRunner.query(`ALTER TABLE "copiers" DROP COLUMN "roi_30d"`);
    await queryRunner.query(`ALTER TABLE "copiers" DROP COLUMN "roi_7d"`);
    await queryRunner.query(`ALTER TABLE "copiers" DROP COLUMN "pnl_180d"`);
    await queryRunner.query(`ALTER TABLE "copiers" DROP COLUMN "pnl_90d"`);
    await queryRunner.query(`ALTER TABLE "copiers" DROP COLUMN "pnl_30d"`);
    await queryRunner.query(`ALTER TABLE "copiers" DROP COLUMN "pnl_7d"`);
  }
}
