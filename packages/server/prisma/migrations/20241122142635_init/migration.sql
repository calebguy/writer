-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PROCESSED', 'SUBMITTED', 'CONFIRMED', 'PAUSED', 'ABANDONED');

-- CreateTable
CREATE TABLE "Writer" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "address" TEXT,
    "storageAddress" TEXT,
    "admin" TEXT NOT NULL,
    "managers" TEXT[],
    "onChainId" BIGINT,
    "createdAtHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "transactionId" TEXT,

    CONSTRAINT "Writer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entry" (
    "id" SERIAL NOT NULL,
    "exists" BOOLEAN NOT NULL,
    "onChainId" BIGINT,
    "createdAtHash" TEXT,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "writerId" INTEGER NOT NULL,
    "transactionId" TEXT,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyndicateTransaction" (
    "id" TEXT NOT NULL,
    "chainId" BIGINT NOT NULL,
    "blockNumber" BIGINT,
    "hash" TEXT,
    "projectId" TEXT NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "functionSignature" TEXT NOT NULL,
    "args" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyndicateTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Writer_address_key" ON "Writer"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Writer_storageAddress_key" ON "Writer"("storageAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Writer_onChainId_key" ON "Writer"("onChainId");

-- CreateIndex
CREATE UNIQUE INDEX "Writer_transactionId_key" ON "Writer"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Entry_transactionId_key" ON "Entry"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Entry_onChainId_writerId_key" ON "Entry"("onChainId", "writerId");

-- CreateIndex
CREATE UNIQUE INDEX "SyndicateTransaction_hash_key" ON "SyndicateTransaction"("hash");

-- AddForeignKey
ALTER TABLE "Writer" ADD CONSTRAINT "Writer_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "SyndicateTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_writerId_fkey" FOREIGN KEY ("writerId") REFERENCES "Writer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "SyndicateTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
