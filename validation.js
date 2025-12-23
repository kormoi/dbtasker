const cstyler = require("cstyler");
const fncs = require("./function");
const eng = require("./enginesupport");

function validateMySQLComment(comment) {
    const errors = [];

    // 1. Must be string
    if (typeof comment !== "string") {
        errors.push("Comment is not a string");
        return { valid: false, errors };
    }

    // 2. Must not contain NULL byte
    if (/[\x00]/.test(comment)) {
        errors.push("Comment contains NULL byte (\\x00)");
    }

    // 3. Length limit (MySQL: 1024 bytes)
    const byteLength = Buffer.byteLength(comment, "utf8");
    if (byteLength > 1024) {
        errors.push(`Comment exceeds 1024 bytes (found ${byteLength})`);
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
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
function validateDefault(columnType, defaultValue, length_value, nullable = false) {
    const type = columnType.toUpperCase();

    // If default is undefined (not explicitly set) → usually valid
    if (defaultValue === undefined) return { valid: true, message: null };

    // NULL default
    if (defaultValue === null) {
        return nullable
            ? { valid: true, message: null }
            : { valid: false, message: "Column does not allow NULL as default" };
    }

    // Numeric types
    if (["INT", "BIGINT", "SMALLINT", "TINYINT", "DECIMAL", "NUMERIC", "FLOAT", "DOUBLE", "REAL"].includes(type)) {
        if (typeof defaultValue === "number") return { valid: true, message: null };
        if (typeof defaultValue === "string" && !isNaN(defaultValue)) return { valid: true, message: null };
        return { valid: false, message: "Invalid numeric default value" };
    }

    // ENUM / SET
    if (["ENUM", "SET"].includes(type)) {
        if (!length_value) return { valid: false, message: "Missing ENUM/SET options" };
        const options = length_value.split(",").map(s => s.trim().replace(/^'(.*)'$/, "$1"));
        if (options.includes(defaultValue)) return { valid: true, message: null };
        return { valid: false, message: `Default value not in ENUM/SET options [${options.join(", ")}]` };
    }

    // Character types
    if (["CHAR", "VARCHAR"].includes(type)) {
        return typeof defaultValue === "string"
            ? { valid: true, message: null }
            : { valid: false, message: "Default must be a string" };
    }

    // TEXT types → valid if no default, invalid only if default explicitly set
    if (["TEXT", "TINYTEXT", "MEDIUMTEXT", "LONGTEXT"].includes(type)) {
        return { valid: false, message: "TEXT columns cannot have default values" };
    }

    // Binary types
    if (["BINARY", "VARBINARY"].includes(type)) {
        return typeof defaultValue === "string" || /^x'[0-9A-Fa-f]+'$/.test(defaultValue)
            ? { valid: true, message: null }
            : { valid: false, message: "Invalid binary default value" };
    }
    if (["BLOB", "TINYBLOB", "MEDIUMBLOB", "LONGBLOB"].includes(type)) {
        return { valid: false, message: "BLOB columns cannot have default values" };
    }

    // Date / Time types
    if (["DATETIME", "TIMESTAMP"].includes(type)) {
        if (typeof defaultValue !== "string") return { valid: false, message: "Default must be a string for DATETIME/TIMESTAMP" };
        if (/^(CURRENT_TIMESTAMP)(\(\d{0,6}\))?$/i.test(defaultValue)) return { valid: true, message: null };
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(defaultValue)) return { valid: true, message: null };
        return { valid: false, message: "Invalid DATETIME/TIMESTAMP default format" };
    }
    if (type === "DATE") {
        return /^\d{4}-\d{2}-\d{2}$/.test(defaultValue)
            ? { valid: true, message: null }
            : { valid: false, message: "Invalid DATE default format" };
    }
    if (type === "TIME") {
        return /^\d{2}:\d{2}:\d{2}$/.test(defaultValue)
            ? { valid: true, message: null }
            : { valid: false, message: "Invalid TIME default format" };
    }
    if (type === "YEAR") {
        return /^\d{4}$/.test(defaultValue)
            ? { valid: true, message: null }
            : { valid: false, message: "Invalid YEAR default format" };
    }

    // BOOLEAN
    if (type === "BOOLEAN") {
        return defaultValue === 0 || defaultValue === 1
            ? { valid: true, message: null }
            : { valid: false, message: "BOOLEAN default must be 0 or 1" };
    }

    // JSON
    if (type === "JSON") {
        return defaultValue === null || defaultValue === '{}' || defaultValue === '[]'
            ? { valid: true, message: null }
            : { valid: false, message: "JSON columns cannot have this default" };
    }

    // Unknown types
    return { valid: false, message: "Unknown column type or invalid default" };
}


async function JSONchecker(table_json, config, seperator = "_") {
    // lets check all table name and column name
    let baddatabaseName = [];
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
    let badcharacterset = [];
    let badcollation = [];
    let badcarcol = [];
    let badengine = [];
    console.log("Initializing JSON checking...");
    // get all character set and collate
    let characterSets;
    let collations;
    const getCharsetAndCollations = await fncs.getCharsetAndCollations(config);
    if (fncs.isJsonObject(getCharsetAndCollations)) {
        characterSets = getCharsetAndCollations.characterSets;
        collations = getCharsetAndCollations.collations;
    } else {
        console.error(cstyler.red.bold("There is a problem connecting to the database. Please check database info or connection."));
        return null;
    }
    // get all mysql table engines
    const mysqlEngines = await fncs.getMySQLEngines(config);
    if (!fncs.isJsonObject(mysqlEngines)) {
        console.error(cstyler.red.bold("There is a problem connecting to the database. Please check database info or connection."));
        return null;
    }
    // key variabls
    const charactersetkeys = ['_character_set_', '_characterset_', '_charset_', '_char_set_', 'character_set', 'characterset', 'charset', 'char_set'];
    const collationkeys = ['_collate_', '_collation_', 'collate', 'collation'];
    const enginekey = ["engine", "_engine_", "__engine__"];
    const commetnkey = ["comment", "_comment_", "__comment__"];
    let contentObj = {};
    if (fncs.isJsonObject(table_json)) {
        // lets loop databases
        for (const databaseName of Object.keys(table_json)) {
            if (fncs.perseDatabaseNameWithLoop(databaseName, seperator) === false) {
                baddatabaseName.push(
                    `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                    `${cstyler.red('- database name is not valid.')}`
                )
            }
            if (!contentObj[databaseName]) contentObj[databaseName] = {};
            if (fncs.isJsonObject(table_json[databaseName])) {
                // lets loop tables
                for (const tableName of Object.keys(table_json[databaseName])) {
                    if (!contentObj[databaseName][tableName]) contentObj[databaseName][tableName] = {};
                    let engine = undefined;
                    for (const ecolumn of Object.keys(table_json[databaseName][tableName])) {
                        if (enginekey.includes(ecolumn.toLowerCase())) {
                            engine = table_json[databaseName][tableName][ecolumn];
                        }
                    }
                    if (fncs.isJsonObject(table_json[databaseName][tableName])) {
                        if (fncs.perseTableNameWithLoop(tableName, seperator) === false) {
                            badTableNames.push(
                                `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                `${cstyler.purple('of table:')} ${cstyler.blue(tableName)} ` +
                                `${cstyler.red('- table name is not valid.')}`
                            );
                        }
                        // lets loop columns
                        for (const columnName of Object.keys(table_json[databaseName][tableName])) {
                            if (fncs.isJsonObject(table_json[databaseName][tableName][columnName])) {
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
                                let _charset_ = undefined;
                                let _collate_ = undefined;
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
                                const coltypekeys = ['type', 'columntype', 'column_type', 'datatype', 'data_type', 'typename', 'type_name'];
                                for (const item of Object.keys(deepColumn)) {
                                    if (coltypekeys.includes(item.toLowerCase())) {
                                        columntype = deepColumn[item];
                                        break;
                                    }
                                }
                                if (typeof columntype !== "string" && columntype !== undefined) {
                                    columntype = null;
                                }
                                /**
                                 * Length_Value
                                 */
                                const legnthkeys = ["lengthvalue", "length_value", 'size', 'scale', 'lengths', 'length', 'value', 'values', 'range', 'maxlength', 'max_length', 'precision'];
                                for (const item of Object.keys(deepColumn)) {
                                    if (legnthkeys.includes(item.toLowerCase())) {
                                        length_value = deepColumn[item];
                                        break;
                                    }
                                }
                                /**
                                 * AUTO_INCREMENT
                                 */
                                const autoincrementkeys = ['autoincrement', 'auto_increment', 'increment', 'serial', 'generated', 'isidentity', 'identity']
                                for (const item of Object.keys(deepColumn)) {
                                    if (autoincrementkeys.includes(item.toLowerCase())) {
                                        autoincrement = deepColumn[item];
                                        break;
                                    }
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
                                let indexvalue = undefined;
                                const indexkey = ["index", 'indexkey', 'index_key', 'indexing'];
                                for (const item of Object.keys(deepColumn)) {
                                    if (indexkey.includes(item.toLowerCase())) {
                                        indexes = deepColumn[item];
                                        break;
                                    } else if (['primarykey', 'primary_key', 'primary', 'isprimary', 'isprimarykey'].includes(item.toLowerCase())) {
                                        if (truers.includes(deepColumn[item])) {
                                            indexes = "PRIMARY KEY";
                                            break;
                                        } else {
                                            indexes = undefined;
                                        }
                                    } else if (['isunique', 'isuniquekey', 'uniqueindex', 'uniquekey', 'unique_index', 'unique_key'].includes(item.toLowerCase())) {
                                        if (truers.includes(deepColumn[item])) {
                                            indexes = "UNIQUE";
                                            break;
                                        } else {
                                            indexes = undefined;
                                        }
                                    } else if (['fulltext', 'isfulltext'].includes(item.toLowerCase())) {
                                        if (truers.includes(deepColumn[item])) {
                                            indexes = "FULLTEXT";
                                            break;
                                        } else {
                                            indexes = undefined;
                                        }
                                    } else if (['spatial', 'isspatial'].includes(item.toLowerCase())) {
                                        if (truers.includes(deepColumn[item])) {
                                            indexes = "SPATIAL";
                                            break;
                                        } else {
                                            indexes = undefined;
                                        }
                                    } else if (['index'].includes(item.toLowerCase())) {
                                        if (truers.includes(deepColumn[item])) {
                                            indexes = "INDEX";
                                            break;
                                        } else {
                                            indexes = undefined;
                                        }
                                    }
                                }
                                if (indexes !== undefined) { indexes = fncs.stringifyAny(indexes).toUpperCase(); }
                                else if (indexes === "PRIMARY") { indexes = "PRIMARY KEY" }
                                else if (indexes === "FULL") {
                                    indexes = "FULLTEXT";
                                }
                                /**
                                 * null
                                 * NULL
                                 * Null
                                 */
                                const nullkeys = ['null', 'nulls', 'nullable', 'optional', 'isnulable', 'allownull', 'canbenull'];
                                for (const item of Object.keys(deepColumn)) {
                                    if (nullkeys.includes(item.toLowerCase())) {
                                        if (truers.includes(deepColumn[item])) {
                                            nulls = true;
                                            break;
                                        } else if (falsers.includes(deepColumn[item])) {
                                            nulls = false;
                                            break;
                                        } else {
                                            nulls = true;
                                            break;
                                        }
                                    } else if (['notnull', 'not_null', 'nonnullable', 'notnullable', 'required', 'disallownull', 'non_nullable', 'not_nullable', 'disallow_null'].includes(item.toLowerCase())) {
                                        if (truers.includes(deepColumn[item])) {
                                            nulls = false;
                                            break;
                                        } else if (falsers.includes(deepColumn[item])) {
                                            nulls = true;
                                            break;
                                        } else {
                                            nulls = true;
                                            break;
                                        }
                                    }
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
                                 * COMMENT
                                 */
                                const commentkeys = ['comment', 'comments', 'columncomment', 'column_comment', 'description', 'label', 'helptext', 'hint', 'note'];
                                for (const item of Object.keys(deepColumn)) {
                                    if (commentkeys.includes(item.toLowerCase())) {
                                        comment = deepColumn[item];
                                        break;
                                    }
                                }
                                /**
                                 * UNSIGNED
                                 */
                                const unsignekey = ['numericunsigned', 'numeric_unsigned', 'unsigned', 'isunsigned'];
                                let signed = undefined;
                                for (const item of Object.keys(deepColumn)) {
                                    if (unsignekey.includes(item.toLowerCase())) {
                                        if (truers.includes(deepColumn[item])) {
                                            unsigned = true;
                                            break;
                                        } else if (falsers.includes(deepColumn[item])) {
                                            unsigned = false;
                                            break;
                                        } else {
                                            unsigned = null;
                                            break;
                                        }
                                    } else if (['signed', 'issigned'].includes(item.toLowerCase())) {
                                        if (truers.includes(deepColumn[item])) {
                                            unsigned = false;
                                            break;
                                        } else if (falsers.includes(deepColumn[item])) {
                                            unsigned = true;
                                            break;
                                        } else {
                                            unsigned = null;
                                            break;
                                        }
                                    }
                                }
                                /**
                                 * DEFAULT
                                 */
                                const defaultkeys = ['default', 'defaults', 'defaultvalue', 'default_value', 'example', 'sample', 'columndefault', 'column_default'];
                                for (const item of Object.keys(deepColumn)) {
                                    if (defaultkeys.includes(item.toLowerCase())) {
                                        defaults = deepColumn[item];
                                        break;
                                    }
                                }
                                /**
                                 * ZEROFILL
                                 */
                                const zerofkeys = ['zerofill', 'zero_fill', 'iszerofill', 'zerofillup'];
                                for (const item of Object.keys(deepColumn)) {
                                    if (zerofkeys.includes(item.toLowerCase())) {
                                        zerofill = deepColumn[item];
                                        break;
                                    }
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
                                // Let's work on character set and collate
                                for (const item of charactersetkeys) {
                                    if (deepColumn.hasOwnProperty(item)) {
                                        _charset_ = deepColumn[item];
                                    }
                                }
                                for (const item of collationkeys) {
                                    if (deepColumn.hasOwnProperty(item)) {
                                        _collate_ = deepColumn[item];
                                    }
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
                                    if (engine !== undefined) {
                                        if (!eng.isColumnTypeAllowed(engine, columntype.toUpperCase())) {
                                            badengine.push(
                                                `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                                `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                                `${cstyler.purple('> Engine:')} ${cstyler.blue(engine)} ` +
                                                `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                                `${cstyler.purple('> Type:')} ${cstyler.blue(columntype.toUpperCase())} ` +
                                                `${cstyler.red('> type is not supported by engine.')}`
                                            )
                                        }
                                    }
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
                                if (autoincrement === true && typeInfo.dataType === "numeric") {
                                    if (typeof indexes === "string") {
                                        if (typeInfo.dataType !== "numeric" || !['PRIMARY KEY', 'UNIQUE'].includes(indexes) || nulls === true || defaults !== undefined) {
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
                                    if (engine !== undefined) {
                                        if (!eng.isEngineFeatureAllowed(engine, 'AutoIncrement')) {
                                            badengine.push(
                                                `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                                `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                                `${cstyler.purple('> Engine:')} ${cstyler.blue(engine)} ` +
                                                `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                                `${cstyler.red('> Engine - does not support')}` +
                                                `${cstyler.yellow(' - Autoincrement')}`
                                            )
                                        }
                                    }
                                    // check multi autoincrement
                                    let autoincrementcolumnlist = [];
                                    for (const column of Object.keys(table_json[databaseName][tableName])) {
                                        const doubleDeepColumn = table_json[databaseName][tableName][column];
                                        let allautoincrement = undefined;
                                        for (const item of autoincrementkeys) {
                                            if (doubleDeepColumn.hasOwnProperty(item)) {
                                                allautoincrement = doubleDeepColumn[item];
                                                break;
                                            }
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
                                if (zerofill === true && typeInfo !== undefined) {
                                    if (!typeInfo.dataType === "numeric") {
                                        badzerofill.push(
                                            cstyler`{purple Database:} {blue ${databaseName}} ` +
                                            cstyler`{purple > Table:} {blue ${tableName}} ` +
                                            cstyler`{purple > Column:} {blue ${columnName}} ` +
                                            cstyler.red(" - for `zerofill` column type has to be numeric")
                                        );
                                    }
                                    if (engine !== undefined) {
                                        if (!eng.isEngineFeatureAllowed(engine, 'ZeroFill')) {
                                            badengine.push(
                                                `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                                `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                                `${cstyler.purple('> Engine:')} ${cstyler.blue(engine)} ` +
                                                `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                                `${cstyler.red('> Engine - does not support')}` +
                                                `${cstyler.yellow(' - ZeroFill')}`
                                            )
                                        }
                                    }
                                } else if (zerofill === null) {
                                    badzerofill.push(
                                        cstyler`{purple Database:} {blue ${databaseName}} ` +
                                        cstyler`{purple > Table:} {blue ${tableName}} ` +
                                        cstyler`{purple > Column:} {blue ${columnName}} ` +
                                        cstyler.red(" - has invalid `zerofill` value and must be boolean or simillar")
                                    );
                                }
                                // check index
                                if (indexes !== undefined) {
                                    if (typeof indexes === "string") {
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
                                        } else if (!validIndexValues.includes(indexes)) {
                                            console.log(indexes);
                                            badindex.push(
                                                `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                                `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                                `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                                `${cstyler.red('- has unsupported index value.')} ` +
                                                `${cstyler.red('Value must be')} ${cstyler.yellow(validIndexValues.join(', '))}`
                                            );
                                        }

                                        if (engine !== undefined) {
                                            if (!eng.isEngineFeatureAllowed(engine, 'Index')) {
                                                badengine.push(
                                                    `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                                    `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                                    `${cstyler.purple('> Engine:')} ${cstyler.blue(engine)} ` +
                                                    `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                                    `${cstyler.red('> Engine - does not support')}` +
                                                    `${cstyler.yellow(' - Index')}`
                                                )
                                            }
                                        }
                                    } else {
                                        badindex.push(
                                            `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                            `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                            `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                            `${cstyler.red('- ')}${cstyler.yellow('index')} ${cstyler.red('value must be text or string.')}`
                                        );
                                    }
                                    // check multi autoincrement
                                    let doubblePrimary = [];
                                    for (const column of Object.keys(table_json[databaseName][tableName])) {
                                        const doubleDeepColumn = table_json[databaseName][tableName][column];
                                        for (const item of indexkey) {
                                            if (doubleDeepColumn.hasOwnProperty(item)) {
                                                if (doubleDeepColumn[item].toUpperCase() === "KEY" || doubleDeepColumn[item].toUpperCase() === "PRIMARY KEY")
                                                    doubblePrimary.push(doubleDeepColumn[item]);
                                                break;
                                            }
                                        }
                                    }
                                    if (doubblePrimary.length > 1) {
                                        badindex.push(
                                            `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                            `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                            `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                            `${cstyler.red('- This table has more than one')} ${cstyler.yellow('PRIMARY KEY')} ${cstyler.red('column. A table can have only one')} ${cstyler.yellow('PRIMARY KEY')} ${cstyler.red('column.')}`
                                        );
                                    }
                                }
                                // Lets work on character set and collat
                                if (_charset_ !== undefined && typeInfo !== undefined) {
                                    if (characterSets.includes(_charset_) && ['text', 'string'].includes(typeInfo.dataType)) {
                                        contentObj[databaseName][tableName][columnName]._charset_ = _charset_;
                                    } else if (!['text', 'string'].includes(typeInfo.dataType)) {
                                        badcharacterset.push(
                                            `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purple('Table:')} ${cstyler.blue(tableName)} ${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ${cstyler.purple("> column type:")} ${cstyler.blue(columntype)} ${cstyler.red('can not accept character set and must be a type that accept TEXT or STRING to set a')} ${cstyler.yellow("character set")}`
                                        );
                                    } else {
                                        badcharacterset.push(
                                            `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purple('Table:')} ${cstyler.blue(tableName)} ${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ${cstyler.yellow("character set")} ${cstyler.red('value must have a valid value')}`
                                        );
                                    }
                                }
                                if (_collate_ !== undefined && typeInfo !== undefined) {
                                    if (collations.includes(_collate_) && ['text', 'string'].includes(typeInfo.dataType)) {
                                        contentObj[databaseName][tableName][columnName]._collate_ = _collate_;
                                    } else if (!['text', 'string'].includes(typeInfo.dataType)) {
                                        badcollation.push(
                                            `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purple('Table:')} ${cstyler.blue(tableName)} ${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ${cstyler.purple("> column type:")} ${cstyler.blue(columntype)} ${cstyler.red('can not accept collate and must be a type that accept TEXT or STRING to set a')} ${cstyler.yellow("collate")}`
                                        );
                                    } else {
                                        badcollation.push(
                                            `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purple('Table:')} ${cstyler.blue(tableName)} ${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ${cstyler.yellow("collate")} ${cstyler.red('value must have a valid value')}`
                                        );
                                    }
                                }
                                if (contentObj[databaseName][tableName][columnName].hasOwnProperty("_collate_") && contentObj[databaseName][tableName][columnName].hasOwnProperty("_charset_")) {
                                    const isvalid = await fncs.isCharsetCollationValid(config, contentObj[databaseName][tableName][columnName]._charset_, contentObj[databaseName][tableName][columnName]._collate_);
                                    if (isvalid === false) {
                                        badcarcol.push(
                                            `${cstyler.purple("Database:")} ${cstyler.blue(databaseName)} ` +
                                            `${cstyler.purple("Table:")} ${cstyler.blue(tableName)} ` +
                                            `${cstyler.purple("Column:")} ${cstyler.blue(columnName)} ` +
                                            `${cstyler.purple("> Character set:")} ${cstyler.blue(contentObj[databaseName][tableName][columnName]._charset_)} ` +
                                            `${cstyler.purple("> Collate:")} ${cstyler.blue(contentObj[databaseName][tableName][columnName]._collate_)} ` +
                                            `${cstyler.red("- is invalid combination")} `
                                        )
                                    }
                                }
                                // lets check default fsp list none
                                const result = validateDefault(columntype, defaults, length_value, nulls);

                                if (!result.valid) {
                                    baddefaults.push(
                                        `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} > ` +
                                        `${cstyler.purple('Table:')} ${cstyler.blue(tableName)} > ` +
                                        `${cstyler.purple('Column:')} ${cstyler.blue(columnName)} ${cstyler.red(result.message)}`
                                    );
                                }
                                // lets check bad foreign_key delete and update options
                                let deleteOption = undefined;
                                let updateOption = undefined;
                                let fktable = undefined;
                                let fkcolumn = undefined;
                                let foreign_key = {};
                                const fk_variations = ["fk", "foreign_key", "foreignkey"];
                                for (const item of Object.keys(deepColumn)) {
                                    if (fk_variations.includes(item.toLowerCase())) {
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
                                    const deleteVariations = ["delete", "ondelete", "on_delete", "when_Delete", "whenDelete", 'ifdelete', 'if_delete']
                                    for (const item of Object.keys(foreign_key)) {
                                        if (deleteVariations.includes(item.toLowerCase())) {
                                            deleteOption = foreign_key[item];
                                            if (typeof deleteOption === "string") {
                                                deleteOption = deleteOption.toUpperCase();
                                            }
                                            break;
                                        }
                                    }
                                    // Lets get update options
                                    const onupdatevariations = ["update", "onupdate", "on_update", "ifupdate", "if_update", "when_update", "whenupdate"];
                                    for (const item of Object.keys(foreign_key)) {
                                        if (onupdatevariations.includes(item.toLowerCase())) {
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
                                    const tableKeyVariation = ["table", "fktable", "fk_table", "foreignkeytable", "foreign_key_table"]
                                    for (const item of Object.keys(foreign_key)) {
                                        if (tableKeyVariation.includes(item.toLowerCase())) {
                                            fktable = foreign_key[item];
                                            break;
                                        }
                                    }
                                    // lets add foreign key column to variable
                                    const columnKeyVariation = ["column", "fkcolumn", "fk_column", "foreignkeycolumn", "foreign_key_column"]
                                    for (const item of Object.keys(foreign_key)) {
                                        if (columnKeyVariation.includes(item.toLowerCase())) {
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
                                // indexes
                                if (typeof indexes === "string" && validIndexValues.includes(fncs.stringifyAny(indexes).toUpperCase())) {
                                    contentObj[databaseName][tableName][columnName].index = indexes;
                                }
                                if (typeof nulls === "boolean") {
                                    contentObj[databaseName][tableName][columnName].nulls = nulls;

                                    if (engine !== undefined) {
                                        if (!eng.isEngineFeatureAllowed(engine, 'Null')) {
                                            badengine.push(
                                                `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                                `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                                `${cstyler.purple('> Engine:')} ${cstyler.blue(engine)} ` +
                                                `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                                `${cstyler.red('> Engine - does not support')}` +
                                                `${cstyler.yellow(' - Null')}`
                                            )
                                        }
                                    }
                                }
                                if (typeof defaults === "string" || typeof defaults === "number") {
                                    contentObj[databaseName][tableName][columnName].defaults = defaults;

                                    if (engine !== undefined) {
                                        if (!eng.isEngineFeatureAllowed(engine, 'Default')) {
                                            badengine.push(
                                                `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ` +
                                                `${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ` +
                                                `${cstyler.purple('> Engine:')} ${cstyler.blue(engine)} ` +
                                                `${cstyler.purple('> Column:')} ${cstyler.blue(columnName)} ` +
                                                `${cstyler.red('> Engine - does not support')}` +
                                                `${cstyler.yellow(' - Default')}`
                                            )
                                        }
                                    }
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
                                // foreign key
                                if (deepColumn.hasOwnProperty("foreign_key")) {
                                    contentObj[databaseName][tableName][columnName].foreign_key = {};
                                    contentObj[databaseName][tableName][columnName].foreign_key.table = fktable;
                                    contentObj[databaseName][tableName][columnName].foreign_key.column = fkcolumn;
                                    // lets refine
                                    if ([true, "DL", "DEL", "DELETE", "CASCADE"].includes(deleteOption)) {
                                        deleteOption = "CASCADE";
                                    } else if ([null, "NULL", "SET NULL"].includes(deleteOption)) {
                                        deleteOption = "SET NULL";
                                    } else if (["DEFAULT", "SET DEFAULT"].includes(deleteOption)) {
                                        deleteOption = "SET DEFAULT";
                                    }
                                    if ([true, "DL", "DEL", "DELETE", "CASCADE"].includes(updateOption)) {
                                        updateOption = "CASCADE";
                                    } else if ([null, "NULL", "SET NULL"].includes(updateOption)) {
                                        updateOption = "SET NULL";
                                    } else if (["DEFAULT", "SET DEFAULT"].includes(updateOption)) {
                                        updateOption = "SET DEFAULT";
                                    }
                                    if (deleteOption !== undefined) {
                                        contentObj[databaseName][tableName][columnName].foreign_key.deleteOption = deleteOption;
                                    }
                                    if (updateOption !== undefined) {
                                        contentObj[databaseName][tableName][columnName].foreign_key.updateOption = updateOption;
                                    }
                                }
                            } else {
                                if (charactersetkeys.includes(columnName.toLowerCase())) {
                                    const charvalue = table_json[databaseName][tableName][columnName];
                                    if (characterSets.includes(charvalue)) {
                                        contentObj[databaseName][tableName]._charset_ = charvalue;
                                    } else {
                                        badcharacterset.push(
                                            `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purple('Table:')} ${cstyler.blue(tableName)} ${cstyler.purple('> character set key:')} ${cstyler.blue(columnName)}  ${cstyler.red('must have a valid character set value')}`
                                        );
                                    }
                                } else if (collationkeys.includes(columnName.toLowerCase())) {
                                    const colvalue = table_json[databaseName][tableName][columnName];
                                    if (collations.includes(colvalue)) {
                                        contentObj[databaseName][tableName]._collate_ = colvalue;
                                    } else {
                                        badcollation.push(
                                            `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purple('Table:')} ${cstyler.blue(tableName)} ${cstyler.purple('> collate key:')} ${cstyler.blue(columnName)}  ${cstyler.red('must have a valid collate value')}`
                                        );
                                    }
                                } else if (enginekey.includes(columnName.toLowerCase())) {
                                    const engvalue = table_json[databaseName][tableName][columnName];
                                    if (Object.keys(mysqlEngines).includes(engvalue)) {
                                        if (mysqlEngines[engvalue].support === "YES") {
                                            contentObj[databaseName][tableName]._engine_ = engvalue;
                                        } else {
                                            badengine.push(
                                                `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ${cstyler.purple('> Engine key:')} ${cstyler.blue(columnName)} ${cstyler.purple("Engine name: ")} ${cstyler.blue(engvalue)} ${cstyler.red('- The storage engine exists in MySQL source code but is not available on this server.')}`
                                            );
                                        }
                                    } else {
                                        badengine.push(
                                            `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purple('> Table:')} ${cstyler.blue(tableName)} ${cstyler.purple('> Engine key:')} ${cstyler.blue(columnName)} ${cstyler.purple("Engine name:")} ${cstyler.blue(engvalue)} ${cstyler.red('- must have a valid engine value')}`
                                        );
                                    }
                                } else if (commetnkey.includes(columnName.toLowerCase())) {
                                    const commentval = table_json[databaseName][tableName][columnName];
                                    if (!validateMySQLComment(commentval).valid) {
                                        badcomment.push(
                                            `${cstyler.purple("Database:")} ${cstyler.blue(databaseName)} ` +
                                            `${cstyler.purple("> Table:")} ${cstyler.blue(tableName)} ` +
                                            `${cstyler.purple("> Table comment:")} ${cstyler.blue(columnName)} ` +
                                            `${cstyler.red("- Invalid comment:")} ` +
                                            result.errors.map(e => cstyler.red(e)).join(", ")
                                        )
                                    }
                                } else {
                                    badColumnNames.push(
                                        `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purple('Table:')} ${cstyler.blue(tableName)} ${cstyler.purple('> columnName:')} ${cstyler.blue(columnName)}  ${cstyler.red('- That column name have some problem with its value')}`
                                    )
                                }
                                if (contentObj[databaseName][tableName].hasOwnProperty("_collate_") && contentObj[databaseName][tableName].hasOwnProperty("_charset_")) {
                                    const isvalid = await fncs.isCharsetCollationValid(config, contentObj[databaseName][tableName]._charset_, contentObj[databaseName][tableName]._collate_);
                                    if (isvalid === false) {
                                        badcarcol.push(
                                            `${cstyler.purple("Database:")} ${cstyler.blue(databaseName)} ` +
                                            `${cstyler.purple("Table:")} ${cstyler.blue(tableName)} ` +
                                            `${cstyler.purple("> Character set:")} ${cstyler.blue(contentObj[databaseName][tableName]._charset_)} ` +
                                            `${cstyler.purple("> Collate:")} ${cstyler.blue(contentObj[databaseName][tableName]._collate_)} ` +
                                            `${cstyler.red("- is invalid combination")} `
                                        )
                                    }
                                }
                            }
                        }
                    } else {
                        if (charactersetkeys.includes(tableName.toLowerCase())) {
                            const charvalue = table_json[databaseName][tableName];
                            if (characterSets.includes(charvalue)) {
                                contentObj[databaseName]._charset_ = charvalue;
                            } else {
                                badcharacterset.push(
                                    `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purple('> character set key:')} ${cstyler.blue(tableName)}  ${cstyler.red('must have a valid character set value')}`
                                );
                            }
                        } else if (collationkeys.includes(tableName.toLowerCase())) {
                            const colvalue = table_json[databaseName][tableName];
                            if (collations.includes(colvalue)) {
                                contentObj[databaseName]._collate_ = colvalue;
                            } else {
                                badcollation.push(
                                    `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purple('> collate key:')} ${cstyler.blue(tableName)}  ${cstyler.red('must have a valid collate value')}`
                                );
                            }
                        } else if (commetnkey.includes(tableName.toLowerCase())) {
                            const commentval = table_json[databaseName][tableName];
                            if (validateMySQLComment(commentval).valid) {
                                contentObj[databaseName]._comment_ = commentval;
                            } else {
                                badcomment.push(
                                    `${cstyler.purple("Database:")} ${cstyler.blue(databaseName)} ` +
                                    `${cstyler.purple("> Database comment:")} ${cstyler.blue(tableName)} ` +
                                    `${cstyler.red("- Invalid comment:")} ` +
                                    result.errors.map(e => cstyler.red(e)).join(", ")
                                )
                            }
                        } else {
                            badTableNames.push(
                                `${cstyler.purple('Database:')} ${cstyler.blue(databaseName)} ${cstyler.purple('Table:')} ${cstyler.blue(tableName)} ${cstyler.red('- That table may have some problem with its property')}`
                            )
                        }
                        if (contentObj[databaseName].hasOwnProperty("_collate_") && contentObj[databaseName].hasOwnProperty("_charset_")) {
                            const isvalid = await fncs.isCharsetCollationValid(config, contentObj[databaseName]._charset_, contentObj[databaseName]._collate_);
                            if (isvalid === false) {
                                badcarcol.push(
                                    `${cstyler.purple("Database:")} ${cstyler.blue(databaseName)} ` +
                                    `${cstyler.purple("> Character set:")} ${cstyler.blue(contentObj[databaseName]._charset_)} ` +
                                    `${cstyler.purple("> Collate:")} ${cstyler.blue(contentObj[databaseName]._collate_)} ` +
                                    `${cstyler.red("- is invalid combination")} `
                                )
                            }
                        }

                    }
                }
            } else {
                console.error("Tables of database: ", databaseName, " must be in Json format.");
                return false;
            }
        }
        // Lets return result
        if (baddatabaseName.length === 0 && badcarcol.length === 0 && badengine.length === 0 && badTableNames.length === 0 && badColumnNames.length === 0 && badcomment.length === 0 && badunsigned.length === 0 && badzerofill.length === 0 && badtype.length === 0 && badindex.length === 0 && badautoincrement.length === 0 && badnulls.length === 0 && baddefaults.length === 0 && badlength.length === 0 && badforeighkey.length === 0 && badcharacterset.length === 0 && badcollation.length === 0) {
            console.log(cstyler.underline.green("All JSON checking is done | Clear to continue"));
            return { status: true, data: contentObj };
        }

        // lets print on the console
        if (baddatabaseName.length > 0) {
            console.error(`Database names are not correct. May have reserved words or length is bigger than 64 character. Names are:\n${baddatabaseName.join("\n")}`);
        }
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
        if (badcharacterset.length > 0) {
            console.log(cstyler.yellow("Valid character sets:"));
            console.log(cstyler.dark.yellow(characterSets.join(", ")));
            console.error(`Character sets are not correct: \n${badcharacterset.join("\n")}`);
        }
        if (badcollation.length > 0) {
            console.log(cstyler.yellow("Valid collates:"));
            console.log(cstyler.dark.yellow(collations.join(", ")));
            console.error(`Collation are not correct: \n${badcollation.join("\n")}`);
        }
        if (badcarcol.length > 0) {
            console.error(`Character set and Collation combination are not correct: \n${badcarcol.join("\n")}`);
        }
        if (badengine.length > 0) {
            console.log(cstyler.yellow("Valid engines:"));
            console.log(cstyler.dark.yellow(Object.keys(mysqlEngines).join(", ")));
            console.error(`Engines are not correct: \n${badengine.join("\n")}`);
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
    mysqlTypeMetadata
}