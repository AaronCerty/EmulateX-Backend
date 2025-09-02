import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1746686394295 implements MigrationInterface {
  name = 'SyncDb1746686394295';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "withdraw_history" ADD "fee" numeric(72,6) DEFAULT '0'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "withdraw_history" DROP COLUMN "fee"`);
  }
}
