const fncs = require("./function");

const DBInfo = {
  port: 3301,
  host: "localhost",
  user: "root",
  password: "1234",
  database: "test",
  waitForConnections: true,
  connectionLimit: 100,
  queueLimit: 0,
};

async function check() {
  const dropTable = fncs.perseTableNameWithLoop("hellos(year)")
  console.log(dropTable);
}
check();