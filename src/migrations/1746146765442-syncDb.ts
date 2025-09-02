import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1746146765442 implements MigrationInterface {
  name = 'SyncDb1746146765442';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."lock_address_status_enum" AS ENUM('AVAILABLE', 'UNAVAILABLE')`);
    await queryRunner.query(
      `CREATE TABLE "lock_address" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "address" character varying NOT NULL, "status" "public"."lock_address_status_enum" NOT NULL, CONSTRAINT "UQ_9071ce6edbc9879dbf6cc0f9203" UNIQUE ("address"), CONSTRAINT "PK_72f04c8ae9685d78b8b120438fb" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "lock_address"`);
    await queryRunner.query(`DROP TYPE "public"."lock_address_status_enum"`);
  }
}
