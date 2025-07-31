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
  const dropTable = await fncs.dropTables(DBInfo, "test", ["cart"]);
  const tableNames = await fncs.getTableNames(DBInfo, "test");
  console.log(dropTable);
  console.log(tableNames);
}
check();