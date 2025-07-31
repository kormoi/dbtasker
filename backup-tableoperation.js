const path = require("path");
const fs = require("fs/promises");  // Importing fs.promises for async operations
const { pool, DBInfo } = require("./server_setup.js"); // Import the promise-based pool
const fncs = require("./functions.js");
const { table, error } = require("console");


const jsonClientfilePath = path.join(__dirname, "../tables.json");
let matchDatabase = path.join(__dirname, "./readonly");
const dropTable = false;
const dropColumn = true;
const createTable = true;
const alterTable = true;








//generate table query
function generateCreateTableQuery(tableName, schemaObject) {
  const errors = [];

  // Validate table name
  if (!tableName || typeof tableName !== "string") {
    errors.push("Invalid table name.");
  }

  // Validate schema object
  if (
    !schemaObject ||
    typeof schemaObject !== "object" ||
    Array.isArray(schemaObject)
  ) {
    errors.push("Invalid schema object.");
  }

  // If there are critical validation errors, return immediately
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

      let columnDef = `${columnName} ${type.name}`;

      // Handle LengthValues if defined
      if (type["LengthValues"] !== undefined) {
        columnDef += `(${type["LengthValues"]})`;
      }

      // Handle NULL/NOT NULL
      columnDef += columnInfo.NULL === false ? " NOT NULL" : " NULL";

      // Handle DEFAULT
      if (columnInfo.DEFAULT !== undefined) {
        let defaultValue = columnInfo.DEFAULT;

        // Check if it's a string and matches the CURRENT_TIMESTAMP pattern
        if (
          typeof defaultValue === "string" &&
          defaultValue.match(/CURRENT_TIMESTAMP/i)
        ) {
          defaultValue = columnInfo.DEFAULT; // Keep it as is if it's CURRENT_TIMESTAMP
        } else {
          defaultValue = `'${defaultValue}'`; // Otherwise, wrap it in single quotes
        }

        columnDef += ` DEFAULT ${defaultValue}`;
      }
      //Handle onupdate
      if (columnInfo.on_update) {
        if (typeof columnInfo.on_update === "string") {
          columnDef += ` ON UPDATE ${columnInfo.on_update}`; // Keep it as is if it's CURRENT_TIMESTAMP
        }
      }

      // Handle COMMENT
      if (columnInfo.comment) {
        let cmnt = columnInfo.comment.replace(/'/g, "");
        columnDef += ` COMMENT '${cmnt}'`;
      }

      // Handle AUTO_INCREMENT
      if (columnInfo.AUTO_INCREMENT) {
        columnDef += " AUTO_INCREMENT";
      }

      // Handle PRIMARY KEY/UNIQUE directly
      if (columnInfo.index) {
        columnDef += ` ${columnInfo.index}`;
      }

      // Push column definition
      columns.push(columnDef);

      // Handle foreign keys
      if (columnInfo.foreign_key) {
        const fk = columnInfo.foreign_key;
        if (
          fk &&
          typeof fk === "object" &&
          fk.REFERENCES &&
          fk.REFERENCES.table &&
          fk.REFERENCES.column
        ) {
          let foreignKeyDef = `FOREIGN KEY (${columnName}) REFERENCES ${fk.REFERENCES.table}(${fk.REFERENCES.column})`;

          // Handle ON DELETE
          if (fk.delete === true) {
            foreignKeyDef += " ON DELETE CASCADE";
          } else if (fk.delete === null) {
            foreignKeyDef += " ON DELETE SET NULL";
          }

          // Handle ON UPDATE
          if (fk.update === "CASCADE") {
            foreignKeyDef += " ON UPDATE CASCADE";
          }

          foreignKeys.push(foreignKeyDef);
        } else {
          errors.push(
            `Invalid foreign key definition for column "${columnName}": ${JSON.stringify(
              fk
            )}`
          );
        }
      }
    } else {
      errors.push(`Invalid column definition for: ${columnName}`);
    }
  }

  // If errors were collected during column validation, throw them
  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  // Combine columns and foreign keys into the table definition
  const tableDefinition = [...columns, ...foreignKeys].join(", ");
  const createTableQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (${tableDefinition}) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`;

  return createTableQuery.replace(/''/g, "'");
}

//Generate modifying and droping table query
async function generateAlterTableQuery(tableName, schema, dropColumn) {
  try {
    if (!schema) {
      throw new Error(`Schema for table ${tableName} is undefined or null`);
    }

    const existingColumns = await getColumnDetails(tableName);
    console.log(`Fetched column details for table: ${tableName}`);
    const existingForeignKey = await getForeignKeyDetails(tableName);
    console.log(`Fetched foreign key details for table: ${tableName}`);
    if (!existingColumns) {
      throw new Error(`Failed to fetch column details for table ${tableName}`);
    }

    let alterStatements = [];
    let isModifyIncludefk = []; //keeps the column_name if column modified
    let isIncludefk = []; //keeps all column_name in the table
    let dropforeignkeyconstraint = [];
    let unmatchedforeignkey = [];

    for (const [columnName, columnDetails] of Object.entries(schema)) {
      if (!columnDetails) {
        console.log(`Column details are undefined for column ${columnName}`);
        continue;
      }

      const existingColumn = existingColumns.find(
        (col) => col.column_name === columnName
      );

      if (existingColumn) {
        let isSameType = false;
        if (
          existingColumn.data_type.toLowerCase() ===
          columnDetails.type?.name.toLowerCase()
        ) {
          isSameType = true;
        }

        let isSameLength = false;
        if (
          (existingColumn.character_maximum_length > 50000 &&
            columnDetails.type?.LengthValues === undefined) ||
          (existingColumn.character_maximum_length === null &&
            columnDetails.type?.LengthValues === undefined) ||
          existingColumn.character_maximum_length ===
          columnDetails.type?.LengthValues
        ) {
          isSameLength = true;
        } else if (columnDetails.type?.name === "ENUM") {
          let length_val = columnDetails.type?.LengthValues;
          length_val = length_val.replace(/,\s+/g, ",");
          if (`enum(${length_val})` === existingColumn.column_type) {
            isSameLength = true;
          } else {
            isSameLength = false;
          }
        }
        let isSameNull = false;
        if (
          existingColumn.is_nullable === "YES" &&
          columnDetails.NULL !== false
        ) {
          isSameNull = true;
        } else if (
          existingColumn.is_nullable === "NO" &&
          columnDetails.NULL === false
        ) {
          isSameNull = true;
        }
        let isDefaultMatch = false;
        if (isNumber(columnDetails.DEFAULT)) {
          columnDetails.DEFAULT = columnDetails.DEFAULT.toString();
        }
        if (
          existingColumn.default_value === `'${columnDetails.DEFAULT}'` ||
          existingColumn.default_value === columnDetails.DEFAULT ||
          (existingColumn.default_value === "NULL" &&
            columnDetails.DEFAULT === undefined) ||
          (existingColumn.default_value === null &&
            columnDetails.DEFAULT === undefined) ||
          (existingColumn.default_value === "current_timestamp()" &&
            columnDetails.DEFAULT === "CURRENT_TIMESTAMP")
        ) {
          isDefaultMatch = true;
        } else if (columnDetails.DEFAULT || columnDetails.DEFAULT === 0) {
          if (
            existingColumn.default_value === columnDetails.DEFAULT.toString()
          ) {
            isDefaultMatch = true;
          } else {
            isDefaultMatch = false;
          }
        }
        let isSameComment = false;
        if (
          existingColumn.column_comment === columnDetails.comment?.replace(/'/g, "") ||
          (existingColumn.column_comment === "" &&
            columnDetails.comment === undefined)
        ) {
          isSameComment = true;
        }
        if (columnDetails.foreign_key) {
          isIncludefk.push(columnName);
          for (const keys of existingForeignKey) {
            if (keys.COLUMN_NAME == columnName) {
              if (
                keys.REFERENCED_TABLE_NAME ===
                columnDetails.foreign_key.REFERENCES.table &&
                keys.REFERENCED_COLUMN_NAME ===
                columnDetails.foreign_key.REFERENCES.column
              ) {
                if (
                  keys.DELETE_RULE === "CASCADE" &&
                  columnDetails.foreign_key.delete !== true
                ) {
                  dropforeignkeyconstraint.push(keys.CONSTRAINT_NAME);
                  unmatchedforeignkey.push(keys.COLUMN_NAME);
                } else if (
                  keys.DELETE_RULE !== "CASCADE" &&
                  columnDetails.foreign_key.delete === true
                ) {
                  dropforeignkeyconstraint.push(keys.CONSTRAINT_NAME);
                  unmatchedforeignkey.push(keys.COLUMN_NAME);
                }
              } else {
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
        ) {
          //console.log(`No modification needed for column "${columnName}"`);
          continue;
        }
        console.log(
          columnName,
          isSameType,
          isSameLength,
          isSameNull,
          isDefaultMatch,
          isSameComment
        );
        if (columnDetails.foreign_key) {
          isModifyIncludefk.push(columnName);
        }
        let modifyStatement = `ALTER TABLE ${tableName} MODIFY COLUMN ${columnName} ${columnDetails.type?.name}`;

        if (
          columnDetails.type?.name === "enum" ||
          columnDetails.type?.name === "varchar"
        ) {
          if (!columnDetails.type?.LengthValues) {
            throw new Error(
              `ENUM or VARCHAR column "${columnName}" needs a LengthValues definition.`
            );
          }
          modifyStatement += `(${columnDetails.type?.LengthValues})`;
        } else if (columnDetails.type?.LengthValues !== undefined) {
          modifyStatement += `(${columnDetails.type?.LengthValues})`;
        }

        if (columnDetails.NULL === false) {
          modifyStatement += " NOT NULL";
        } else {
          modifyStatement += " NULL";
        }
        if (columnDetails.DEFAULT || columnDetails.DEFAULT === 0) {
          if (columnDetails.DEFAULT === "CURRENT_TIMESTAMP") {
            modifyStatement += ` DEFAULT CURRENT_TIMESTAMP`;
          } else if (isJsonObject(columnDetails.DEFAULT)) {
            throw new Error(
              "Having default value is restricted by database for BLOB, TEXT, GEOMETRY or JSON column"
            );
          } else {
            modifyStatement += ` DEFAULT '${columnDetails.DEFAULT}'`;
          }
        }
        if (columnDetails.on_update) {
          modifyStatement += ` ON UPDATE ${columnDetails.on_update}`;
        }
        if (columnDetails.comment)
          modifyStatement += ` COMMENT '${bypassQuotes(columnDetails.comment)}'`;

        // Handle AUTO_INCREMENT
        if (columnDetails.AUTO_INCREMENT) {
          modifyStatement += " AUTO_INCREMENT";
        }

        console.log(`Modified existing column: ${columnName}`);
        console.log("modify statement is: ", modifyStatement);
        alterStatements.push(modifyStatement);
      } else {
        let addStatement = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDetails.type?.name}`;

        if (
          columnDetails.type?.name === "enum" ||
          columnDetails.type?.name === "varchar"
        ) {
          if (!columnDetails.type?.LengthValues) {
            throw new Error(
              `ENUM or VARCHAR column "${columnName}" needs a LengthValues definition.`
            );
          }
          addStatement += `(${columnDetails.type?.LengthValues})`;
        } else if (columnDetails.type?.LengthValues !== undefined) {
          addStatement += `(${columnDetails.type?.LengthValues})`;
        }

        if (columnDetails.NULL === false) addStatement += " NOT NULL";
        if (columnDetails.DEFAULT || columnDetails.DEFAULT === 0) {
          if (columnDetails.DEFAULT === "CURRENT_TIMESTAMP") {
            addStatement += ` DEFAULT CURRENT_TIMESTAMP`;
          } else if (isJsonObject(columnDetails.DEFAULT)) {
            throw new Error(
              "Having default value is restricted by database for BLOB, TEXT, GEOMETRY or JSON column"
            );
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

        // Handle AUTO_INCREMENT
        if (columnDetails.AUTO_INCREMENT) {
          addStatement += " AUTO_INCREMENT";
        }

        alterStatements.push(addStatement);
        if (columnDetails.foreign_key) {
          isIncludefk.push(columnName);
          for (const keys of existingForeignKey) {
            if (keys.COLUMN_NAME == columnName) {
              if (
                keys.REFERENCED_TABLE_NAME ===
                columnDetails.foreign_key.REFERENCES.table &&
                keys.REFERENCED_COLUMN_NAME ===
                columnDetails.foreign_key.REFERENCES.column
              ) {
                if (
                  keys.DELETE_RULE === "CASCADE" &&
                  columnDetails.foreign_key.delete !== true
                ) {
                  dropforeignkeyconstraint.push(keys.CONSTRAINT_NAME);
                  unmatchedforeignkey.push(keys.COLUMN_NAME);
                } else if (
                  keys.DELETE_RULE !== "CASCADE" &&
                  columnDetails.foreign_key.delete === true
                ) {
                  dropforeignkeyconstraint.push(keys.CONSTRAINT_NAME);
                  unmatchedforeignkey.push(keys.COLUMN_NAME);
                }
              } else {
                dropforeignkeyconstraint.push(keys.CONSTRAINT_NAME);
                unmatchedforeignkey.push(keys.COLUMN_NAME);
              }
            }
          }
        }
      }
    }
    //ALTER TABLE table_name DROP FOREIGN KEY foreign_key_name;
    //foreign keys query create operations
    let addForeignkeyquery = [];
    let dropForeignkeyquery = [];
    let findnewfk = isIncludefk;

    if (existingForeignKey.length > 0) {
      for (const existingforeigncolumn of existingForeignKey) {
        if (
          isModifyIncludefk.includes(existingforeigncolumn.COLUMN_NAME) ||
          !isIncludefk.includes(existingforeigncolumn.COLUMN_NAME)
        ) {
          if (
            !dropforeignkeyconstraint.includes(
              existingforeigncolumn.CONSTRAINT_NAME
            )
          ) {
            dropforeignkeyconstraint.push(
              existingforeigncolumn.CONSTRAINT_NAME
            );
          }
        }
        if (findnewfk.includes(existingforeigncolumn.COLUMN_NAME)) {
          findnewfk = removefromarray(
            findnewfk,
            existingforeigncolumn.COLUMN_NAME
          );
        }
      }
      //what is not modified those are not needed to delete or added newly. but what is not in existing is new to be added. if any need to drop then drop
    }

    //create drop foreign key queries
    if (dropforeignkeyconstraint.length > 0) {
      for (const dropkeys of dropforeignkeyconstraint) {
        dropForeignkeyquery.push(
          `ALTER TABLE ${tableName} DROP FOREIGN KEY ${dropkeys}`
        );
      }
    }
    //create add foreign key queries
    let ibfk = 1
    if (findnewfk.length > 0) {
      for (const newfk of findnewfk) {
        let newstatement = `ALTER TABLE ${tableName} ADD CONSTRAINT ${tableName}_ibfk${ibfk} FOREIGN KEY (${newfk}) REFERENCES ${schema[newfk].foreign_key.REFERENCES.table}(${schema[newfk].foreign_key.REFERENCES.column})`;
        ibfk += 1;
        if (schema[newfk].foreign_key.delete) {
          newstatement += ` ON DELETE CASCADE`;
        } else if (schema[newfk].foreign_key.delete === null) {
          newstatement += ` ON DELETE SET NULL`;
        }
        if (schema[newfk].foreign_key.on_update === null) {
          newstatement += ` ON UPDATE SET NULL`;
        }
        addForeignkeyquery.push(newstatement);
      }
    }
    if (isModifyIncludefk.length > 0) {
      for (const newfk of isModifyIncludefk) {
        let newstatement = `ALTER TABLE ${tableName} ADD CONSTRAINT ${tableName}_ibfk${ibfk} FOREIGN KEY (${newfk}) REFERENCES ${schema[newfk].foreign_key.REFERENCES.table}(${schema[newfk].foreign_key.REFERENCES.column})`;
        ibfk += 1;
        if (schema[newfk].foreign_key.delete) {
          newstatement += ` ON DELETE CASCADE`;
        } else if (schema[newfk].foreign_key.delete === null) {
          newstatement += ` ON DELETE SET NULL`;
        }
        if (schema[newfk].foreign_key.on_update === null) {
          newstatement += ` ON UPDATE SET NULL`;
        }
        addForeignkeyquery.push(newstatement);
      }
    }
    if (unmatchedforeignkey.length > 0) {
      for (const newfk of unmatchedforeignkey) {
        let newstatement = `ALTER TABLE ${tableName} ADD CONSTRAINT ${tableName}_ibfk${ibfk} FOREIGN KEY (${newfk}) REFERENCES ${schema[newfk].foreign_key.REFERENCES.table}(${schema[newfk].foreign_key.REFERENCES.column})`;
        ibfk += 1;
        if (schema[newfk].foreign_key.delete) {
          newstatement += ` ON DELETE CASCADE`;
        } else if (schema[newfk].foreign_key.delete === null) {
          newstatement += ` ON DELETE SET NULL`;
        }
        if (schema[newfk].foreign_key.on_update === null) {
          newstatement += ` ON UPDATE SET NULL`;
        }
        addForeignkeyquery.push(newstatement);
      }
    }

    if (dropColumn) {
      for (const col of existingColumns) {
        if (!schema[col.column_name]) {
          alterStatements.push(
            `ALTER TABLE ${tableName} DROP COLUMN ${col.column_name}`
          );
        }
      }
    }
    let newalterStatements = [];
    newalterStatements.push(dropForeignkeyquery);
    newalterStatements.push(alterStatements);
    newalterStatements.push(addForeignkeyquery);
    alterStatements = newalterStatements;
    if (alterStatements.length === 0) {
      console.log(`No changes needed for table "${tableName}".`);
      return [];
    }
    return alterStatements.flat();
  } catch (err) {
    console.error(
      `Error generating alter table queries for ${tableName}:`,
      err.message
    );
    throw err;
  }
}

