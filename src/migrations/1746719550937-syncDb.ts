import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1746719550937 implements MigrationInterface {
  name = 'SyncDb1746719550937';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."deposit_history_status_enum" RENAME TO "deposit_history_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."deposit_history_status_enum" AS ENUM('DEPOSITED_BLOCKCHAIN', 'DEPOSITED_HYPERLIQUID', 'DEPOSITED_HYPERLIQUID_FAILED', 'DONE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "deposit_history" ALTER COLUMN "status" TYPE "public"."deposit_history_status_enum" USING "status"::"text"::"public"."deposit_history_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."deposit_history_status_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."deposit_history_status_enum_old" AS ENUM('DEPOSITED_BLOCKCHAIN', 'DEPOSITED_HYPERLIQUID')`,
    );
    await queryRunner.query(
      `ALTER TABLE "deposit_history" ALTER COLUMN "status" TYPE "public"."deposit_history_status_enum_old" USING "status"::"text"::"public"."deposit_history_status_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."deposit_history_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."deposit_history_status_enum_old" RENAME TO "deposit_history_status_enum"`,
    );
  }
}
