import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1746578007704 implements MigrationInterface {
  name = 'SyncDb1746578007704';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "hyperliquid_withdraw" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_wallet_address" character varying NOT NULL, "amount" numeric(72,6) NOT NULL DEFAULT '0', "tx_hash" character varying, "block_number" numeric(20,0) NOT NULL DEFAULT '0', CONSTRAINT "UQ_91d4f6e12ac040945984e0d1904" UNIQUE ("tx_hash"), CONSTRAINT "PK_4fa8c812c3016327c08f8977d2d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "withdraw_history" DROP COLUMN "wallet_address"`);
    await queryRunner.query(`ALTER TABLE "hyperliquid_deposit" DROP COLUMN "copy_trade_session_id"`);
    await queryRunner.query(`ALTER TABLE "hyperliquid_deposit" DROP COLUMN "gas_fee"`);
    await queryRunner.query(`ALTER TABLE "hyperliquid_deposit" DROP COLUMN "block_timestamp"`);
    await queryRunner.query(`ALTER TABLE "withdraw_history" ADD "user_id" uuid NOT NULL`);
    await queryRunner.query(
      `CREATE TYPE "public"."withdraw_history_status_enum" AS ENUM('PENDING_HYPERLIQUID', 'PENDING_SMART_CONTRACT', 'COMPLETED', 'FAILED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "withdraw_history" ADD "status" "public"."withdraw_history_status_enum" NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "hyperliquid_deposit" ADD "user_wallet_address" character varying NOT NULL`);
    await queryRunner.query(`ALTER TABLE "balance" ADD "balance_wallet_private_key" character varying NOT NULL`);
    await queryRunner.query(`ALTER TABLE "balance" ADD "balance_wallet_address" character varying NOT NULL`);
    await queryRunner.query(`ALTER TABLE "hyperliquid_deposit" ALTER COLUMN "block_number" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "hyperliquid_deposit" ALTER COLUMN "block_number" SET DEFAULT '0'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "hyperliquid_deposit" ALTER COLUMN "block_number" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "hyperliquid_deposit" ALTER COLUMN "block_number" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "balance" DROP COLUMN "balance_wallet_address"`);
    await queryRunner.query(`ALTER TABLE "balance" DROP COLUMN "balance_wallet_private_key"`);
    await queryRunner.query(`ALTER TABLE "hyperliquid_deposit" DROP COLUMN "user_wallet_address"`);
    await queryRunner.query(`ALTER TABLE "withdraw_history" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."withdraw_history_status_enum"`);
    await queryRunner.query(`ALTER TABLE "withdraw_history" DROP COLUMN "user_id"`);
    await queryRunner.query(`ALTER TABLE "hyperliquid_deposit" ADD "block_timestamp" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "hyperliquid_deposit" ADD "gas_fee" numeric(72,6) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "hyperliquid_deposit" ADD "copy_trade_session_id" character varying NOT NULL`);
    await queryRunner.query(`ALTER TABLE "withdraw_history" ADD "wallet_address" character varying NOT NULL`);
    await queryRunner.query(`DROP TABLE "hyperliquid_withdraw"`);
  }
}
