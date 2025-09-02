import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1746147869156 implements MigrationInterface {
  name = 'SyncDb1746147869156';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "withdraw_history" ALTER COLUMN "amount" TYPE numeric(72,6)`);
    await queryRunner.query(`ALTER TABLE "hyperliquid_deposit" ALTER COLUMN "amount" TYPE numeric(72,6)`);
    await queryRunner.query(`ALTER TABLE "hyperliquid_deposit" ALTER COLUMN "gas_fee" TYPE numeric(72,6)`);
    await queryRunner.query(`ALTER TABLE "fund_transfer" ALTER COLUMN "amount" TYPE numeric(72,6)`);
    await queryRunner.query(`ALTER TABLE "fund_transfer" ALTER COLUMN "gas_fee" TYPE numeric(72,0)`);
    await queryRunner.query(`ALTER TABLE "deposit_history" ALTER COLUMN "amount" TYPE numeric(72,6)`);
    await queryRunner.query(`ALTER TABLE "balance" ALTER COLUMN "deposited_balance" TYPE numeric(72,6)`);
    await queryRunner.query(`ALTER TABLE "balance" ALTER COLUMN "withdrawn_balance" TYPE numeric(72,6)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "balance" ALTER COLUMN "withdrawn_balance" TYPE numeric(72,18)`);
    await queryRunner.query(`ALTER TABLE "balance" ALTER COLUMN "deposited_balance" TYPE numeric(72,18)`);
    await queryRunner.query(`ALTER TABLE "deposit_history" ALTER COLUMN "amount" TYPE numeric(72,18)`);
    await queryRunner.query(`ALTER TABLE "fund_transfer" ALTER COLUMN "gas_fee" TYPE numeric(72,18)`);
    await queryRunner.query(`ALTER TABLE "fund_transfer" ALTER COLUMN "amount" TYPE numeric(72,18)`);
    await queryRunner.query(`ALTER TABLE "hyperliquid_deposit" ALTER COLUMN "gas_fee" TYPE numeric(72,18)`);
    await queryRunner.query(`ALTER TABLE "hyperliquid_deposit" ALTER COLUMN "amount" TYPE numeric(72,18)`);
    await queryRunner.query(`ALTER TABLE "withdraw_history" ALTER COLUMN "amount" TYPE numeric(72,18)`);
  }
}
