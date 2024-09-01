-- CreateTable
CREATE TABLE "Writer" (
    "id" SERIAL NOT NULL,
    "title" TEXT,
    "address" TEXT NOT NULL,
    "storageAddress" TEXT NOT NULL,
    "admin" TEXT NOT NULL,
    "authors" TEXT[],
    "createdAtBlock" TEXT NOT NULL,
    "createdAtHash" TEXT NOT NULL,

    CONSTRAINT "Writer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entry" (
    "id" SERIAL NOT NULL,
    "author" TEXT NOT NULL,
    "createdAtBlock" INTEGER NOT NULL,
    "updatedAtBlock" INTEGER NOT NULL,
    "totalChunks" INTEGER NOT NULL,
    "receivedChunks" INTEGER NOT NULL,
    "exists" BOOLEAN NOT NULL,
    "writerId" INTEGER NOT NULL,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chunk" (
    "id" SERIAL NOT NULL,
    "index" INTEGER NOT NULL,
    "author" TEXT NOT NULL,
    "encodedContent" TEXT NOT NULL,
    "decodedContent" TEXT NOT NULL,
    "entryId" INTEGER NOT NULL,

    CONSTRAINT "Chunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Writer_address_key" ON "Writer"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Writer_storageAddress_key" ON "Writer"("storageAddress");

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_writerId_fkey" FOREIGN KEY ("writerId") REFERENCES "Writer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chunk" ADD CONSTRAINT "Chunk_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
