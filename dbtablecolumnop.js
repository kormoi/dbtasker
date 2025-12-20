const fncs = require("./function");
const recordedjson = require("./tables");
const cstyler = require("cstyler");
const checker = require("./validation");
const validateion = require("./validation");

const mysqlTypeMetadata = validateion.mysqlTypeMetadata;


function alterColumnQuery(columndata, columnName, tableName) {
    try {
        if (!columndata.columntype) {
            throw new Error("columntype is required for MODIFY COLUMN");
        }

        let queryText = "";
        queryText += `ALTER TABLE \`${tableName}\` MODIFY COLUMN \`${columnName}\``;

        queryText += ` ${columndata.columntype}`;

        if (columndata.hasOwnProperty("length_value")) {
            const lengthval = columndata.length_value;

            if (typeof lengthval === "number") {
                queryText += `(${lengthval}) `;
            } else if (
                Array.isArray(lengthval) &&
                lengthval.length === 2 &&
                lengthval.every(v => typeof v === "number")
            ) {
                queryText += `(${lengthval[0]},${lengthval[1]}) `;
            } else if (
                Array.isArray(lengthval) &&
                lengthval.every(v => typeof v === "string")
            ) {
                const escaped = lengthval.map(v => `'${v.replace(/'/g, "''")}'`);
                queryText += `(${escaped.join(",")}) `;
            }
        }

        if (columndata.unsigned === true) queryText += "UNSIGNED ";
        if (columndata.zerofill === true) queryText += "ZEROFILL ";

        if (columndata.hasOwnProperty("nulls")) {
            queryText += columndata.nulls ? "NULL " : "NOT NULL ";
        }

        if (columndata.hasOwnProperty("defaults")) {
            const d = columndata.defaults;
            if (d === null) queryText += "DEFAULT NULL ";
            else if (typeof d === "number") queryText += `DEFAULT ${d} `;
            else if (/^CURRENT_TIMESTAMP$/i.test(d)) queryText += `DEFAULT ${d} `;
            else queryText += `DEFAULT '${d.replace(/'/g, "''")}' `;
        }

        if (columndata.autoincrement === true) {
            queryText += "AUTO_INCREMENT ";
        }

        if (columndata._charset_) queryText += `CHARACTER SET ${columndata._charset_} `;
        if (columndata._collate_) queryText += `COLLATE ${columndata._collate_} `;

        if (columndata.comment) {
            queryText += `COMMENT '${columndata.comment.replace(/'/g, "''")}' `;
        }

        return queryText.trim();
    } catch (err) {
        console.error(err.message);
        return null;
    }
}
function addColumnQuery(columndata, columnName, tableName) {
    try {
        if (!columndata.columntype) {
            throw new Error("columntype is required to add a column");
        }

        let queryText = "";
        queryText += `ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\``;

        // column type
        queryText += ` ${columndata.columntype}`;

        // length / enum / set
        if (columndata.hasOwnProperty("length_value")) {
            const lengthval = columndata.length_value;

            if (typeof lengthval === "number") {
                queryText += `(${lengthval}) `;
            } else if (
                Array.isArray(lengthval) &&
                lengthval.length === 2 &&
                lengthval.every(v => typeof v === "number")
            ) {
                queryText += `(${lengthval[0]},${lengthval[1]}) `;
            } else if (
                Array.isArray(lengthval) &&
                lengthval.every(v => typeof v === "string")
            ) {
                const escaped = lengthval.map(v => `'${v.replace(/'/g, "''")}'`);
                queryText += `(${escaped.join(",")}) `;
            }
        }

        if (columndata.unsigned === true) queryText += "UNSIGNED ";
        if (columndata.zerofill === true) queryText += "ZEROFILL ";

        if (columndata.hasOwnProperty("nulls")) {
            queryText += columndata.nulls ? "NULL " : "NOT NULL ";
        }

        if (columndata.hasOwnProperty("defaults")) {
            const d = columndata.defaults;
            if (d === null) queryText += "DEFAULT NULL ";
            else if (typeof d === "number") queryText += `DEFAULT ${d} `;
            else if (/^CURRENT_TIMESTAMP$/i.test(d)) queryText += `DEFAULT ${d} `;
            else queryText += `DEFAULT '${d.replace(/'/g, "''")}' `;
        }

        if (columndata.autoincrement === true) {
            queryText += "AUTO_INCREMENT ";
        }

        if (columndata._charset_) queryText += `CHARACTER SET ${columndata._charset_} `;
        if (columndata._collate_) queryText += `COLLATE ${columndata._collate_} `;

        if (columndata.comment) {
            queryText += `COMMENT '${columndata.comment.replace(/'/g, "''")}' `;
        }

        return queryText.trim();
    } catch (err) {
        console.error(err.message);
        return null;
    }
}
function addForeignKeyWithIndexQuery(tableName, columnName, refTable, refColumn, options = {}) {
    const {
        onDelete = "RESTRICT",
        onUpdate = "RESTRICT"
    } = options;

    const indexName = `idx_${tableName}_${columnName}`;
    const fkName = `fk_${tableName}_${refTable}_${columnName}`;

    const indexQuery = `
    ALTER TABLE \`${tableName}\`
    ADD INDEX \`${indexName}\` (\`${columnName}\`)
  `.trim();

    const foreignKeyQuery = `
    ALTER TABLE \`${tableName}\`
    ADD CONSTRAINT \`${fkName}\`
    FOREIGN KEY (\`${columnName}\`)
    REFERENCES \`${refTable}\` (\`${refColumn}\`)
    ON DELETE ${onDelete}
    ON UPDATE ${onUpdate}
  `.trim();

    return {
        indexQuery,
        foreignKeyQuery
    };
}
function isColumnDataSame(columnData, columndetails) {
    // 1. Column type
    if (columnData.columntype !== columndetails.columntype) {
        return false;
    }

    // 2. Length / precision / enum-set values
    if (columnData.length_value !== undefined) {
        const a = columnData.length_value;
        const b = columndetails.length_value;

        // ENUM / SET → array of strings
        if (['ENUM', 'SET'].includes(columnData.columntype)) {
            if (!Array.isArray(a) || !Array.isArray(b)) return false;
            if (a.length !== b.length) return false;

            for (let i = 0; i < a.length; i++) {
                if (!a.includes(b[i])) return false;
            }
        }
        // DECIMAL(p,s) → [number, number]
        else if (Array.isArray(a)) {
            if (!Array.isArray(b) || a.length !== b.length) return false;
            if (a[0] !== b[0] || a[1] !== b[1]) return false;
        }
        // INT, VARCHAR, CHAR, etc. → number
        else {
            if (a !== b && a !== undefined) return false;
        }
    }

    // 3. UNSIGNED
    if (typeof columnData.unsigned === "boolean" &&
        columnData.unsigned !== columndetails.unsigned) {
        return false;
    }

    // 4. ZEROFILL
    if (typeof columnData.zerofill === "boolean" &&
        columnData.zerofill !== columndetails.zerofill) {
        return false;
    }

    // 5. NULL / NOT NULL
    if (typeof columnData.nulls === "boolean" &&
        columnData.nulls !== columndetails.nulls) {
        return false;
    }

    // 6. DEFAULT
    const defA = columnData.defaults ?? null;
    const defB = columndetails.defaults ?? null;
    if (defA !== defB) {
        return false;
    }

    // 7. INDEX (PRIMARY / UNIQUE / "")
    const idxA = columnData.index ?? "";
    const idxB = columndetails.index ?? "";
    if (idxA !== idxB) {
        return false;
    }

    // 8. AUTO_INCREMENT
    if ((columnData.autoincrement !== undefined && columnData.autoincrement !== columndetails.autoincrement) || (columnData.autoincrement === undefined && columndetails.autoincrement === true)) {
        return false;
    }

    // 9. COMMENT
    const comA = columnData.comment ?? "";
    const comB = columndetails.comment ?? "";
    if (comA !== comB) {
        return false;
    }

    // 10. CHARACTER SET
    if (columnData._charset_ !== undefined &&
        columnData._charset_ !== columndetails._charset_) {
        return false;
    }

    // 11. COLLATION
    if (columnData._collate_ !== undefined &&
        columnData._collate_ !== columndetails._collate_) {
        return false;
    }

    return true;
}

