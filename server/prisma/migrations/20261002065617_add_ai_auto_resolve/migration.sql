-- DropForeignKey
ALTER TABLE "TicketReply" DROP CONSTRAINT "TicketReply_authorId_fkey";

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "autoResolved" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TicketReply" ADD COLUMN     "isAiGenerated" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "authorId" DROP NOT NULL,
ALTER COLUMN "senderType" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "TicketReply" ADD CONSTRAINT "TicketReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
