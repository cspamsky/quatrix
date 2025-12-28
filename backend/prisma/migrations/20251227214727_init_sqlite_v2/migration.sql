-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "servers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "map" TEXT NOT NULL DEFAULT 'de_dust2',
    "maxPlayers" INTEGER NOT NULL DEFAULT 10,
    "gameMode" TEXT NOT NULL DEFAULT 'competitive',
    "port" INTEGER NOT NULL,
    "rconPort" INTEGER NOT NULL,
    "rconPassword" TEXT NOT NULL,
    "gsltToken" TEXT NOT NULL,
    "processId" INTEGER,
    "installPath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'STOPPED',
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastStartedAt" DATETIME,
    "lastStoppedAt" DATETIME,
    CONSTRAINT "servers_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "servers_port_key" ON "servers"("port");

-- CreateIndex
CREATE UNIQUE INDEX "servers_rconPort_key" ON "servers"("rconPort");
