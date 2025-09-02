import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1745678875897 implements MigrationInterface {
  name = 'SyncDb1745678875897';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "fund_transfer" RENAME COLUMN "fund_wallet_address" TO "block_timestamp"`);
    await queryRunner.query(`ALTER TABLE "fund_transfer" DROP COLUMN "block_timestamp"`);
    await queryRunner.query(`ALTER TABLE "fund_transfer" ADD "block_timestamp" TIME`);
    await queryRunner.query(
      `ALTER TYPE "public"."copy_trade_session_status_enum" RENAME TO "copy_trade_session_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."copy_trade_session_status_enum" AS ENUM('CREATING', 'FUNDING', 'HYPERLIQUID_DEPOSIT', 'RUNNING', 'COMPLETED', 'FAILED')`,
    );
    await queryRunner.query(`ALTER TABLE "copy_trade_session" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "copy_trade_session" ALTER COLUMN "status" TYPE "public"."copy_trade_session_status_enum" USING "status"::"text"::"public"."copy_trade_session_status_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "copy_trade_session" ALTER COLUMN "status" SET DEFAULT 'CREATING'`);
    await queryRunner.query(`DROP TYPE "public"."copy_trade_session_status_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."copy_trade_session_status_enum_old" AS ENUM('CREATING', 'FUNDING', 'RUNNING', 'COMPLETED', 'FAILED')`,
    );
    await queryRunner.query(`ALTER TABLE "copy_trade_session" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "copy_trade_session" ALTER COLUMN "status" TYPE "public"."copy_trade_session_status_enum_old" USING "status"::"text"::"public"."copy_trade_session_status_enum_old"`,
    );
    await queryRunner.query(`ALTER TABLE "copy_trade_session" ALTER COLUMN "status" SET DEFAULT 'CREATING'`);
    await queryRunner.query(`DROP TYPE "public"."copy_trade_session_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."copy_trade_session_status_enum_old" RENAME TO "copy_trade_session_status_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "fund_transfer" DROP COLUMN "block_timestamp"`);
    await queryRunner.query(`ALTER TABLE "fund_transfer" ADD "block_timestamp" character varying NOT NULL`);
    await queryRunner.query(`ALTER TABLE "fund_transfer" RENAME COLUMN "block_timestamp" TO "fund_wallet_address"`);
  }
}
