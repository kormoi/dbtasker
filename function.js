const mysql = require('mysql2/promise');


function isNumber(str) {
  if (str === null || str === undefined) {
    return false;
  }
  if (typeof str === "number") {
    return true;
  }
  if (Array.isArray(str) || typeof str === "object") {
    return false;
  }
  return !isNaN(str) && str.trim() !== "";
}
function getDateTime(seperator) {
  const today = new Date();
  const formattedDateTime =
    today.getFullYear() +
    seperator +
    (today.getMonth() + 1).toString().padStart(2, "0") +
    seperator +
    today.getDate().toString().padStart(2, "0") +
    " " +
    today.getHours().toString().padStart(2, "0") +
    seperator +
    today.getMinutes().toString().padStart(2, "0") +
    seperator +
    today.getSeconds().toString().padStart(2, "0");

  const formatedDate =
    today.getFullYear() +
    seperator +
    (today.getMonth() + 1).toString().padStart(2, "0") +
    seperator +
    today.getDate().toString().padStart(2, "0");
  const formatedTime =
    today.getHours().toString().padStart(2, "0") +
    seperator +
    today.getMinutes().toString().padStart(2, "0") +
    seperator +
    today.getSeconds().toString().padStart(2, "0");
  return {
    year: today.getFullYear(),
    month: (today.getMonth() + 1).toString().padStart(2, "0"),
    day: today.getDate().toString().padStart(2, "0"),
    date: formatedDate,
    time: formatedTime,
    hours: today.getHours().toString().padStart(2, "0"),
    minutes: today.getMinutes().toString().padStart(2, "0"),
    seconds: today.getSeconds().toString().padStart(2, "0"),
    datetime: formattedDateTime,
  };
}
function isValidMySQLConfig(config) {
  if (typeof config !== 'object' || config === null) return false;

  const requiredKeys = ['host', 'user', 'password'];
  
  for (const key of requiredKeys) {
    if (!(key in config)) return false;
    if (typeof config[key] !== 'string' || config[key].trim() === '') return false;
  }

  return true;
}
async function isMySQLDatabase(config) {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    const [rows] = await connection.query('SELECT VERSION() AS version');

    const version = rows?.[0]?.version;

    // Check that version is a non-empty string
    return typeof version === 'string' && version.length > 0;
  } catch (err) {
    console.error('Connection error:', err.message);
    return false;
  } finally {
    if (connection) await connection.end();
  }
}
async function checkDatabaseExists(config, dbName) {
  try {
    const connection = await mysql.createConnection({
      host: config.host,
      user: config.user,
      password: config.password,
      port: config.port || 3306
    });

    const [rows] = await connection.query("SHOW DATABASES LIKE ?", [dbName]);
    await connection.end();

    return rows.length > 0;
  } catch (err) {
    console.error(err.message);
    return null;
  }
}
async function createDatabase(config, dbName) {
  let connection;

  try {
    connection = await mysql.createConnection(config);
    await connection.query(`CREATE DATABASE \`${dbName}\``);
    console.log(`✅ Database '${dbName}' created successfully.`);
    return true;
  } catch (err) {
    if (err.code === 'ER_DB_CREATE_EXISTS') {
      console.log(`⚠️  Database '${dbName}' already exists.`);
      return false;
    } else {
      console.error(`❌ Error creating database:`, err.message);
      return null;
    }
  } finally {
    if (connection) await connection.end();
  }
}
async function getAllDatabaseNames(config) {
  let connection;

  try {
    connection = await mysql.createConnection(config);
    const [rows] = await connection.query('SHOW DATABASES');

    // Extract database names from result
    const databases = rows.map(row => row.Database);
    return databases;
  } catch (err) {
    console.error('❌ Error fetching database names:', err.message);
    return null;
  } finally {
    if (connection) await connection.end();
  }
}
function isValidDatabaseName(name) {
  if (typeof name !== 'string') return false;

  const maxLength = 64;

  const reservedKeywords = new Set([
    "select", "insert", "update", "delete", "create", "drop", "alter", "table",
    "from", "where", "join", "and", "or", "not", "null", "group", "by", "order",
    "having", "into", "as", "like", "union", "distinct", "case", "when", "then",
    "else", "end", "in", "exists", "between", "index", "primary", "foreign", "key",
    "check", "constraint", "default", "trigger", "view", "procedure", "function",
    "grant", "revoke", "all", "any", "asc", "desc", "count", "limit", "offset",
    "schema", "cursor", "declare", "begin", "end", "fetch", "loop", "exit",
    "handler", "leave", "open", "close", "temporary", "replace", "if", "while",
    "repeat", "do", "admin", "root", "master", "mysql", "postgres", "test", "sys",
    "system", "public", "information_schema", "performance_schema", "pg_catalog"
  ]);

  const osReserved = new Set([
    "con", "prn", "aux", "nul", "com1", "com2", "com3", "com4", "com5", "com6",
    "com7", "com8", "com9", "lpt1", "lpt2", "lpt3", "lpt4", "lpt5", "lpt6",
    "lpt7", "lpt8", "lpt9"
  ]);

  const lowerName = name.toLowerCase();

  // Basic rules
  if (name.length === 0 || name.length > maxLength) return false;
  if (!/^[a-z][a-z0-9_]*$/.test(name)) return false;
  if (reservedKeywords.has(lowerName)) return false;
  if (osReserved.has(lowerName)) return false;

  return true;
}
function isValidTableName(name) {
  if (typeof name !== 'string') return false;

  const maxLength = 64;

  const reservedKeywords = new Set([
    "select", "insert", "update", "delete", "create", "drop", "alter", "table",
    "from", "where", "join", "and", "or", "not", "null", "group", "by", "order",
    "having", "into", "as", "like", "union", "distinct", "case", "when", "then",
    "else", "end", "in", "exists", "between", "index", "primary", "foreign", "key",
    "check", "constraint", "default", "trigger", "view", "procedure", "function",
    "grant", "revoke", "all", "any", "asc", "desc", "count", "limit", "offset",
    "schema", "cursor", "declare", "begin", "end", "fetch", "loop", "exit",
    "handler", "leave", "open", "close", "temporary", "replace", "if", "while",
    "repeat", "do", "admin", "root", "master", "mysql", "postgres", "test", "sys",
    "system", "public", "information_schema", "performance_schema", "pg_catalog"
  ]);

  const invalidCharacters = /[^a-zA-Z0-9_]/;
  const startsInvalid = /^[^a-zA-Z]/;
  const lowerName = name.toLowerCase();

  if (name.length === 0 || name.length > maxLength) return false;
  if (invalidCharacters.test(name)) return false;
  if (startsInvalid.test(name)) return false;
  if (reservedKeywords.has(lowerName)) return false;

  return true;
}
function isValidColumnName(name) {
  if (typeof name !== 'string') return false;

  const maxLength = 64;

  const reservedKeywords = new Set([
    "select", "insert", "update", "delete", "create", "drop", "alter", "table",
    "column", "from", "where", "join", "and", "or", "not", "null", "group", "by",
    "order", "having", "into", "as", "like", "union", "distinct", "case", "when",
    "then", "else", "end", "in", "exists", "between", "index", "primary", "foreign",
    "key", "check", "constraint", "default", "trigger", "view", "procedure",
    "function", "grant", "revoke", "asc", "desc", "limit", "offset", "schema",
    "if", "while", "do", "loop", "replace", "return", "all", "any", "begin", "end"
  ]);

  const startsInvalid = /^[^a-zA-Z]/;
  const invalidChars = /[^a-zA-Z0-9_]/;
  const lowerName = name.toLowerCase();

  if (name.length === 0 || name.length > maxLength) return false;
  if (startsInvalid.test(name)) return false;           // Must start with a letter
  if (invalidChars.test(name)) return false;            // Only letters, numbers, _
  if (reservedKeywords.has(lowerName)) return false;    // Not a SQL keyword

  return true;
}
function parseColumnWithOptionalLoopStrict(text) {
  if (typeof text !== 'string') return false;

  text = text.trim();

  // Case 1: product(year)
  let match = text.match(/^([a-zA-Z_][\w]*)\(([^()]+)\)$/);
  if (match) {
    const name = match[1];
    const loop = match[2];
    if (isValidColumnName(name) && isValidColumnName(loop)) {
      return { name, loop };
    }
    return false;
  }

  // Case 2: (year)product
  match = text.match(/^\(([^()]+)\)([a-zA-Z_][\w]*)$/);
  if (match) {
    const loop = match[1];
    const name = match[2];
    if (isValidColumnName(name) && isValidColumnName(loop)) {
      return { name, loop };
    }
    return false;
  }

  // Case 3: just a column name without loop
  if (isValidColumnName(text)) {
    return { name: text, loop: null };
  }

  // Any invalid format or invalid name
  return false;
}










