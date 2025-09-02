import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1746680766590 implements MigrationInterface {
  name = 'SyncDb1746680766590';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "withdraw_history" ALTER COLUMN "tx_hash" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "withdraw_history" ALTER COLUMN "tx_hash" SET NOT NULL`);
  }
}
