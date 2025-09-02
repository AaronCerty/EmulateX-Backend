import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1745514421859 implements MigrationInterface {
  name = 'SyncDb1745514421859';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "copy_trade_session" DROP COLUMN "status"`);
    await queryRunner.query(
      `ALTER TABLE "copy_trade_session" ADD "status" "public"."copy_trade_session_status_enum" NOT NULL DEFAULT 'CREATING'`,
    );
    await queryRunner.query(`ALTER TABLE "copy_trade_session" ADD "confirm_sharing" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(
      `ALTER TABLE "copy_trade_session" ADD "agree_service_terms" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`ALTER TABLE "copy_trade_session" ALTER COLUMN "start_copy_trade_at" DROP DEFAULT`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "copy_trade_session" ALTER COLUMN "start_copy_trade_at" SET DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "copy_trade_session" DROP COLUMN "agree_service_terms"`);
    await queryRunner.query(`ALTER TABLE "copy_trade_session" DROP COLUMN "confirm_sharing"`);
    await queryRunner.query(`ALTER TABLE "copy_trade_session" DROP COLUMN "status"`);
    await queryRunner.query(
      `ALTER TABLE "copy_trade_session" ADD "status" "public"."copy_trade_session_status_enum" NOT NULL DEFAULT 'CREATING'`,
    );
  }
}