async function getLastSavedFile(directory) {
  try {
    // Read the directory
    const files = await fs.readdir(directory);

    // Handle empty directory
    if (files.length === 0) {
      throw new Error(`No files found in the directory: ${directory}`);
    }

    // Get file stats and sort by modification time
    const fileStats = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(directory, file);
        const stats = await fs.stat(filePath);
        return { file, stats };
      })
    );

    const sortedFiles = fileStats.sort((a, b) => b.stats.mtime - a.stats.mtime);

    // Return the most recently saved file
    const lastSavedFile = sortedFiles[0]?.file; // Use optional chaining
    return lastSavedFile;
  } catch (err) {
    console.error(
      `Error getting last saved file from directory "${directory}": ${err.message}`
    );
    return null; // Return `null` if an error occurs
  }
}
async function compareJsonFiles(filePath1, filePath2) {
  try {
    // Ensure both files exist
    await fs.access(filePath1);
    await fs.access(filePath2);

    // Read the content of both files
    const fileContent1 = await fs.readFile(filePath1, "utf-8");
    const fileContent2 = await fs.readFile(filePath2, "utf-8");

    // Check if either file is empty
    if (!fileContent1.trim()) {
      console.error("File 1 is empty.");
      return false;
    }
    if (!fileContent2.trim()) {
      console.error("File 2 is empty.");
      return false;
    }

    // Parse the JSON content of both files
    let jsonData1, jsonData2;
    try {
      jsonData1 = JSON.parse(fileContent1);
    } catch (parseError) {
      console.error("Failed to parse File 1:", parseError.message);
      return false;
    }

    try {
      jsonData2 = JSON.parse(fileContent2);
    } catch (parseError) {
      console.error("Failed to parse File 2:", parseError.message);
      return false;
    }

    // Compare the two JSON objects using deepEqual
    const isEqual = JSON.stringify(jsonData1) === JSON.stringify(jsonData2);
    console.log("Are the JSON files equal?", isEqual);
    return isEqual;
  } catch (error) {
    // Log specific errors
    if (error.code === "ENOENT") {
      console.warn(`File not found: ${error.path}`);
      return false;
    } else {
      console.error("Error comparing JSON files:", error.message);
      return null;
    }
  }
}
async function readJsonFile(filePath) {
  try {
    // Check if the file has a .json extension
    if (path.extname(filePath).toLowerCase() !== ".json") {
      throw new Error(`The file at ${filePath} is not a JSON file.`);
    }

    // Read the file as a string
    const fileContent = await fs.readFile(filePath, "utf-8");

    // Parse the JSON string into an object
    const jsonData = JSON.parse(fileContent);
    return jsonData;
  } catch (error) {
    // Handle errors (e.g., file not found, invalid JSON)
    console.error(`Error reading or parsing JSON file at ${filePath}:`, error);
    return null;
  }
}
async function writeJsonFile(filePath, data) {
  try {
    // Ensure the directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Convert the data object to a JSON string with indentation
    const jsonString = JSON.stringify(data, null, 2);

    // Write the JSON string to the file
    await fs.writeFile(filePath, jsonString, "utf-8");
    const successMessage = `File written successfully to ${filePath}`;
    console.log(successMessage);
    return successMessage;
  } catch (error) {
    // Handle errors (e.g., permission issues, invalid data)
    console.error(`Error writing JSON file at ${filePath}:`, error);
    return null;
  }
}
//Write js file
const writeJsFile = async (filePath, content) => {
  try {
    await fs.access(filePath).catch(() => fs.mkdir(path.dirname(filePath), { recursive: true }));
    await fs.writeFile(filePath, content, 'utf8');
    console.log(`File written successfully to ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error writing file at ${filePath}:`, error);
  }
};
function removefromarray(arr, text) {
  if (!Array.isArray(arr)) {
    throw new Error("data must be an array.");
  }
  let index = arr.indexOf(text);
  if (index !== -1) {
    arr.splice(index, 1);
  }
  return arr
}
function isJsonObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isJsonString(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    return (
      typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
    );
  } catch (error) {
    return false;
  }
}
function isJsonSame(a, b) {
  if (isJsonString(a)) a = JSON.parse(a);
  if (isJsonString(b)) b = JSON.parse(b);

  if (a === b) return true;

  if (typeof a !== typeof b || a === null || b === null) return false;

  if (typeof a !== 'object') return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (let key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!isJsonSame(a[key], b[key])) return false;
  }

  return true;
}
function bypassQuotes(data) {
  let stringData = "";

  if (typeof data !== "string") {
    stringData = safeStringify(data);
  } else {
    stringData = data;
  }

  // First unescape any previously escaped quotes and backslashes
  stringData = stringData.replace(/\\(["'\\])/g, "$1");

  // Now escape all quotes and backslashes
  return stringData.replace(/(["'\\])/g, "\\$1");
}
async function getTableNames(config, databaseName) {
  const dbName = databaseName || config.database;

  if (!dbName) throw new Error("No database name provided.");

  const query = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = ?
  `;

  const pool = await mysql.createPool(config);
  try {
    const [results] = await pool.query(query, [dbName]);
    return results.map(row => row.TABLE_NAME || row.table_name);
  } catch (err) {
    console.error("Query failed:", err.message);
    return null;
  } finally {
    await pool.end();
  }
}
async function getColumnNames(config, databaseName, tableName) {
  let connection;

  try {
    // Create a new connection using the provided config
    connection = await mysql.createConnection({ ...config, database: databaseName });

    const query = `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
    `;

    const [rows] = await connection.execute(query, [databaseName, tableName]);

    return rows.map(row => row.COLUMN_NAME);
  } catch (err) {
    console.error("Error fetching column names:", err.message);
    return null;
  } finally {
    if (connection) await connection.end(); // Ensure connection is closed
  }
}
async function getColumnDetails(config, databaseName, tableName, columnName = null) {
  let connection;

  const query = `
    SELECT 
      COLUMN_NAME AS column_name,
      DATA_TYPE AS data_type,
      COLUMN_TYPE AS column_type,
      CHARACTER_MAXIMUM_LENGTH AS character_maximum_length,
      IS_NULLABLE AS is_nullable,
      COLUMN_DEFAULT AS default_value,
      COLUMN_COMMENT AS column_comment,
      COLLATION_NAME AS collation_name
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE 
      TABLE_SCHEMA = ?
      AND TABLE_NAME = ?
      ${columnName ? "AND COLUMN_NAME = ?" : ""}
  `;

  const params = columnName
    ? [databaseName, tableName, columnName]
    : [databaseName, tableName];

  try {
    connection = await mysql.createConnection({ ...config, database: databaseName });
    const [rows] = await connection.execute(query, params);

    // Process ENUM and SET types
    rows.forEach((row) => {
      if (row.data_type === "enum" || row.data_type === "set") {
        row.enum_set_values = row.column_type
          .replace(/(enum|set)\((.*)\)/i, "$2")
          .split(",")
          .map((val) => val.replace(/'/g, ""));
      }
    });

    return rows;
  } catch (error) {
    console.error("Error fetching column details:", error.message);
    return null;
  } finally {
    if (connection) await connection.end();
  }
}
async function getForeignKeyDetails(config, databaseName, tableName) {
  let connection;

  const query = `
    SELECT 
        k.TABLE_NAME,
        k.COLUMN_NAME,
        k.CONSTRAINT_NAME,
        k.REFERENCED_TABLE_NAME,
        k.REFERENCED_COLUMN_NAME,
        r.DELETE_RULE
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
    JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS r
        ON k.CONSTRAINT_NAME = r.CONSTRAINT_NAME
        AND k.CONSTRAINT_SCHEMA = r.CONSTRAINT_SCHEMA
    WHERE k.TABLE_SCHEMA = ?
      AND k.TABLE_NAME = ?
      AND k.REFERENCED_TABLE_NAME IS NOT NULL;
  `;

  try {
    connection = await mysql.createConnection({ ...config, database: databaseName });
    const [rows] = await connection.execute(query, [databaseName, tableName]);
    return rows;
  } catch (err) {
    console.error("Error fetching foreign key details:", err.message);
    return null;
  } finally {
    if (connection) await connection.end();
  }
}
async function dropTables(config, databaseName, tableNames) {
  if (!config || typeof config !== 'object') {
    throw new Error("Config must be a valid object.");
  }

  if (typeof databaseName !== 'string' || !databaseName.trim()) {
    throw new Error("databaseName must be a non-empty string.");
  }

  if (!Array.isArray(tableNames) || tableNames.length === 0) {
    throw new Error("tableNames must be a non-empty array of strings.");
  }

  // Create pool using the config, override the database name
  const pool = await mysql.createPool({ ...config, database: databaseName });

  try {
    console.log(`Attempting to drop tables in database ${databaseName}: ${tableNames.join(", ")}`);

    const escapedTables = tableNames
      .map(t => `\`${databaseName.replace(/`/g, "``")}\`.\`${t.replace(/`/g, "``")}\``)
      .join(", ");

    const query = `DROP TABLE IF EXISTS ${escapedTables}`;
    await pool.query(query);

    console.log(`Tables dropped successfully in database ${databaseName}: ${tableNames.join(", ")}`);
    return true;
  } catch (error) {
    console.error(`Error dropping tables in database ${databaseName}:`, error.message);
    return false;
  } finally {
    await pool.end();
  }
}
async function dropColumns(config, databaseName, tableName, columnNames) {
  if (!config || typeof config !== 'object') {
    throw new Error("Config must be a valid object.");
  }
  if (typeof databaseName !== 'string' || !databaseName.trim()) {
    throw new Error("databaseName must be a non-empty string.");
  }
  if (typeof tableName !== 'string' || !tableName.trim()) {
    throw new Error("tableName must be a non-empty string.");
  }
  if (!Array.isArray(columnNames) || columnNames.length === 0) {
    throw new Error("columnNames must be a non-empty array of strings.");
  }

  const pool = await mysql.createPool({ ...config, database: databaseName });

  try {
    // Escape identifiers
    const escapedTable = `\`${databaseName.replace(/`/g, "``")}\`.\`${tableName.replace(/`/g, "``")}\``;
    const dropStatements = columnNames.map(col =>
      `DROP COLUMN \`${col.replace(/`/g, "``")}\``).join(", ");

    const query = `ALTER TABLE ${escapedTable} ${dropStatements}`;
    console.log(`Executing: ${query}`);
    await pool.query(query);

    console.log(`Columns dropped from ${tableName}: ${columnNames.join(", ")}`);
  } catch (error) {
    console.error(`Error dropping columns:`, error.message);
  } finally {
    await pool.end();
  }
}
async function runQueryReturnTrueOrNull(config, databaseName, queryText) {
  let connection;

  try {
    connection = await mysql.createConnection({ ...config, database: databaseName });
    await connection.query(queryText);
    return true;
  } catch (err) {
    console.error("Query error:", err.message);
    return null;
  } finally {
    if (connection) await connection.end();
  }
}


module.exports = {
  isNumber,
  getDateTime,
  isValidMySQLConfig,
  isMySQLDatabase,
  checkDatabaseExists,
  createDatabase,
  getAllDatabaseNames,
  isValidDatabaseName,
  isValidTableName,
  isValidColumnName,
  parseColumnWithOptionalLoopStrict,
  isJsonString,
  isJsonObject,
  isJsonSame,
  getTableNames,
  getColumnNames,
  getColumnDetails,
  getForeignKeyDetails,
  dropTables,
  dropColumns,
}