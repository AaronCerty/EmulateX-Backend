import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1747034668212 implements MigrationInterface {
  name = 'SyncDb1747034668212';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_statistic_history" DROP CONSTRAINT "FK_c5f2f99006b4f1e92eaa08c18b5"`);
    await queryRunner.query(`ALTER TABLE "user_statistic_history" DROP CONSTRAINT "FK_a67540106ab977c0625939a5148"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_4cb1dd5ab05d69bb8097b8058e"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a682b02d26bcd5e1eaf318e3ee"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_febbf7c34e251666f55217dc1e"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1305cd7bf6a2fd455d68a04f70"`);
    await queryRunner.query(`ALTER TABLE "user_statistic_history" DROP COLUMN "leaderId"`);
    await queryRunner.query(`ALTER TABLE "user_statistic_history" DROP COLUMN "copierId"`);
    await queryRunner.query(`ALTER TABLE "user_statistic_history" DROP COLUMN "statisticType"`);
    await queryRunner.query(`DROP TYPE "public"."user_statistic_history_statistictype_enum"`);
    await queryRunner.query(
      `CREATE TYPE "public"."user_statistic_history_statistic_type_enum" AS ENUM('roi', 'pnl', 'aum')`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_statistic_history" ADD "statistic_type" "public"."user_statistic_history_statistic_type_enum" NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_53554aace59f927f7b02575539" ON "user_statistic_history" ("copier_id", "statistic_type", "date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3eb3659cd6aa206d77375f332f" ON "user_statistic_history" ("leader_id", "statistic_type", "date") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_10e08e799af8ad77d5d3eaa840" ON "user_statistic_history" ("date", "copier_id", "statistic_type") WHERE copier_id IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_75d817efc33098a210f618a9bd" ON "user_statistic_history" ("date", "leader_id", "statistic_type") WHERE leader_id IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_75d817efc33098a210f618a9bd"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_10e08e799af8ad77d5d3eaa840"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3eb3659cd6aa206d77375f332f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_53554aace59f927f7b02575539"`);
    await queryRunner.query(`ALTER TABLE "user_statistic_history" DROP COLUMN "statistic_type"`);
    await queryRunner.query(`DROP TYPE "public"."user_statistic_history_statistic_type_enum"`);
    await queryRunner.query(
      `CREATE TYPE "public"."user_statistic_history_statistictype_enum" AS ENUM('roi', 'pnl', 'aum')`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_statistic_history" ADD "statisticType" "public"."user_statistic_history_statistictype_enum" NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "user_statistic_history" ADD "copierId" character varying(36)`);
    await queryRunner.query(`ALTER TABLE "user_statistic_history" ADD "leaderId" character varying(36)`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_1305cd7bf6a2fd455d68a04f70" ON "user_statistic_history" ("date", "leaderId", "statisticType") WHERE (leader_id IS NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_febbf7c34e251666f55217dc1e" ON "user_statistic_history" ("date", "copierId", "statisticType") WHERE (copier_id IS NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a682b02d26bcd5e1eaf318e3ee" ON "user_statistic_history" ("date", "leaderId", "statisticType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4cb1dd5ab05d69bb8097b8058e" ON "user_statistic_history" ("date", "copierId", "statisticType") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user_statistic_history" ADD CONSTRAINT "FK_a67540106ab977c0625939a5148" FOREIGN KEY ("copier_id") REFERENCES "copiers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_statistic_history" ADD CONSTRAINT "FK_c5f2f99006b4f1e92eaa08c18b5" FOREIGN KEY ("leader_id") REFERENCES "leaders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
