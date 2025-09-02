import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1746964092140 implements MigrationInterface {
  name = 'SyncDb1746964092140';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "leaders" ADD "history_synced" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "copiers" ADD "history_synced" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "copiers" DROP COLUMN "history_synced"`);
    await queryRunner.query(`ALTER TABLE "leaders" DROP COLUMN "history_synced"`);
  }
}
