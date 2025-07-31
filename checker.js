const cstyler = require("cstyler");
const fncs = require("./function");


function parseQuotedListSafely(text) {
    if (typeof text !== 'string') return [];
    if (Array.isArray(text)) return text;

    // Check: does it look like a quoted comma-separated list?
    const isListLike = /^('.*?')(,\s*'.*?')*$/.test(text.trim());

    if (!isListLike) {
        return [];
    }

    return text
        .split(",")
        .map(item => item.trim().replace(/^'(.*)'$/, "$1"))
        .filter(item => item.length > 0);
}
function JSONchecker(table_json) {
    // lets check all table name and column name
    let badTableNames = [];
    let badColumnNames = [];
    let badautoincrement = [];
    let badindex = [];
    let badnulls = [];
    let baddefaults = [];
    let badlength = [];
    let badforeighkey = [];

    if (fncs.isJsonObject(table_json)) {
        for (const databaseName of Object.keys(table_json)) {
            if (fncs.isJsonObject(table_json[databaseName])) {
                for (const tableName of Object.keys(table_json[databaseName])) {
                    if (!fncs.parseColumnWithOptionalLoopStrict(tableName.toLocaleLowerCase())) {
                        badTableNames.push(
                            `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ` +
                            `${cstyler.purpal('of table:')} ${cstyler.blue(tableName)} ` +
                            `${cstyler.red('- table name is not valid.')}`
                        );

                    }
                    if (fncs.isJsonObject(table_json[databaseName][tableName])) {
                        for (const columnName of Object.keys(table_json[databaseName][tableName])) {
                            const deepColumn = table_json[databaseName][tableName][columnName];
                            // lets check column names
                            if (!fncs.isValidColumnName(columnName.toLocaleLowerCase())) {
                                badColumnNames.push(
                                    `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ` +
                                    `${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ` +
                                    `${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)} ` +
                                    `${cstyler.red('- column name is not valid.')}`
                                );

                            }
                            // Let's check properties
                            if (!deepColumn.hasOwnProperty("type")) {
                                badColumnNames.push(
                                    `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ` +
                                    `${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ` +
                                    `${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)} ` +
                                    `${cstyler.red('- must have type.')}`
                                );
                                continue;
                            } else {
                                if (!deepColumn.type.hasOwnProperty("name")) {
                                    badColumnNames.push(
                                        `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ` +
                                        `${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ` +
                                        `${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)} ` +
                                        `${cstyler.red('> type - must have name.')}`
                                    );
                                    continue;
                                }
                            }
                            // check auto increment
                            const autoIncrementIntegerTypesWithUnsigned = [
                                "TINYINT",
                                "SMALLINT",
                                "MEDIUMINT",
                                "INT",
                                "INTEGER",
                                "BIGINT",
                                "TINYINT UNSIGNED",
                                "SMALLINT UNSIGNED",
                                "MEDIUMINT UNSIGNED",
                                "INT UNSIGNED",
                                "INTEGER UNSIGNED",
                                "BIGINT UNSIGNED"
                            ];
                            if (deepColumn.hasOwnProperty("AUTO_INCREMENT")) {
                                if (
                                    !autoIncrementIntegerTypesWithUnsigned.includes(deepColumn.type?.name) ||
                                    !['PRIMARY KEY', 'UNIQUE', true].includes(deepColumn.index) ||
                                    deepColumn.NULL === true ||
                                    deepColumn.hasOwnProperty("DEFAULT")
                                ) {
                                    badautoincrement.push(
                                        `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ` +
                                        `${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ` +
                                        `${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)} ` +
                                        `${cstyler.red('column must be')} ${cstyler.yellow('integer')} ${cstyler.red('type, should be')} ${cstyler.yellow('primary key')} ${cstyler.red('or')} ${cstyler.yellow('unique indexed')}, ` +
                                        `${cstyler.red('should be')} ${cstyler.yellow('NOT NULL')}, ` +
                                        `${cstyler.red('can not have a')} ${cstyler.yellow('DEFAULT')} ${cstyler.red('value.')}`
                                    );
                                }
                                let autoincrementcolumnlist = [];
                                for (const column of Object.keys(table_json[databaseName][tableName])) {
                                    if (table_json[databaseName][tableName][column].hasOwnProperty("AUTO_INCREMENT")) {
                                        if (table_json[databaseName][tableName][column].AUTO_INCREMENT === true) {
                                            autoincrementcolumnlist.push(column);
                                        }
                                    }
                                }
                                if (autoincrementcolumnlist.length > 1) {
                                    badautoincrement.push(
                                        `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ` +
                                        `${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ` +
                                        `${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)} ` +
                                        `${cstyler.red('- This table has another')} ${cstyler.yellow('auto_increment')} ${cstyler.red('column. A table can have only one')} ${cstyler.yellow('auto_increment')} ${cstyler.red('column.')}`
                                    );

                                }
                            }
                            // check index
                            if (deepColumn.hasOwnProperty("index")) {
                                if (deepColumn.type?.name === "JSON") {
                                    badindex.push(
                                        `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ` +
                                        `${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ` +
                                        `${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)} ` +
                                        `${cstyler.red('- is a JSON column which can not have an ')}${cstyler.yellow('index')} ${cstyler.red('property')}`
                                    );

                                }
                                const validIndexValues = [
                                    true,       // normal index
                                    "INDEX",
                                    "UNIQUE",
                                    "PRIMARY",
                                    "PRIMARY KEY",
                                    "FULLTEXT",
                                    "SPATIAL"
                                ];
                                const indexValue = typeof deepColumn.index === "string" ? deepColumn.index.toUpperCase() : deepColumn.index;
                                if (!validIndexValues.includes(indexValue)) {
                                    badindex.push(
                                        `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ` +
                                        `${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ` +
                                        `${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)} ` +
                                        `${cstyler.red('- has unsupported index value.')} ` +
                                        `${cstyler.red('Value must be')} ${cstyler.yellow(validIndexValues.join(', '))}`
                                    );

                                }
                            }
                            // check ENUM
                            if (deepColumn.type?.name === "ENUM") {
                                const enumoptions = parseQuotedListSafely(deepColumn.type?.LengthValues);
                                if (enumoptions.length < 1) {
                                    badlength.push(
                                        `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ` +
                                        `${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ` +
                                        `${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)} ` +
                                        `${cstyler.yellow('LengthValues')} ${cstyler.red('for')} ${cstyler.yellow('ENUM')} ` +
                                        `${cstyler.red('must be a non-empty list with single-quoted items or an array:')} ` +
                                        `${cstyler.yellow(`"'red', 'blue',..."`)} ${cstyler.red('or')} ${cstyler.yellow("['red', 'blue',...]")}`
                                    );

                                }
                            }
                            // check SET
                            if (deepColumn.type?.name === "SET") {
                                const setOptions = parseQuotedListSafely(deepColumn.type.LengthValues);
                                if (setOptions.length < 1) {
                                    badlength.push(
                                        `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ` +
                                        `${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ` +
                                        `${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)} ` +
                                        `${cstyler.yellow('LengthValues')} ${cstyler.red('for')} ${cstyler.yellow('SET')} ` +
                                        `${cstyler.red('must be a non-empty list with single-quoted items or an array:')} ` +
                                        `${cstyler.yellow(`"'red', 'blue',..."`)} ${cstyler.red('or')} ${cstyler.yellow("['red', 'blue',...]")}`
                                    );

                                }
                            }
                            // check VARCHAR or CHAR
                            if (["VARCHAR", "CHAR"].includes(deepColumn.type?.name)) {
                                if (!Number.isInteger(deepColumn.type.LengthValues) || deepColumn.type.LengthValues < 1) {
                                    badlength.push(
                                        `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)}${cstyler.red("'s must define a positive integer Length for type")} ${cstyler.yellow(deepColumn.type?.name)}`
                                    );

                                }
                            }
                            // check DECIMAL
                            if (deepColumn.type?.name === "DECIMAL") {
                                const [precision, scale] = deepColumn.type.LengthValues || [];
                                if (!Number.isInteger(precision) || precision <= 0 || precision > 65) {
                                    badlength.push(
                                        `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)}${cstyler.red(" has invalid")} ${cstyler.yellow('DECIMAL')} ${cstyler.red('precision')}`
                                    );

                                }
                                if (!Number.isInteger(scale) || scale < 0 || scale > precision) {
                                    badlength.push(
                                        `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} > ${cstyler.purpal('Table:')} ${cstyler.blue(tableName)} > ${cstyler.purpal('Column:')} ${cstyler.blue(columnName)} ${cstyler.red('has invalid')} ${cstyler.yellow('DECIMAL')} ${cstyler.red('scale')}`
                                    );


                                }
                            }
                            // lets check bad null
                            if (deepColumn.hasOwnProperty("NULL")) {
                                if (deepColumn.NULL !== true && deepColumn.NULL !== false) {
                                    badnulls.push(
                                        `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} > ${cstyler.purpal('Table:')} ${cstyler.blue(tableName)} > ${cstyler.purpal('Column:')} ${cstyler.blue(columnName)} ${cstyler.yellow('NULL')} ${cstyler.red('- must be true or false')}`
                                    );

                                }
                            }
                            // check DEFAULT
                            if (deepColumn.hasOwnProperty("DEFAULT")) {
                                if (deepColumn.type?.name === "JSON" && deepColumn.DEFAULT !== null) {
                                    baddefaults.push(
                                        `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} > ${cstyler.purpal('Table:')} ${cstyler.blue(tableName)} > ${cstyler.purpal('Column:')} ${cstyler.blue(columnName)} ${cstyler.red('column can not have')} ${cstyler.yellow('DEFAULT')} ${cstyler.red('or must be null')}`
                                    );

                                } else if (typeof deepColumn.DEFAULT !== "string" && typeof deepColumn.DEFAULT !== "number") {
                                    baddefaults.push(
                                        `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} > ` +
                                        `${cstyler.purpal('Table:')} ${cstyler.blue(tableName)} > ` +
                                        `${cstyler.purpal('Column:')} ${cstyler.blue(columnName)}'s ` +
                                        `${cstyler.yellow('DEFAULT')} ${cstyler.red('must be string')}`
                                    );

                                }
                            }
                            // lets check bad foreign_key
                            if (deepColumn.hasOwnProperty("foreign_key")) {
                                const validDeleteOptions = new Set([null, true, 'set null', 'cascade', 'restrict', 'no action', 'set default']);

                                if (!validDeleteOptions.has(deepColumn.foreign_key.delete)) {
                                    badforeighkey.push(
                                        `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} > ` +
                                        `${cstyler.purpal('Table:')} ${cstyler.blue(tableName)} > ` +
                                        `${cstyler.purpal('Column:')} ${cstyler.blue(columnName)} ` +
                                        `${cstyler.blue('foreign_key > delete')} ` +
                                        `${cstyler.red('must be one of:')} ` +
                                        `${cstyler.yellow('null')}, ${cstyler.blue('true')}, ${cstyler.yellow("'restrict'")}, ` +
                                        `${cstyler.yellow("'no action'")}, ${cstyler.yellow("'set default'")}`
                                    );

                                } else {
                                    const deleteOption = deepColumn.foreign_key.delete;

                                    // If DELETE is null (SET NULL), column must allow NULLs
                                    if (deleteOption === null && deepColumn.NULL !== true) {
                                        badforeighkey.push(
                                            `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} > ` +
                                            `${cstyler.purpal('Table:')} ${cstyler.blue(tableName)} > ` +
                                            `${cstyler.purpal('Column:')} ${cstyler.blue(columnName)} ` +
                                            `${cstyler.blue('foreign_key >')} ` +
                                            `${cstyler.yellow('delete')} === ${cstyler.yellow('null')} - then column ${cstyler.red('NULL must be true')}`
                                        );
                                    }

                                    // If DELETE is 'set default', column must have a DEFAULT value
                                    else if (deleteOption === 'set default' && deepColumn.DEFAULT === undefined) {
                                        badforeighkey.push(
                                            `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ` +
                                            `${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ` +
                                            `${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)} ` +
                                            `${cstyler.blue('foreign_key >')} ${cstyler.red("delete === 'set default'")} - then column ${cstyler.red('DEFAULT must be defined')}`
                                        );

                                    }
                                }
                                // check reference
                                if (deepColumn.foreign_key.hasOwnProperty("REFERENCES")) {
                                    if (deepColumn.foreign_key.REFERENCES.hasOwnProperty("table") && deepColumn.foreign_key.REFERENCES.hasOwnProperty("column")) {
                                        if (table_json[databaseName].hasOwnProperty(deepColumn.foreign_key.REFERENCES.table)) {
                                            if (!table_json[databaseName][deepColumn.foreign_key.REFERENCES.table].hasOwnProperty(deepColumn.foreign_key.REFERENCES.column)) {
                                                badforeighkey.push(
                                                    `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ` +
                                                    `${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ` +
                                                    `${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)} ` +
                                                    `${cstyler.purpal('foreign_key > REFERENCES > table > column -')} ${cstyler.yellow.underline(deepColumn.foreign_key.REFERENCES.column)} ${cstyler.red('do not exist')}`
                                                );
                                            }
                                        } else {
                                            badforeighkey.push(`${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ${cstyler.purpal('> Column:')} ${cstyler.blue(`${columnName} > foreign_key > REFERENCES >`)} ${cstyler.purpal('Table:')} ${cstyler.underline.yellow(deepColumn.foreign_key.REFERENCES.table)} - ${cstyler.red('do not exist')}`)
                                        }
                                    } else {
                                        badforeighkey.push(
                                            `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ` +
                                            `${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ` +
                                            `${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)} ` +
                                            `${cstyler.blue('foreign_key > REFERENCES -')} ${cstyler.red('must have a table and column property')}`
                                        );
                                    }
                                } else {
                                    badforeighkey.push(
                                        `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ` +
                                        `${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ` +
                                        `${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)} ` +
                                        `${cstyler.blue('foreign_key -')} ${cstyler.red('must have a REFERENCES property')}`
                                    );
                                }
                            }
                        }
                    } else {
                        console.error("Column of table: ", tableName, " must be in json format.");
                        return false;
                    }
                }
            } else {
                console.error("Tables of database: ", databaseName, " must be in Json format.");
                return false;
            }
        }
        // Lets return result
        if (badTableNames.length === 0 && badColumnNames.length === 0 && badnulls.length === 0 && baddefaults.length === 0 && badlength.length === 0 && badforeighkey.length === 0) {
            return true;
        }
        if (badTableNames.length > 0) {
            console.error(`Table names are not correct: \n${badTableNames.join("\n")}`);
        }
        if (badColumnNames.length > 0) {
            console.error(`Column names are not correct: \n${badColumnNames.join("\n")}`);
        }
        if (badlength.length > 0) {
            console.error(`ENUM values that are not correct: \n${badlength.join("\n")}`);
        }
        if (badautoincrement.length > 0) {
            console.error(`Auto Increment values that are not correct: \n${badautoincrement.join("\n")}`);
        }
        if (badindex.length > 0) {
            console.error(`Index values that are not correct: \n${badindex.join("\n")}`);
        }
        if (badnulls.length > 0) {
            console.error(`NULL values that are not correct: \n${badnulls.join("\n")}`);
        }
        if (baddefaults.length > 0) {
            console.error(`DEFAULT values that are not correct: \n${baddefaults.join("\n")}`);
        }
        if (badforeighkey.length > 0) {
            console.error(`Foreign keys and values that are not correct: \n${badforeighkey.join("\n")}`);
        }
        return false;
    } else {
        console.error("Plese provide a valid json file");
        return false;
    }
}
module.exports = {
    JSONchecker,
}