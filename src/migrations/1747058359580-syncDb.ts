import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1747058359580 implements MigrationInterface {
  name = 'SyncDb1747058359580';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "copy_trade_session" ADD "fixed_amount_per_trade" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "copy_trade_session" DROP COLUMN "fixed_amount_per_trade"`);
  }
}
