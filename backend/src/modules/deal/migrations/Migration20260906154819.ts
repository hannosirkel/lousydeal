import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260906154819 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "lousy_deal" drop constraint if exists "lousy_deal_serial_unique";`);
    this.addSql(`alter table if exists "lousy_deal" drop constraint if exists "lousy_deal_public_slug_unique";`);
    this.addSql(`alter table if exists "lousy_deal" drop constraint if exists "lousy_deal_order_id_unique";`);
    this.addSql(`create table if not exists "lousy_deal" ("id" text not null, "order_id" text not null, "serial" serial, "public_slug" text not null, "tier" text not null, "amount_paid" numeric not null, "currency_code" text not null, "display_name" text null, "dedication" text null, "layout_version" integer not null, "status" text check ("status" in ('issued', 'hidden')) not null, "issued_at" timestamptz not null, "raw_amount_paid" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "lousy_deal_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_lousy_deal_deleted_at" ON "lousy_deal" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_lousy_deal_order_id_unique" ON "lousy_deal" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_lousy_deal_public_slug_unique" ON "lousy_deal" ("public_slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_lousy_deal_serial_unique" ON "lousy_deal" ("serial") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "lousy_deal" cascade;`);
  }

}
