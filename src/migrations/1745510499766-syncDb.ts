import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDb1745510499766 implements MigrationInterface {
  name = 'SyncDb1745510499766';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "withdraw_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "wallet_address" character varying NOT NULL, "amount" numeric(72,18) NOT NULL DEFAULT '0', "token" character varying NOT NULL, "tx_hash" character varying NOT NULL, "block_number" numeric(20,0) NOT NULL DEFAULT '0', CONSTRAINT "UQ_86424911f01347dc2b296fe6bfa" UNIQUE ("tx_hash"), CONSTRAINT "PK_c5fe833f62249dd76df8a5b36e7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "username" character varying, "wallet_address" character varying NOT NULL, CONSTRAINT "UQ_196ef3e52525d3cd9e203bdb1de" UNIQUE ("wallet_address"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE TYPE "public"."leaders_risk_level_enum" AS ENUM('low', 'medium', 'high')`);
    await queryRunner.query(`CREATE TYPE "public"."leaders_leader_type_enum" AS ENUM('all', 'trading_bot', 'trader')`);
    await queryRunner.query(
      `CREATE TABLE "leaders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "name" character varying(255), "avt" character varying(255), "image_url" character varying(255), "description" text, "telegram_url" character varying(255), "x_url" character varying(255), "risk_level" "public"."leaders_risk_level_enum", "leader_type" "public"."leaders_leader_type_enum" NOT NULL DEFAULT 'trader', "start_trade_time" TIMESTAMP, "pnl_7d" numeric(20,2) DEFAULT '0', "pnl_30d" numeric(20,2) DEFAULT '0', "pnl_90d" numeric(20,2) DEFAULT '0', "pnl_180d" numeric(20,2) DEFAULT '0', "roi_7d" numeric(10,2) DEFAULT '0', "roi_30d" numeric(10,2) DEFAULT '0', "roi_90d" numeric(10,2) DEFAULT '0', "roi_180d" numeric(10,2) DEFAULT '0', "apy_7d" numeric(10,2) DEFAULT '0', "apy_30d" numeric(10,2) DEFAULT '0', "apy_90d" numeric(10,2) DEFAULT '0', "apy_180d" numeric(10,2) DEFAULT '0', "win_rate_7d" numeric(5,2) DEFAULT '0', "win_rate_30d" numeric(5,2) DEFAULT '0', "win_rate_90d" numeric(5,2) DEFAULT '0', "win_rate_180d" numeric(5,2) DEFAULT '0', "sharpe_ratio_7d" numeric(10,2) DEFAULT '0', "sharpe_ratio_30d" numeric(10,2) DEFAULT '0', "sharpe_ratio_90d" numeric(10,2) DEFAULT '0', "sharpe_ratio_180d" numeric(10,2) DEFAULT '0', "drawdown_7d" numeric(10,2) DEFAULT '0', "drawdown_30d" numeric(10,2) DEFAULT '0', "drawdown_90d" numeric(10,2) DEFAULT '0', "drawdown_180d" numeric(10,2) DEFAULT '0', "followers_count" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_6035d2826e63f39b50a34901d36" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE TYPE "public"."transactions_direction_enum" AS ENUM('BUY', 'SELL')`);
    await queryRunner.query(`CREATE TYPE "public"."transactions_type_enum" AS ENUM('SPOT', 'PREPETUALS')`);
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_status_enum" AS ENUM('PENDING', 'COMPLETED', 'FAILED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "chain_id" integer NOT NULL, "leader_id" uuid, "copier_id" uuid, "base" character varying NOT NULL, "quote" character varying NOT NULL, "amount" numeric(18,8), "price" numeric(18,8), "total_value" numeric(18,8), "direction" "public"."transactions_direction_enum" NOT NULL, "type" "public"."transactions_type_enum" NOT NULL DEFAULT 'SPOT', "status" "public"."transactions_status_enum" NOT NULL DEFAULT 'PENDING', "transaction_hash" character varying, "timestamp_ms" character varying, "error_message" character varying, "copy_from_transaction" uuid, "metadata" character varying, CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "latest_block" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "latest_block" integer NOT NULL, "service" character varying NOT NULL, CONSTRAINT "PK_2318d318fb44e47e1dadb0769cb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."fund_transfer_status_enum" AS ENUM('PENDING', 'COMPLETED', 'FAILED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."fund_transfer_type_enum" AS ENUM('SMART_CONTRACT_TO_FUND_WALLET', 'FUND_WALLET_TO_SMART_CONTRACT')`,
    );
    await queryRunner.query(
      `CREATE TABLE "fund_transfer" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "fund_wallet_address" character varying NOT NULL, "amount" numeric(72,18) NOT NULL DEFAULT '0', "tx_hash" character varying, "gas_fee" numeric(72,18) DEFAULT '0', "block_number" numeric(20,0), "status" "public"."fund_transfer_status_enum" NOT NULL, "type" "public"."fund_transfer_type_enum" NOT NULL, CONSTRAINT "UQ_4060802e214bcc06284b77c6498" UNIQUE ("tx_hash"), CONSTRAINT "PK_4665e1a51b2ef8238c283f27d9c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "deposit_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "wallet_address" character varying NOT NULL, "amount" numeric(72,18) NOT NULL DEFAULT '0', "token" character varying NOT NULL, "tx_hash" character varying NOT NULL, "block_number" numeric(20,0) NOT NULL DEFAULT '0', CONSTRAINT "UQ_24f10f34c326bbccee8c9520a7d" UNIQUE ("tx_hash"), CONSTRAINT "PK_0c0af61249b3e3ddf3e7954925a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "copiers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "total_balance" numeric(10,2) NOT NULL DEFAULT '0', "fund_wallet_private_key" character varying NOT NULL, "fund_wallet_address" character varying NOT NULL, CONSTRAINT "PK_29dcdf3f14f6efae3a2d5e960cb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "copy_trade_session" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "leader_id" uuid NOT NULL, "copier_id" uuid NOT NULL, "allocation_amount" numeric(10,2) NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, "slippage" numeric(10,2) NOT NULL DEFAULT '0', "tp" numeric(10,2) NOT NULL DEFAULT '0', "sl" numeric(10,2) NOT NULL DEFAULT '0', "scale_factor" numeric(10,2) NOT NULL DEFAULT '0', "start_copy_trade_at" TIMESTAMP NOT NULL, CONSTRAINT "PK_965258bbc5cb786e63bb6e947ec" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "balance" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "deposited_balance" numeric(72,18) NOT NULL DEFAULT '0', "withdrawn_balance" numeric(72,18) NOT NULL DEFAULT '0', CONSTRAINT "PK_079dddd31a81672e8143a649ca0" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "balance"`);
    await queryRunner.query(`DROP TABLE "copy_trade_session"`);
    await queryRunner.query(`DROP TABLE "copiers"`);
    await queryRunner.query(`DROP TABLE "deposit_history"`);
    await queryRunner.query(`DROP TABLE "fund_transfer"`);
    await queryRunner.query(`DROP TYPE "public"."fund_transfer_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."fund_transfer_status_enum"`);
    await queryRunner.query(`DROP TABLE "latest_block"`);
    await queryRunner.query(`DROP TABLE "transactions"`);
    await queryRunner.query(`DROP TYPE "public"."transactions_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."transactions_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."transactions_direction_enum"`);
    await queryRunner.query(`DROP TABLE "leaders"`);
    await queryRunner.query(`DROP TYPE "public"."leaders_leader_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."leaders_risk_level_enum"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "withdraw_history"`);
  }
}
