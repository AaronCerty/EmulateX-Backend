import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1745679328637 implements MigrationInterface {
  name = 'SyncDb1745679328637';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "fund_transfer" DROP COLUMN "block_timestamp"`);
    await queryRunner.query(`ALTER TABLE "fund_transfer" ADD "block_timestamp" TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "fund_transfer" DROP COLUMN "block_timestamp"`);
    await queryRunner.query(`ALTER TABLE "fund_transfer" ADD "block_timestamp" TIME`);
  }
}
