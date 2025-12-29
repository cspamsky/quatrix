-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_servers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "map" TEXT NOT NULL DEFAULT 'de_dust2',
    "maxPlayers" INTEGER NOT NULL DEFAULT 10,
    "gameMode" TEXT NOT NULL DEFAULT 'competitive',
    "workshopCollection" TEXT,
    "workshopMapId" TEXT,
    "port" INTEGER NOT NULL,
    "rconPort" INTEGER NOT NULL,
    "rconPassword" TEXT NOT NULL,
    "gsltToken" TEXT NOT NULL,
    "steamAuthKey" TEXT,
    "processId" INTEGER,
    "installPath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'STOPPED',
    "vacEnabled" BOOLEAN NOT NULL DEFAULT true,
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastStartedAt" DATETIME,
    "lastStoppedAt" DATETIME,
    CONSTRAINT "servers_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_servers" ("createdAt", "description", "gameMode", "gsltToken", "id", "installPath", "lastStartedAt", "lastStoppedAt", "map", "maxPlayers", "name", "ownerId", "port", "processId", "rconPassword", "rconPort", "status", "updatedAt", "workshopCollection", "workshopMapId") SELECT "createdAt", "description", "gameMode", "gsltToken", "id", "installPath", "lastStartedAt", "lastStoppedAt", "map", "maxPlayers", "name", "ownerId", "port", "processId", "rconPassword", "rconPort", "status", "updatedAt", "workshopCollection", "workshopMapId" FROM "servers";
DROP TABLE "servers";
ALTER TABLE "new_servers" RENAME TO "servers";
CREATE UNIQUE INDEX "servers_port_key" ON "servers"("port");
CREATE UNIQUE INDEX "servers_rconPort_key" ON "servers"("rconPort");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
