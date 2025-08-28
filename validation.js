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

    // Bit type // you can specify how many bits (1–64)
    BIT: { lengthType: "int", required: true, query: "BIT(1)", supportsUnsigned: false, dataType: "bit" },

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
    ENUM: { lengthType: "list", required: true, query: "ENUM('option1', 'option2')", supportsUnsigned: false, dataType: "text" },
    SET: { lengthType: "list", required: true, query: "SET('a','b','c')", supportsUnsigned: false, dataType: "text" },

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

const validIndexValues = [
    "INDEX",
    "UNIQUE",
    "PRIMARY",
    "PRIMARY KEY",
    "FULLTEXT",
    "SPATIAL"
];
const truers = [true, 1, "1", "true", "True", "TRUE"];
const falsers = [false, 0, "0", "false", "False", "FALSE"];
function isValidDefault(columnType, defaultValue, length_value) {
    // NULL is always valid if column allows NULL
    if (defaultValue === null) return null;

    // Normalize type (just in case user passes lowercase)
    const type = columnType.toUpperCase();

    // Numeric types
    if (["INT", "BIGINT", "SMALLINT", "TINYINT", "DECIMAL", "NUMERIC", "FLOAT", "DOUBLE"].includes(type)) {
        if (typeof defaultValue === "number") return true;
        if (typeof defaultValue === "string" && !isNaN(defaultValue)) return true;
        return false;
    }

    // ENUM and SET
    if (["ENUM", "SET"].includes(type)) {
        if (length_value !== undefined) {
            const options = parseQuotedListSafely(length_value);
            if (options.length === 0) {
                return false;
            } else {
                if (options.includes(defaultValue)) {
                    return true;
                } else {
                    return false;
                }
            }
        } else {
            return false;
        }
    }
    // Character types
    if (["CHAR", "VARCHAR", "TEXT"].some(t => type.startsWith(t))) {
        if (typeof defaultValue === "string") return true;
        return false;
    }

    // Binary types
    if (["BINARY", "VARBINARY", "BLOB"].some(t => type.startsWith(t))) {
        if (typeof defaultValue === "string") return true; // literal string
        if (/^x'[0-9A-Fa-f]+'$/.test(defaultValue)) return true; // hex literal
        return false;
    }

    // Date/time types
    if (["DATE", "DATETIME", "TIMESTAMP", "TIME", "YEAR"].includes(type)) {
        if (typeof defaultValue === "string") {
            // Allow CURRENT_TIMESTAMP / NOW() only for DATETIME & TIMESTAMP
            if (
                ["DATETIME", "TIMESTAMP"].includes(type) &&
                /^(CURRENT_TIMESTAMP|NOW)(\(\d*\))?$/.test(defaultValue)
            ) {
                return true;
            }

            // Validate literal formats
            switch (type) {
                case "DATE": // YYYY-MM-DD
                    return /^\d{4}-\d{2}-\d{2}$/.test(defaultValue);

                case "DATETIME": // YYYY-MM-DD HH:MM:SS
                case "TIMESTAMP":
                    return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(defaultValue);

                case "TIME": // HH:MM:SS
                    return /^\d{2}:\d{2}:\d{2}$/.test(defaultValue);

                case "YEAR": // YYYY (4-digit only)
                    return /^\d{4}$/.test(defaultValue);
            }
        }
        return false;
    }


    // Boolean (alias of TINYINT(1))
    if (type === "BOOLEAN") {
        return defaultValue === 0 || defaultValue === 1 || defaultValue === "0" || defaultValue === "1" || defaultValue === true || defaultValue === false || defaultValue === "true" || defaultValue === "false" || defaultValue === "True" || defaultValue === "False" || defaultValue === "TRUE" || defaultValue === "FALSE";
    }

    // JSON cannot have default except NULL (in MySQL < 8.0.13)
    if (type === "JSON") {
        return defaultValue === null;
    }

    // If unknown type → reject
    return false;
}


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
        let contentObj = {};
        // lets loop databases
        for (const databaseName of Object.keys(table_json)) {
            if (fncs.isJsonObject(table_json[databaseName])) {
                if (!contentObj[databaseName]) contentObj[databaseName] = {}
                // lets loop tables
                for (const tableName of Object.keys(table_json[databaseName])) {
                    if (!contentObj[databaseName][tableName]) contentObj[databaseName][tableName] = {}
                    if (!fncs.perseTableNameWithLoop(tableName.toLowerCase())) {
                        badTableNames.push(
                            `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                            `${cstyler.purple('of table:')} ${cstyler.blue(tableName)} ` +
                            `${cstyler.red('- table name is not valid.')}`
                        );
                    }
                    if (fncs.isJsonObject(table_json[databaseName][tableName])) {
                        // lets loop columns
                        for (const columnName of Object.keys(table_json[databaseName][tableName])) {
                            if (!contentObj[databaseName][tableName][columnName]) contentObj[databaseName][tableName][columnName] = {}
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
                            if (typeof columntype !== "string" && columntype !== undefined) {
                                columntype = null;
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
                            if (truers.includes(autoincrement)) {
                                autoincrement = true;
                            } else if (falsers.includes(autoincrement)) {
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
                            if (truers.includes(nulls)) {
                                nulls = true;
                            } else if (falsers.includes(nulls)) {
                                nulls = false;
                            } else if (nulls === undefined) {
                                nulls = true;
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
                                if (truers.includes(unsigned)) {
                                    unsigned = true;
                                } else if (falsers.includes(unsigned)) {
                                    unsigned = false;
                                } else if (unsigned === undefined) {
                                    unsigned = undefined;
                                } else {
                                    unsigned = null;
                                }
                            } else if (signed !== undefined) {
                                if (truers.includes(signed)) {
                                    unsigned = false;
                                } else if (falsers.includes(signed)) {
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
                            if (truers.includes(zerofill)) {
                                zerofill = true;
                            } else if (falsers.includes(zerofill)) {
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
                            // check type
                            const allMySQLColumnTypes = Object.keys(mysqlTypeMetadata);
                            if (typeof columntype !== "string") {
                                badtype.push(
                                    `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                    `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                    `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                    `${cstyler.red('- must have type.')}`
                                );
                                columntype = null;
                            } else {
                                if (!allMySQLColumnTypes.includes(columntype.toUpperCase())) {
                                    badtype.push(
                                        `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                        `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                        `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                        `${cstyler.red('> type - must have valid column type.')}`
                                    );
                                    columntype = null;
                                }
                            }
                            // check LengthValue
                            if (typeInfo !== undefined) {

                                // Check if length is required but missing
                                if (typeInfo.required && length_value === undefined) {
                                    badlength.push(
                                        `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ${cstyler.red('requires length but none provided.')}`
                                    );
                                } else if (length_value !== undefined) {
                                    let lenVals = length_value;
                                    if (fncs.isNumber(lenVals)) {
                                        lenVals = Number(lenVals);
                                    }
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
                                        `${cstyler.red('a valid')} ${cstyler.yellow('index')} ${cstyler.red('value must be ')}` +
                                        `${cstyler.yellow('PRIMARY KEY, UNIQUE')} ${cstyler.red('for autoincrement.')}`
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
                                    if (truers.includes(allautoincrement)) {
                                        autoincrementcolumnlist.push(column);
                                    }
                                }
                                if (autoincrementcolumnlist.length > 1) {
                                    badautoincrement.push(
                                        `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                        `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                        `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                        `${cstyler.red('- This table has more than one')} ${cstyler.yellow('auto increment')} ${cstyler.red('column. A table can have only one')} ${cstyler.yellow('auto increment')} ${cstyler.red('column.')}`
                                    );
                                }
                            } else if (autoincrement === null) {
                                badautoincrement.push(
                                    `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                    `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                    `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                    `${cstyler.red('- must true or false as valid autoincrement value')}`
                                );
                            }
                            // check unsigned
                            if (typeof unsigned === "boolean") {
                                // ❌ Invalid use of unsigned on a non-numeric type
                                if (typeInfo !== undefined) {
                                    if (typeInfo.supportsUnsigned === false) {
                                        badunsigned.push(
                                            cstyler`{purple Database:} {blue ${databaseName}} ` +
                                            cstyler`{purple > Table:} {blue ${tableName}} ` +
                                            cstyler`{purple > Column:} {blue ${columnName}} ` +
                                            `${cstyler.red(" - has `unsigned` but type ")} ${cstyler.yellow(columntype)} ${cstyler.red(" do not support signed or unsigned modifiers.")}`
                                        );
                                    }
                                } else {
                                    badunsigned.push(
                                        cstyler`{purple Database:} {blue ${databaseName}} ` +
                                        cstyler`{purple > Table:} {blue ${tableName}} ` +
                                        cstyler`{purple > Column:} {blue ${columnName}} ` +
                                        cstyler.red(" - can not validate signed or unsigned modifier with invalid column type")
                                    );
                                }
                            } else if (unsigned === null) {
                                badunsigned.push(
                                    cstyler`{purple Database:} {blue ${databaseName}} ` +
                                    cstyler`{purple > Table:} {blue ${tableName}} ` +
                                    cstyler`{purple > Column:} {blue ${columnName}} ` +
                                    cstyler.red(" - has invalid signed or unsigned value")
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
                                        cstyler.red(" - for `zerofill` column type has to be numeric")
                                    );
                                } else if (zerofill === null) {
                                    badzerofill.push(
                                        cstyler`{purple Database:} {blue ${databaseName}} ` +
                                        cstyler`{purple > Table:} {blue ${tableName}} ` +
                                        cstyler`{purple > Column:} {blue ${columnName}} ` +
                                        cstyler.red(" - has invalid `zerofill` value and must be boolean and simillar")
                                    );
                                }
                            }
                            // check index
                            if (indexes !== undefined) {
                                if (typeof indexes === "string") {
                                    indexes = indexes.toUpperCase();
                                    if (columntype === "JSON") {
                                        badindex.push(
                                            `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                            `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                            `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                            `${cstyler.red('- is a JSON column which can not have an ')}${cstyler.yellow('index')} ${cstyler.red('property')}`
                                        );
                                    } else if (typeInfo.dataType !== "geometry" && indexes === "SPATIAL" || typeInfo.dataType === "geometry" && indexes !== "SPATIAL") {
                                        badindex.push(
                                            `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                            `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                            `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                            `${cstyler.red(' - ')}${cstyler.yellow('SPATIAL - index')} ${cstyler.red('can only be used with ')}${cstyler.yellow('GEOMETRY')} ${cstyler.red('data type and ')}${cstyler.yellow('GEOMETRY')} ${cstyler.red('can only be used with ')}${cstyler.yellow('SPATIAL - index')}`
                                        );
                                    } else if (indexes === "FULLTEXT" && typeInfo.dataType !== "string") {
                                        badindex.push(
                                            `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                            `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                            `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                            `${cstyler.red(' - ')}${cstyler.yellow('FULLTEXT - index')} ${cstyler.red('can only be used with ')}${cstyler.yellow('CHAR, VARCHAR, TINYTEXT, TEXT, MEDIUMTEXT, LONGTEXT')} ${cstyler.red('column types which are string.')}`
                                        );
                                    } else if (!validIndexValues.includes(indexes.toUpperCase())) {
                                        badindex.push(
                                            `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                            `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                            `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                            `${cstyler.red('- has unsupported index value.')} ` +
                                            `${cstyler.red('Value must be')} ${cstyler.yellow(validIndexValues.join(', '))}`
                                        );
                                    }
                                } else {
                                    badindex.push(
                                        `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                        `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                        `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                        `${cstyler.red('- ')}${cstyler.yellow('index')} ${cstyler.red('value must be text or string.')}`
                                    );
                                }
                            }
                            // lets check default fsp list none
                            if ((fncs.isNumber(defaults) || typeof defaults === "string") && columntype) {
                                const isvaliddefaultvalue = isValidDefault(columntype, defaults, length_value);
                                if (isvaliddefaultvalue === null || isvaliddefaultvalue === false) {
                                    baddefaults.push(
                                        `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} > ${cstyler.purple('Table:')} ${cstyler.blue(tableName)} > ${cstyler.purple('Column:')} ${cstyler.blue(columnName)} ${cstyler.red('valid')} ${cstyler.yellow('DEFAULT')} ${cstyler.red('value required')}`
                                    );
                                }
                            } else if (defaults === null) {
                                baddefaults.push(
                                    `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} > ${cstyler.purple('Table:')} ${cstyler.blue(tableName)} > ${cstyler.purple('Column:')} ${cstyler.blue(columnName)} ${cstyler.red('-')} ${cstyler.yellow('DEFAULT')} ${cstyler.red('value can not be null')}`
                                );
                            } else {
                                defaults = undefined;
                            }
                            // lets check bad foreign_key delete and update options
                            let deleteOption = undefined;
                            let updateOption = undefined;
                            let fktable = undefined;
                            let fkcolumn = undefined;
                            let foreign_key = {};
                            const fk_variations = ["fk", "Fk", "FK", "foreign_key", "foreign_Key", "Foreign_Key", "FOREIGN_KEY", "foreignkey", "foreignKey", "ForeignKey", "FOREIGNKEY"];
                            for (const item of fk_variations) {
                                if (deepColumn.hasOwnProperty(item)) {
                                    foreign_key = deepColumn[item];
                                    break;
                                }
                            }
                            if (fncs.isJsonObject(foreign_key) && Object.keys(foreign_key).length > 0) {
                                const validFKSetOption = new Set([null, "NULL", "SET NULL", true, "DL", "DEL", "DELETE", "CASCADE", "DEFAULT", "SET DEFAULT", "RESTRICT", "NO ACTION"]);
                                /**
                                 * CASCADE:         Child value is updated to match the new parent value.
                                 * SET NULL:	    Child value becomes NULL. Column must allow NULL.
                                 * SET DEFAULT:	    Child value is set to the column’s default value.
                                 * RESTRICT:	    Prevents update if any matching child exists.
                                 * NO ACTION:	    Like RESTRICT (timing differences in some DB engines).
                                 */
                                const deleteVariations = ["delete", "Delete", "DELETE", "ondelete", "OnDelete", "onDelete", "ONDELETE", "on_delete", "ON_DELETE", "On_Delete", "on_Delete"]
                                for (const item of deleteVariations) {
                                    if (foreign_key.hasOwnProperty(item)) {
                                        deleteOption = foreign_key[item];
                                        if (typeof deleteOption === "string") {
                                            deleteOption = deleteOption.toUpperCase();
                                        }
                                        break;
                                    }
                                }
                                // Lets get update options
                                const onupdatevariations = ["update", "Update", "UPDATE", "onupdate", "OnUpdate", "onUpdate", "ONUPDATE", "on_update", "ON_UPDATE", "On_Update", "on_Update"];
                                for (const item of onupdatevariations) {
                                    if (foreign_key.hasOwnProperty(item)) {
                                        updateOption = foreign_key[item];
                                        if (typeof updateOption === "string") {
                                            updateOption = updateOption.toUpperCase();
                                        }
                                        break;
                                    }
                                }
                                if (!validFKSetOption.has(deleteOption)) {
                                    badforeighkey.push(
                                        `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} > ` +
                                        `${cstyler.purple('Table:')} ${cstyler.blue(tableName)} > ` +
                                        `${cstyler.purple('Column:')} ${cstyler.blue(columnName)} ` +
                                        `${cstyler.blue('foreign_key > delete')} ` +
                                        `${cstyler.red('must be one of:')} ` +
                                        `${cstyler.yellow('[true, "DELETE"] > work as > CASCADE, "CASCADE", [null, "NULL"] > work as > "SET NULL", "DEFAULT" > work as > "SET DEFAULT", "RESTRICT", "NO ACTION"')}, ` +
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
                                            `${cstyler.yellow('[true, "DELETE"] > work as > CASCADE, "CASCADE", [null, "NULL"] > work as > "SET NULL", "DEFAULT" > work as > "SET DEFAULT", "RESTRICT", "NO ACTION"')}, ` +
                                            `${cstyler.red(". You can use lowercase too.")}`
                                        );

                                    } else {
                                        // If ONUPDATE is null (SET NULL), column must allow NULLs
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
                                // lets add foreign key table to variable
                                const tableKeyVariation = ["table", "Table", "TABLE", "fktable", "fkTable", "fkTABLE", "Fktable", "FkTable", "FkTABLE", "FKTable", "FKTABLE", "fk_table", "fk_Table", "fk_TABLE", "Fk_table", "Fk_Table", "Fk_TABLE", "FK_Table", "FK_TABLE", "foreignkeytable", "foreignKeyTable", "ForeignKeyTable", "FOREIGNKEYTABLE", "foreign_key_table", "foreign_Key_Table", "FOREIGN_KEY_TABLE", "Foreign_Key_Table"]
                                for (const item of tableKeyVariation) {
                                    if (foreign_key.hasOwnProperty(item)) {
                                        fktable = foreign_key[item];
                                        break;
                                    }
                                }
                                // lets add foreign key column to variable
                                const columnKeyVariation = ["column", "Column", "COLUMN", "fkcolumn", "fkColumn", "fkCOLUMN", "Fkcolumn", "FkColumn", "FkCOLUMN", "FKColumn", "FKCOLUMN", "fk_column", "fk_Column", "fk_COLUMN", "Fk_column", "Fk_Column", "Fk_COLUMN", "FK_Column", "FK_COLUMN", "foreignkeycolumn", "foreignKeyColumn", "ForeignKeyColumn", "FOREIGNKEYCOLUMN", "foreign_key_column", "foreign_Key_Column", "FOREIGN_KEY_COLUMN", "Foreign_Key_Column"]
                                for (const item of (columnKeyVariation)) {
                                    if (foreign_key.hasOwnProperty(item)) {
                                        fkcolumn = foreign_key[item];
                                        break;
                                    }
                                }
                                // lets work on that
                                if (fktable && fkcolumn) {
                                    if (table_json[databaseName].hasOwnProperty(fktable)) {
                                        if (!table_json[databaseName][fktable].hasOwnProperty(fkcolumn)) {
                                            badforeighkey.push(
                                                `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                                `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                                `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                                `${cstyler.purple('foreign_key > references > table > column -')} ${cstyler.yellow.underline(fkcolumn)} ${cstyler.red('do not exist')}`
                                            );
                                        }
                                    } else {
                                        badforeighkey.push(`${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ${cstyler.purple('> Column:')} ${cstyler.blue(`${columnName} > foreign_key > references >`)} ${cstyler.purple('Table:')} ${cstyler.underline.yellow(fktable)} - ${cstyler.red('do not exist')}`)
                                    }
                                } else {
                                    badforeighkey.push(
                                        `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                        `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                        `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                        `${cstyler.blue('foreign_key > references -')} ${cstyler.red('must have a table and column property referancing to referance table column')}`
                                    );
                                }

                            }
                            // Lets add values to a passing object to use it
                            if (typeof columntype === "string") {
                                contentObj[databaseName][tableName][columnName].columntype = columntype.toUpperCase();
                            }
                            if (length_value) {
                                if (["ENUM", "SET"].includes(fncs.stringifyAny(columntype).toUpperCase())) {
                                    length_value = parseQuotedListSafely(length_value);
                                }
                                contentObj[databaseName][tableName][columnName].length_value = length_value;
                            }
                            if (autoincrement === true) {
                                contentObj[databaseName][tableName][columnName].autoincrement = true;
                            }
                            if (typeof indexes === "string" && validIndexValues.includes(fncs.stringifyAny(indexes).toUpperCase())) {
                                indexes = fncs.stringifyAny(indexes).toUpperCase();
                                if (indexes === "PRIMARY") {
                                    indexes = "PRIMARY KEY"
                                }
                                contentObj[databaseName][tableName][columnName].index = indexes;
                            }
                            if (typeof nulls === "boolean") {
                                contentObj[databaseName][tableName][columnName].nulls = nulls;
                            }
                            if (typeof defaults === "string" || typeof defaults === "number") {
                                contentObj[databaseName][tableName][columnName].defaults = defaults;
                            }
                            if (comment !== undefined) {
                                contentObj[databaseName][tableName][columnName].comment = comment;
                            }
                            if (typeof unsigned === "boolean") {
                                contentObj[databaseName][tableName][columnName].unsigned = unsigned;
                            }
                            if (typeof zerofill === "boolean") {
                                contentObj[databaseName][tableName][columnName].zerofill = zerofill;
                            }
                            if (deepColumn.hasOwnProperty("foreign_key")) {
                                contentObj[databaseName][tableName][columnName].foreign_key = {};
                                contentObj[databaseName][tableName][columnName].foreign_key.table = fktable;
                                contentObj[databaseName][tableName][columnName].foreign_key.column = fkcolumn;
                                if([true, "DELETE", "DL", "DEL", "CASCADE"].includes(deleteOption)){
                                    deleteOption = "CASCADE";
                                } else if([null, "NULL", "SET NULL"].includes(deleteOption)){
                                    deleteOption = "SET NULL";
                                } else if(["DEFAULT", "SET DEFAULT"].includes(deleteOption)){
                                    deleteOption = "SET DEFAULT";
                                }
                                contentObj[databaseName][tableName][columnName].foreign_key.deleteOption = deleteOption;
                                if([true, "DELETE", "CASCADE"].includes(updateOption)){
                                    updateOption = "CASCADE";
                                } else if([null, "NULL", "SET NULL"].includes(updateOption)){
                                    updateOption = "SET NULL";
                                } else if(["DEFAULT", "SET DEFAULT"].includes(updateOption)){
                                    updateOption = "SET DEFAULT";
                                }
                                contentObj[databaseName][tableName][columnName].foreign_key.updateOption = updateOption;
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
            return { status: true, data: contentObj };
        }

        // lets print on the console
        if (badTableNames.length > 0) {
            console.error(`Table names are not correct: \n${badTableNames.join("\n")}`);
        }
        if (badColumnNames.length > 0) {
            console.error(`Column names are not correct: \n${badColumnNames.join("\n")}`);
        }
        if (badtype.length > 0) {
            console.log(cstyler.yellow("Valid column types:"));
            console.log(cstyler.dark.yellow(Object.keys(mysqlTypeMetadata).join(", ")));
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