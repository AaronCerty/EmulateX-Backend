import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1746965161005 implements MigrationInterface {
  name = 'SyncDb1746965161005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b53cfe42d3c5c88fe715b9432b" ON "transactions" ("transaction_hash") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_b53cfe42d3c5c88fe715b9432b"`);
  }
}
