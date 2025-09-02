import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1745681114035 implements MigrationInterface {
  name = 'SyncDb1745681114035';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."hyperliquid_deposit_status_enum" AS ENUM('PENDING', 'COMPLETED', 'FAILED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "hyperliquid_deposit" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "copy_trade_session_id" character varying NOT NULL, "amount" numeric(72,18) NOT NULL DEFAULT '0', "status" "public"."hyperliquid_deposit_status_enum" NOT NULL, "tx_hash" character varying, "gas_fee" numeric(72,18) DEFAULT '0', "block_number" numeric(20,0), "block_timestamp" TIMESTAMP, CONSTRAINT "UQ_05df10b497b772b015cbf330563" UNIQUE ("tx_hash"), CONSTRAINT "PK_edfcbfd4b386f905c78350832b8" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "hyperliquid_deposit"`);
    await queryRunner.query(`DROP TYPE "public"."hyperliquid_deposit_status_enum"`);
  }
}
