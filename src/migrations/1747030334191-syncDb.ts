import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1747030334191 implements MigrationInterface {
  name = 'SyncDb1747030334191';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."user_statistic_history_statistictype_enum" AS ENUM('roi', 'pnl', 'aum')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_statistic_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "date" date NOT NULL, "leaderId" character varying(36), "copierId" character varying(36), "statisticType" "public"."user_statistic_history_statistictype_enum" NOT NULL, "value" numeric(30,10) NOT NULL DEFAULT '0', "leader_id" uuid, "copier_id" uuid, CONSTRAINT "PK_e1249642743c221453cc19fc55b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4cb1dd5ab05d69bb8097b8058e" ON "user_statistic_history" ("copierId", "statisticType", "date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a682b02d26bcd5e1eaf318e3ee" ON "user_statistic_history" ("leaderId", "statisticType", "date") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_febbf7c34e251666f55217dc1e" ON "user_statistic_history" ("date", "copierId", "statisticType") WHERE copier_id IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_1305cd7bf6a2fd455d68a04f70" ON "user_statistic_history" ("date", "leaderId", "statisticType") WHERE leader_id IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_statistic_history" ADD CONSTRAINT "FK_c5f2f99006b4f1e92eaa08c18b5" FOREIGN KEY ("leader_id") REFERENCES "leaders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_statistic_history" ADD CONSTRAINT "FK_a67540106ab977c0625939a5148" FOREIGN KEY ("copier_id") REFERENCES "copiers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_statistic_history" DROP CONSTRAINT "FK_a67540106ab977c0625939a5148"`);
    await queryRunner.query(`ALTER TABLE "user_statistic_history" DROP CONSTRAINT "FK_c5f2f99006b4f1e92eaa08c18b5"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1305cd7bf6a2fd455d68a04f70"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_febbf7c34e251666f55217dc1e"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a682b02d26bcd5e1eaf318e3ee"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_4cb1dd5ab05d69bb8097b8058e"`);
    await queryRunner.query(`DROP TABLE "user_statistic_history"`);
    await queryRunner.query(`DROP TYPE "public"."user_statistic_history_statistictype_enum"`);
  }
}
