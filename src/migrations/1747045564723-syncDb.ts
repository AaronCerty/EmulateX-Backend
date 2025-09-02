import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1747045564723 implements MigrationInterface {
  name = 'SyncDb1747045564723';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_53554aace59f927f7b02575539"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3eb3659cd6aa206d77375f332f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_10e08e799af8ad77d5d3eaa840"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_75d817efc33098a210f618a9bd"`);
    await queryRunner.query(`ALTER TABLE "user_statistic_history" DROP COLUMN "value"`);
    await queryRunner.query(`ALTER TABLE "user_statistic_history" DROP COLUMN "statistic_type"`);
    await queryRunner.query(`DROP TYPE "public"."user_statistic_history_statistic_type_enum"`);
    await queryRunner.query(`ALTER TABLE "user_statistic_history" ADD "pnl_value" numeric(30,10) NOT NULL DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "user_statistic_history" ADD "roi_value" numeric(30,10) NOT NULL DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "user_statistic_history" ADD "aum_value" numeric(30,10)`);
    await queryRunner.query(
      `CREATE INDEX "IDX_66f1f09cd564f726ae75ebcd97" ON "user_statistic_history" ("copier_id", "date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_334f311283d89ac009074b96a0" ON "user_statistic_history" ("leader_id", "date") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_31cc69a16021b3789cfab3e88a" ON "user_statistic_history" ("date", "copier_id") WHERE copier_id IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_49667b72b1bf0cc93e05e23f12" ON "user_statistic_history" ("date", "leader_id") WHERE leader_id IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_49667b72b1bf0cc93e05e23f12"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_31cc69a16021b3789cfab3e88a"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_334f311283d89ac009074b96a0"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_66f1f09cd564f726ae75ebcd97"`);
    await queryRunner.query(`ALTER TABLE "user_statistic_history" DROP COLUMN "aum_value"`);
    await queryRunner.query(`ALTER TABLE "user_statistic_history" DROP COLUMN "roi_value"`);
    await queryRunner.query(`ALTER TABLE "user_statistic_history" DROP COLUMN "pnl_value"`);
    await queryRunner.query(
      `CREATE TYPE "public"."user_statistic_history_statistic_type_enum" AS ENUM('roi', 'pnl', 'aum')`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_statistic_history" ADD "statistic_type" "public"."user_statistic_history_statistic_type_enum" NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "user_statistic_history" ADD "value" numeric(30,10) NOT NULL DEFAULT '0'`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_75d817efc33098a210f618a9bd" ON "user_statistic_history" ("date", "leader_id", "statistic_type") WHERE (leader_id IS NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_10e08e799af8ad77d5d3eaa840" ON "user_statistic_history" ("date", "copier_id", "statistic_type") WHERE (copier_id IS NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3eb3659cd6aa206d77375f332f" ON "user_statistic_history" ("date", "leader_id", "statistic_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_53554aace59f927f7b02575539" ON "user_statistic_history" ("date", "copier_id", "statistic_type") `,
    );
  }
}
