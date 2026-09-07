import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260907143438 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "lousy_deal" add column if not exists "gift_recipient_name" text null, add column if not exists "gift_recipient_email" text null, add column if not exists "gift_sender_name" text null, add column if not exists "gift_message" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "lousy_deal" drop column if exists "gift_recipient_name", drop column if exists "gift_recipient_email", drop column if exists "gift_sender_name", drop column if exists "gift_message";`);
  }

}
