import knex from "knex";

let db;
export default async function connectPg(connectionString) {
  db = knex({
    client: "pg",
    connection: connectionString,
    pool: { min: 0, max: 7 }
  });
  console.log("Connected to Postgres via Knex");
  return db;
}

// optionally export db for queries
export { db as pg };
