const fncs = require("./function");
const cstyler = require("cstyler");

const moduleName = "dbtasker";
const truers = [true, 1, "1", "true", "True", "TRUE"];
const falsers = [false, 0, "0", "false", "False", "FALSE"];






async function createTableQuery(config, tabledata, tableName, dbname) {
  try {
    let quries = [];
    let foreignkeys = {};

    for (const columnName of Object.keys(tabledata)) {
      let queryText = "";
      if (["_engine_", "_charset_", "_collate_", "_comment_"].includes(columnName)) {
        continue;
      }
      
      queryText += `\`${columnName}\``;
      
      if (tabledata[columnName].hasOwnProperty("columntype")) {
        queryText += ` ${tabledata[columnName].columntype}`;
      }
      
      if (tabledata[columnName].hasOwnProperty("length_value")) {
        const lengthval = tabledata[columnName].length_value;

        // INT, VARCHAR, CHAR, BIT, etc.
        if (typeof lengthval === "number") {
          queryText += `(${lengthval})`;
        }
        // DECIMAL, FLOAT, DOUBLE → [precision, scale]
        else if (
          Array.isArray(lengthval) &&
          lengthval.length === 2 &&
          lengthval.every(v => typeof v === "number")
        ) {
          queryText += `(${lengthval[0]},${lengthval[1]})`;
        }
        // ENUM / SET → ['a','b','c']
        else if (
          Array.isArray(lengthval) &&
          lengthval.every(v => typeof v === "string")
        ) {
          const escaped = lengthval.map(v => `'${v.replace(/'/g, "''")}'`);
          queryText += `(${escaped.join(",")})`;
        }
      }

      // --- CRITICAL ATTR ORDERING CORRECTION ---
      
      // 1. Character Sets and Collations must come directly after data type definitions
      if (tabledata[columnName].hasOwnProperty("_charset_")) {
        queryText += ` CHARACTER SET ${tabledata[columnName]._charset_}`;
      }
      if (tabledata[columnName].hasOwnProperty("_collate_")) {
        queryText += ` COLLATE ${tabledata[columnName]._collate_}`;
      }

      // 2. Numerical modifiers
      if (tabledata[columnName].hasOwnProperty("unsigned") && tabledata[columnName].unsigned === true) {
        queryText += " UNSIGNED";
      }
      if (tabledata[columnName].zerofill === true) {
        queryText += " ZEROFILL";
      }

      // 3. Nullability profiles
      if (tabledata[columnName].hasOwnProperty("nulls")) {
        if (tabledata[columnName].nulls === true) {
          queryText += " NULL";
        } else {
          queryText += " NOT NULL";
        }
      }

      // 4. Default expressions
      if (tabledata[columnName].hasOwnProperty("defaults")) {
        const d = tabledata[columnName].defaults;
        if (d === null) queryText += " DEFAULT NULL";
        else if (typeof d === "number") queryText += ` DEFAULT ${d}`;
        else if (/^CURRENT_TIMESTAMP$/i.test(d)) queryText += ` DEFAULT ${d}`;
        else queryText += ` DEFAULT '${d.replace(/'/g, "''")}'`;
      }

      // 5. System structural increments
      if (tabledata[columnName].autoincrement === true) {
        queryText += " AUTO_INCREMENT";
      }

      // 6. Keys / Structural indexes must come at the very end of inline attributes
      if (tabledata[columnName].hasOwnProperty("index")) {
        queryText += ` ${tabledata[columnName].index}`;
      }

      // 7. Context comments
      if (tabledata[columnName].hasOwnProperty("comment")) {
        queryText += ` COMMENT '${tabledata[columnName].comment.replace(/'/g, "''")}'`;
      }

      quries.push(queryText);

      // Map to correct metadata object properties outputted by getColumnDetails
      if (tabledata[columnName].hasOwnProperty("foreignKey")) {
        foreignkeys[columnName] = tabledata[columnName].foreignKey;
      }
    }

    // Foreign keys processing
    let fkquery = [];
    let keyidx = [];
    
    if (Object.keys(foreignkeys).length > 0) {
      for (const fks in foreignkeys) {
        const targetTable = foreignkeys[fks].referencedTable;
        const targetColumn = foreignkeys[fks].referencedColumn;

        const ifexist = await fncs.columnExists(config, dbname, targetTable, targetColumn);
        
        if (ifexist === false) {
          console.log(cstyler.red(`Foreign key column ${targetTable}.${targetColumn} does not exist.`));
        } else if (ifexist === true) {
          let fktext = "";
          fktext +=
            `CONSTRAINT \`fk_${tableName}_${fks}\` ` +
            `FOREIGN KEY (\`${fks}\`) REFERENCES \`${targetTable}\`(\`${targetColumn}\`)`;

          if (foreignkeys[fks].hasOwnProperty("onDelete")) {
            fktext += ` ON DELETE ${foreignkeys[fks].onDelete}`;
          }
          if (foreignkeys[fks].hasOwnProperty("onUpdate")) {
            fktext += ` ON UPDATE ${foreignkeys[fks].onUpdate}`;
          }
          
          fkquery.push(fktext);
          keyidx.push(`KEY \`idx_${tableName}_${fks}\` (\`${fks}\`)`);
          
          delete foreignkeys[fks];
        } else {
          console.error("Having problem connecting to database.");
          return null;
        }
      }
    }

    let lastqueryText = "";
    if (tabledata.hasOwnProperty("_engine_")) {
      lastqueryText += ` ENGINE=${tabledata._engine_}`;
    }
    if (tabledata.hasOwnProperty("_charset_")) {
      lastqueryText += ` DEFAULT CHARSET=${tabledata._charset_}`;
    }
    if (tabledata.hasOwnProperty("_collate_")) {
      lastqueryText += ` COLLATE=${tabledata._collate_}`;
    }
    if (tabledata.hasOwnProperty("_comment_")) {
      lastqueryText += ` COMMENT='${tabledata._comment_.replace(/'/g, "''")}'`;
    }

    const fullqueryText = `
CREATE TABLE IF NOT EXISTS \`${tableName}\` (
  ${[...quries, ...keyidx, ...fkquery].join(",\n  ")}
)${lastqueryText};
`.trim();

    console.log("Running query:\n", cstyler.green(fullqueryText));
    
    const runquery = await fncs.runQuery(config, dbname, fullqueryText);
    if (runquery === null) {
      return null;
    }
    
    console.log(
      cstyler.green("Successfully created "), 
      cstyler.blue("Table: "), 
      cstyler.hex("#00d9ffff")(tableName), 
      " on ", 
      cstyler.blue("Database: "), 
      cstyler.hex("#00d9ffff")(dbname)
    );
    
    return foreignkeys;
  } catch (err) {
    console.error(err.message);
    return null;
  }
}
async function createTableIfNeeded(config, jsondata, separator) {
    try {
        if (!fncs.isJsonObject(jsondata)) {
            return false;
        }
        let count = 0;
        let foreignkeys = {};
        console.log(cstyler.bold.underline.hex("#00fff2ff")("Lets start creating unlisted tables if needed."));
        // Lets check config
        for (const jsdb of Object.keys(jsondata)) {
            let dbname = fncs.perseDatabaseNameWithLoop(jsdb, separator);
            if (dbname === false) {
                console.error(cstyler.bold.red("There must be some mistake. Please re install the module."));
                return null;
            }
            const getalltables = await fncs.getTableNames(config, dbname.loopname);
            if (getalltables === null) {
                console.error(cstyler.bold.red("Having problem getting all the table names of Database: ", dbname.loopname, ". Please re-install the module."));
                return null;
            }
            for (const dbtableName of Object.keys(jsondata[jsdb])) {
                // check if table data is json object
                if (fncs.isJsonObject(jsondata[jsdb][dbtableName]) === false) { continue }
                const tableName = fncs.perseTableNameWithLoop(dbtableName, separator);
                if (tableName === false) {
                    console.error(cstyler.bold.red("Can not parse table name from json. There must be some mistake in table name. Please re install the module."));
                    return null;
                }
                if (getalltables.includes(tableName.loopname)) {
                    console.log(cstyler.blue("Database:"), cstyler.hex("#00d9ffff")(dbname.loopname), cstyler.blue("Table: "), cstyler.hex("#00d9ffff")(tableName.loopname), cstyler.green(" already exists in Database"));
                    continue;
                }
                const createtable = await createTableQuery(config, jsondata[jsdb][dbtableName], tableName.loopname, dbname.loopname);
                if (createtable === null) {
                    console.error(cstyler.bold.red("Having problem creating table: ", tableName.loopname, " on Database: ", dbname.loopname, ". Please check database connection."));
                    return null;
                }
                count += 1;
                if (createtable && Object.keys(createtable).length > 0) {
                    foreignkeys = fncs.JoinJsonObjects(foreignkeys, createtable);
                }
            }
            // lets create foreign keys if any
            if (Object.keys(foreignkeys).length > 0) {
                for (const fkcol of Object.keys(foreignkeys)) {
                    const addfk = await fncs.addForeignKeyWithIndex(config, dbname.loopname, tableName.loopname, fkcol, foreignkeys[fkcol].table, foreignkeys[fkcol].column, { onDelete: foreignkeys[fkcol].deleteOption, onUpdate: foreignkeys[fkcol].updateOption });
                    if (addfk === null) {
                        console.error(cstyler.bold.red("Having problem adding foreign key constraint on column: ", fkcol, " on Database: ", dbname.loopname, ". Please check database connection."));
                        return null;
                    }
                    else if (addfk === true) {
                        console.log(cstyler.green("Successfully added foreign key constraint on column: "), cstyler.hex("#00d9ffff")(fkcol), cstyler.green(" on Table: "), cstyler.hex("#00d9ffff")(tableName.loopname), cstyler.green(" on Database: "), cstyler.hex("#00d9ffff")(dbname.loopname));
                    }
                    else if (addfk === false) {
                        console.log(cstyler.blue("Foreign key constraint on column: "), cstyler.hex("#00d9ffff")(fkcol), cstyler.blue(" on Table: "), cstyler.hex("#00d9ffff")(tableName.loopname), cstyler.blue(" on Database: "), cstyler.hex("#00d9ffff")(dbname.loopname), cstyler.blue(" already exists. So, skipping."));
                    }
                }
            }
        }
        if(count > 0) {
            console.log(cstyler.bold.green("Successfully created ", count, " unlisted tables."));
        } else {
            console.log(cstyler.bold.purple("No table found to be created. All the tables are present already."));
        }
        return true;
    } catch (err) {
        console.error(cstyler.bold.red("Error occurred in createTableIfNeeded function of ", moduleName, " module. Error details: "), err);
        return null;
    }
}
async function dropTable(config, json_data, separator = "_") {
    try {
        console.log(cstyler.bold.yellow("Initiating drop table operation"));
        let count = 0;
        for (const jsondb of Object.keys(json_data)) {
            let dbname = fncs.perseDatabaseNameWithLoop(jsondb, separator);
            if (dbname === false) {
                console.error("There must be some mistake. Please re install the module.");
            }
            const alltables = await fncs.getTableNames(config, dbname.loopname);
            if (alltables === null) {
                console.error("Having problem getting all the table name of the Database: ", cstyler.blue(dbname.loopname), ". Please re-install the module.");
                return null;
            }
            for (const tableName of (alltables)) {
                const revlpnm = fncs.reverseLoopName(tableName);
                if (Array.isArray(revlpnm)) {
                    if (!Object.keys(json_data[jsondb]).includes(revlpnm[0]) && !Object.keys(json_data[jsondb]).includes(revlpnm[1]) && !Object.keys(json_data[jsondb]).includes(revlpnm[2]) && !Object.keys(json_data[jsondb]).includes(revlpnm[3])) {
                        const droptable = await fncs.dropTable(config, dbname.loopname, tableName);
                        if (droptable === null) {
                            console.error("Having problem dropping table. Please check database connection.");
                            return null;
                        } else if (droptable === true) {
                            count += 1;
                            console.log(cstyler.blue("Database: "), cstyler.hex("#00d9ffff")(dbname.loopname), cstyler.blue("Table: "), cstyler.hex("#00d9ffff")(tableName), "- has dropped successfully.");
                        }
                    }
                } else if (!Object.keys(json_data[jsondb]).includes(revlpnm)) {
                    const droptable = await fncs.dropTable(config, dbname.loopname, tableName);
                    if (droptable === null) {
                        console.error("Having problem dropping table. Please check database connection.");
                        return null;
                    } else if (droptable === true) {
                        count += 1;
                        console.log(cstyler.blue("Database: "), cstyler.hex("#00d9ffff")(dbname.loopname), cstyler.blue("Table: "), cstyler.hex("#00d9ffff")(tableName), "- has dropped successfully.");
                    }
                }
            }
        }
        if (count > 0) {
            console.log(cstyler.bold.green("Successfully dropped ", count, " unlisted tables"));
        } else {
            console.log(cstyler.bold.purple("No table found to be dropped"));
        }
        return true;
    } catch (err) {
        console.error(err.message);
        return null;
    }
}


module.exports = {
    createTableIfNeeded,
    dropTable
};