async function alterTableQuery(config, tabledata, tableName, dbName, dropColumn = false) {
    try {
        let queries = [];
        let idxkey = [];
        let foreignkeys = [];
        let leftfk = [];
        for (const columnName of Object.keys(tabledata)) {
            const columnData = tabledata[columnName];
            const fkData = columnData.foreign_key;
            const columndetails = await fncs.getColumnDetails(config, dbName, tableName, columnName);
            if (columndetails === true) {
                // alter column query
                if (!isColumnDataSame(columnData, columndetails)) {
                    const alterquery = alterColumnQuery(columnData, columnName, tableName);
                    if (alterquery === null) {
                        // Not that important
                        console.error("There must be an issue with the validation system. Please reinstall.");
                        return null;
                    }
                    queries.push(alterquery);
                    // lets work on foreign key
                    const remfk = await fncs.removeForeignKeyFromColumn(config, dbName, tableName, columnName);
                    if (remfk === null) {
                        console.error("Having problem removing foreignkey from ", cstyler.purple("Database: "), cstyler.blue(dbName), cstyler.purple(" Table: "), cstyler.blue(tableName), cstyler.purple(" Column Name: "), cstyler.blue(columnName));
                        return null;
                    }
                    if (columnData.hasOwnProperty("foreign_key")) {
                        // lets check foreign key table column exist
                        const fktcexist = await fncs.columnExists(config, dbName, fkData.table, fkData.column);
                        if (fktcexist === true) {
                            const fkquery = addForeignKeyWithIndexQuery(tableName, columnName, fkData.table, fkData.column, { onDelete: fkData.deleteOption, onUpdate: fkData.updateOption });
                            // lets add foreign key quries
                            idxkey.push(fkquery.indexQuery);
                            foreignkeys.push(fkquery.foreignKeyQuery);
                        } else if (fktcexist === false) {
                            leftfk[columnName] = fkData;
                        } else {
                            console.error("Having problem checking foreignkey table column exist or not from ", cstyler.purple("Database: "), cstyler.blue(dbName), cstyler.purple(" Table: "), cstyler.blue(tableName), cstyler.purple(" Column Name: "), cstyler.blue(columnName));
                            return null;
                        }
                    }
                } else {
                    if (columnData.hasOwnProperty("foreign_key")) {
                        // is foreignkey same0
                        const fkdetails = await fncs.getForeignKeyDetails(config, dbName, tableName, columnName);
                        if (fncs.isJsonObject(fkdetails)) {
                            let issame = true;
                            // lets check if foreign keys are same or not
                            if (fkData.table !== fkdetails.table) issame = false;
                            if (fkData.column !== fkdetails.column) issame = false;
                            if (fkData.deleteOption !== fkdetails.deleteOption) issame = false;
                            if (fkData.updateOption !== undefined && fkData.updateOption !== fkdetails.updateOption) issame = false;
                            if (issame === false) {
                                const dfk = await fncs.removeForeignKeyFromColumn(config, dbName, tableName, columnName);
                                if (dfk === true || dfk === false) {
                                    const fkquery = addForeignKeyWithIndexQuery(tableName, columnName, fkData.table, fkData.column, { onDelete: fkData.deleteOption, onUpdate: fkData.updateOption });
                                    // lets add foreign key quries
                                    idxkey.push(fkquery.indexQuery);
                                    foreignkeys.push(fkquery.foreignKeyQuery);
                                } else {
                                    console.error("Having problem deleting foreign key from column. Please check your database connection.");
                                }
                            }
                        } else if (fkdetails === false) {
                            const fktcexist = await fncs.columnExists(config, dbName, fkData.table, fkData.column);
                            if (fktcexist === true) {
                                const fkquery = addForeignKeyWithIndexQuery(tableName, columnName, fkData.table, fkData.column, { onDelete: fkData.deleteOption, onUpdate: fkData.updateOption });
                                // lets add foreign key quries
                                idxkey.push(fkquery.indexQuery);
                                foreignkeys.push(fkquery.foreignKeyQuery);
                            } else if (fktcexist === false) {
                                leftfk[columnName] = fkData;
                            } else {
                                console.error("Having problem checking foreignkey table column exist or not from ", cstyler.purple("Database: "), cstyler.blue(dbName), cstyler.purple(" Table: "), cstyler.blue(tableName), cstyler.purple(" Column Name: "), cstyler.blue(columnName));
                                return null;
                            }
                        } else {
                            console.error("Having problem getting foreignkey details of ", cstyler.purple("Database: "), cstyler.blue(dbName), cstyler.purple(" Table: "), cstyler.blue(tableName), cstyler.purple(" Column Name: "), cstyler.blue(columnName));
                            return null;
                        }
                    } else {
                        const dfk = await fncs.removeForeignKeyFromColumn(config, dbName, tableName, columnName);
                        if (dfk === null) {
                            console.error("Having problem removing foreignkey from ", cstyler.purple("Database: "), cstyler.blue(dbName), cstyler.purple(" Table: "), cstyler.blue(tableName), cstyler.purple(" Column Name: "), cstyler.blue(columnName));
                            return null;
                        }
                    }
                }
            } else if (columndetails === false) {
                // add column query
                const columnquery = addColumnQuery(columnData, columnName, tableName);
                if (columnquery === null) {
                    console.error("There must be an issue with the validation system. Please reinstall.");
                    return null;
                }
                queries.push(columnquery);
                if (columnData.hasOwnProperty("foreign_key")) {
                    // lets check if column exist or not
                    const colexist = await fncs.columnExists(config, dbName, fkData.table, fkData.column);
                    if (colexist === true) {
                        const fkquery = addForeignKeyWithIndexQuery(tableName, columnName, fkData.table, fkData.column, { onDelete: fkData.deleteOption, onUpdate: fkData.updateOption });
                        // lets add foreign key quries
                        idxkey.push(fkquery.indexQuery);
                        foreignkeys.push(fkquery.foreignKeyQuery);
                    } else if (colexist === false) {
                        leftfk[columnName] = fkData;
                    } else {
                        console.error("Having problem checking foreignkey table column exist or not from ", cstyler.purple("Database: "), cstyler.blue(dbName), cstyler.purple(" Table: "), cstyler.blue(tableName), cstyler.purple(" Column Name: "), cstyler.blue(columnName));
                        return null;
                    }
                }
            } else {
                console.error("Having problem getting column details from the database. Please check your database connection.");
                return null;
            }
        }
        // drop column
        if (dropColumn) {
            const allcols = await fncs.getColumnNames(config, dbName, tableName);
            if (allcols === null) {
                console.error("Having problem getting all the column names of ", tableName, ". Please check database connection.");
            }
            for (const item of allcols) {
                if (!Object.keys(tabledata).includes(item)) {
                    // drop column
                    const dropcol = await fncs.dropColumn(config, dbName, tableName, item);
                    if (dropcol === null) {
                        console.error("Haveing problem dropping column. Please check database connection.");
                        return null;
                    }
                }
            }
        }
        // lets arrange all the query
        for (const item of queries) {
            const runquery = await fncs.runQuery(config, dbName, item);
            if (runquery === null) {
                console.error("Having problem running query. Please check database connection.");
                return null;
            }
        }
        for (const item of idxkey) {
            const runquery = await fncs.runQuery(config, dbName, item);
            if (runquery === null) {
                console.error("Having problem running query. Please check database connection.");
                return null;
            }
        }
        for (const item of foreignkeys) {
            const runquery = await fncs.runQuery(config, dbName, item);
            if (runquery === null) {
                console.error("Having problem running query. Please check database connection.");
                return null;
            }
        }
        return leftfk;
    } catch (err) {
        console.error(err.message);
        return null;
    }
}
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
                    queryText += `(${lengthval}) `;
                }

                // DECIMAL, FLOAT, DOUBLE → [precision, scale]
                else if (
                    Array.isArray(lengthval) &&
                    lengthval.length === 2 &&
                    lengthval.every(v => typeof v === "number")
                ) {
                    queryText += `(${lengthval[0]},${lengthval[1]}) `;
                }

                // ENUM / SET → ['a','b','c']
                else if (
                    Array.isArray(lengthval) &&
                    lengthval.every(v => typeof v === "string")
                ) {
                    const escaped = lengthval.map(v => `'${v.replace(/'/g, "''")}'`);
                    queryText += `(${escaped.join(",")}) `;
                }
            }
            if (tabledata[columnName].hasOwnProperty("unsigned") && tabledata[columnName].unsigned === true) {
                queryText += `UNSIGNED `
            }
            if (tabledata[columnName].zerofill === true) {
                queryText += `ZEROFILL `
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
                    console.log(cstyler.yellow("Foreign key column do not exist."));
                } else if (ifexist === true) {
                    let fktext = "";
                    fktext +=
                        `CONSTRAINT fk_${tableName}_${foreignkeys[fks].table}_${foreignkeys[fks].column} ` +
                        `FOREIGN KEY (\`${fks}\`) REFERENCES \`${foreignkeys[fks].table}\`(\`${foreignkeys[fks].column}\`) `;

                    if (foreignkeys[fks].hasOwnProperty("deleteOption")) {
                        fktext += `ON DELETE ${foreignkeys[fks].deleteOption} `
                    }
                    if (foreignkeys[fks].hasOwnProperty("updateOption")) {
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
        let lastqueryText = `)`;
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
        const runquery = await fncs.runQuery(config, dbname, fullqueryText);
        if (runquery === null) {
            console.error("Having problem running query. Please check database connection.");
            return null;
        }
        return foreignkeys;
    } catch (err) {
        console.error(err.message);
        return null;
    }
}
async function columnAddDeleteAlter(allconfig, jsondata, seperator = "_") {
    try {
        console.log(cstyler.bold.blue("Let's initiate table and column operations"));
        if (!fncs.isJsonObject(jsondata)) {
            return false;
        }
        // Lets check config
        let config;
        if (fncs.isValidMySQLConfig(allconfig)) {
            config = { "port": allconfig.port, "host": allconfig.host, "user": allconfig.user, "password": allconfig.password }
        } else {
            console.error(cstyler.bold("Invalid config"));
            return null;
        }
        // get all mysql table engines
        const mysqlEngines = await fncs.getMySQLEngines(config);
        if (!fncs.isJsonObject(mysqlEngines)) {
            console.error(cstyler.red.bold("There is a problem connecting to the database. Please check database info or connection."));
            return null;
        }
        // Lets decleare main variables
        let queries = [];
        let foreignKeys = {};
        // let work on tables and columns
        for (const dbname of Object.keys(jsondata)) {
            if (fncs.isJsonObject(jsondata[dbname])) {
                if (!foreignKeys.hasOwnProperty(dbname)) foreignKeys[dbname] = {};
                const loopedName = fncs.perseDatabaseNameWithLoop(dbname, seperator);
                if (loopedName === null || loopedName === false) {
                    console.error(cstyler.bold("There must be some function error. Please reinstall the module and use it."));
                    return loopedName;
                }
                const databaseName = loopedName.loopname;
                config.database = databaseName;
                const existingTable = await fncs.getTableNames(config);
                if (!Array.isArray(existingTable)) {
                    console.error(cstyler.bold("Having problem getting table name from database: "), cstyler.blue(databaseName));
                    return null;
                }
                for (const tableName of Object.keys(jsondata[dbname])) {
                    const loopedTableName = fncs.perseTableNameWithLoop(tableName, seperator);
                    if (loopedTableName === null || loopedTableName === false) {
                        console.error(cstyler.bold("There must be some function error. Please reinstall the module and use it."));
                        return loopedTableName;
                    }
                    const createdTableName = loopedTableName.loopname;
                    if (!["_charset_", "_collate_"].includes(tableName) || fncs.isJsonObject(jsondata[dbname][tableName])) {
                        const tabledata = jsondata[dbname][tableName];
                        if (existingTable.includes(createdTableName)) {
                            /**
                             * Alter Table
                             */
                            const altertable = await alterTableQuery(config, tabledata, tableName, dbname, allconfig.dropColumn);
                            if (altertable === null) return null;
                            foreignKeys[dbname][tableName] = altertable;
                        } else {
                            /**
                             * Create table
                             */
                            const createtable = await createTableQuery(config, tabledata, tableName, dbname);
                            if (createtable === null) {
                                return null;
                            }
                            foreignKeys[dbname][tableName] = createtable;
                        }
                    } else if (["_charset_", "_collate_"].includes(tableName)) {
                        // as we already have deal with the database on dbop.js file
                        continue;
                    } else {
                        console.error(cstyler.bold.red("There must be some issue with the module. Please reinstall and run the operation."));
                    }
                }
            } else {
                console.error(cstyler.bold.red("There must be some issue with the module. Please reinstall and run the operation."));
            }
        }
    } catch (err) {
        console.error(err.message);
        return null;
    }
}



module.exports = {
    columnAddDeleteAlter
}