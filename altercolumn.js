const fncs = require("./function");
const cstyler = require("cstyler");



function isValidToBeForeignkey(refColData, columnData) {
    try {
        if (refColData.columntype.toUpperCase() !== columnData.columntype.toUpperCase()) {
            return false;
        }
        if (Array.isArray(refColData.length_values) !== Array.isArray(columnData.length_values)) {
            return false;
        } else if (Array.isArray(refColData.length_values) && Array.isArray(columnData.length_values)) {
            if (!fncs.isSameArray(refColData.length_values, columnData.length_values)) {
                return false;
            }
        } else {
            if (refColData.length_values !== columnData.length_values) {
                return false;
            }
        }
        if ((refColData.unsigned || false) !== (columnData.unsigned || false)) {
            return false;
        }
        if (["CHAR", "VARCHAR", "TINYTEXT", "TEXT", "MEDIUMTEXT", "LONGTEXT", "ENUM", "SET"].includes(refColData.columntype.toUpperCase())) {
            if ((refColData._charset_ || "") !== (columnData._charset_ || "")) {
                return false;
            }
            if ((refColData._collate_ || "") !== (columnData._collate_ || "")) {
                return false;
            }
        }
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}
async function isColumnDataSame(config, databaseName, tableName, columnName, columnData, columndetails, fkdetails,) {
    // 1. Column type
    if (columnData.columntype !== columndetails.columntype) {
        console.log(cstyler.blue("Table:"), cstyler.hex("#00d9ffff")(tableName), cstyler.blue("Column:"), cstyler.hex("#00d9ffff")(columnName));
        console.log(cstyler.red("Column type do not match"));
        return false;
    }

    // 2. Length / precision / enum-set values
    if (columnData.length_value !== undefined) {
        const a = columnData.length_value;
        const b = columndetails.length_value;

        // ENUM / SET → array of strings
        if (['ENUM', 'SET'].includes(columnData.columntype)) {
            if (!Array.isArray(a) || !Array.isArray(b)) {
                console.log(cstyler.blue("Table:"), cstyler.hex("#00d9ffff")(tableName), cstyler.blue("Column:"), cstyler.hex("#00d9ffff")(columnName));
                console.log(cstyler.red("ENUM or SET values must be an array"));
                return false;
            }
            if (a.length !== b.length) {
                console.log(cstyler.blue("Table:"), cstyler.hex("#00d9ffff")(tableName), cstyler.blue("Column:"), cstyler.hex("#00d9ffff")(columnName));
                console.log(cstyler.red("ENUM or SET - value length are not same"), cstyler.hex("#00b7ff")("Given data:"), cstyler.hex("#ffffff")(a), cstyler.hex("#00b7ff")("Server data:"), cstyler.hex("#ffffff")(b),);
                return false;
            }

            for (let i = 0; i < a.length; i++) {
                if (!a.includes(b[i])) {
                    console.log(cstyler.blue("Table:"), cstyler.hex("#00d9ffff")(tableName), cstyler.blue("Column:"), cstyler.hex("#00d9ffff")(columnName));
                    console.log(cstyler.red("ENUM or SET - Server and given value are not same"), cstyler.hex("#00b7ff")("Given data:"), cstyler.hex("#ffffff")(a), cstyler.hex("#00b7ff")("Server data:"), cstyler.hex("#ffffff")(b),);
                    return false;

                }
            }
        }
        // DECIMAL(p,s) → [number, number]
        else if (Array.isArray(a)) {
            if (!Array.isArray(b) || a.length !== b.length) {
                console.log(cstyler.blue("Table:"), cstyler.hex("#00d9ffff")(tableName), cstyler.blue("Column:"), cstyler.hex("#00d9ffff")(columnName));
                console.log(cstyler.red("Decimal length value are not same"), cstyler.hex("#00b7ff")("Given data:"), cstyler.hex("#ffffff")(a), cstyler.hex("#00b7ff")("Server data:"), cstyler.hex("#ffffff")(b),);
                return false;
            }
            if (a[0] !== b[0] || a[1] !== b[1]) {
                console.log(cstyler.blue("Table:"), cstyler.hex("#00d9ffff")(tableName), cstyler.blue("Column:"), cstyler.hex("#00d9ffff")(columnName));
                console.log(cstyler.red("Decimal length value are not same"), cstyler.hex("#00b7ff")("Given data:"), cstyler.hex("#ffffff")(a), cstyler.hex("#00b7ff")("Server data:"), cstyler.hex("#ffffff")(b),);
                return false;
            }
        }
        // INT, VARCHAR, CHAR, etc. → number
        else {
            if (a !== b && a !== undefined) {
                console.log(cstyler.blue("Table:"), cstyler.hex("#00d9ffff")(tableName), cstyler.blue("Column:"), cstyler.hex("#00d9ffff")(columnName));
                console.log(cstyler.red("Length value are not same"), cstyler.hex("#00b7ff")("Given data:"), cstyler.hex("#ffffff")(a), cstyler.hex("#00b7ff")("Server data:"), cstyler.hex("#ffffff")(b),);
                return false;
            }
        }
    }

    // 3. UNSIGNED
    if (typeof columnData.unsigned === "boolean" &&
        columnData.unsigned !== columndetails.unsigned) {
        console.log(cstyler.blue("Table:"), cstyler.hex("#00d9ffff")(tableName), cstyler.blue("Column:"), cstyler.hex("#00d9ffff")(columnName));
        console.log(cstyler.red("Unsigned have changed"), cstyler.hex("#00b7ff")("Given data:"), cstyler.hex("#ffffff")(columnData.unsigned), cstyler.hex("#00b7ff")("Server data:"), cstyler.hex("#ffffff")(columndetails.unsigned),);
        return false;
    }

    // 4. ZEROFILL
    if (typeof columnData.zerofill === "boolean" &&
        columnData.zerofill !== columndetails.zerofill) {
        console.log(cstyler.blue("Table:"), cstyler.hex("#00d9ffff")(tableName), cstyler.blue("Column:"), cstyler.hex("#00d9ffff")(columnName));
        console.log(cstyler.red("Zerofill have changed"), cstyler.hex("#00b7ff")("Given data:"), cstyler.hex("#ffffff")(columnData.zerofill), cstyler.hex("#00b7ff")("Server data:"), cstyler.hex("#ffffff")(columndetails.zerofill),);
        return false;
    }

    // 5. NULL / NOT NULL
    if (typeof columnData.nulls === "boolean" &&
        columnData.nulls !== columndetails.nulls) {
        console.log(cstyler.blue("Table:"), cstyler.hex("#00d9ffff")(tableName), cstyler.blue("Column:"), cstyler.hex("#00d9ffff")(columnName));
        console.log(cstyler.red("Null have changed"), cstyler.hex("#00b7ff")("Given data:"), cstyler.hex("#ffffff")(columnData.nulls), cstyler.hex("#00b7ff")("Server data:"), cstyler.hex("#ffffff")(columndetails.nulls),);
        return false;
    }

    // 6. DEFAULT
    const defA = columnData.defaults ?? null;
    const defB = columndetails.defaults ?? null;
    if (defA != defB) {
        console.log(cstyler.blue("Table:"), cstyler.hex("#00d9ffff")(tableName), cstyler.blue("Column:"), cstyler.hex("#00d9ffff")(columnName));
        console.log(cstyler.red("Default need some changes"), cstyler.hex("#00b7ff")("Given data:"), cstyler.hex("#ffffff")(columnData.defaults), cstyler.hex("#00b7ff")("Server data:"), cstyler.hex("#ffffff")(columndetails.defaults),);
        return false;
    }

    // 7. INDEX (PRIMARY / UNIQUE / "")
    const idxA = columnData.index ?? "";
    const idxB = columndetails.index ?? "";
    const realfk = idxB === "" && (idxA === "" || idxA === undefined);
    if ((idxA === "" || idxA === undefined) && idxB === "KEY") {
        // check if it is a referancing column
        const getall = await fncs.getForeignKeyDetails(config, databaseName, tableName, columnName);
        if (getall === null) {
            console.error("Server error: Having problem finding referencing columns from ", cstyler.blue("Database: "), cstyler.hex("#00d9ffff")(databaseName), cstyler.blue(" Table: "), cstyler.hex("#00d9ffff")(tableName), cstyler.blue(" Column Name: "), cstyler.hex("#00d9ffff")(columnName));
            return null;
        }
        if (!fncs.isJsonObject(getall)) {
            console.log(cstyler.blue("Table:"), cstyler.hex("#00d9ffff")(tableName), cstyler.blue("Column:"), cstyler.hex("#00d9ffff")(columnName));
            console.log(cstyler.red("Index need some changes"), cstyler.hex("#00b7ff")("Given data:"), cstyler.hex("#ffffff")(columnData.index), cstyler.hex("#00b7ff")("Server data:"), cstyler.hex("#ffffff")(columndetails.index),);
            return false;
        }
    } else if (idxA !== idxB && !realfk) {
        console.log(cstyler.blue("Table:"), cstyler.hex("#00d9ffff")(tableName), cstyler.blue("Column:"), cstyler.hex("#00d9ffff")(columnName));
        console.log(cstyler.red("Index are not same"), cstyler.hex("#00b7ff")("Given data:"), cstyler.hex("#ffffff")(columnData.index), cstyler.hex("#00b7ff")("Server data:"), cstyler.hex("#ffffff")(columndetails.index),);
        console.log("fk exist:", fkdetails)
        return false;
    }

    // 8. AUTO_INCREMENT
    if ((columnData.autoincrement !== undefined && columnData.autoincrement !== columndetails.autoincrement) || (columnData.autoincrement === undefined && columndetails.autoincrement === true)) {
        console.log(cstyler.blue("Table:"), cstyler.hex("#00d9ffff")(tableName), cstyler.blue("Column:"), cstyler.hex("#00d9ffff")(columnName));
        console.log(cstyler.red("Autoincrement have some changes"), cstyler.hex("#00b7ff")("Given data:"), cstyler.hex("#ffffff")(columnData.autoincrement), cstyler.hex("#00b7ff")("Server data:"), cstyler.hex("#ffffff")(columndetails.autoincrement),);
        return false;
    }

    // 9. COMMENT
    const comA = columnData.comment ?? "";
    const comB = columndetails.comment ?? "";
    if (comA !== comB) {
        console.log(cstyler.blue("Table:"), cstyler.hex("#00d9ffff")(tableName), cstyler.blue("Column:"), cstyler.hex("#00d9ffff")(columnName));
        console.log(cstyler.red("Comment have some changes"), cstyler.hex("#00b7ff")("Given data:"), cstyler.hex("#ffffff")(columnData.comment), cstyler.hex("#00b7ff")("Server data:"), cstyler.hex("#ffffff")(columndetails.comment),);
        return false;
    }

    // 10. CHARACTER SET
    if (columnData._charset_ !== undefined &&
        columnData._charset_ !== columndetails._charset_) {
        console.log(cstyler.blue("Table:"), cstyler.hex("#00d9ffff")(tableName), cstyler.blue("Column:"), cstyler.hex("#00d9ffff")(columnName));
        console.log(cstyler.red("Character set have some changes"), cstyler.hex("#00b7ff")("Given data:"), cstyler.hex("#ffffff")(columnData._charset_), cstyler.hex("#00b7ff")("Server data:"), cstyler.hex("#ffffff")(columndetails._charset_),);
        return false;
    }

    // 11. COLLATION
    if (columnData._collate_ !== undefined &&
        columnData._collate_ !== columndetails._collate_) {
        console.log(cstyler.blue("Table:"), cstyler.hex("#00d9ffff")(tableName), cstyler.blue("Column:"), cstyler.hex("#00d9ffff")(columnName));
        console.log(cstyler.red("Collate have some changes"), cstyler.hex("#00b7ff")("Given data:"), cstyler.hex("#ffffff")(columnData._collate_), cstyler.hex("#00b7ff")("Server data:"), cstyler.hex("#ffffff")(columndetails._collate_),);
        return false;
    }

    return true;
}
// Identifier validator (letters, digits, underscore, dollar, max 64 chars)
const validIdent = name => typeof name === 'string' && /^[A-Za-z0-9$_]{1,64}$/.test(name);
async function alterColumnQuery(dbConfig, columndata, columnName, tableName, database, options = {}) {
    try {
        // Basic validation
        if (!validIdent(columnName)) throw new Error('Invalid columnName');
        if (!validIdent(tableName)) throw new Error('Invalid tableName');
        if (!validIdent(database)) throw new Error('Invalid database');

        if (!columndata || !columndata.columntype) {
            throw new Error('columntype is required for MODIFY COLUMN');
        }

        if (typeof fncs.inspectColumnConstraint !== 'function') {
            throw new Error('fncs.inspectColumnConstraint function not found in ./checkConstraints (require updated module)');
        }

        // Query the DB to see whether the column participates in any constraint/index/check.
        // Default: loose=true meaning any constraint/index that includes the column counts.
        const loose = options.loose !== false;
        const info = await fncs.inspectColumnConstraint(dbConfig, database, tableName, columnName, { loose });

        const columnHasConstraint = !!(info && info.found);

        // Helper functions
        const escapeSqlString = s => String(s).replace(/'/g, "''");
        const quoteId = id => {
            if (!validIdent(id)) throw new Error('Invalid identifier: ' + id);
            return `\`${id}\``;
        };

        // Build column definition (same approach as previous function)
        let colDef = `${quoteId(columnName)} ${columndata.columntype}`;

        // length_value handling
        if (columndata.hasOwnProperty('length_value')) {
            const lv = columndata.length_value;
            if (typeof lv === 'number') {
                colDef += `(${lv})`;
            } else if (Array.isArray(lv) && lv.length === 2 && lv.every(n => typeof n === 'number')) {
                colDef += `(${lv[0]},${lv[1]})`;
            } else if (Array.isArray(lv) && lv.every(s => typeof s === 'string')) {
                const escaped = lv.map(v => `'${escapeSqlString(v)}'`);
                colDef += `(${escaped.join(',')})`;
            } else {
                throw new Error('Invalid length_value');
            }
        }

        // UNSIGNED / ZEROFILL
        if (columndata.unsigned === true) colDef += ' UNSIGNED';
        if (columndata.zerofill === true) colDef += ' ZEROFILL';

        // CHARSET / COLLATE
        if (columndata._charset_) {
            if (!/^[A-Za-z0-9_]+$/.test(columndata._charset_)) throw new Error('Invalid charset');
            colDef += ` CHARACTER SET ${columndata._charset_}`;
        }
        if (columndata._collate_) {
            if (!/^[A-Za-z0-9_]+$/.test(columndata._collate_)) throw new Error('Invalid collate');
            colDef += ` COLLATE ${columndata._collate_}`;
        }

        // NULL / NOT NULL (only include if explicitly provided)
        if (columndata.hasOwnProperty('nulls')) {
            if (columndata.nulls === false) colDef += ' NOT NULL';
            else colDef += ' NULL';
        }

        // DEFAULT handling
        if (columndata.hasOwnProperty('defaults')) {
            const d = columndata.defaults;
            if (d === null) {
                colDef += ' DEFAULT NULL';
            } else if (typeof d === 'number') {
                colDef += ` DEFAULT ${d}`;
            } else if (typeof d === 'boolean') {
                colDef += ` DEFAULT ${d ? 1 : 0}`;
            } else if (typeof d === 'string') {
                if (columndata.defaults_is_expression === true) {
                    colDef += ` DEFAULT ${d}`;
                } else if (/^CURRENT_TIMESTAMP$/i.test(d) && /^(TIMESTAMP|DATETIME)/i.test(columndata.columntype)) {
                    colDef += ` DEFAULT ${d.toUpperCase()}`;
                } else {
                    colDef += ` DEFAULT '${escapeSqlString(d)}'`;
                }
            } else {
                throw new Error('Unsupported default type');
            }
        }

        // ON UPDATE
        if (columndata.on_update && typeof columndata.on_update === 'string') {
            if (columndata.on_update_is_expression === true) {
                colDef += ` ON UPDATE ${columndata.on_update}`;
            } else if (/^CURRENT_TIMESTAMP$/i.test(columndata.on_update)) {
                colDef += ` ON UPDATE ${columndata.on_update.toUpperCase()}`;
            } else {
                throw new Error('Unsupported on_update value (must be expression-flagged)');
            }
        }

        // AUTO_INCREMENT
        if (columndata.autoincrement === true) {
            colDef += ' AUTO_INCREMENT';
        }

        // COMMENT
        if (columndata.comment) {
            colDef += ` COMMENT '${escapeSqlString(columndata.comment)}'`;
        }

        // Build ALTER actions (we will return a single ALTER TABLE ... action list)
        const actions = [];
        actions.push(`MODIFY COLUMN ${colDef}`);

        // Determine whether the caller wants a UNIQUE index/constraint
        const wantsUnique = (
            columndata.unique === true ||
            (typeof columndata.index === 'string' && columndata.index.toUpperCase() === 'UNIQUE') ||
            (typeof columndata.index === 'object' && (columndata.index.type || '').toUpperCase() === 'UNIQUE')
        );

        // If the caller asked for an index that's NOT UNIQUE, or asked for UNIQUE and column has no constraints,
        // we add the appropriate ADD action. If the column already has any constraint/index and wantsUnique,
        // we DO NOT add the UNIQUE (per your requirement).
        if (columndata.index) {
            // Helper to build column list string
            const buildColsSql = cols => {
                const arr = Array.isArray(cols) ? cols : [cols];
                if (arr.length === 0) throw new Error('Index columns required');
                arr.forEach(c => { if (!validIdent(c)) throw new Error('Invalid index column: ' + c); });
                return arr.map(c => quoteId(c)).join(', ');
            };

            if (wantsUnique) {
                if (columnHasConstraint) {
                    // Skip adding UNIQUE because column already participates in a constraint/index
                    if (options.log !== false) {
                        console.info(`Skipping ADD UNIQUE for ${database}.${tableName}.${columnName} because it already has constraints/indexes.`);
                    }
                } else {
                    // Add UNIQUE on the column (single-column unique)
                    const idxName = (`uq_${tableName}_${columnName}`).slice(0, 64);
                    actions.push(`ADD UNIQUE KEY ${quoteId(idxName)} (${quoteId(columnName)})`);
                }
            } else {
                // Non-unique index or other index types: honor the spec in columndata.index
                if (typeof columndata.index === 'boolean' && columndata.index === true) {
                    actions.push(`ADD INDEX (${quoteId(columnName)})`);
                } else if (typeof columndata.index === 'string') {
                    const t = columndata.index.toUpperCase();
                    if (t === 'PRIMARY') {
                        actions.push(`ADD PRIMARY KEY (${quoteId(columnName)})`);
                    } else if (['INDEX', 'FULLTEXT', 'SPATIAL'].includes(t)) {
                        actions.push(`ADD ${t} (${quoteId(columnName)})`);
                    } else {
                        throw new Error('Unsupported index type string: ' + columndata.index);
                    }
                } else if (typeof columndata.index === 'object' && columndata.index !== null) {
                    const type = (columndata.index.type || 'INDEX').toUpperCase();
                    const colsSql = buildColsSql(columndata.index.columns || [columnName]);
                    let namePart = '';
                    if (type !== 'PRIMARY') {
                        const raw = (columndata.index.name || `idx_${tableName}_${columnName}`).slice(0, 64);
                        namePart = ` ${quoteId(raw)}`;
                    }
                    if (type === 'PRIMARY') actions.push(`ADD PRIMARY KEY (${colsSql})`);
                    else actions.push(`ADD ${type}${namePart} (${colsSql})`);
                }
            }
        }  else {
            const ifexist = await fncs.columnHasKey(dbConfig, database, tableName, columnName);
            if (ifexist === null) {
                console.error("Having problem checking column have key or not. Server connection problem.");
                return null;
            }
            if (ifexist.hasKey === true) {
                const rem = await fncs.removeForeignKeyConstraintFromColumn(dbConfig, database, tableName, columnName);
                if (rem === null) {
                    console.error("Having problem removing constraint name from the column.");
                    return null;
                }
            }
        }

        // Return single ALTER TABLE statement (no multi-statement)
        const sql = `ALTER TABLE ${quoteId(tableName)} ${actions.join(', ')};`;
        const runquery = await fncs.runQuery(dbConfig, database, sql);
        return runquery;
    } catch (err) {
        console.error('alterColumnQuery error:', err.message);
        return null;
    }
}
async function addForeignKeyWithIndexQuery(config, databaseName, tableName, columnName, refTable, refColumn, options = {}) {
    const {
        onDelete = "RESTRICT",
        onUpdate = "RESTRICT"
    } = options;

    const indexName = `idx_${tableName}_${columnName}`;

    // Combine both ADD INDEX and ADD FOREIGN KEY into one ALTER TABLE statement
    // Note: We use a comma to separate multiple actions in one query
    const combinedQuery = `
        ALTER TABLE \`${tableName}\`
        ADD INDEX \`${indexName}\` (\`${columnName}\`),
        ADD FOREIGN KEY (\`${columnName}\`)
        REFERENCES \`${refTable}\` (\`${refColumn}\`)
        ON DELETE ${onDelete}
        ON UPDATE ${onUpdate}
    `.trim();

    // Now we only send one single command to runQuery
    const runquery = await fncs.runQuery(config, databaseName, combinedQuery);
    return runquery;
}
async function alterColumnIfNeeded(config, jsondata, forceupdatecolumn, separator) {
    try {
        console.log(cstyler.bold.yellow("Let's initiate Alter Column to table if needed..."));
        for (const jsondb of Object.keys(jsondata)) {
            const loopdb = fncs.perseTableNameWithLoop(jsondb, separator);
            if (loopdb === false) {
                console.error("There must be some mistake. Please re install the module.")
            }
            const databaseName = loopdb.loopname;
            const getalltable = await fncs.getTableNames(config, databaseName);
            if (getalltable === null) {
                console.error(cstyler.red(`Failed to get table names for database ${databaseName}. Skipping...`));
                return null;
            }
            for (const jsontable of Object.keys(jsondata[jsondb])) {
                if (!fncs.isJsonObject(jsondata[jsondb][jsontable])) { continue; }
                // parse loop table name
                const looptable = fncs.perseTableNameWithLoop(jsontable, separator);
                if (looptable === false) {
                    console.error("There must be some mistake. Please re install the module.")
                }
                const tableName = looptable.loopname;
                // check if table exist
                if (!getalltable.includes(tableName)) {
                    console.error(cstyler.red(`Table ${tableName} does not exist in database ${databaseName}. Skipping...`));
                    continue;
                }
                // get all columns from the table
                const allcols = await fncs.getColumnNames(config, databaseName, tableName);
                if (allcols === null) {
                    console.error(cstyler.red(`Failed to get column names for table ${tableName} in database ${databaseName}. Skipping...`));
                    return null;
                }
                for (const jsoncolumn of Object.keys(jsondata[jsondb][jsontable])) {
                    if (!fncs.isJsonObject(jsondata[jsondb][jsontable][jsoncolumn])) { continue; }
                    if (!allcols.includes(jsoncolumn)) {
                        // column does not exist, skip it
                        console.error(cstyler.red(`Column ${jsoncolumn} does not exist in table ${tableName} of database ${databaseName}. Skipping...`));
                        continue;
                    }
                    // lets add the column
                    const columndata = jsondata[jsondb][jsontable][jsoncolumn];
                    const serverdata = await fncs.getColumnDetails(config, databaseName, tableName, jsoncolumn);
                    const fkdetails = await fncs.getForeignKeyDetails(config, databaseName, tableName, jsoncolumn);
                    const getallrefcol = await fncs.findReferencingFromColumns(config, databaseName, tableName, jsoncolumn);
                    if (getallrefcol === null) {
                        console.error("Server error: Having problem finding referencing columns from ", cstyler.blue("Database: "), cstyler.hex("#00d9ffff")(databaseName), cstyler.blue(" Table: "), cstyler.hex("#00d9ffff")(tableName), cstyler.blue(" Column Name: "), cstyler.hex("#00d9ffff")(jsoncolumn));
                        return null;
                    }
                    if (serverdata === null || fkdetails === null) {
                        console.error(cstyler.red(`Failed to get details for column ${jsoncolumn} in table ${tableName} of database ${databaseName}. Skipping...`));
                        return null;
                    }
                    const isColSame = await isColumnDataSame(config, databaseName, tableName, jsoncolumn, columndata, serverdata, fkdetails);
                    if (isColSame === null) {
                        return null;
                    }
                    if (!isColSame) {
                        console.log(cstyler.yellow("Column alteration needed for "), cstyler.blue("Database: "), cstyler.hex("#00d9ffff")(databaseName), cstyler.blue(" Table: "), cstyler.hex("#00d9ffff")(tableName), cstyler.blue(" Column Name: "), cstyler.hex("#00d9ffff")(jsoncolumn));
                        if (forceupdatecolumn === true) {
                            if (getallrefcol.length > 0) {
                                // there are referencing columns, we need to drop foreign keys from referencing columns first
                                for (const refcol of getallrefcol) {
                                    const dropfk = await fncs.removeForeignKeyFromColumn(config, refcol.child_schema, refcol.child_table, refcol.child_columns[0]);
                                    const delkey = await fncs.removeForeignKeyConstraintFromColumn(config, refcol.child_schema, refcol.child_table, refcol.child_columns[0]);
                                    if (dropfk === null || delkey === null) {
                                        console.error("Having problem removing foreign key from ", cstyler.blue("Database: "), cstyler.hex("#00d9ffff")(refcol.child_schema), cstyler.blue(" Table: "), cstyler.hex("#00d9ffff")(refcol.child_table), cstyler.blue(" Column Name: "), cstyler.hex("#00d9ffff")(refcol.child_columns[0]));
                                        return null;
                                    }
                                }
                            }
                            // lets update the column now
                            // first remove foreign key from the column if exist
                            if (fncs.isJsonObject(fkdetails)) {
                                const delfk = await fncs.removeForeignKeyFromColumn(config, databaseName, tableName, jsoncolumn);
                                const delkey = await fncs.removeForeignKeyConstraintFromColumn(config, databaseName, tableName, jsoncolumn);
                                if (delfk === null || delkey === null) {
                                    console.error("There was an issue when removing foreign key from", cstyler.blue("Database:"), cstyler.hex("#00d9ffff")(databaseName), cstyler.blue("Table:"), cstyler.hex("#00d9ffff")(tableName), cstyler.blue("Column:"), cstyler.hex("#00d9ffff")(jsoncolumn));
                                    return null;
                                }
                            }
                            // now alter the column
                            const alterquery = await alterColumnQuery(config, columndata, jsoncolumn, tableName, databaseName);
                            if (alterquery === null) {
                                console.error("There was an issue when creating alter column for", cstyler.blue("Database:"), cstyler.hex("#00d9ffff")(databaseName), cstyler.blue("Table:"), cstyler.hex("#00d9ffff")(tableName), cstyler.blue("Column:"), cstyler.hex("#00d9ffff")(jsoncolumn));
                                return null;
                            }
                            // now re add foreign key to the column if exist
                            if (columndata.hasOwnProperty("foreign_key")) {
                                const fkdata = columndata.foreign_key;
                                const fkquery = await addForeignKeyWithIndexQuery(config, databaseName, tableName, jsoncolumn, fkdata.table, fkdata.column, {
                                    onDelete: fkdata.deleteOption,
                                    onUpdate: fkdata.updateOption
                                });
                                if (fkquery === null) {
                                    console.error("There was an issue when creating foreign key for", cstyler.blue("Database:"), cstyler.hex("#00d9ffff")(databaseName), cstyler.blue("Table:"), cstyler.hex("#00d9ffff")(tableName), cstyler.blue("Column:"), cstyler.hex("#00d9ffff")(jsoncolumn));
                                    return null;
                                }
                            }
                            if (getallrefcol.length > 0) {
                                // lets re add the foreign keys to referencing columns
                                for (const refcol of getallrefcol) {
                                    // Re-add foreign key constraint to referencing columns
                                    const readdfk = await addForeignKeyWithIndexQuery(config, refcol.child_schema, refcol.child_table, refcol.child_columns[0], refcol.parent_table, refcol.parent_columns[0], {
                                        onDelete: refcol.delete_rule,
                                        onUpdate: refcol.update_rule
                                    });
                                    if (readdfk === null) {
                                        console.error("Having problem re adding foreign key to ", cstyler.blue("Database: "), cstyler.hex("#00d9ffff")(refcol.child_schema), cstyler.blue(" Table: "), cstyler.hex("#00d9ffff")(refcol.child_table), cstyler.blue(" Column Name: "), cstyler.hex("#00d9ffff")(refcol.child_columns[0]));
                                        return null;
                                    }
                                }
                            }
                        } else {
                            // lets try to see if there is any referencing foreign key
                            if (getallrefcol.length > 0) {
                                console.error(cstyler.blue("Database: "), cstyler.hex("#00d9ffff")(databaseName), cstyler.blue(" Table: "), cstyler.hex("#00d9ffff")(tableName), cstyler.blue(" Column Name: "), cstyler.hex("#00d9ffff")(jsoncolumn), cstyler.red("Column alteration needed but skipped due to forceupdatecolumn set to false and there are referencing foreign keys."));
                            } else {
                                // lets alter the column now
                                if (fncs.isJsonObject(fkdetails)) {
                                    const delfk = await fncs.removeForeignKeyFromColumn(config, databaseName, tableName, jsoncolumn);
                                    const delkey = await fncs.removeForeignKeyConstraintFromColumn(config, databaseName, tableName, jsoncolumn);
                                    if (delfk === null || delkey === null) {
                                        console.error(cstyler.blue("Database:"), cstyler.hex("#00d9ffff")(databaseName), cstyler.blue("Table:"), cstyler.hex("#00d9ffff")(tableName), cstyler.blue("Column:"), cstyler.hex("#00d9ffff")(jsoncolumn), cstyler.red("There was an issue when removing foreign key",));
                                        return null;
                                    }
                                }
                                const alterquery = await alterColumnQuery(config, columndata, jsoncolumn, tableName, databaseName);
                                if (alterquery === null) {
                                    console.error(cstyler.blue("Database:"), cstyler.hex("#00d9ffff")(databaseName), cstyler.blue("Table:"), cstyler.hex("#00d9ffff")(tableName), cstyler.blue("Column:"), cstyler.hex("#00d9ffff")(jsoncolumn), cstyler.red("There was an issue when modifying column",));
                                    return null;
                                }
                                if (columndata.hasOwnProperty("foreign_key")) {
                                    const fkdata = columndata.foreign_key;
                                    const fkquery = await addForeignKeyWithIndexQuery(config, databaseName, tableName, jsoncolumn, fkdata.table, fkdata.column, {
                                        onDelete: fkdata.deleteOption,
                                        onUpdate: fkdata.updateOption
                                    });
                                    if (fkquery === null) {
                                        console.error(cstyler.blue("Database:"), cstyler.hex("#00d9ffff")(databaseName), cstyler.blue("Table:"), cstyler.hex("#00d9ffff")(tableName), cstyler.blue("Column:"), cstyler.hex("#00d9ffff")(jsoncolumn), cstyler.red("There was an issue when creating foreign key",));
                                        return null;
                                    }
                                }
                            }
                        }
                    } else {
                        console.log(cstyler.blue("Database: "), cstyler.hex("#00d9ffff")(databaseName), cstyler.blue(" Table: "), cstyler.hex("#00d9ffff")(tableName), cstyler.blue(" Column Name: "), cstyler.hex("#00d9ffff")(jsoncolumn), cstyler.yellow("Given column data and server data are same."), "Let's check foreign key now.");
                        // lets check if foreign key need update
                        if (fkdetails === false && !columndata.hasOwnProperty("foreign_key")) {
                            continue;
                        } else if (fkdetails === false && columndata.hasOwnProperty("foreign_key")) {
                            console.log(cstyler.yellow("Foreign key need to be added for "), cstyler.blue("Database: "), cstyler.hex("#00d9ffff")(databaseName), cstyler.blue(" Table: "), cstyler.hex("#00d9ffff")(tableName), cstyler.blue(" Column Name: "), cstyler.hex("#00d9ffff")(jsoncolumn));
                            // need to add foreign key
                            const fkdata = columndata.foreign_key;
                            const addfk = await addForeignKeyWithIndexQuery(config, databaseName, tableName, jsoncolumn, fkdata.table, fkdata.column, {
                                onDelete: fkdata.deleteOption,
                                onUpdate: fkdata.updateOption
                            });
                            if (addfk === null) {
                                console.error("There was an issue when creating foreign key for", cstyler.blue("Database:"), cstyler.hex("#00d9ffff")(databaseName), cstyler.blue("Table:"), cstyler.hex("#00d9ffff")(tableName), cstyler.blue("Column:"), cstyler.hex("#00d9ffff")(jsoncolumn));
                                return null;
                            }
                        } else if (fncs.isJsonObject(fkdetails) && columndata.hasOwnProperty("foreign_key")) {
                            // need to check if foreign key details are same
                            const fkdt = columndata.foreign_key;
                            if (fkdetails.table === fkdt.table &&
                                fkdetails.column === fkdt.column &&
                                fkdetails.deleteOption === fkdt.deleteOption &&
                                (fkdt.updateOption === undefined ||fkdetails.updateOption === fkdt.updateOption)) {
                                continue;
                            }
                            console.log(cstyler.yellow("Foreign key need to be updated for "), cstyler.blue("Database: "), cstyler.hex("#00d9ffff")(databaseName), cstyler.blue(" Table: "), cstyler.hex("#00d9ffff")(tableName), cstyler.blue(" Column Name: "), cstyler.hex("#00d9ffff")(jsoncolumn));
                            console.log(cstyler.yellow("Foreign key details are different, updating foreign key for "), cstyler.blue("Database: "), cstyler.hex("#00d9ffff")(databaseName), cstyler.blue(" Table: "), cstyler.hex("#00d9ffff")(tableName), cstyler.blue(" Column Name: "), cstyler.hex("#00d9ffff")(jsoncolumn));
                            // need to update foreign key
                            const dropfk = await fncs.removeForeignKeyFromColumn(config, databaseName, tableName, jsoncolumn);
                            if (dropfk === null) {
                                console.error("Having problem removing foreign key from ", cstyler.blue("Database: "), cstyler.hex("#00d9ffff")(databaseName), cstyler.blue(" Table: "), cstyler.hex("#00d9ffff")(tableName), cstyler.blue(" Column Name: "), cstyler.hex("#00d9ffff")(jsoncolumn));
                                return null;
                            }
                            const fkdata = columndata.foreign_key;
                            const addfk = await addForeignKeyWithIndexQuery(config, databaseName, tableName, jsoncolumn, fkdata.table, fkdata.column, {
                                onDelete: fkdata.deleteOption,
                                onUpdate: fkdata.updateOption
                            });
                            if (addfk === null) {
                                console.error("There was an issue when creating foreign key for", cstyler.blue("Database:"), cstyler.hex("#00d9ffff")(databaseName), cstyler.blue("Table:"), cstyler.hex("#00d9ffff")(tableName), cstyler.blue("Column:"), cstyler.hex("#00d9ffff")(jsoncolumn));
                                return null;
                            }
                        }
                    }
                }
            }
        }
        console.log(cstyler.bold.underline.hex("#b700ffff")("Alter Column process to tables are completed successfully."));
        return true;
    } catch (err) {
        console.error(err.message);
        return null;
    }
}

module.exports = {
    alterColumnIfNeeded
}
