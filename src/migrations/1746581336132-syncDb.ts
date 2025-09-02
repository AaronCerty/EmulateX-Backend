import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1746581336132 implements MigrationInterface {
  name = 'SyncDb1746581336132';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "balance" ADD "available_balance" numeric(72,6) NOT NULL DEFAULT '0'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "balance" DROP COLUMN "available_balance"`);
  }
}
