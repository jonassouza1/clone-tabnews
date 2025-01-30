import migrationRunner from "node-pg-migrate";
import { resolve } from "node:path";
import database from "infra/database.js";
import { createRouter } from "next-connect";
import controller from "infra/controller";

const router = createRouter();
router.get(getHandler);
router.post(postHandler);

export default router.handler(controller.errorHandlers);

async function migrationsOptions() {
  const dbClient = await database.getNewClient();
  const defaultMigrationOptions = {
    dbClient: dbClient,
    dryRun: true,
    dir: resolve("infra", "migrations"),
    direction: "up",
    verbose: true,
    migrationsTable: "pgmigrations",
  };
  return defaultMigrationOptions;
}

async function getHandler(request, response) {
  let defaultMigrationOptions;
  try {
    defaultMigrationOptions = await migrationsOptions();
    const pendingMigrations = await migrationRunner(defaultMigrationOptions);

    return response.status(200).json(pendingMigrations);
  } finally {
    defaultMigrationOptions.dbClient.end();
  }
}

async function postHandler(request, response) {
  let defaultMigrationOptions;
  try {
    defaultMigrationOptions = await migrationsOptions();
    const migratedMigrations = await migrationRunner({
      ...defaultMigrationOptions,
      dryRun: false,
    });

    if (migratedMigrations.length > 0) {
      return response.status(201).json(migratedMigrations);
    }
    return response.status(200).json(migratedMigrations);
  } finally {
    defaultMigrationOptions.dbClient.end();
  }
}
