-- AlterTable
ALTER TABLE "TicketReply" ADD COLUMN     "senderType" "UserRole";

-- Backfill existing replies from their author's current role, since no
-- senderType was recorded before this column existed.
UPDATE "TicketReply"
SET "senderType" = "user"."role"
FROM "user"
WHERE "user"."id" = "TicketReply"."authorId";

ALTER TABLE "TicketReply" ALTER COLUMN "senderType" SET NOT NULL;
