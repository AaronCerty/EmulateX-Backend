import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1747236703290 implements MigrationInterface {
  name = 'SyncDb1747236703290';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "leaders" DROP COLUMN "aum"`);
    await queryRunner.query(`ALTER TABLE "copiers" DROP COLUMN "aum"`);
    await queryRunner.query(`ALTER TABLE "leaders" ADD "aum_1d" numeric(88,18) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "leaders" ADD "aum_7d" numeric(88,18) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "leaders" ADD "aum_30d" numeric(88,18) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "copiers" ADD "aum_1d" numeric(88,18) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "copiers" ADD "aum_7d" numeric(88,18) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "copiers" ADD "aum_30d" numeric(88,18) DEFAULT '0'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "copiers" DROP COLUMN "aum_30d"`);
    await queryRunner.query(`ALTER TABLE "copiers" DROP COLUMN "aum_7d"`);
    await queryRunner.query(`ALTER TABLE "copiers" DROP COLUMN "aum_1d"`);
    await queryRunner.query(`ALTER TABLE "leaders" DROP COLUMN "aum_30d"`);
    await queryRunner.query(`ALTER TABLE "leaders" DROP COLUMN "aum_7d"`);
    await queryRunner.query(`ALTER TABLE "leaders" DROP COLUMN "aum_1d"`);
    await queryRunner.query(`ALTER TABLE "copiers" ADD "aum" numeric(88,18) DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "leaders" ADD "aum" numeric(88,18) DEFAULT '0'`);
  }
}
