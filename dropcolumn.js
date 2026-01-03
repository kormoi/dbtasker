const fncs = require("./function");
const cstyler = require("cstyler");






async function dropcolumn(config, tableJson, forceDropColumn, separator = "_") {
    try {
        console.log(cstyler.bold.yellow("Initiating drop column operation"));
        let count = 0;
        if (!fncs.isJsonObject(tableJson)) {
            return false;
        }

        for (const jsDb of Object.keys(tableJson)) {
            const parsedDb = fncs.perseDatabaseNameWithLoop(jsDb, separator);
            if (!parsedDb) {
                console.error(
                    cstyler.bold.red("Cannot parse database name."),
                    jsDb,
                    parsedDb
                );
                return null;
            }

            const databaseName = parsedDb.loopname;
            config.database = databaseName;

            for (const jsTable of Object.keys(tableJson[jsDb])) {
                const tableDef = tableJson[jsDb][jsTable];
                if (!fncs.isJsonObject(tableDef)) continue;

                const parsedTable = fncs.perseTableNameWithLoop(jsTable, separator);
                if (!parsedTable) {
                    console.error(
                        cstyler.bold.red("Cannot parse table name."),
                        jsTable
                    );
                    return null;
                }

                const tableName = parsedTable.loopname;

                const existingColumns = await fncs.getColumnNames(
                    config,
                    databaseName,
                    tableName
                );

                if (!existingColumns) {
                    console.error(
                        cstyler.bold.red("Failed to fetch columns for table:"),
                        cstyler.hex("#00d9ffff")(tableName),
                        cstyler.bold.red("from database:"),
                        cstyler.hex("#00d9ffff")(databaseName)
                    );
                    return null;
                }

                for (const column of existingColumns) {
                    const definedInJson = Object.prototype.hasOwnProperty.call(
                        tableDef,
                        column
                    );

                    const isValidDefinition =
                        definedInJson && fncs.isJsonObject(tableDef[column]);

                    if (isValidDefinition) continue;

                    console.log(
                        cstyler.bold.purple("Database:"),
                        cstyler.hex("#00d9ffff")(databaseName),
                        cstyler.bold.purple("Table:"),
                        cstyler.hex("#00d9ffff")(tableName),
                        cstyler.bold.yellow("Dropping column:"),
                        cstyler.yellow(column)
                    );

                    const referencingColumns =
                        await fncs.findReferencingFromColumns(
                            config,
                            databaseName,
                            tableName,
                            column
                        );

                    if (referencingColumns === null) {
                        console.error(
                            cstyler.bold.red("Failed to resolve FK references for column:"),
                            cstyler.hex("#00d9ffff")(column)
                        );
                        return null;
                    }

                    if (referencingColumns.length > 0) {
                        if (!forceDropColumn) {
                            console.error(
                                cstyler.bold.red("Column is referenced by other tables:"),
                                cstyler.hex("#00d9ffff")(column),
                                cstyler.bold.red("Enable forceDropColumn to proceed.")
                            );
                            continue;
                        }

                        let allFkRemoved = true;

                        for (const ref of referencingColumns) {
                            const removed = await fncs.removeForeignKeyFromColumn(
                                config,
                                ref.child_schema,
                                ref.child_table,
                                ref.child_columns[0]
                            );

                            if (removed === null) {
                                console.error(
                                    cstyler.bold.red("Failed to drop FK from:"),
                                    cstyler.hex("#00d9ffff")(ref.child_table),
                                    cstyler.bold.red("column:"),
                                    cstyler.hex("#00d9ffff")(ref.child_columns[0])
                                );
                                allFkRemoved = false;
                            }
                        }

                        if (!allFkRemoved) {
                            console.error(
                                cstyler.bold.red("Aborting column drop due to FK failures:"),
                                cstyler.hex("#00d9ffff")(column)
                            );
                            continue;
                        }
                    }

                    const dropped = await fncs.dropColumn(
                        config,
                        databaseName,
                        tableName,
                        column
                    );

                    if (dropped === null) {
                        console.error(
                            cstyler.bold.red("Failed to drop column:"),
                            cstyler.hex("#00d9ffff")(column)
                        );
                        return null;
                    }
                    console.log(cstyler.blue("Database: "), cstyler.hex("#00d9ffff")(databaseName), cstyler.blue(" Table: "), cstyler.hex("#00d9ffff")(tableName), cstyler.blue("Column: "), cstyler.hex("#00d9ffff")(column), cstyler.green("- dropped successfully."))
                    count += 1;
                    console.log(
                        cstyler.bold.green("Successfully dropped column:"),
                        cstyler.hex("#00d9ffff")(column),
                        cstyler.bold.green("from table:"),
                        cstyler.hex("#00d9ffff")(tableName)
                    );
                }
            }
        }
        if (count > 0) {
            console.log(cstyler.green("Successfully dropped ", count, " columns."));
        } else {
            console.log("There is not column found to be dropped.");
        }
        return true;
    } catch (err) {
        console.error(err?.message || err);
        return null;
    }
}



module.exports = {
    dropcolumn
}