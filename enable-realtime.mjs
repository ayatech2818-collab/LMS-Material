import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'db.yzjjwhenniaucguvzgvj.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'Ayatech2818@',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  try {
    console.log("Enabling Realtime via Supabase logical replication publication...");
    await client.query("ALTER PUBLICATION supabase_realtime ADD TABLE tasks;");
    await client.query("ALTER PUBLICATION supabase_realtime ADD TABLE task_assignments;");
    console.log("Realtime successfully enabled for Kanban and Assignments!");
  } catch (error) {
    if (error.message.includes("is already in publication")) {
      console.log("Tables are already registered in realtime publication.");
    } else {
      console.error(error);
    }
  } finally {
    await client.end();
  }
}
run();
