import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1746578993226 implements MigrationInterface {
  name = 'SyncDb1746578993226';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."deposit_history_status_enum" AS ENUM('DEPOSITED_BLOCKCHAIN', 'DEPOSITED_HYPERLIQUID')`,
    );
    await queryRunner.query(`ALTER TABLE "deposit_history" ADD "status" "public"."deposit_history_status_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "deposit_history" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."deposit_history_status_enum"`);
  }
}
