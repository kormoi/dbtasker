const mysql = require("mysql2/promise");
const mdatabase = require("./index");


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
let pool = mysql.createPool({
  port: DBInfo.port,
  host: DBInfo.host,
  user: DBInfo.user,
  password: DBInfo.password,
  database: DBInfo.database,
  waitForConnections: DBInfo.waitForConnections,
  connectionLimit: DBInfo.connectionLimit,
  queueLimit: DBInfo.queueLimit
});

module.exports = {
    DBInfo
}




