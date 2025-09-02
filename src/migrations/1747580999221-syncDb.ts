import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1747580999221 implements MigrationInterface {
  name = 'SyncDb1747580999221';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."withdraw_history_status_enum" RENAME TO "withdraw_history_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."withdraw_history_status_enum" AS ENUM('PENDING_HYPERLIQUID', 'PENDING_BLOCKCHAIN', 'DONE', 'FAILED', 'COMPLETED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "withdraw_history" ALTER COLUMN "status" TYPE "public"."withdraw_history_status_enum" USING "status"::"text"::"public"."withdraw_history_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."withdraw_history_status_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."withdraw_history_status_enum_old" AS ENUM('PENDING_HYPERLIQUID', 'PENDING_BLOCKCHAIN', 'COMPLETED', 'FAILED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "withdraw_history" ALTER COLUMN "status" TYPE "public"."withdraw_history_status_enum_old" USING "status"::"text"::"public"."withdraw_history_status_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."withdraw_history_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."withdraw_history_status_enum_old" RENAME TO "withdraw_history_status_enum"`,
    );
  }
}
