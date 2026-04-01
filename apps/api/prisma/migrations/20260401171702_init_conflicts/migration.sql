-- CreateTable
CREATE TABLE "Conflict" (
    "id" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "sourceBranch" TEXT NOT NULL,
    "targetBranch" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "hunks" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conflict_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Conflict_owner_repo_idx" ON "Conflict"("owner", "repo");
