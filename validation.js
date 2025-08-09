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

const mysqlTypeMetadata = {
    // Numeric types
    TINYINT: { lengthType: "int", required: false, query: "TINYINT(3)", supportsUnsigned: true },
    SMALLINT: { lengthType: "int", required: false, query: "SMALLINT(5)", supportsUnsigned: true },
    MEDIUMINT: { lengthType: "int", required: false, query: "MEDIUMINT(8)", supportsUnsigned: true },
    INT: { lengthType: "int", required: false, query: "INT(11)", supportsUnsigned: true },
    INTEGER: { lengthType: "int", required: false, query: "INTEGER(11)", supportsUnsigned: true },
    BIGINT: { lengthType: "int", required: false, query: "BIGINT(20)", supportsUnsigned: true },
    FLOAT: { lengthType: "two-int", required: false, query: "FLOAT(10,2)", supportsUnsigned: true },
    DOUBLE: { lengthType: "two-int", required: false, query: "DOUBLE(16,4)", supportsUnsigned: true },
    REAL: { lengthType: "two-int", required: false, query: "REAL(16,4)", supportsUnsigned: true },
    DECIMAL: { lengthType: "two-int", required: true, query: "DECIMAL(10,2)", supportsUnsigned: true },
    NUMERIC: { lengthType: "two-int", required: true, query: "NUMERIC(10,2)", supportsUnsigned: true },

    // Boolean types
    BOOLEAN: { lengthType: "none", required: false, query: "BOOLEAN", supportsUnsigned: false },
    BOOL: { lengthType: "none", required: false, query: "BOOL", supportsUnsigned: false },

    // Date & Time types
    DATE: { lengthType: "none", required: false, query: "DATE", supportsUnsigned: false },
    TIME: { lengthType: "fsp", required: false, query: "TIME(6)", supportsUnsigned: false },
    YEAR: { lengthType: "none", required: false, query: "YEAR", supportsUnsigned: false },
    DATETIME: { lengthType: "fsp", required: false, query: "DATETIME(6)", supportsUnsigned: false },
    TIMESTAMP: { lengthType: "fsp", required: false, query: "TIMESTAMP(6)", supportsUnsigned: false },

    // String types
    CHAR: { lengthType: "int", required: true, query: "CHAR(1)", supportsUnsigned: false },
    VARCHAR: { lengthType: "int", required: true, query: "VARCHAR(255)", supportsUnsigned: false },
    TINYTEXT: { lengthType: "none", required: false, query: "TINYTEXT", supportsUnsigned: false },
    TEXT: { lengthType: "none", required: false, query: "TEXT", supportsUnsigned: false },
    MEDIUMTEXT: { lengthType: "none", required: false, query: "MEDIUMTEXT", supportsUnsigned: false },
    LONGTEXT: { lengthType: "none", required: false, query: "LONGTEXT", supportsUnsigned: false },
    ENUM: { lengthType: "list", required: true, query: "ENUM('option1', 'option2')", supportsUnsigned: false },
    SET: { lengthType: "list", required: true, query: "SET('a','b','c')", supportsUnsigned: false },

    // Binary types
    BINARY: { lengthType: "int", required: true, query: "BINARY(1)", supportsUnsigned: false },
    VARBINARY: { lengthType: "int", required: true, query: "VARBINARY(255)", supportsUnsigned: false },
    TINYBLOB: { lengthType: "none", required: false, query: "TINYBLOB", supportsUnsigned: false },
    BLOB: { lengthType: "none", required: false, query: "BLOB", supportsUnsigned: false },
    MEDIUMBLOB: { lengthType: "none", required: false, query: "MEDIUMBLOB", supportsUnsigned: false },
    LONGBLOB: { lengthType: "none", required: false, query: "LONGBLOB", supportsUnsigned: false },

    // Spatial types
    GEOMETRY: { lengthType: "none", required: false, query: "GEOMETRY", supportsUnsigned: false },
    POINT: { lengthType: "none", required: false, query: "POINT", supportsUnsigned: false },
    LINESTRING: { lengthType: "none", required: false, query: "LINESTRING", supportsUnsigned: false },
    POLYGON: { lengthType: "none", required: false, query: "POLYGON", supportsUnsigned: false },
    MULTIPOINT: { lengthType: "none", required: false, query: "MULTIPOINT", supportsUnsigned: false },
    MULTILINESTRING: { lengthType: "none", required: false, query: "MULTILINESTRING", supportsUnsigned: false },
    MULTIPOLYGON: { lengthType: "none", required: false, query: "MULTIPOLYGON", supportsUnsigned: false },
    GEOMETRYCOLLECTION: { lengthType: "none", required: false, query: "GEOMETRYCOLLECTION", supportsUnsigned: false },

    // JSON
    JSON: { lengthType: "none", required: false, query: "JSON", supportsUnsigned: false }
};




