import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1745512611324 implements MigrationInterface {
  name = 'SyncDb1745512611324';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."copy_trade_session_status_enum" AS ENUM('CREATING', 'RUNNING', 'COMPLETED', 'FAILED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "copy_trade_session" ADD "status" "public"."copy_trade_session_status_enum" NOT NULL DEFAULT 'CREATING'`,
    );
    await queryRunner.query(`ALTER TABLE "copy_trade_session" ALTER COLUMN "start_copy_trade_at" SET DEFAULT now()`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "copy_trade_session" ALTER COLUMN "start_copy_trade_at" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "copy_trade_session" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."copy_trade_session_status_enum"`);
  }
}
