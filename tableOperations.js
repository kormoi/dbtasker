const path = require("path");
const fncs = require("./functions.js");
const { table, error } = require("console");


const jsonClientfilePath = path.join(__dirname, "../tables.json");
let matchDatabase = path.join(__dirname, "./readonly");
const dropTable = false;
const dropColumn = true;
const createTable = true;
const alterTable = true;








//generate table query
function generateCreateTableQuery(databaseName, tableName, schemaObject, dbType = "mysql") {
  const errors = [];

  // Validate inputs
  if (!databaseName || typeof databaseName !== "string") {
    errors.push("Invalid database name.");
  }

  if (!tableName || typeof tableName !== "string") {
    errors.push("Invalid table name.");
  }

  if (
    !schemaObject ||
    typeof schemaObject !== "object" ||
    Array.isArray(schemaObject)
  ) {
    errors.push("Invalid schema object.");
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  const columns = [];
  const foreignKeys = [];

  for (let columnName in schemaObject) {
    const columnInfo = schemaObject[columnName];

    if (
      typeof columnInfo === "object" &&
      columnInfo !== null &&
      !Array.isArray(columnInfo)
    ) {
      const type = columnInfo.type;

      if (!type || typeof type.name !== "string") {
        errors.push(`Invalid type for column: ${columnName}`);
        continue;
      }

      let columnDef = `"${columnName}" ${type.name}`;

      // Length/Precision
      if (type.LengthValues !== undefined) {
        columnDef += `(${type.LengthValues})`;
      }

      // NULL/NOT NULL
      columnDef += columnInfo.NULL === false ? " NOT NULL" : " NULL";

      // DEFAULT
      if (columnInfo.DEFAULT !== undefined) {
        let defaultValue = columnInfo.DEFAULT;

        if (
          typeof defaultValue === "string" &&
          defaultValue.match(/CURRENT_TIMESTAMP/i)
        ) {
          columnDef += ` DEFAULT ${defaultValue}`;
        } else {
          defaultValue = `'${defaultValue}'`;
          columnDef += ` DEFAULT ${defaultValue}`;
        }
      }

      // ON UPDATE (MySQL only)
      if (dbType === "mysql" && columnInfo.on_update) {
        if (typeof columnInfo.on_update === "string") {
          columnDef += ` ON UPDATE ${columnInfo.on_update}`;
        }
      }

      // COMMENT (MySQL only)
      if (dbType === "mysql" && columnInfo.comment) {
        const cmnt = columnInfo.comment.replace(/'/g, "");
        columnDef += ` COMMENT '${cmnt}'`;
      }

      // AUTO_INCREMENT (MySQL) or SERIAL (PostgreSQL)
      if (columnInfo.AUTO_INCREMENT) {
        if (dbType === "mysql") {
          columnDef += " AUTO_INCREMENT";
        } else if (dbType === "postgres") {
          columnDef = `"${columnName}" SERIAL`;
        }
      }

      // INDEX (MySQL only)
      if (dbType === "mysql" && columnInfo.index) {
        columnDef += ` ${columnInfo.index}`;
      }

      columns.push(columnDef);

      // Foreign Keys
      if (columnInfo.foreign_key) {
        const fk = columnInfo.foreign_key;
        if (
          fk &&
          typeof fk === "object" &&
          fk.REFERENCES &&
          fk.REFERENCES.table &&
          fk.REFERENCES.column
        ) {
          let foreignKeyDef = `FOREIGN KEY ("${columnName}") REFERENCES "${fk.REFERENCES.table}"("${fk.REFERENCES.column}")`;

          if (fk.delete === true) {
            foreignKeyDef += " ON DELETE CASCADE";
          } else if (fk.delete === null) {
            foreignKeyDef += " ON DELETE SET NULL";
          }

          if (fk.update === "CASCADE") {
            foreignKeyDef += " ON UPDATE CASCADE";
          }

          foreignKeys.push(foreignKeyDef);
        } else {
          errors.push(`Invalid foreign key for column "${columnName}": ${JSON.stringify(fk)}`);
        }
      }
    } else {
      errors.push(`Invalid column definition for: ${columnName}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  const tableDefinition = [...columns, ...foreignKeys].join(", ");
  let createTableQuery = "";

  if (dbType === "mysql") {
    createTableQuery = `CREATE TABLE IF NOT EXISTS \`${tableName}\` (${tableDefinition}) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`;
  } else if (dbType === "postgres") {
    createTableQuery = `CREATE TABLE IF NOT EXISTS "${tableName}" (${tableDefinition});`;
  } else {
    throw new Error(`Unsupported database type: ${dbType}`);
  }

  return createTableQuery.replace(/''/g, "'");
}


//Generate modifying and droping table query
async function generateAlterTableQuery(databaseName, tableName, schema, dropColumn) {
  try {
    if (!schema) {
      throw new Error(`Schema for table ${tableName} is undefined or null`);
    }

    const fullTableName = `\`${databaseName}\`.\`${tableName}\``;

    const existingColumns = await getColumnDetails(databaseName, tableName);
    console.log(`Fetched column details for table: ${tableName}`);
    const existingForeignKey = await getForeignKeyDetails(databaseName, tableName);
    console.log(`Fetched foreign key details for table: ${tableName}`);

    if (!existingColumns) {
      throw new Error(`Failed to fetch column details for table ${tableName}`);
    }

    let alterStatements = [];
    let isModifyIncludefk = [];
    let isIncludefk = [];
    let dropforeignkeyconstraint = [];
    let unmatchedforeignkey = [];

    for (const [columnName, columnDetails] of Object.entries(schema)) {
      if (!columnDetails) continue;

      const existingColumn = existingColumns.find(col => col.column_name === columnName);

      if (existingColumn) {
        let isSameType = existingColumn.data_type.toLowerCase() === columnDetails.type?.name.toLowerCase();

        let isSameLength = false;
        if (
          (existingColumn.character_maximum_length > 50000 &&
            columnDetails.type?.LengthValues === undefined) ||
          (existingColumn.character_maximum_length === null &&
            columnDetails.type?.LengthValues === undefined) ||
          existingColumn.character_maximum_length === columnDetails.type?.LengthValues
        ) {
          isSameLength = true;
        } else if (columnDetails.type?.name === "ENUM") {
          let length_val = columnDetails.type?.LengthValues?.replace(/,\s+/g, ",");
          if (`enum(${length_val})` === existingColumn.column_type) {
            isSameLength = true;
          }
        }

        let isSameNull =
          (existingColumn.is_nullable === "YES" && columnDetails.NULL !== false) ||
          (existingColumn.is_nullable === "NO" && columnDetails.NULL === false);

        let isDefaultMatch = false;
        if (isNumber(columnDetails.DEFAULT)) {
          columnDetails.DEFAULT = columnDetails.DEFAULT.toString();
        }

        if (
          existingColumn.default_value === `'${columnDetails.DEFAULT}'` ||
          existingColumn.default_value === columnDetails.DEFAULT ||
          (["NULL", null].includes(existingColumn.default_value) && columnDetails.DEFAULT === undefined) ||
          (existingColumn.default_value === "current_timestamp()" && columnDetails.DEFAULT === "CURRENT_TIMESTAMP")
        ) {
          isDefaultMatch = true;
        } else if (columnDetails.DEFAULT || columnDetails.DEFAULT === 0) {
          isDefaultMatch = existingColumn.default_value === columnDetails.DEFAULT.toString();
        }

        let isSameComment =
          existingColumn.column_comment === columnDetails.comment?.replace(/'/g, "") ||
          (existingColumn.column_comment === "" && columnDetails.comment === undefined);

        if (columnDetails.foreign_key) {
          isIncludefk.push(columnName);
          for (const keys of existingForeignKey) {
            if (keys.COLUMN_NAME == columnName) {
              if (
                keys.REFERENCED_TABLE_NAME !== columnDetails.foreign_key.REFERENCES.table ||
                keys.REFERENCED_COLUMN_NAME !== columnDetails.foreign_key.REFERENCES.column ||
                (keys.DELETE_RULE === "CASCADE" && columnDetails.foreign_key.delete !== true) ||
                (keys.DELETE_RULE !== "CASCADE" && columnDetails.foreign_key.delete === true)
              ) {
                dropforeignkeyconstraint.push(keys.CONSTRAINT_NAME);
                unmatchedforeignkey.push(keys.COLUMN_NAME);
              }
            }
          }
        }

        if (
          isSameType &&
          isSameLength &&
          isSameNull &&
          isDefaultMatch &&
          isSameComment
        ) continue;

        if (columnDetails.foreign_key) {
          isModifyIncludefk.push(columnName);
        }

        let modifyStatement = `ALTER TABLE ${fullTableName} MODIFY COLUMN \`${columnName}\` ${columnDetails.type?.name}`;

        if (
          ["enum", "varchar"].includes(columnDetails.type?.name) &&
          !columnDetails.type?.LengthValues
        ) {
          throw new Error(`ENUM or VARCHAR column "${columnName}" needs a LengthValues definition.`);
        }

        if (columnDetails.type?.LengthValues !== undefined) {
          modifyStatement += `(${columnDetails.type.LengthValues})`;
        }

        modifyStatement += columnDetails.NULL === false ? " NOT NULL" : " NULL";

        if (columnDetails.DEFAULT || columnDetails.DEFAULT === 0) {
          if (columnDetails.DEFAULT === "CURRENT_TIMESTAMP") {
            modifyStatement += ` DEFAULT CURRENT_TIMESTAMP`;
          } else if (isJsonObject(columnDetails.DEFAULT)) {
            throw new Error("Default value is restricted for BLOB, TEXT, JSON, etc.");
          } else {
            modifyStatement += ` DEFAULT '${columnDetails.DEFAULT}'`;
          }
        }

        if (columnDetails.on_update) {
          modifyStatement += ` ON UPDATE ${columnDetails.on_update}`;
        }

        if (columnDetails.comment) {
          modifyStatement += ` COMMENT '${bypassQuotes(columnDetails.comment)}'`;
        }

        if (columnDetails.AUTO_INCREMENT) {
          modifyStatement += " AUTO_INCREMENT";
        }

        alterStatements.push(modifyStatement);
      } else {
        // New column
        let addStatement = `ALTER TABLE ${fullTableName} ADD COLUMN \`${columnName}\` ${columnDetails.type?.name}`;

        if (
          ["enum", "varchar"].includes(columnDetails.type?.name) &&
          !columnDetails.type?.LengthValues
        ) {
          throw new Error(`ENUM or VARCHAR column "${columnName}" needs a LengthValues definition.`);
        }

        if (columnDetails.type?.LengthValues !== undefined) {
          addStatement += `(${columnDetails.type.LengthValues})`;
        }

        addStatement += columnDetails.NULL === false ? " NOT NULL" : " NULL";

        if (columnDetails.DEFAULT || columnDetails.DEFAULT === 0) {
          if (columnDetails.DEFAULT === "CURRENT_TIMESTAMP") {
            addStatement += ` DEFAULT CURRENT_TIMESTAMP`;
          } else if (isJsonObject(columnDetails.DEFAULT)) {
            throw new Error("Default value is restricted for BLOB, TEXT, JSON, etc.");
          } else {
            addStatement += ` DEFAULT '${columnDetails.DEFAULT}'`;
          }
        }

        if (columnDetails.on_update) {
          addStatement += ` ON UPDATE ${columnDetails.on_update}`;
        }

        if (columnDetails.comment) {
          addStatement += ` COMMENT '${bypassQuotes(columnDetails.comment)}'`;
        }

        if (columnDetails.AUTO_INCREMENT) {
          addStatement += " AUTO_INCREMENT";
        }

        alterStatements.push(addStatement);

        if (columnDetails.foreign_key) {
          isIncludefk.push(columnName);
        }
      }
    }

    // Handle foreign keys
    const addForeignkeyquery = [];
    const dropForeignkeyquery = [];
    let findnewfk = [...isIncludefk];

    if (existingForeignKey.length > 0) {
      for (const fk of existingForeignKey) {
        if (
          isModifyIncludefk.includes(fk.COLUMN_NAME) ||
          !isIncludefk.includes(fk.COLUMN_NAME)
        ) {
          if (!dropforeignkeyconstraint.includes(fk.CONSTRAINT_NAME)) {
            dropforeignkeyconstraint.push(fk.CONSTRAINT_NAME);
          }
        }
        findnewfk = removefromarray(findnewfk, fk.COLUMN_NAME);
      }
    }

    for (const dropKey of dropforeignkeyconstraint) {
      dropForeignkeyquery.push(`ALTER TABLE ${fullTableName} DROP FOREIGN KEY \`${dropKey}\``);
    }

    let ibfk = 1;
    for (const fkCol of [...findnewfk, ...isModifyIncludefk, ...unmatchedforeignkey]) {
      const fk = schema[fkCol].foreign_key;
      let fkStmt = `ALTER TABLE ${fullTableName} ADD CONSTRAINT \`${tableName}_ibfk${ibfk++}\` FOREIGN KEY (\`${fkCol}\`) REFERENCES \`${fk.REFERENCES.table}\`(\`${fk.REFERENCES.column}\`)`;
      if (fk.delete === true) {
        fkStmt += " ON DELETE CASCADE";
      } else if (fk.delete === null) {
        fkStmt += " ON DELETE SET NULL";
      }
      if (fk.on_update === null) {
        fkStmt += " ON UPDATE SET NULL";
      }
      addForeignkeyquery.push(fkStmt);
    }

    if (dropColumn) {
      for (const col of existingColumns) {
        if (!schema[col.column_name]) {
          alterStatements.push(`ALTER TABLE ${fullTableName} DROP COLUMN \`${col.column_name}\``);
        }
      }
    }

    const result = [
      ...dropForeignkeyquery,
      ...alterStatements,
      ...addForeignkeyquery,
    ];

    if (result.length === 0) {
      console.log(`No changes needed for table "${tableName}".`);
      return [];
    }

    return result;
  } catch (err) {
    console.error(`Error generating alter table queries for ${tableName}:`, err.message);
    throw err;
  }
}

// Do anything with the table
async function createOrModifyTable(databaseName, queryText) {
  try {
    // Select the target database first
    await pool.query(`USE \`${databaseName}\`;`);

    await pool.query(queryText);

    function getTableName(input) {
      if (typeof input !== "string") {
        throw new Error("Query text must be a string");
      }
      const words = input.trim().split(/\s+/);
      if (words.length < 5) {
        return [];
      }
      if (input.startsWith("CREATE TABLE IF NOT EXISTS") && words.length > 5) {
        return [words[5]];
      } else {
        return [words[2], words[5]];
      }
    }

    const table_name = getTableName(queryText);

    if (table_name.length > 1) {
      return {
        success: true,
        message: `${table_name[1]} column of ${table_name[0]} table created or modified successfully.`,
        querytext: queryText,
      };
    } else if (table_name.length === 1) {
      return {
        success: true,
        message: `${table_name[0]} table created or modified successfully.`,
        querytext: queryText,
      };
    } else {
      return {
        success: true,
        message: `Table operation successful.`,
        querytext: queryText,
      };
    }
  } catch (err) {
    return {
      success: false,
      message: err.message,
      querytext: queryText,
    };
  }
}


async function createTables(databaseName, tableQueries) {
  console.log(`Creating or Modifying Tables in Database: ${databaseName}`);

  for (const query of tableQueries) {
    console.log("Operating query is:");
    console.log([query]);
    console.log("...");

    const result = await createOrModifyTable(databaseName, query);

    if (!result.success) {
      console.error(
        "Error creating table:",
        result.message,
        "queryText:",
        result.querytext
      );
      throw new Error("Error creating table");
    } else {
      console.log(result.message);
    }
  }
}


async function tableOperation({ createTable, alterTable, dropTable, dropColumn, databaseName }) {
  try {
    let isTableModified = false;
    let newJsonStoreFilePath = "";

    const lastSavedFile = await getLastSavedFile(databaseName);
    newJsonStoreFilePath = lastSavedFile
      ? path.join(databaseName, lastSavedFile)
      : databaseName + path.join(__dirname, "/file.json");

    const isSame = await compareJsonFiles(jsonClientfilePath, newJsonStoreFilePath);
    if (isSame) {
      console.log("\x1b[1m\x1b[32mThe JSON files are the same. No update needed. We are good to go...\x1b[0m");
      return;
    }

    console.log("The JSON files are different. Updating the database and the store file...");
    const jsonData = await readJsonFile(jsonClientfilePath);
    const objectTableNames = Object.keys(jsonData.tables);
    const dbTableNames = await getTableNames(databaseName);

    let queryList = [];

    for (const tableName of objectTableNames) {
      try {
        const tableDef = jsonData.tables[tableName];

        // Support LengthValue as array for enum/decimal
        if (Array.isArray(tableDef.columns)) {
          tableDef.columns = tableDef.columns.map((col) => {
            if (Array.isArray(col.LengthValue)) {
              col.LengthValue = col.LengthValue.join(",");
            }
            return col;
          });
        }

        let query;
        if (dbTableNames.includes(tableName.toLowerCase())) {
          if (alterTable) {
            query = await generateAlterTableQuery(
              tableName.toLowerCase(),
              tableDef,
              dropColumn,
              databaseName
            );
            console.log(`Alter query generated for table: ${tableName}`);
          }
        } else if (createTable) {
          query = await generateCreateTableQuery(
            tableName.toLowerCase(),
            tableDef,
            databaseName
          );
          console.log(`Create query generated for new table: ${tableName}`);
        }

        if (query) queryList.push(query);
      } catch (err) {
        console.error(`Error generating query for table ${tableName}:`, err.message);
        return;
      }
    }

    // Execute the queries
    if (queryList.length) {
      try {
        await createTables(queryList.flat(), databaseName);
        console.log("All tables created or modified successfully.");
        isTableModified = true;
      } catch (err) {
        console.error("Error in creating/modifying tables:", err.message);
        return;
      }
    } else {
      console.log("No table changes needed.");
    }

    // Drop unused tables
    if (dropTable) {
      try {
        const tablesToDrop = dbTableNames.filter(
          (dbTable) => !objectTableNames.includes(dbTable)
        );

        if (tablesToDrop.length > 0) {
          await dropTables(tablesToDrop, databaseName);
          console.log("Dropped tables:", tablesToDrop);
        } else {
          console.log("No tables to drop.");
        }
      } catch (err) {
        console.error("Error during dropTable operation:", err.message);
      }
    }

    // Update store file
    if (isTableModified) {
      try {
        const dateTime = getDateTime("_");
        const filename = `${databaseName}/${dateTime.date}__${dateTime.time}_storeTableJSON.json`;
        const jsonData = await readJsonFile(jsonClientfilePath);
        await writeJsonFile(filename, jsonData);
        console.log("Updated store file at:", filename);
      } catch (err) {
        console.error("Error saving updated JSON store file:", err.message);
      }
    }
  } catch (error) {
    console.error("Error in tableOperation:", error.message);
  }
}

//tableOperation(true, true, true, true);
module.exports = { tableOperation };
//tableOperation(createTable, alterTable, dropTable, dropColumn);
