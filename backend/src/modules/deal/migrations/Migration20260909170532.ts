import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260909170532 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "printful_submission" add column if not exists "last_event_at" timestamptz null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "printful_submission" drop column if exists "last_event_at";`);
  }

}
