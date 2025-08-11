const cstyler = require("cstyler");
const fncs = require("./function");


function parseQuotedListSafely(text) {
    if (Array.isArray(text)) return text;
    if (typeof text !== 'string') return [];

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
    TINYINT: { lengthType: "int", required: false, query: "TINYINT(3)", supportsUnsigned: true, dataType: "numeric" },
    SMALLINT: { lengthType: "int", required: false, query: "SMALLINT(5)", supportsUnsigned: true, dataType: "numeric" },
    MEDIUMINT: { lengthType: "int", required: false, query: "MEDIUMINT(8)", supportsUnsigned: true, dataType: "numeric" },
    INT: { lengthType: "int", required: false, query: "INT(11)", supportsUnsigned: true, dataType: "numeric" },
    INTEGER: { lengthType: "int", required: false, query: "INTEGER(11)", supportsUnsigned: true, dataType: "numeric" },
    BIGINT: { lengthType: "int", required: false, query: "BIGINT(20)", supportsUnsigned: true, dataType: "numeric" },
    FLOAT: { lengthType: "two-int", required: false, query: "FLOAT(10,2)", supportsUnsigned: true, dataType: "numeric" },
    DOUBLE: { lengthType: "two-int", required: false, query: "DOUBLE(16,4)", supportsUnsigned: true, dataType: "numeric" },
    REAL: { lengthType: "two-int", required: false, query: "REAL(16,4)", supportsUnsigned: true, dataType: "numeric" },
    DECIMAL: { lengthType: "two-int", required: true, query: "DECIMAL(10,2)", supportsUnsigned: true, dataType: "numeric" },
    NUMERIC: { lengthType: "two-int", required: true, query: "NUMERIC(10,2)", supportsUnsigned: true, dataType: "numeric" },

    // Boolean types
    BOOLEAN: { lengthType: "none", required: false, query: "BOOLEAN", supportsUnsigned: false, dataType: "boolean" },
    BOOL: { lengthType: "none", required: false, query: "BOOL", supportsUnsigned: false, dataType: "boolean" },

    // Date & Time types
    DATE: { lengthType: "none", required: false, query: "DATE", supportsUnsigned: false, dataType: "datetime" },
    TIME: { lengthType: "fsp", required: false, query: "TIME(6)", supportsUnsigned: false, dataType: "datetime" },
    YEAR: { lengthType: "none", required: false, query: "YEAR", supportsUnsigned: false, dataType: "datetime" },
    DATETIME: { lengthType: "fsp", required: false, query: "DATETIME(6)", supportsUnsigned: false, dataType: "datetime" },
    TIMESTAMP: { lengthType: "fsp", required: false, query: "TIMESTAMP(6)", supportsUnsigned: false, dataType: "datetime" },

    // String types
    CHAR: { lengthType: "int", required: true, query: "CHAR(1)", supportsUnsigned: false, dataType: "string" },
    VARCHAR: { lengthType: "int", required: true, query: "VARCHAR(255)", supportsUnsigned: false, dataType: "string" },
    TINYTEXT: { lengthType: "none", required: false, query: "TINYTEXT", supportsUnsigned: false, dataType: "string" },
    TEXT: { lengthType: "none", required: false, query: "TEXT", supportsUnsigned: false, dataType: "string" },
    MEDIUMTEXT: { lengthType: "none", required: false, query: "MEDIUMTEXT", supportsUnsigned: false, dataType: "string" },
    LONGTEXT: { lengthType: "none", required: false, query: "LONGTEXT", supportsUnsigned: false, dataType: "string" },
    ENUM: { lengthType: "list", required: true, query: "ENUM('option1', 'option2')", supportsUnsigned: false, dataType: "string" },
    SET: { lengthType: "list", required: true, query: "SET('a','b','c')", supportsUnsigned: false, dataType: "string" },

    // Binary types
    BINARY: { lengthType: "int", required: true, query: "BINARY(1)", supportsUnsigned: false, dataType: "binary" },
    VARBINARY: { lengthType: "int", required: true, query: "VARBINARY(255)", supportsUnsigned: false, dataType: "binary" },
    TINYBLOB: { lengthType: "none", required: false, query: "TINYBLOB", supportsUnsigned: false, dataType: "binary" },
    BLOB: { lengthType: "none", required: false, query: "BLOB", supportsUnsigned: false, dataType: "binary" },
    MEDIUMBLOB: { lengthType: "none", required: false, query: "MEDIUMBLOB", supportsUnsigned: false, dataType: "binary" },
    LONGBLOB: { lengthType: "none", required: false, query: "LONGBLOB", supportsUnsigned: false, dataType: "binary" },

    // Spatial types
    GEOMETRY: { lengthType: "none", required: false, query: "GEOMETRY", supportsUnsigned: false, dataType: "geometry" },
    POINT: { lengthType: "none", required: false, query: "POINT", supportsUnsigned: false, dataType: "geometry" },
    LINESTRING: { lengthType: "none", required: false, query: "LINESTRING", supportsUnsigned: false, dataType: "geometry" },
    POLYGON: { lengthType: "none", required: false, query: "POLYGON", supportsUnsigned: false, dataType: "geometry" },
    MULTIPOINT: { lengthType: "none", required: false, query: "MULTIPOINT", supportsUnsigned: false, dataType: "geometry" },
    MULTILINESTRING: { lengthType: "none", required: false, query: "MULTILINESTRING", supportsUnsigned: false, dataType: "geometry" },
    MULTIPOLYGON: { lengthType: "none", required: false, query: "MULTIPOLYGON", supportsUnsigned: false, dataType: "geometry" },
    GEOMETRYCOLLECTION: { lengthType: "none", required: false, query: "GEOMETRYCOLLECTION", supportsUnsigned: false, dataType: "geometry" },

    // JSON
    JSON: { lengthType: "none", required: false, query: "JSON", supportsUnsigned: false, dataType: "json" }
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
                            `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                            `${cstyler.purple('of table:')} ${cstyler.blue(tableName)} ` +
                            `${cstyler.red('- table name is not valid.')}`
                        );

                    }
                    if (fncs.isJsonObject(table_json[databaseName][tableName])) {
                        for (const columnName of Object.keys(table_json[databaseName][tableName])) {
                            const deepColumn = table_json[databaseName][tableName][columnName];
                            let columntype = undefined;
                            let length_value = undefined;
                            let autoincrement = undefined;
                            let indexes = undefined;
                            let nulls = undefined;
                            let defaults = undefined;
                            let comment = undefined;
                            let unsigned = undefined;
                            let zerofill = undefined;
                            /**
                             * Lets get variables
                             */
                            /**
                             * type
                             * Type
                             * TYPE
                             * column_type
                             * Column_Type
                             * columntype
                             * ColumnType
                             * COLUMNTYPE
                             */
                            if (deepColumn.hasOwnProperty("type")) {
                                columntype = deepColumn.type;
                            } else if (deepColumn.hasOwnProperty("Type")) {
                                columntype = deepColumn.Type;
                            } else if (deepColumn.hasOwnProperty("TYPE")) {
                                columntype = deepColumn.TYPE;
                            } else if (deepColumn.hasOwnProperty("columntype")) {
                                columntype = deepColumn.columntype;
                            } else if (deepColumn.hasOwnProperty("column_type")) {
                                columntype = deepColumn.column_type;
                            } else if (deepColumn.hasOwnProperty("Column_Type")) {
                                columntype = deepColumn.Column_Type;
                            } else if (deepColumn.hasOwnProperty("ColumnType")) {
                                columntype = deepColumn.ColumnType;
                            } else if (deepColumn.hasOwnProperty("COLUMNTYPE")) {
                                columntype = deepColumn.COLUMNTYPE;
                            }
                            if (typeof columntype !== "string") {
                                columntype = "";
                            }
                            /**
                             * LengthValue
                             * lengthvalue
                             * LENGTHVALUE
                             * length_value
                             * Length_Value
                             */
                            if (deepColumn.hasOwnProperty("LengthValue")) {
                                length_value = deepColumn.LengthValue;
                            } else if (deepColumn.hasOwnProperty("lengthvalue")) {
                                length_value = deepColumn.lengthvalue;
                            } else if (deepColumn.hasOwnProperty("length_value")) {
                                length_value = deepColumn.length_value;
                            } else if (deepColumn.hasOwnProperty("LENGTHVALUE")) {
                                length_value = deepColumn.LENGTHVALUE;
                            } else if (deepColumn.hasOwnProperty("Length_Value")) {
                                length_value = deepColumn.Length_Value;
                            }
                            /**
                             * autoIncrement
                             * autoincrement
                             * auto_increment
                             * AUTO_INCREMENT
                             * AUTOINCREMENT
                             */
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
                            if (autoincrement === true || autoincrement === 1 || autoincrement === "1") {
                                autoincrement = true;
                            } else if (autoincrement === false || autoincrement === 0 || autoincrement === "0") {
                                autoincrement = false;
                            } else if (autoincrement === undefined) {
                                autoincrement = undefined;
                            } else {
                                autoincrement = null;
                            }
                            /**
                             * index
                             * INDEX
                             * Index
                             */
                            if (deepColumn.hasOwnProperty("index")) {
                                indexes = deepColumn.index;
                            } else if (deepColumn.hasOwnProperty("INDEX")) {
                                indexes = deepColumn.INDEX;
                            } else if (deepColumn.hasOwnProperty("Index")) {
                                indexes = deepColumn.Index;
                            }
                            /**
                             * null
                             * NULL
                             * Null
                             */
                            if (deepColumn.hasOwnProperty("null")) {
                                nulls = deepColumn.null;
                            } else if (deepColumn.hasOwnProperty("NULL")) {
                                nulls = deepColumn.NULL;
                            } else if (deepColumn.hasOwnProperty("Null")) {
                                nulls = deepColumn.Null;
                            }
                            if (nulls === null || nulls === true || nulls === 1 || nulls === "1") {
                                nulls = true;
                            } else if (nulls === false || nulls === 0 || nulls === "0") {
                                nulls = false;
                            } else if (nulls === undefined) {
                                nulls = undefined;
                            } else {
                                // lets check bad null
                                badnulls.push(
                                    `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} > ${cstyler.purple('Table:')} ${cstyler.blue(tableName)} > ${cstyler.purple('Column:')} ${cstyler.blue(columnName)} ${cstyler.yellow('NULL')} ${cstyler.red('- must be true or false')}`
                                );
                            }
                            /**
                             * comment
                             * COMMENT
                             * Comment
                             */
                            if (deepColumn.hasOwnProperty("comment")) {
                                comment = deepColumn.comment;
                            } else if (deepColumn.hasOwnProperty("COMMENT")) {
                                comment = deepColumn.COMMENT;
                            } else if (deepColumn.hasOwnProperty("Comment")) {
                                comment = deepColumn.Comment;
                            }
                            /**
                             * unsigned
                             * UNSIGNED
                             * Unsigned
                             * signed
                             * Signed
                             * SIGNED
                             */

                            let signed = undefined;
                            if (deepColumn.hasOwnProperty("unsigned")) {
                                unsigned = deepColumn.unsigned;
                            } else if (deepColumn.hasOwnProperty("UNSIGNED")) {
                                unsigned = deepColumn.UNSIGNED;
                            } else if (deepColumn.hasOwnProperty("Unsigned")) {
                                unsigned = deepColumn.Unsigned;
                            } else if (deepColumn.hasOwnProperty("signed")) {
                                signed = deepColumn.signed;
                            } else if (deepColumn.hasOwnProperty("Signed")) {
                                signed = deepColumn.Signed;
                            } else if (deepColumn.hasOwnProperty("SIGNED")) {
                                signed = deepColumn.SIGNED;
                            }
                            if (unsigned !== undefined) {
                                if (unsigned === true || unsigned === 1 || unsigned === "1") {
                                    unsigned = true;
                                } else if (unsigned === false || unsigned === 0 || unsigned === "0") {
                                    unsigned = false;
                                } else if (unsigned === undefined) {
                                    unsigned = undefined;
                                } else {
                                    unsigned = null;
                                }
                            } else if (signed !== undefined) {
                                if (signed === true || signed === 1 || signed === "1") {
                                    unsigned = false;
                                } else if (signed === false || signed === 0 || signed === "0") {
                                    unsigned = true;
                                } else if (signed === undefined) {
                                    unsigned = undefined;
                                } else {
                                    unsigned = null;
                                }
                            }
                            /**
                             * default
                             * DEFAULT
                             * Default
                             */
                            if (deepColumn.hasOwnProperty("default")) {
                                defaults = deepColumn.default;
                            } else if (deepColumn.hasOwnProperty("DEFAULT")) {
                                defaults = deepColumn.DEFAULT;
                            } else if (deepColumn.hasOwnProperty("Default")) {
                                defaults = deepColumn.Default;
                            }
                            /**
                             * zerofill
                             * ZeroFill
                             * Zerofill
                             * ZEROFILL
                             * zero_fill
                             * Zero_Fill
                             */
                            if (deepColumn.hasOwnProperty("zerofill")) {
                                zerofill = deepColumn.zerofill;
                            } else if (deepColumn.hasOwnProperty("ZeroFill")) {
                                zerofill = deepColumn.ZeroFill;
                            } else if (deepColumn.hasOwnProperty("Zerofill")) {
                                zerofill = deepColumn.Zerofill;
                            } else if (deepColumn.hasOwnProperty("ZEROFILL")) {
                                zerofill = deepColumn.ZEROFILL;
                            } else if (deepColumn.hasOwnProperty("zero_fill")) {
                                zerofill = deepColumn.zero_fill;
                            } else if (deepColumn.hasOwnProperty("Zero_Fill")) {
                                zerofill = deepColumn.Zero_Fill;
                            }
                            if (zerofill === true || zerofill === 1 || zerofill === "1") {
                                zerofill = true;
                            } else if (zerofill === false || zerofill === 0 || zerofill === "0") {
                                zerofill = false;
                            } else if (zerofill === undefined) {
                                zerofill = undefined;
                            } else {
                                zerofill = null;
                            }
                            /**
                             * Getting variable is ended
                             */
                            const typeInfo = mysqlTypeMetadata[columntype.toUpperCase()];
                            // lets check column names
                            if (!fncs.isValidColumnName(columnName.toLowerCase())) {
                                badColumnNames.push(
                                    `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                    `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                    `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                    `${cstyler.red('- column name is not valid.')}`
                                );
                            }
                            // check DEFAULT
                            if (typeof columntype === "string") {
                                if (columntype.toUpperCase() === "JSON" && ![null, undefined].includes(defaults)) {
                                    baddefaults.push(
                                        `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} > ${cstyler.purple('Table:')} ${cstyler.blue(tableName)} > ${cstyler.purple('Column:')} ${cstyler.blue(columnName)} ${cstyler.red('column can not have')} ${cstyler.yellow('DEFAULT')} ${cstyler.red('or must be null')}`
                                    );
                                } else if (typeof defaults !== "string" && typeof defaults !== "number" && defaults !== undefined) {
                                    baddefaults.push(
                                        `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} > ` +
                                        `${cstyler.purple('Table:')} ${cstyler.blue(tableName)} > ` +
                                        `${cstyler.purple('Column:')} ${cstyler.blue(columnName)}'s ` +
                                        `${cstyler.yellow('DEFAULT')} ${cstyler.red('must be string')}`
                                    );
                                }
                            }
                            // check auto increment
                            if (autoincrement === true && typeInfo !== undefined) {
                                if (typeof indexes === "string") {
                                    if (typeInfo.dataType !== "numeric" || !['PRIMARY KEY', 'UNIQUE'].includes(indexes.toUpperCase()) || nulls === true || defaults !== undefined) {
                                        badautoincrement.push(
                                            `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                            `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                            `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                            `${cstyler.red('column must be')} ${cstyler.yellow('integer')} ${cstyler.red('type, should be')} ${cstyler.yellow('primary key')} ${cstyler.red('or')} ${cstyler.yellow('unique indexed')}, ` +
                                            `${cstyler.red('should be')} ${cstyler.yellow('NOT NULL')}, ` +
                                            `${cstyler.red('can not have a')} ${cstyler.yellow('DEFAULT')} ${cstyler.red('value.')}`
                                        );
                                    }
                                } else {
                                    badautoincrement.push(
                                        `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                        `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                        `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                        `${cstyler.red('a valid')} ${cstyler.yellow('index')} ${cstyler.red('value is required for autoincrement.')}`
                                    );
                                }
                                // check multi autoincrement
                                let autoincrementcolumnlist = [];
                                for (const column of Object.keys(table_json[databaseName][tableName])) {
                                    const doubleDeepColumn = table_json[databaseName][tableName][column];
                                    let allautoincrement = undefined;
                                    if (doubleDeepColumn.hasOwnProperty("autoIncrement")) {
                                        allautoincrement = doubleDeepColumn.autoIncrement;
                                    } else if (doubleDeepColumn.hasOwnProperty("autoincrement")) {
                                        allautoincrement = doubleDeepColumn.autoincrement;
                                    } else if (doubleDeepColumn.hasOwnProperty("auto_increment")) {
                                        allautoincrement = doubleDeepColumn.auto_increment;
                                    } else if (doubleDeepColumn.hasOwnProperty("AUTO_INCREMENT")) {
                                        allautoincrement = doubleDeepColumn.AUTO_INCREMENT;
                                    } else if (doubleDeepColumn.hasOwnProperty("AUTOINCREMENT")) {
                                        allautoincrement = doubleDeepColumn.AUTOINCREMENT;
                                    }
                                    if (allautoincrement === true || allautoincrement === 1 || allautoincrement === "1") {
                                        autoincrementcolumnlist.push(column);
                                    }
                                }
                                if (autoincrementcolumnlist.length > 1) {
                                    badautoincrement.push(
                                        `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                        `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                        `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                        `${cstyler.red('- This table has another')} ${cstyler.yellow('auto_increment')} ${cstyler.red('column. A table can have only one')} ${cstyler.yellow('auto_increment')} ${cstyler.red('column.')}`
                                    );
                                }
                            } else if (autoincrement === null) {
                                badautoincrement.push(
                                    `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                    `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                    `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                    `${cstyler.red('- must have a valid autoincrement value')}`
                                );
                            }
                            // check unsigned
                            if (unsigned === true) {
                                // ❌ Invalid use of unsigned on a non-numeric type
                                if (typeInfo !== undefined) {
                                    if (!typeInfo.dataType !== "numeric") {
                                        badunsigned.push(
                                            cstyler`{purple Database:} {blue ${databaseName}} ` +
                                            cstyler`{purple > Table:} {blue ${tableName}} ` +
                                            cstyler`{purple > Column:} {blue ${columnName}} ` +
                                            cstyler.red(" - has `unsigned` but type is not numeric")
                                        );
                                    }
                                } else {
                                    badunsigned.push(
                                        cstyler`{purple Database:} {blue ${databaseName}} ` +
                                        cstyler`{purple > Table:} {blue ${tableName}} ` +
                                        cstyler`{purple > Column:} {blue ${columnName}} ` +
                                        cstyler.red(" - can not validate unsigned with invalid column type information")
                                    );
                                }
                            } else if (unsigned === null) {
                                badunsigned.push(
                                    cstyler`{purple Database:} {blue ${databaseName}} ` +
                                    cstyler`{purple > Table:} {blue ${tableName}} ` +
                                    cstyler`{purple > Column:} {blue ${columnName}} ` +
                                    cstyler.red(" - has invalid `unsigned` value")
                                );
                            }
                            // check comment
                            if (comment !== undefined) {
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
                                        `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                        `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                        `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                        `${cstyler.red('- Invalid comment:')} ${invalids.join(cstyler.red(' | '))}`
                                    );
                                }
                            }
                            // check zerofill
                            if (typeInfo !== undefined) {
                                if (zerofill === true && !typeInfo.dataType === "numeric") {
                                    badzerofill.push(
                                        cstyler`{purple Database:} {blue ${databaseName}} ` +
                                        cstyler`{purple > Table:} {blue ${tableName}} ` +
                                        cstyler`{purple > Column:} {blue ${columnName}} ` +
                                        cstyler.red(" - has `zerofill` but column type is not numeric")
                                    );
                                } else if (zerofill === null) {
                                    badzerofill.push(
                                        cstyler`{purple Database:} {blue ${databaseName}} ` +
                                        cstyler`{purple > Table:} {blue ${tableName}} ` +
                                        cstyler`{purple > Column:} {blue ${columnName}} ` +
                                        cstyler.red(" - has invalid `zerofill` value")
                                    );
                                }
                            }

                            // check index
                            if (indexes !== undefined) {
                                if (columntype === "JSON") {
                                    badindex.push(
                                        `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                        `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                        `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                        `${cstyler.red('- is a JSON column which can not have an ')}${cstyler.yellow('index')} ${cstyler.red('property')}`
                                    );
                                }
                                const validIndexValues = [
                                    "INDEX",
                                    "UNIQUE",
                                    "PRIMARY",
                                    "PRIMARY KEY",
                                    "FULLTEXT",
                                    "SPATIAL"
                                ];
                                if (!validIndexValues.includes(indexes.toUpperCase())) {
                                    badindex.push(
                                        `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                        `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                        `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                        `${cstyler.red('- has unsupported index value.')} ` +
                                        `${cstyler.red('Value must be')} ${cstyler.yellow(validIndexValues.join(', '))}`
                                    );

                                }
                            }
                            // lets check bad foreign_key
                            if (deepColumn.hasOwnProperty("foreign_key")) {
                                const validFKSetOption = new Set([null, true, "DEFAULT", "CASCADE", "SET NULL", "SET DEFAULT", "RESTRICT", "NO ACTION"]);
                                /**
                                 * CASCADE:         Child value is updated to match the new parent value.
                                 * SET NULL:	    Child value becomes NULL. Column must allow NULL.
                                 * SET DEFAULT:	    Child value is set to the column’s default value.
                                 * RESTRICT:	    Prevents update if any matching child exists.
                                 * NO ACTION:	    Like RESTRICT (timing differences in some DB engines).
                                 */
                                let deleteOption = undefined;
                                let updateOption = undefined;
                                if (deepColumn.foreign_key.hasOwnProperty("delete")) {
                                    deleteOption = deepColumn.foreign_key.delete;
                                } else if (deepColumn.foreign_key.hasOwnProperty("Delete")) {
                                    deleteOption = deepColumn.foreign_key.Delete;
                                } else if (deepColumn.foreign_key.hasOwnProperty("DELETE")) {
                                    deleteOption = deepColumn.foreign_key.DELETE;
                                } else if (deepColumn.foreign_key.hasOwnProperty("ondelete")) {
                                    deleteOption = deepColumn.foreign_key.ondelete;
                                } else if (deepColumn.foreign_key.hasOwnProperty("OnDelete")) {
                                    deleteOption = deepColumn.foreign_key.OnDelete;
                                } else if (deepColumn.foreign_key.hasOwnProperty("ONDELETE")) {
                                    deleteOption = deepColumn.foreign_key.ONDELETE;
                                } else if (deepColumn.foreign_key.hasOwnProperty("on_delete")) {
                                    deleteOption = deepColumn.foreign_key.on_delete;
                                } else if (deepColumn.foreign_key.hasOwnProperty("ON_DELETE")) {
                                    deleteOption = deepColumn.foreign_key.ON_DELETE;
                                } else if (deepColumn.foreign_key.hasOwnProperty("On_Delete")) {
                                    deleteOption = deepColumn.foreign_key.On_Delete;
                                }
                                if (typeof deleteOption === "string") {
                                    deleteOption = deleteOption.toUpperCase();
                                }
                                if (deepColumn.foreign_key.hasOwnProperty("update")) {
                                    updateOption = deepColumn.foreign_key.update;
                                } else if (deepColumn.foreign_key.hasOwnProperty("Update")) {
                                    updateOption = deepColumn.foreign_key.Update;
                                } else if (deepColumn.foreign_key.hasOwnProperty("UPDATE")) {
                                    updateOption = deepColumn.foreign_key.UPDATE;
                                } else if (deepColumn.foreign_key.hasOwnProperty("onupdate")) {
                                    updateOption = deepColumn.foreign_key.onupdate;
                                } else if (deepColumn.foreign_key.hasOwnProperty("OnUpdate")) {
                                    updateOption = deepColumn.foreign_key.OnUpdate;
                                } else if (deepColumn.foreign_key.hasOwnProperty("ONUPDATE")) {
                                    updateOption = deepColumn.foreign_key.ONUPDATE;
                                } else if (deepColumn.foreign_key.hasOwnProperty("on_update")) {
                                    updateOption = deepColumn.foreign_key.on_update;
                                } else if (deepColumn.foreign_key.hasOwnProperty("ON_UPDATE")) {
                                    updateOption = deepColumn.foreign_key.ON_UPDATE;
                                } else if (deepColumn.foreign_key.hasOwnProperty("On_Update")) {
                                    updateOption = deepColumn.foreign_key.On_Update;
                                }
                                if (typeof updateOption === "string") {
                                    updateOption = updateOption.toUpperCase();
                                }
                                if (!validFKSetOption.has(deleteOption)) {
                                    badforeighkey.push(
                                        `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} > ` +
                                        `${cstyler.purple('Table:')} ${cstyler.blue(tableName)} > ` +
                                        `${cstyler.purple('Column:')} ${cstyler.blue(columnName)} ` +
                                        `${cstyler.blue('foreign_key > delete')} ` +
                                        `${cstyler.red('must be one of:')} ` +
                                        `${cstyler.yellow('null, true - work as CASCADE, "CASCADE", "SET NULL", "DEFAULT", "SET DEFAULT", "RESTRICT", "NO ACTION"')}, ` +
                                        `${cstyler.red(". You can use lowercase too.")}`
                                    );

                                } else {
                                    // If DELETE is null (SET NULL), column must allow NULLs
                                    if ([null, "SET NULL", "NULL"].includes(deleteOption) && nulls !== true) {
                                        badforeighkey.push(
                                            `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} > ` +
                                            `${cstyler.purple('Table:')} ${cstyler.blue(tableName)} > ` +
                                            `${cstyler.purple('Column:')} ${cstyler.blue(columnName)} ` +
                                            `${cstyler.blue('foreign_key >')} ` +
                                            `${cstyler.yellow('delete')} === ${cstyler.yellow('null')} - then column ${cstyler.red('NULL must be true')}`
                                        );
                                    }

                                    // If DELETE is 'set default', column must have a DEFAULT value
                                    else if (["DEFAULT", "SET DEFAULT"].includes(deleteOption) && defaults === undefined) {
                                        badforeighkey.push(
                                            `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                            `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                            `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                            `${cstyler.blue('foreign_key >')} ${cstyler.red("delete === 'set default'")} - then column ${cstyler.red('DEFAULT must be defined')}`
                                        );

                                    }
                                }
                                // check on update
                                // null, true, "CASCADE", "SET NULL", "DEFAULT", "SET DEFAULT", "RESTRICT", "NO ACTION"
                                if (updateOption !== undefined) {
                                    if (!validFKSetOption.has(updateOption)) {
                                        badforeighkey.push(
                                            `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} > ` +
                                            `${cstyler.purple('Table:')} ${cstyler.blue(tableName)} > ` +
                                            `${cstyler.purple('Column:')} ${cstyler.blue(columnName)} ` +
                                            `${cstyler.blue('foreign_key > ONUPDATE')} ` +
                                            `${cstyler.red('must be one of:')} ` +
                                            `${cstyler.yellow('null, true - work as CASCADE, "CASCADE", "SET NULL", "DEFAULT", "SET DEFAULT", "RESTRICT", "NO ACTION"')}, ` +
                                            `${cstyler.red(". You can use lowercase too.")}`
                                        );

                                    } else {
                                        // If DELETE is null (SET NULL), column must allow NULLs
                                        if ([null, "SET NULL", "NULL"].includes(updateOption) && nulls !== true) {
                                            badforeighkey.push(
                                                `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} > ` +
                                                `${cstyler.purple('Table:')} ${cstyler.blue(tableName)} > ` +
                                                `${cstyler.purple('Column:')} ${cstyler.blue(columnName)} ` +
                                                `${cstyler.blue('foreign_key >')} ` +
                                                `${cstyler.yellow('update set to')} ${cstyler.yellow('null')} - then column ${cstyler.red('must be null true')}`
                                            );
                                        }

                                        // If DELETE is 'set default', column must have a DEFAULT value
                                        else if (["DEFAULT", "SET DEFAULT"].includes(updateOption) && defaults === undefined) {
                                            badforeighkey.push(
                                                `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                                `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                                `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                                `${cstyler.blue('foreign_key >')} ${cstyler.red("update === 'set default'")} - then column ${cstyler.red('DEFAULT must be defined')}`
                                            );

                                        }
                                    }
                                }
                                // check reference table and column
                                if (deepColumn.foreign_key.hasOwnProperty("table") && deepColumn.foreign_key.hasOwnProperty("column")) {
                                    if (table_json[databaseName].hasOwnProperty(deepColumn.foreign_key.table)) {
                                        if (!table_json[databaseName][deepColumn.foreign_key.table].hasOwnProperty(deepColumn.foreign_key.column)) {
                                            badforeighkey.push(
                                                `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                                `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                                `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                                `${cstyler.purple('foreign_key > references > table > column -')} ${cstyler.yellow.underline(deepColumn.foreign_key.column)} ${cstyler.red('do not exist')}`
                                            );
                                        }
                                    } else {
                                        badforeighkey.push(`${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ${cstyler.purple('> Column:')} ${cstyler.blue(`${columnName} > foreign_key > references >`)} ${cstyler.purple('Table:')} ${cstyler.underline.yellow(deepColumn.foreign_key.table)} - ${cstyler.red('do not exist')}`)
                                    }
                                } else {
                                    badforeighkey.push(
                                        `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                        `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                        `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                        `${cstyler.blue('foreign_key > references -')} ${cstyler.red('must have a table and column property')}`
                                    );
                                }

                            }
                            // Let's check properties
                            // check type
                            const allMySQLColumnTypes = Object.keys(mysqlTypeMetadata);
                            if (typeof columntype !== "string") {
                                badtype.push(
                                    `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                    `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                    `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                    `${cstyler.red('- must have type.')}`
                                );
                                continue;
                            } else {
                                if (!allMySQLColumnTypes.includes(columntype.toUpperCase())) {
                                    badtype.push(
                                        `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                        `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                        `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                        `${cstyler.red('> type - must have valid column type.')}`
                                    );
                                    continue;
                                }
                            }
                            // check LengthValue
                            if (Object.keys(mysqlTypeMetadata).includes(columntype.toUpperCase())) {

                                // Check if length is required but missing
                                if (typeInfo.required && length_value === undefined) {
                                    badlength.push(
                                        `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ${cstyler.red('requires length but none provided.')}`
                                    );
                                } else if (length_value !== undefined) {
                                    const lenVals = length_value;

                                    if (typeInfo.lengthType === "int") {
                                        if (!Number.isInteger(lenVals)) {
                                            badlength.push(
                                                `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ${cstyler.red('should have a valid integer length')}`
                                            );
                                        }
                                    } else if (typeInfo.lengthType === "two-int") {
                                        const parsed = parseQuotedListSafely(lenVals);
                                        if (parsed.length !== 2) {
                                            badlength.push(
                                                `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ${cstyler.red('should have two integer values [precision, scale]')}`
                                            );
                                        } else {
                                            const [precision, scale] = parsed;
                                            if (
                                                !Number.isInteger(precision) || precision <= 0 || precision > 65 ||
                                                !Number.isInteger(scale) || scale < 0 || scale > precision
                                            ) {
                                                badlength.push(
                                                    `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ${cstyler.red('has invalid precision or scale')}`
                                                );
                                            }
                                        }
                                    } else if (typeInfo.lengthType === "list") {
                                        const parsed = parseQuotedListSafely(lenVals);
                                        if (parsed.length === 0) {
                                            badlength.push(
                                                `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ${cstyler.red('should have a valid list of options')}`
                                            );
                                        }
                                    }
                                }
                            } else {
                                badtype.push(
                                    `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                    `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                    `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
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
            console.log(cstyler.green("<<<All JSON checking is done | Clear to continue>>>"));
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
            console.error(`UNSIGNED values that are not correct: \n${badunsigned.join("\n")}`);
        }
        if (badnulls.length > 0) {
            console.error(`NULL values that are not correct: \n${badnulls.join("\n")}`);
        }
        if (baddefaults.length > 0) {
            console.error(`DEFAULT values that are not correct: \n${baddefaults.join("\n")}`);
        }
        if (badcomment.length > 0) {
            console.error(`Comment values that are not correct: \n${badcomment.join("\n")}`);
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