async function createTables(tableQueries) {
  console.log("Creating or Modifiying Table");
  for (const query of tableQueries) {
    console.log("Operating query is:");
    let console_query = [];
    console_query.push(query);
    console.log(console_query);
    console.log("...");
    const result = await createOrModifyTable(query);
    if (!result.success) {
      console.error(
        "Error creating table:",
        result.message,
        "queryText: ",
        result.querytext
      );
      throw new Error("Error creating table");
    } else {
      console.log(result.message);
    }
  }
}

async function tableOperation(createTable, alterTable, dropTable, dropColumn) {
  try {
    let isTableCreated = false;
    let newJsonStoreFilePath = "";
    if ((await getLastSavedFile(matchDatabase)) == null) {
      newJsonStoreFilePath = matchDatabase + path.join(__dirname, "/file.json");
    } else {
      newJsonStoreFilePath =
        matchDatabase + "/" + (await getLastSavedFile(matchDatabase));
    }
    
    const compareTable = await compareJsonFiles(
      jsonClientfilePath,
      newJsonStoreFilePath
    );
    if (!compareTable) {
      console.log(
        "The JSON files are different. Updating the database and the store file..."
      );
      const jsonData = await readJsonFile(jsonClientfilePath);
      const objectTableNames = Object.keys(jsonData.tables);
      const dbTableNames = await getTableNames();

      //Creating and altering table
      if (createTable || alterTable) {
        let queryList = [];
        //Lets generate the query
        for (const ObjTable of objectTableNames) {
          try {
            let generatedQuery;
            // Check if the table exists in the database table names
            if (dbTableNames.includes(ObjTable.toLowerCase()) && alterTable) {
              console.log("db table names includes", ObjTable);
              // Generate alter table query if it exists
              generatedQuery = await generateAlterTableQuery(
                ObjTable.toLowerCase(),
                jsonData.tables[ObjTable],
                dropColumn
              );
              console.log(
                `Query generated for the existing table: ${ObjTable}`
              );
              console.log("Generated Query: ", generatedQuery);
            } else if (createTable) {
              // Generate create table query if it does not exist
              generatedQuery = await generateCreateTableQuery(
                ObjTable.toLowerCase(),
                jsonData.tables[ObjTable]
              );
              console.log("db table names do not includes", ObjTable);
              console.log(`Query generated for the new table: ${ObjTable}`);
              console.log(generatedQuery);
            }
            // Push the generated query to the list
            queryList.push(generatedQuery);
          } catch (err) {
            console.error(
              `Error generating query for table ${ObjTable}: \n${err.message}`
            );
            return;
          }
        }
        //lets create and modify tables
        try {
          await createTables(queryList.flat());
          let query_length = 0;
          for (const query_text of queryList) {
            if (query_text.length > 0) {
              query_length += 1;
            }
          }
          if (query_length > 0) {
            console.log(
              "All tables created or modified or both done successfully."
            );
          } else {
            console.log("All tables are good to go. No modifications needed.");
          }

          isTableCreated = true;
        } catch (err) {
          console.error("Error in creating tables:", err.message);
          return;
        }
      }

      //Dropping all the tables that are not on the object
      if (dropTable) {
        try {
          let dropTableList = [];
          for (const table of dbTableNames) {
            if (objectTableNames.includes(table)) {
              // Check if table exists in the list
              console.log(`Table name "${table}" exists in objectTableNames`);
            } else {
              dropTableList.push(table); // Add table to the drop list
            }
          }

          console.log("Drop Table list is: ", dropTableList);

          // Call the dropTables function
          if (dropTableList.length > 0) {
            await dropTables(dropTableList);
            console.log("All of these tables are dropped: ", dropTableList);
          } else {
            console.log("No tables to drop.");
          }
        } catch (err) {
          console.error("Error processing dropTable operation:", err.message);
        }
      }
      //Creating file with objecet ware used to create tables
      if (isTableCreated) {
        try {
          matchDatabase =
            matchDatabase +
            "/" +
            getDateTime("_").date +
            "__" +
            getDateTime("_").time +
            "_storeTableJSON.json";
          const json_Data = await readJsonFile(jsonClientfilePath);
          await writeJsonFile(matchDatabase, json_Data);
          console.log("Table JSON file has been created at: ", matchDatabase);
          console.log("Table operations completed successfully");
        } catch (err) {
          console.error("Cannot Update store file", err.message);
        }
      }
    } else {
      console.log("\x1b[1m\x1b[32mThe JSON files are the same. No update needed. We are good to go...\x1b[0m");
    }
  } catch (error) {
    console.error("An error occurred in tableOperation:", error.message);
  }
}
//tableOperation(true, true, true, true);
module.exports = { tableOperation };
//tableOperation(createTable, alterTable, dropTable, dropColumn);
