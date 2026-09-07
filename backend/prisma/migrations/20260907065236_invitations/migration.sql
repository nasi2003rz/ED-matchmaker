-- CreateEnum
CREATE TYPE "InvitationLinkStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- AlterTable
ALTER TABLE "classes" ADD COLUMN     "invitationStatus" "InvitationLinkStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invitations_classId_studentId_key" ON "invitations"("classId", "studentId");

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
