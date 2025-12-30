const fncs = require("./function");
const cstyler = require("cstyler");

const moduleName = "dbtasker";
const truers = [true, 1, "1", "true", "True", "TRUE"];
const falsers = [false, 0, "0", "false", "False", "FALSE"];





async function createTableQuery(config, tabledata, tableName, dbname) {
    try {
        //let queryText = `CREATE TABLE ${tableName} ( `;
        let quries = [];
        let foreignkeys = {};
        for (const columnName of Object.keys(tabledata)) {
            let queryText = "";
            if (["_engine_", "_charset_", "_collate_"].includes(columnName)) {
                continue;
            }
            queryText += `\`${columnName}\``;
            if (tabledata[columnName].hasOwnProperty("columntype")) {
                queryText += ` ${tabledata[columnName].columntype}`
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
            queryText += " ";
            if (tabledata[columnName].hasOwnProperty("unsigned") && tabledata[columnName].unsigned === true) {
                queryText += `UNSIGNED `
            }
            if (tabledata[columnName].zerofill === true) {
                queryText += `ZEROFILL `
            }
            if (tabledata[columnName].autoincrement === true) {
                queryText += `AUTO_INCREMENT `
            }
            if (tabledata[columnName].hasOwnProperty("index")) {
                queryText += `${tabledata[columnName].index} `
            }
            if (tabledata[columnName].hasOwnProperty("_charset_")) {
                queryText += `CHARACTER SET ${tabledata[columnName]._charset_} `
            }
            if (tabledata[columnName].hasOwnProperty("_collate_")) {
                queryText += `COLLATE ${tabledata[columnName]._collate_} `
            }
            if (tabledata[columnName].hasOwnProperty("nulls")) {
                if (tabledata[columnName].nulls === true) {
                    queryText += `NULL `
                } else {
                    queryText += `NOT NULL `
                }
            }
            if (tabledata[columnName].hasOwnProperty("defaults")) {
                const d = tabledata[columnName].defaults;
                if (d === null) queryText += "DEFAULT NULL ";
                else if (typeof d === "number") queryText += `DEFAULT ${d} `;
                else if (/^CURRENT_TIMESTAMP$/i.test(d)) queryText += `DEFAULT ${d} `;
                else queryText += `DEFAULT '${d.replace(/'/g, "''")}' `;
            }
            if (tabledata[columnName].hasOwnProperty("comment")) {
                queryText += `COMMENT '${tabledata[columnName].comment}' `
            }
            quries.push(queryText);
            // lets sotore foreing keys
            if (tabledata[columnName].hasOwnProperty("foreign_key")) {
                foreignkeys[columnName] = tabledata[columnName].foreign_key;
            }
        }
        // foreign keys
        let fkquery = [];
        let keyidx = [];
        if (Object.keys(foreignkeys).length > 0) {
            for (const fks in foreignkeys) {
                const ifexist = await fncs.columnExists(config, dbname, tabledata[fks].foreign_key.table, tabledata[fks].foreign_key.column);
                if (ifexist === false) {
                    console.log(cstyler.red("Foreign key column do not exist."));
                } else if (ifexist === true) {
                    let fktext = "";
                    fktext +=
                        `CONSTRAINT fk_${tableName}_${foreignkeys[fks].table}_${foreignkeys[fks].column} ` +
                        `FOREIGN KEY (\`${fks}\`) REFERENCES \`${foreignkeys[fks].table}\`(\`${foreignkeys[fks].column}\`) `;

                    if (foreignkeys[fks].hasOwnProperty("deleteOption")) {
                        fktext += `ON DELETE ${foreignkeys[fks].deleteOption} `
                    }
                    if (foreignkeys[fks].hasOwnProperty("updateOption")) {
                        console.log(cstyler.red("has update option"), foreignkeys[fks].updateOption)
                        fktext += `ON UPDATE ${foreignkeys[fks].updateOption} `
                    }
                    fkquery.push(fktext);
                    keyidx.push(`KEY \`idx_${tableName}_${fks}\` (\`${fks}\`)`);
                    // lets delete used item from the foreign key
                    delete foreignkeys[fks];
                } else {
                    console.error("Having problem connecting to database.");
                    return null;
                }
            }
        }
        let lastqueryText = ``;
        if (tabledata.hasOwnProperty("_engine_")) {
            lastqueryText += `ENGINE=${tabledata._engine_}\n`;
        }
        if (tabledata.hasOwnProperty("_charset_")) {
            lastqueryText += `DEFAULT CHARSET=${tabledata._charset_}\n`;
        }
        if (tabledata.hasOwnProperty("_collate_")) {
            lastqueryText += `COLLATE=${tabledata._collate_}\n`;
        }
        if (tabledata.hasOwnProperty("_comment_")) {
            lastqueryText += `COMMENT=${tabledata._comment_}\n`;
        }
        const fullqueryText = `
            CREATE TABLE IF NOT EXISTS \`${tableName}\` (
            ${[...quries, ...keyidx, ...fkquery].join(",\n  ")}
            ) ${lastqueryText};
            `;
        console.log("Running query: ", cstyler.green(fullqueryText));
        const runquery = await fncs.runQuery(config, dbname, fullqueryText);
        if (runquery === null) {
            return null;
        }
        console.log(cstyler.green("Successfully created "), cstyler.blue("Table: "), cstyler.hex("#00d9ffff")(tableName), " on ", cstyler.blue("Database: "), cstyler.hex("#00d9ffff")(dbname));
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
        let foreignkeys = {};
        console.log(cstyler.bold.purple("Lets start creating unlisted tables if needed."));
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
        console.log(cstyler.bold.underline.hex("#b700ffff")("Create table if needed process completed successfully."));
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
            if (count > 0) {
                console.log(cstyler.green("Successfully dropped ", count, " unlisted tables"));
            } else {
                console.log(cstyler.underline("No table found to be dropped"));
            }
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