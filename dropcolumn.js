const fncs = require("./function");
const cstyler = require("cstyler");




async function dropcolumn(config, table_json, forcedropcolumn, separator = "_") {
    try {
        console.log(cstyler.bold.blue("Let's initiate drop column operation"));
        if (!fncs.isJsonObject(table_json)) {
            return false;
        }
        for (const jsdb of Object.keys(table_json)) {
            const loopedName = fncs.perseDatabaseNameWithLoop(jsdb, separator);
            if (loopedName === null || loopedName === false) {
                console.error(cstyler.bold("There must be some function error. Please re-install the module and use it.", jsdb, loopedName));
                return null;
            }
            const databaseName = loopedName.loopname;
            config.database = databaseName;
            for (const jstable of Object.keys(table_json[jsdb])) {
                const loopedTableName = fncs.perseTableNameWithLoop(jstable, separator);
                if (loopedTableName === null || loopedTableName === false) {
                    console.error("There must be some function error. Please re-install the module and use it.");
                    return null;
                }
                const createdTableName = loopedTableName.loopname;
                const gettablcolumns = await fncs.getColumnNames(config, databaseName, createdTableName);
                if (gettablcolumns === null) {
                    console.error(cstyler.bold.red("Having problem getting columns of table: "), cstyler.blue(createdTableName), cstyler.bold.red(" from database: "), cstyler.blue(databaseName));
                    return null;
                }
                for (const col of gettablcolumns) {
                    if (!Object.keys(table_json[jsdb][jstable]).includes(col)) {
                        // drop column
                        console.log(cstyler.bold.yellow("Dropping column: "), cstyler.blue(col), cstyler.bold.yellow(" from table: "), cstyler.blue(createdTableName), cstyler.bold.yellow(" of database: "), cstyler.blue(databaseName));
                        (config, database, parentTable, parentColumn)
                        // lets check referencing columns
                        const getreferencingcolumns = await fncs.getReferencingColumns(config, databaseName, createdTableName, col);
                        if (getreferencingcolumns === null) {
                            console.error(cstyler.bold.red("Having problem getting referencing columns for column: "), cstyler.blue(col), cstyler.bold.red(" from table: "), cstyler.blue(createdTableName), cstyler.bold.red(" of database: "), cstyler.blue(databaseName));
                            return null;
                        }
                        // drop foreign keys from referencing columns
                        if (getreferencingcolumns.length > 0 && forcedropcolumn) {
                            let deletedallreffk = true;
                            for (const refcol of getreferencingcolumns) {
                                const dropfk = await fncs.removeForeignKeyFromColumn(config, refcol.child_schema, refcol.child_table, refcol.child_columns[0]);
                                if (dropfk === null) {
                                    console.error(cstyler.bold.red("Having problem dropping foreign key from referencing column: "), cstyler.blue(refcol.child_columns[0]), cstyler.bold.red(" from table: "), cstyler.blue(refcol.child_table), cstyler.bold.red(" of database: "), cstyler.blue(refcol.child_schema));
                                    deletedallreffk = false;
                                }
                            }
                            if (!deletedallreffk) {
                                console.error(cstyler.bold.red("Having problem dropping all foreign keys from referencing columns for column: "), cstyler.blue(col), cstyler.bold.red(" from table: "), cstyler.blue(createdTableName), cstyler.bold.red(" of database: "), cstyler.blue(databaseName), cstyler.bold.red(" So, cannot drop the column."));
                                continue;
                            }
                            const dropcol = await fncs.dropColumn(config, databaseName, createdTableName, col);
                            if (dropcol === null) {
                                console.error(cstyler.bold.red("Having problem dropping column: "), cstyler.blue(col), cstyler.bold.red(" from table: "), cstyler.blue(createdTableName), cstyler.bold.red(" of database: "), cstyler.blue(databaseName));
                                return null;
                            }
                            console.log(cstyler.bold.green("Successfully dropped column: "), cstyler.blue(col), cstyler.bold.green(" from table: "), cstyler.blue(createdTableName), cstyler.bold.green(" of database: "), cstyler.blue(databaseName));
                        } else if (getreferencingcolumns.length > 0 && !forcedropcolumn) {
                            console.error(cstyler.bold.red("Column: "), cstyler.blue(col), cstyler.bold.red(" from table: "), cstyler.blue(createdTableName), cstyler.bold.red(" of database: "), cstyler.blue(databaseName), cstyler.bold.red(" is referenced by other columns. To force drop the column along with its foreign keys, please set forcedropcolumn to true at your config."));
                            continue;
                        } else if (getreferencingcolumns.length === 0) {
                            // lets drop the column
                            const dropcol = await fncs.dropColumn(config, databaseName, createdTableName, col);
                            if (dropcol === null) {
                                console.error(cstyler.bold.red("Having problem dropping column: "), cstyler.blue(col), cstyler.bold.red(" from table: "), cstyler.blue(createdTableName), cstyler.bold.red(" of database: "), cstyler.blue(databaseName));
                                return null;
                            }
                            console.log(cstyler.bold.green("Successfully dropped column: "), cstyler.blue(col), cstyler.bold.green(" from table: "), cstyler.blue(createdTableName), cstyler.bold.green(" of database: "), cstyler.blue(databaseName));
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.error(err.message);
        return null;
    }
}


module.exports = {
    dropcolumn
}