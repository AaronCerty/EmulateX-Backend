import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1746682921311 implements MigrationInterface {
  name = 'SyncDb1746682921311';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "withdraw_history" ADD "nonce" numeric(20,0) NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "withdraw_history" ADD CONSTRAINT "UQ_74c45caf0d6870ae52a26d55e4b" UNIQUE ("nonce")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "withdraw_history" DROP CONSTRAINT "UQ_74c45caf0d6870ae52a26d55e4b"`);
    await queryRunner.query(`ALTER TABLE "withdraw_history" DROP COLUMN "nonce"`);
  }
}
