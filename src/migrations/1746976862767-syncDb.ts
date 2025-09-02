import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1746976862767 implements MigrationInterface {
  name = 'SyncDb1746976862767';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "copy_trade_session" ALTER COLUMN "slippage" SET DEFAULT '1'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "copy_trade_session" ALTER COLUMN "slippage" SET DEFAULT '0'`);
  }
}
