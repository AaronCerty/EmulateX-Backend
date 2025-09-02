import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1747107878274 implements MigrationInterface {
  name = 'SyncDb1747107878274';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "hyperliquid_withdraw" ADD "tx_hash" character varying`);
    await queryRunner.query(
      `ALTER TABLE "hyperliquid_withdraw" ADD CONSTRAINT "UQ_91d4f6e12ac040945984e0d1904" UNIQUE ("tx_hash")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "hyperliquid_withdraw" DROP CONSTRAINT "UQ_91d4f6e12ac040945984e0d1904"`);
    await queryRunner.query(`ALTER TABLE "hyperliquid_withdraw" DROP COLUMN "tx_hash"`);
  }
}
