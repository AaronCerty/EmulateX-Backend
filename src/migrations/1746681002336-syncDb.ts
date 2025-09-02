import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1746681002336 implements MigrationInterface {
  name = 'SyncDb1746681002336';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "hyperliquid_withdraw" DROP COLUMN "user_wallet_address"`);
    await queryRunner.query(`ALTER TABLE "hyperliquid_withdraw" DROP CONSTRAINT "UQ_91d4f6e12ac040945984e0d1904"`);
    await queryRunner.query(`ALTER TABLE "hyperliquid_withdraw" DROP COLUMN "tx_hash"`);
    await queryRunner.query(`ALTER TABLE "hyperliquid_withdraw" DROP COLUMN "block_number"`);
    await queryRunner.query(
      `ALTER TABLE "hyperliquid_withdraw" ADD "balance_wallet_address" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "hyperliquid_withdraw" ADD "fund_wallet_address" character varying NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "hyperliquid_withdraw" DROP COLUMN "fund_wallet_address"`);
    await queryRunner.query(`ALTER TABLE "hyperliquid_withdraw" DROP COLUMN "balance_wallet_address"`);
    await queryRunner.query(`ALTER TABLE "hyperliquid_withdraw" ADD "block_number" numeric(20,0) NOT NULL DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "hyperliquid_withdraw" ADD "tx_hash" character varying`);
    await queryRunner.query(
      `ALTER TABLE "hyperliquid_withdraw" ADD CONSTRAINT "UQ_91d4f6e12ac040945984e0d1904" UNIQUE ("tx_hash")`,
    );
    await queryRunner.query(`ALTER TABLE "hyperliquid_withdraw" ADD "user_wallet_address" character varying NOT NULL`);
  }
}