function JSONchecker(table_json) {
    // lets check all table name and column name
    let badTableNames = [];
    let badColumnNames = [];
    let badtype = [];
    let badautoincrement = [];
    let badindex = [];
    let badnulls = [];
    let baddefaults = [];
    let badlength = [];
    let badforeighkey = [];
    let badcomment = [];
    let badunsigned = [];
    let badzerofill = [];
    console.log(cstyler.green("Initializing JSON checking..."));

    if (fncs.isJsonObject(table_json)) {
        for (const databaseName of Object.keys(table_json)) {
            if (fncs.isJsonObject(table_json[databaseName])) {
                for (const tableName of Object.keys(table_json[databaseName])) {
                    if (!fncs.perseTableNameWithLoop(tableName.toLowerCase())) {
                        badTableNames.push(
                            `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ` +
                            `${cstyler.purpal('of table:')} ${cstyler.blue(tableName)} ` +
                            `${cstyler.red('- table name is not valid.')}`
                        );

                    }
                    if (fncs.isJsonObject(table_json[databaseName][tableName])) {
                        for (const columnName of Object.keys(table_json[databaseName][tableName])) {
                            const deepColumn = table_json[databaseName][tableName][columnName];
                            let autoincrement = undefined;
                            let indexes = undefined;
                            let nulls = undefined;
                            let defaults = undefined;
                            let comment = undefined;
                            let unsigned = undefined;
                            let zerofill = undefined;
                            if (deepColumn.hasOwnProperty("autoIncrement")) {
                                autoincrement = deepColumn.autoIncrement;
                            } else if (deepColumn.hasOwnProperty("autoincrement")) {
                                autoincrement = deepColumn.autoincrement;
                            } else if (deepColumn.hasOwnProperty("auto_increment")) {
                                autoincrement = deepColumn.auto_increment;
                            } else if (deepColumn.hasOwnProperty("AUTO_INCREMENT")) {
                                autoincrement = deepColumn.AUTO_INCREMENT;
                            } else if (deepColumn.hasOwnProperty("AUTOINCREMENT")) {
                                autoincrement = deepColumn.AUTOINCREMENT;
                            }
                            /**
                             * autoIncrement
                             * autoincrement
                             * auto_increment
                             * AUTO_INCREMENT
                             * AUTOINCREMENT
                             */
                            if (deepColumn.hasOwnProperty("index")) {
                                indexes = deepColumn.index;
                            } else if (deepColumn.hasOwnProperty("INDEX")) {
                                indexes = deepColumn.INDEX;
                            } else if (deepColumn.hasOwnProperty("Index")) {
                                indexes = deepColumn.Index;
                            }
                            /**
                             * index
                             * INDEX
                             * Index
                             */
                            if (deepColumn.hasOwnProperty("null")) {
                                nulls = deepColumn.null;
                            } else if (deepColumn.hasOwnProperty("NULL")) {
                                nulls = deepColumn.NULL;
                            } else if (deepColumn.hasOwnProperty("Null")) {
                                nulls = deepColumn.Null;
                            }
                            /**
                             * null
                             * NULL
                             * Null
                             */
                            if (deepColumn.hasOwnProperty("default")) {
                                defaults = deepColumn.default;
                            } else if (deepColumn.hasOwnProperty("DEFAULT")) {
                                defaults = deepColumn.DEFAULT;
                            } else if (deepColumn.hasOwnProperty("Default")) {
                                defaults = deepColumn.Default;
                            }
                            /**
                             * default
                             * DEFAULT
                             * Default
                             */
                            if (deepColumn.hasOwnProperty("comment")) {
                                comment = deepColumn.comment;
                            } else if (deepColumn.hasOwnProperty("COMMENT")) {
                                comment = deepColumn.COMMENT;
                            } else if (deepColumn.hasOwnProperty("Comment")) {
                                comment = deepColumn.Comment;
                            }
                            /**
                             * comment
                             * COMMENT
                             * Comment
                             */
                            if (deepColumn.hasOwnProperty("comment")) {
                                unsigned = deepColumn.comment;
                            } else if (deepColumn.hasOwnProperty("COMMENT")) {
                                unsigned = deepColumn.COMMENT;
                            } else if (deepColumn.hasOwnProperty("Comment")) {
                                unsigned = deepColumn.Comment;
                            }
                            /**
                             * unsigned
                             * UNSIGNED
                             * Unsigned
                             * 
                             */
                            // lets check column names
                            if (!fncs.isValidColumnName(columnName.toLowerCase())) {
                                badColumnNames.push(
                                    `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ` +
                                    `${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ` +
                                    `${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)} ` +
                                    `${cstyler.red('- column name is not valid.')}`
                                );
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
                            if (deepColumn.hasOwnProperty("DEFAULT") || deepColumn.hasOwnProperty("default")) {
                                let def = undefined;
                                if (deepColumn.hasOwnProperty("DEFAULT")) {
                                    def = deepColumn.DEFAULT;
                                } else {
                                    def = deepColumn.default;
                                }
                                if (deepColumn.type?.name === "JSON" && def !== null) {
                                    baddefaults.push(
                                        `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} > ${cstyler.purpal('Table:')} ${cstyler.blue(tableName)} > ${cstyler.purpal('Column:')} ${cstyler.blue(columnName)} ${cstyler.red('column can not have')} ${cstyler.yellow('DEFAULT')} ${cstyler.red('or must be null')}`
                                    );

                                } else if (typeof def !== "string" && typeof def !== "number") {
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
                            // check auto increment
                            if (deepColumn.hasOwnProperty("AUTO_INCREMENT")) {
                                if (
                                    !autoIncrementIntegerTypesWithUnsigned.includes(deepColumn.type?.name.toUpperCase()) ||
                                    !['PRIMARY KEY', 'UNIQUE', true].includes(deepColumn.index) ||
                                    deepColumn.NULL === true ||
                                    (deepColumn.hasOwnProperty("DEFAULT") || deepColumn.hasOwnProperty("default"))
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
                            // check unsigned
                            if (deepColumn.unsigned === true || deepColumn.UNSIGNED === true) {
                                const validNumericTypes = [
                                    "tinyint", "smallint", "mediumint", "int", "integer",
                                    "bigint", "float", "double", "decimal", "numeric"
                                ];

                                const columnType = deepColumn.type?.name?.toLowerCase?.();

                                // ❌ Invalid use of unsigned on a non-numeric type
                                if (!validNumericTypes.includes(columnType)) {
                                    badunsigned.push(
                                        cstyler`{purpal Database:} {blue ${databaseName}} ` +
                                        cstyler`{purpal > Table:} {blue ${tableName}} ` +
                                        cstyler`{purpal > Column:} {blue ${columnName}} ` +
                                        cstyler.red(" - has `unsigned` but type is not numeric")
                                    );
                                }
                            }
                            // check zerofill
                            if (deepColumn.zerofill === true &&
                                !["int", "integer", "bigint", "smallint", "mediumint", "tinyint", "decimal", "numeric", "float", "double"].includes(deepColumn.type?.name.toLowerCase?.())
                            ) {
                                badzerofill.push(
                                    cstyler`{purpal Database:} {blue ${databaseName}} ` +
                                    cstyler`{purpal > Table:} {blue ${tableName}} ` +
                                    cstyler`{purpal > Column:} {blue ${columnName}} ` +
                                    cstyler.red(" - has `zerofill` but column type is not numeric")
                                );
                            }

                            // check comment
                            if (deepColumn.hasOwnProperty("comment") || deepColumn.hasOwnProperty("Comment")) {
                                const comment = deepColumn.comment ?? deepColumn.Comment;

                                // Invalid comment flags
                                const invalids = [];

                                if (typeof comment !== "string") {
                                    invalids.push(cstyler.red("Not a string"));
                                } else {
                                    if (comment.includes('"')) {
                                        invalids.push(cstyler.red('Contains double quote (") '));
                                    }

                                    if (comment.includes("'")) {
                                        invalids.push(cstyler.red("Contains single quote (') "));
                                    }

                                    if (/[\x00]/.test(comment)) {
                                        invalids.push(cstyler.red("Contains null byte "));
                                    }

                                    if (comment.length > 1024) {
                                        invalids.push(cstyler.red("Comment too long (exceeds 1024 characters)"));
                                    }
                                }

                                if (invalids.length) {
                                    badcomment.push(
                                        `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ` +
                                        `${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ` +
                                        `${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)} ` +
                                        `${cstyler.red('- Invalid comment:')} ${invalids.join(cstyler.red(' | '))}`
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
                                if (!validIndexValues.includes(indexValue.toUpperCase())) {
                                    badindex.push(
                                        `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ` +
                                        `${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ` +
                                        `${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)} ` +
                                        `${cstyler.red('- has unsupported index value.')} ` +
                                        `${cstyler.red('Value must be')} ${cstyler.yellow(validIndexValues.join(', '))}`
                                    );

                                }
                            }
                            // Let's check properties
                            // check type
                            const allMySQLColumnTypes = Object.keys(mysqlTypeMetadata);
                            if (!deepColumn.hasOwnProperty("type")) {
                                badtype.push(
                                    `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ` +
                                    `${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ` +
                                    `${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)} ` +
                                    `${cstyler.red('- must have type.')}`
                                );
                                continue;
                            } else {
                                if (!deepColumn.type.hasOwnProperty("name")) {
                                    badtype.push(
                                        `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ` +
                                        `${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ` +
                                        `${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)} ` +
                                        `${cstyler.red('> type - must have name.')}`
                                    );
                                    continue;
                                } else {
                                    if (!allMySQLColumnTypes.includes(deepColumn.type.name.toUpperCase())) {
                                        badtype.push(
                                            `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ` +
                                            `${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ` +
                                            `${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)} ` +
                                            `${cstyler.red('> type - must have valid column type.')}`
                                        );
                                        continue;
                                    }
                                }
                            }
                            // check LengthValue
                            if (Object.keys(mysqlTypeMetadata).includes(deepColumn.type.name.toUpperCase())) {
                                const typeInfo = mysqlTypeMetadata[deepColumn.type.name.toUpperCase()];

                                // Check if length is required but missing
                                if (
                                    typeInfo.required &&
                                    !deepColumn.type.hasOwnProperty("LengthValues")
                                ) {
                                    badlength.push(
                                        `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)} ${cstyler.red('requires length but none provided.')}`
                                    );
                                }

                                // Validate LengthValues if provided (even if not required)
                                if (deepColumn.type.hasOwnProperty("LengthValues")) {
                                    const lenVals = deepColumn.type.LengthValues;

                                    if (typeInfo.lengthType === "int") {
                                        if (!Number.isInteger(lenVals)) {
                                            badlength.push(
                                                `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)} ${cstyler.red('should have a valid integer length')}`
                                            );
                                        }
                                    } else if (typeInfo.lengthType === "two-int") {
                                        const parsed = parseQuotedListSafely(lenVals);
                                        if (parsed.length !== 2) {
                                            badlength.push(
                                                `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)} ${cstyler.red('should have two integer values [precision, scale]')}`
                                            );
                                        } else {
                                            const [precision, scale] = parsed;
                                            if (
                                                !Number.isInteger(precision) || precision <= 0 || precision > 65 ||
                                                !Number.isInteger(scale) || scale < 0 || scale > precision
                                            ) {
                                                badlength.push(
                                                    `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)} ${cstyler.red('has invalid precision or scale')}`
                                                );
                                            }
                                        }
                                    } else if (typeInfo.lengthType === "list") {
                                        const parsed = parseQuotedListSafely(lenVals);
                                        if (!Array.isArray(parsed) || parsed.length === 0) {
                                            badlength.push(
                                                `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)} ${cstyler.red('should have a valid list of options')}`
                                            );
                                        }
                                    }
                                }
                            }
                            else {
                                badtype.push(
                                    `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ` +
                                    `${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ` +
                                    `${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)} ` +
                                    `${cstyler.red('- must have a valid column type like INT, DATE.')}`
                                );
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
        if (badTableNames.length === 0 && badColumnNames.length === 0 && badcomment.length === 0 && badunsigned.length === 0 && badzerofill.length === 0 && badtype.length === 0 && badindex.length === 0 && badautoincrement.length === 0 && badnulls.length === 0 && baddefaults.length === 0 && badlength.length === 0 && badforeighkey.length === 0) {
            console.log(cstyler.green("<<<All JSON checking is done>>>"));
            return true;
        }

        // lets print on the console
        if (badTableNames.length > 0) {
            console.error(`Table names are not correct: \n${badTableNames.join("\n")}`);
        }
        if (badColumnNames.length > 0) {
            console.error(`Column names are not correct: \n${badColumnNames.join("\n")}`);
        }
        console.log(cstyler.yellow("Valid column types:"));
        console.log(cstyler.dark.yellow(Object.keys(mysqlTypeMetadata).join(", ")));
        if (badtype.length > 0) {
            console.error(`Column type are not correct: \n${badtype.join("\n")}`);
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
        if (badunsigned.length > 0) {
            console.error(`UNSIGNED values that are not correct: \n${badnulls.join("\n")}`);
        }
        if (badnulls.length > 0) {
            console.error(`NULL values that are not correct: \n${badnulls.join("\n")}`);
        }
        if (baddefaults.length > 0) {
            console.error(`DEFAULT values that are not correct: \n${baddefaults.join("\n")}`);
        }
        if (badcomment.length > 0) {
            console.error(`Comment values that are not correct: \n${baddefaults.join("\n")}`);
        }
        if (badforeighkey.length > 0) {
            console.error(`Foreign keys and values that are not correct: \n${badforeighkey.join("\n")}`);
        }
        console.log(cstyler.red("<<<All JSON checking is done. JSON need correction.>>>"));
        return false;
    } else {
        console.error("Plese provide a valid json file");
        return false;
    }
}
module.exports = {
    JSONchecker,
}