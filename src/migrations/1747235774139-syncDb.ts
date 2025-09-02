import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1747235774139 implements MigrationInterface {
  name = 'SyncDb1747235774139';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "token" ("id" SERIAL NOT NULL, "slug" character varying, "address" character varying, "chain_id" integer, "logo_img" character varying, "name" character varying, "symbol" character varying, CONSTRAINT "PK_82fae97f905930df5d62a702fc9" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "token"`);
  }
}
