import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260909091623 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "printful_submission" drop constraint if exists "printful_submission_order_id_unique";`);
    this.addSql(`create table if not exists "printful_submission" ("id" text not null, "order_id" text not null, "printful_order_id" text null, "printful_status" text null, "status" text check ("status" in ('submitted', 'skipped', 'canceled', 'failed')) not null, "attempts" integer not null, "last_error" text null, "submitted_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "printful_submission_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_printful_submission_deleted_at" ON "printful_submission" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_printful_submission_order_id_unique" ON "printful_submission" ("order_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "printful_submission" cascade;`);
  }

}
