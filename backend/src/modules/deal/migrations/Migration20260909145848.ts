import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260909145848 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "printful_submission" add column if not exists "tracking_number" text null, add column if not exists "tracking_url" text null, add column if not exists "carrier" text null, add column if not exists "shipped_at" timestamptz null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "printful_submission" drop column if exists "tracking_number", drop column if exists "tracking_url", drop column if exists "carrier", drop column if exists "shipped_at";`);
  }

}
