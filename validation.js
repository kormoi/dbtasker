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
    CHAR: { lengthType: "int", required: true, query: "CHAR(10)", supportsUnsigned: false },
    VARCHAR: { lengthType: "int", required: true, query: "VARCHAR(255)", supportsUnsigned: false },
    BINARY: { lengthType: "int", required: true, query: "BINARY(16)", supportsUnsigned: false },
    VARBINARY: { lengthType: "int", required: true, query: "VARBINARY(255)", supportsUnsigned: false },
    BIT: { lengthType: "int", required: true, query: "BIT(8)", supportsUnsigned: false },

    DECIMAL: { lengthType: "two-int", required: true, query: "DECIMAL(10,2)", supportsUnsigned: true },
    NUMERIC: { lengthType: "two-int", required: true, query: "NUMERIC(8,3)", supportsUnsigned: true },

    FLOAT: { lengthType: "two-int", required: false, query: "FLOAT(10,2)", supportsUnsigned: true },
    DOUBLE: { lengthType: "two-int", required: false, query: "DOUBLE(12,4)", supportsUnsigned: true },

    ENUM: { lengthType: "list", required: true, query: "ENUM('a','b')", supportsUnsigned: false },
    SET: { lengthType: "list", required: true, query: "SET('x','y')", supportsUnsigned: false },

    TINYINT: { lengthType: "int", required: false, query: "TINYINT(3)", supportsUnsigned: true },
    SMALLINT: { lengthType: "int", required: false, query: "SMALLINT(5)", supportsUnsigned: true },
    MEDIUMINT: { lengthType: "int", required: false, query: "MEDIUMINT(8)", supportsUnsigned: true },
    INT: { lengthType: "int", required: false, query: "INT(11)", supportsUnsigned: true },
    BIGINT: { lengthType: "int", required: false, query: "BIGINT(20)", supportsUnsigned: true },

    DATE: { lengthType: "none", required: false, query: "DATE", supportsUnsigned: false },
    DATETIME: { lengthType: "none", required: false, query: "DATETIME", supportsUnsigned: false },
    TIMESTAMP: { lengthType: "none", required: false, query: "TIMESTAMP", supportsUnsigned: false },
    TIME: { lengthType: "none", required: false, query: "TIME", supportsUnsigned: false },
    YEAR: { lengthType: "none", required: false, query: "YEAR", supportsUnsigned: false },

    TINYTEXT: { lengthType: "none", required: false, query: "TINYTEXT", supportsUnsigned: false },
    TEXT: { lengthType: "none", required: false, query: "TEXT", supportsUnsigned: false },
    MEDIUMTEXT: { lengthType: "none", required: false, query: "MEDIUMTEXT", supportsUnsigned: false },
    LONGTEXT: { lengthType: "none", required: false, query: "LONGTEXT", supportsUnsigned: false },

    TINYBLOB: { lengthType: "none", required: false, query: "TINYBLOB", supportsUnsigned: false },
    BLOB: { lengthType: "none", required: false, query: "BLOB", supportsUnsigned: false },
    MEDIUMBLOB: { lengthType: "none", required: false, query: "MEDIUMBLOB", supportsUnsigned: false },
    LONGBLOB: { lengthType: "none", required: false, query: "LONGBLOB", supportsUnsigned: false },

    GEOMETRY: { lengthType: "none", required: false, query: "GEOMETRY", supportsUnsigned: false },
    POINT: { lengthType: "none", required: false, query: "POINT", supportsUnsigned: false },
    LINESTRING: { lengthType: "none", required: false, query: "LINESTRING", supportsUnsigned: false },
    POLYGON: { lengthType: "none", required: false, query: "POLYGON", supportsUnsigned: false },
    MULTIPOINT: { lengthType: "none", required: false, query: "MULTIPOINT", supportsUnsigned: false },
    MULTILINESTRING: { lengthType: "none", required: false, query: "MULTILINESTRING", supportsUnsigned: false },
    MULTIPOLYGON: { lengthType: "none", required: false, query: "MULTIPOLYGON", supportsUnsigned: false },
    GEOMETRYCOLLECTION: { lengthType: "none", required: false, query: "GEOMETRYCOLLECTION", supportsUnsigned: false }
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
                                    !autoIncrementIntegerTypesWithUnsigned.includes(deepColumn.type?.name.toUpperCase()) ||
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
                            // Bad length value
                            const requireLength = [
                                "char",
                                "varchar",
                                "binary",
                                "varbinary",
                                "bit",
                                "decimal",
                                "numeric",
                                "enum",
                                "set"
                            ];
                            if (requireLength.includes(deepColumn.type.name.toLowerCase())) {
                                if (!deepColumn.type.hasOwnProperty(LengthValues)) {
                                    badlength.push(
                                        `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ` +
                                        `${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ` +
                                        `${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)} ` +
                                        `${cstyler.red('must be have a ')} ${cstyler.yellow("LengthValues")}`
                                    )
                                } else {
                                    if (parseQuotedListSafely(deepColumn.type.LengthValues).length === 0 && !fncs.isNumber(deepColumn.type.LengthValues)) {
                                        badlength.push(
                                            `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ` +
                                            `${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ` +
                                            `${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)} ` +
                                            `${cstyler.red(' LengthValue must be a ')} ${cstyler.yellow("number or an array")}`
                                        )
                                    }
                                }
                            }
                            const typesWithNumericLengthValue = [
                                "char",        // CHAR(n)
                                "varchar",     // VARCHAR(n)
                                "binary",      // BINARY(n)
                                "varbinary",   // VARBINARY(n)
                                "bit",         // BIT(n)
                                "tinyint",     // TINYINT(n)
                                "smallint",    // SMALLINT(n)
                                "mediumint",   // MEDIUMINT(n)
                                "int",         // INT(n)
                                "integer",     // INTEGER(n)
                                "bigint"       // BIGINT(n)
                            ];
                            if (typesWithNumericLengthValue.includes(deepColumn.type.name.toLowerCase()) && deepColumn.type.hasOwnProperty("LengthValues")) {
                                if (!fncs.isNumber(deepColumn.type.LengthValues)) {
                                    badlength.push(
                                        `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ` +
                                        `${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ` +
                                        `${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)} ` +
                                        `${cstyler.red(' LengthValue must be an ')} ${cstyler.yellow("integer")}`
                                    )
                                    continue;
                                }
                            }
                            // check ENUM and SET
                            if (["ENUM", "SET"].includes(deepColumn.type.name.toUpperCase())) {
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
                            // check VARCHAR or CHAR
                            const columnTypesRequiringLengthValue = [
                                "char",       // CHAR(n) – required
                                "varchar",    // VARCHAR(n) – required
                                "binary",     // BINARY(n) – required
                                "varbinary",  // VARBINARY(n) – required
                                "bit"         // BIT(n) – required
                            ];
                            if (columnTypesRequiringLengthValue.includes(deepColumn.type.name.toLowerCase())) {
                                if (!fncs.isNumber(deepColumn.type.LengthValues)) {
                                    badlength.push(
                                        `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)}${cstyler.red("'s must define a positive integer Length for type")} ${cstyler.yellow(deepColumn.type?.name)}`
                                    );

                                }
                            }
                            // check DECIMAL
                            const typeName = deepColumn.type.name.toUpperCase();
                            const [precision, scale] = parseQuotedListSafely(deepColumn.type.LengthValues) || [];
                            if (fncs.isNumber(precision)) precision = Number(precision);
                            if (fncs.isNumber(scale)) scale = Number(scale);
                            // DECIMAL and NUMERIC — Length values are required
                            if (typeName === "DECIMAL" || typeName === "NUMERIC") {
                                if (!Number.isInteger(precision) || precision <= 0 || precision > 65) {
                                    badlength.push(
                                        `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)}${cstyler.red(" has invalid")} ${cstyler.yellow(typeName)} ${cstyler.red('precision')}`
                                    );
                                }

                                if (!Number.isInteger(scale) || scale < 0 || scale > precision) {
                                    badlength.push(
                                        `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} > ${cstyler.purpal('Table:')} ${cstyler.blue(tableName)} > ${cstyler.purpal('Column:')} ${cstyler.blue(columnName)} ${cstyler.red('has invalid')} ${cstyler.yellow(typeName)} ${cstyler.red('scale')}`
                                    );
                                }
                            }
                            if ((typeName === "FLOAT" || typeName === "DOUBLE") && deepColumn.type.LengthValues) {
                                // Check if LengthValues is not a valid string or array
                                if (parseQuotedListSafely(deepColumn.type.LengthValues).length !== 2) {
                                    badlength.push(
                                        `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)} ${cstyler.red('has invalid')} ${cstyler.yellow(typeName)} ${cstyler.red('length value format')}`
                                    );
                                } else {
                                    // Safe to parse
                                    const [precision, scale] = parseQuotedListSafely(deepColumn.type.LengthValues) || [];
                                    if (fncs.isNumber(precision)) precision = Number(precision);
                                    if (fncs.isNumber(scale)) scale = Number(scale);

                                    if (!Number.isInteger(precision) || precision <= 0 || precision > 255) {
                                        badlength.push(
                                            `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purpal('> Table:')} ${cstyler.blue(tableName)} ${cstyler.purpal('> Column:')} ${cstyler.blue(columnName)}${cstyler.red(" has invalid")} ${cstyler.yellow(typeName)} ${cstyler.red('precision')}`
                                        );
                                    }

                                    if (!Number.isInteger(scale) || scale < 0 || scale > precision) {
                                        badlength.push(
                                            `${cstyler.purpal('Database:')} ${cstyler.blue(databaseName)} > ${cstyler.purpal('Table:')} ${cstyler.blue(tableName)} > ${cstyler.purpal('Column:')} ${cstyler.blue(columnName)} ${cstyler.red('has invalid')} ${cstyler.yellow(typeName)} ${cstyler.red('scale')}`
                                        );
                                    }
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