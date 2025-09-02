import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1745520563572 implements MigrationInterface {
  name = 'SyncDb1745520563572';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "fund_transfer" ADD "copy_trade_session_id" character varying NOT NULL`);
    await queryRunner.query(`ALTER TABLE "copy_trade_session" ALTER COLUMN "start_copy_trade_at" SET DEFAULT now()`);
    await queryRunner.query(
      `ALTER TYPE "public"."copy_trade_session_status_enum" RENAME TO "copy_trade_session_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."copy_trade_session_status_enum" AS ENUM('CREATING', 'FUNDING', 'RUNNING', 'COMPLETED', 'FAILED')`,
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
      `CREATE TYPE "public"."copy_trade_session_status_enum_old" AS ENUM('CREATING', 'RUNNING', 'COMPLETED', 'FAILED')`,
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
    await queryRunner.query(`ALTER TABLE "copy_trade_session" ALTER COLUMN "start_copy_trade_at" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "fund_transfer" DROP COLUMN "copy_trade_session_id"`);
  }
}
