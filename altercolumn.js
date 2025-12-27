const fncs = require("./function");
const cstyler = require("cstyler");




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
        }

        // Return single ALTER TABLE statement (no multi-statement)
        const sql = `ALTER TABLE ${quoteId(tableName)} ${actions.join(', ')};`;
        return sql;
    } catch (err) {
        console.error('alterColumnQuery error:', err.message);
        return null;
    }
}
function addForeignKeyWithIndexQuery(tableName, columnName, refTable, refColumn, options = {}) {
  const {
    onDelete = "RESTRICT",
    onUpdate = "RESTRICT"
  } = options;

  const indexName = `idx_${tableName}_${columnName}`;

  const indexQuery = `
    ALTER TABLE \`${tableName}\`
    ADD INDEX \`${indexName}\` (\`${columnName}\`)
  `.trim();

  // Do not provide a constraint name; let MySQL generate it automatically
  const foreignKeyQuery = `
    ALTER TABLE \`${tableName}\`
    ADD FOREIGN KEY (\`${columnName}\`)
    REFERENCES \`${refTable}\` (\`${refColumn}\`)
    ON DELETE ${onDelete}
    ON UPDATE ${onUpdate}
  `.trim();

  return {
    indexQuery,
    foreignKeyQuery
  };
}
function isColumnDataSame(columnData, columndetails, fkdetails, tableName, columnName) {
    // 1. Column type
    if (columnData.columntype !== columndetails.columntype) {
        console.log(cstyler.purple("Table:"), cstyler.blue(tableName), cstyler.purple("Column:"), cstyler.blue(columnName));
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
                console.log(cstyler.purple("Table:"), cstyler.blue(tableName), cstyler.purple("Column:"), cstyler.blue(columnName));
                console.log(cstyler.red("ENUM or SET values must be an array"));
                return false;
            }
            if (a.length !== b.length) {
                console.log(cstyler.purple("Table:"), cstyler.blue(tableName), cstyler.purple("Column:"), cstyler.blue(columnName));
                console.log(cstyler.red("ENUM or SET - value length are not same"), cstyler.hex("#00b7ff")("Given data:"), cstyler.hex("#ffffff")(a), cstyler.hex("#00b7ff")("Server data:"), cstyler.hex("#ffffff")(b),);
                return false;
            }

            for (let i = 0; i < a.length; i++) {
                if (!a.includes(b[i])) {
                    console.log(cstyler.purple("Table:"), cstyler.blue(tableName), cstyler.purple("Column:"), cstyler.blue(columnName));
                    console.log(cstyler.red("ENUM or SET - Server and given value are not same"), cstyler.hex("#00b7ff")("Given data:"), cstyler.hex("#ffffff")(a), cstyler.hex("#00b7ff")("Server data:"), cstyler.hex("#ffffff")(b),);
                    return false;

                }
            }
        }
        // DECIMAL(p,s) → [number, number]
        else if (Array.isArray(a)) {
            if (!Array.isArray(b) || a.length !== b.length) {
                console.log(cstyler.purple("Table:"), cstyler.blue(tableName), cstyler.purple("Column:"), cstyler.blue(columnName));
                console.log(cstyler.red("Decimal length value are not same"), cstyler.hex("#00b7ff")("Given data:"), cstyler.hex("#ffffff")(a), cstyler.hex("#00b7ff")("Server data:"), cstyler.hex("#ffffff")(b),);
                return false;
            }
            if (a[0] !== b[0] || a[1] !== b[1]) {
                console.log(cstyler.purple("Table:"), cstyler.blue(tableName), cstyler.purple("Column:"), cstyler.blue(columnName));
                console.log(cstyler.red("Decimal length value are not same"), cstyler.hex("#00b7ff")("Given data:"), cstyler.hex("#ffffff")(a), cstyler.hex("#00b7ff")("Server data:"), cstyler.hex("#ffffff")(b),);
                return false;
            }
        }
        // INT, VARCHAR, CHAR, etc. → number
        else {
            if (a !== b && a !== undefined) {
                console.log(cstyler.purple("Table:"), cstyler.blue(tableName), cstyler.purple("Column:"), cstyler.blue(columnName));
                console.log(cstyler.red("Length value are not same"), cstyler.hex("#00b7ff")("Given data:"), cstyler.hex("#ffffff")(a), cstyler.hex("#00b7ff")("Server data:"), cstyler.hex("#ffffff")(b),);
                return false;
            }
        }
    }

    // 3. UNSIGNED
    if (typeof columnData.unsigned === "boolean" &&
        columnData.unsigned !== columndetails.unsigned) {
        console.log(cstyler.purple("Table:"), cstyler.blue(tableName), cstyler.purple("Column:"), cstyler.blue(columnName));
        console.log(cstyler.red("Unsigned have changed"), cstyler.hex("#00b7ff")("Given data:"), cstyler.hex("#ffffff")(columnData.unsigned), cstyler.hex("#00b7ff")("Server data:"), cstyler.hex("#ffffff")(columndetails.unsigned),);
        return false;
    }

    // 4. ZEROFILL
    if (typeof columnData.zerofill === "boolean" &&
        columnData.zerofill !== columndetails.zerofill) {
        console.log(cstyler.purple("Table:"), cstyler.blue(tableName), cstyler.purple("Column:"), cstyler.blue(columnName));
        console.log(cstyler.red("Zerofill have changed"), cstyler.hex("#00b7ff")("Given data:"), cstyler.hex("#ffffff")(columnData.zerofill), cstyler.hex("#00b7ff")("Server data:"), cstyler.hex("#ffffff")(columndetails.zerofill),);
        return false;
    }

    // 5. NULL / NOT NULL
    if (typeof columnData.nulls === "boolean" &&
        columnData.nulls !== columndetails.nulls) {
        console.log(cstyler.purple("Table:"), cstyler.blue(tableName), cstyler.purple("Column:"), cstyler.blue(columnName));
        console.log(cstyler.red("Null have changed"), cstyler.hex("#00b7ff")("Given data:"), cstyler.hex("#ffffff")(columnData.nulls), cstyler.hex("#00b7ff")("Server data:"), cstyler.hex("#ffffff")(columndetails.nulls),);
        return false;
    }

    // 6. DEFAULT
    const defA = columnData.defaults ?? null;
    const defB = columndetails.defaults ?? null;
    if (defA != defB) {
        console.log(cstyler.purple("Table:"), cstyler.blue(tableName), cstyler.purple("Column:"), cstyler.blue(columnName));
        console.log(cstyler.red("Default need some changes"), cstyler.hex("#00b7ff")("Given data:"), cstyler.hex("#ffffff")(columnData.defaults), cstyler.hex("#00b7ff")("Server data:"), cstyler.hex("#ffffff")(columndetails.defaults),);
        return false;
    }

    // 7. INDEX (PRIMARY / UNIQUE / "")
    const idxA = columnData.index ?? "";
    const idxB = columndetails.index ?? "";

    const realfk =
        fncs.isJsonObject(fkdetails) &&
        idxB === "KEY" &&
        (idxA === "" || idxA === undefined);

    if (idxA !== idxB && !realfk) {
        console.log(cstyler.purple("Table:"), cstyler.blue(tableName), cstyler.purple("Column:"), cstyler.blue(columnName));
        console.log(cstyler.red("Index are not same"), cstyler.hex("#00b7ff")("Given data:"), cstyler.hex("#ffffff")(columnData.index), cstyler.hex("#00b7ff")("Server data:"), cstyler.hex("#ffffff")(columndetails.index),);
        console.log("fk exist:", fkdetails)
        return false;
    }

    // 8. AUTO_INCREMENT
    if ((columnData.autoincrement !== undefined && columnData.autoincrement !== columndetails.autoincrement) || (columnData.autoincrement === undefined && columndetails.autoincrement === true)) {
        console.log(cstyler.purple("Table:"), cstyler.blue(tableName), cstyler.purple("Column:"), cstyler.blue(columnName));
        console.log(cstyler.red("Autoincrement have some changes"), cstyler.hex("#00b7ff")("Given data:"), cstyler.hex("#ffffff")(columnData.autoincrement), cstyler.hex("#00b7ff")("Server data:"), cstyler.hex("#ffffff")(columndetails.autoincrement),);
        return false;
    }

    // 9. COMMENT
    const comA = columnData.comment ?? "";
    const comB = columndetails.comment ?? "";
    if (comA !== comB) {
        console.log(cstyler.purple("Table:"), cstyler.blue(tableName), cstyler.purple("Column:"), cstyler.blue(columnName));
        console.log(cstyler.red("Comment have some changes"), cstyler.hex("#00b7ff")("Given data:"), cstyler.hex("#ffffff")(columnData.comment), cstyler.hex("#00b7ff")("Server data:"), cstyler.hex("#ffffff")(columndetails.comment),);
        return false;
    }

    // 10. CHARACTER SET
    if (columnData._charset_ !== undefined &&
        columnData._charset_ !== columndetails._charset_) {
        console.log(cstyler.purple("Table:"), cstyler.blue(tableName), cstyler.purple("Column:"), cstyler.blue(columnName));
        console.log(cstyler.red("Character set have some changes"), cstyler.hex("#00b7ff")("Given data:"), cstyler.hex("#ffffff")(columnData._charset_), cstyler.hex("#00b7ff")("Server data:"), cstyler.hex("#ffffff")(columndetails._charset_),);
        return false;
    }

    // 11. COLLATION
    if (columnData._collate_ !== undefined &&
        columnData._collate_ !== columndetails._collate_) {
        console.log(cstyler.purple("Table:"), cstyler.blue(tableName), cstyler.purple("Column:"), cstyler.blue(columnName));
        console.log(cstyler.red("Collate have some changes"), cstyler.hex("#00b7ff")("Given data:"), cstyler.hex("#ffffff")(columnData._collate_), cstyler.hex("#00b7ff")("Server data:"), cstyler.hex("#ffffff")(columndetails._collate_),);
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
        console.log(cstyler.yellow("Lets check if any changes needed on"), cstyler.purple("Database:"), cstyler.blue(dbName), cstyler.purple("Table:"), cstyler.blue(tableName));
        for (const columnName of Object.keys(tabledata)) {
            const columnData = tabledata[columnName];
            const fkData = columnData.foreign_key;
            const columndetails = await fncs.getColumnDetails(config, dbName, tableName, columnName);
            const fkdetails = await fncs.getForeignKeyDetails(config, dbName, tableName, columnName);
            const constraintexist = await fncs.columnHasKey(config, dbName, tableName, columnName);
            if (fkdetails === null) {
                console.error("Server error: Having problem getting foreignkey details of ", cstyler.purple("Database: "), cstyler.blue(dbName), cstyler.purple(" Table: "), cstyler.blue(tableName), cstyler.purple(" Column Name: "), cstyler.blue(columnName));
                return null;
            }
            if (constraintexist === null) {
                console.error("Server error: Having problem removing foreignkey constraint from ", cstyler.purple("Database: "), cstyler.blue(dbName), cstyler.purple(" Table: "), cstyler.blue(tableName), cstyler.purple(" Column Name: "), cstyler.blue(columnName));
                return null;
            }
            if (fncs.isJsonObject(columndetails)) {
                // alter column query
                if (!isColumnDataSame(columnData, columndetails, fkdetails, tableName, columnName)) {
                    console.log("Server details:\n", columndetails);
                    console.log("Given details:\n", columnData);
                    const delkey = await fncs.removeForeignKeyConstraintFromColumn(config, dbName, tableName, columnName);
                    if (delkey === null) {
                        console.error("Having problem deleting foreign key constraint from column -", cstyler.purple("Database: "), cstyler.blue(dbName), cstyler.purple(" Table: "), cstyler.blue(tableName), cstyler.purple(" Column Name: "), cstyler.blue(columnName));
                        return null;
                    }
                    const alterquery = await alterColumnQuery(config, columnData, columnName, tableName, dbName);
                    if (alterquery === null) {
                        // Not that important
                        console.error("There was an issue when creating alter column query for", cstyler.purple("Database:"), cstyler.blue(dbName), cstyler.purple("Table:"), cstyler.blue(tableName), cstyler.purple("Column:"), cstyler.blue(columnName));
                        return null;
                    }
                    queries.push(alterquery);
                    // lets work on foreign key
                    if (columnData.hasOwnProperty("foreign_key")) {
                        // lets check foreign key table column exist
                        const fktcexist = await fncs.columnExists(config, dbName, fkData.table, fkData.column);
                        if (constraintexist)
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
                        // is foreignkey same
                        if (fncs.isJsonObject(fkdetails)) {
                            let issame = true;
                            // lets check if foreign keys are same or not
                            if (fkData.table !== fkdetails.table) issame = false;
                            if (fkData.column !== fkdetails.column) issame = false;
                            if (fkData.deleteOption !== fkdetails.deleteOption) issame = false;
                            if (fkData.updateOption !== undefined && fkData.updateOption !== fkdetails.updateOption) issame = false;
                            if (issame === false) {
                                console.log(cstyler.red("Foreign key server and given value are not same"), cstyler.hex("#00b7ff")("Given data:"), cstyler.hex("#ffffff")(fkData), cstyler.hex("#00b7ff")("Server data:"), cstyler.hex("#ffffff")(fkdetails),);
                                const dfk = await fncs.removeForeignKeyFromColumn(config, dbName, tableName, columnName);
                                const delkey = await fncs.removeForeignKeyConstraintFromColumn(config, dbName, tableName, columnName);
                                if (delkey === null) {
                                    console.error("Having problem deleting foreign key constraint from column -", cstyler.purple("Database: "), cstyler.blue(dbName), cstyler.purple(" Table: "), cstyler.blue(tableName), cstyler.purple(" Column Name: "), cstyler.blue(columnName));
                                    return null;
                                }
                                if (dfk === true || dfk === false) {
                                    const fkquery = addForeignKeyWithIndexQuery(tableName, columnName, fkData.table, fkData.column, { onDelete: fkData.deleteOption, onUpdate: fkData.updateOption });
                                    // lets add foreign key quries
                                    idxkey.push(fkquery.indexQuery);
                                    foreignkeys.push(fkquery.foreignKeyQuery);
                                } else {
                                    console.error("Having problem deleting foreign key from column. Please check your database connection.");
                                }
                            } else {
                                console.log(cstyler.bold.green("No changes needed on "), cstyler.purple("Database: "), cstyler.blue(dbName), cstyler.purple(" Table: "), cstyler.blue(tableName));
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
                        if (constraintexist || fkdetails) {
                            const dfk = await fncs.removeForeignKeyFromColumn(config, dbName, tableName, columnName);
                            const delkey = await fncs.removeForeignKeyConstraintFromColumn(config, dbName, tableName, columnName);
                            if (dfk === null || delkey === null) {
                                console.error("Having problem removing foreignkey from ", cstyler.purple("Database: "), cstyler.blue(dbName), cstyler.purple(" Table: "), cstyler.blue(tableName), cstyler.purple(" Column Name: "), cstyler.blue(columnName));
                                return null;
                            }
                        }
                    }
                }
            } else if (columndetails === false && !['_charset_', '_collate_'].includes(columnName)) {
                // add column query
                const columnquery = addColumnQuery(columnData, columnName, tableName);
                if (columnquery === null) {
                    console.error("There was an issue when creating column query for", cstyler.purple("Database:"), cstyler.blue(dbName), cstyler.purple("Table:"), cstyler.blue(tableName), cstyler.purple("Column:"), cstyler.blue(columnName));
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
            } else if (['_charset_', '_collate_'].includes(columnName)) {
                // used for storing characterset and collate data
                const notacolumn = true;
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
            console.log("Running query");
            const runquery = await fncs.runQuery(config, dbName, item);
            if (runquery === null) {
                return null;
            }
            console.log(cstyler.blue("Successful"));
        }
        for (const item of idxkey) {
            console.log("Running query of idxkey");
            const runquery = await fncs.runQuery(config, dbName, item);
            if (runquery === null) {
                return null;
            } else if (runquery === false) {
                return null;
            }
            console.log(cstyler.blue("Successful"));
        }
        for (const item of foreignkeys) {
            console.log("Running query of foreignkey");
            const runquery = await fncs.runQuery(config, dbName, item);
            if (runquery === null) {
                return null;
            }
            console.log(cstyler.blue("Successful"));
        }
        console.log(cstyler.underline.green("All column checking are done for"), cstyler.purple("Database:"), cstyler.blue(dbName), cstyler.purple("Table:"), cstyler.blue(tableName), "Lets go>>>");
        return leftfk;
    } catch (err) {
        console.error(err.message);
        return null;
    }
}

async function alterColumnIfNeeded(config, jsondata, separator) {
    try {
        console.log(cstyler.cyan("Let's initiate addColumn to table if needed..."));
        for (const jsondb of Object.keys(jsondata)) {
            let remainfk = {};
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
                let queryText = [];
                let foreignKeyQueries = [];
                const looptable = fncs.perseTableNameWithLoop(jsontable, separator);
                if (looptable === false) {
                    console.error("There must be some mistake. Please re install the module.")
                }
                const tableName = looptable.loopname;
                if (!getalltable.includes(tableName)) {
                    console.error(cstyler.red(`Table ${tableName} does not exist in database ${databaseName}. Skipping...`));
                    continue;
                }
                const allcols = await fncs.getColumnNames(config, databaseName, tableName);
                if (allcols === null) {
                    console.error(cstyler.red(`Failed to get column names for table ${tableName} in database ${databaseName}. Skipping...`));
                    return null;
                }
                for (const jsoncolumn of Object.keys(jsondata[jsondb][jsontable])) {
                    if (!allcols.includes(jsoncolumn)) {
                        // column does not exist, skip it
                        continue;
                    }
                    // lets add the column
                    const columndata = jsondata[jsondb][jsontable][jsoncolumn];
                    const addcolquery = addColumnQuery(columndata, jsoncolumn, tableName);
                    queryText.push(addcolquery);
                    // check for foreign key
                    if (columndata.hasOwnProperty("foreign_key")) {
                        const fk = columndata.foreign_key;
                        const columnExists = await fncs.columnExists(config, databaseName, tableName, jsoncolumn);
                        if (columnExists === null) {
                            console.error(cstyler.red(`Failed to verify existence of column ${jsoncolumn} in table ${tableName}. Skipping foreign key addition.`));
                            return null;
                        }
                        if (columnExists === false) {
                            if (!remainfk.hasOwnProperty(tableName)) remainfk[tableName] = {};
                            remainfk[tableName][jsoncolumn] = fk;
                            continue;
                        }
                        const fkquery = addForeignKeyWithIndexQuery(tableName, jsoncolumn, fk.table, fk.column, { onDelete: fk.deleteOption, onUpdate: fk.updateOption });
                        foreignKeyQueries.push(fkquery);
                    }
                }
                // execute all queries for this table
                for (const qt of queryText) {
                    const execution = await fncs.runQuery(config, databaseName, qt);
                    if (execution === null) {
                        console.error(cstyler.red(`Failed to execute query on table ${tableName} in database ${databaseName}. Query: ${qt}`));
                        return null;
                    }
                    else {
                        console.log(cstyler.green(`Successfully added column on table ${tableName} in database ${databaseName}. Query: ${qt}`));
                    }
                }
                for (const qt of foreignKeyQueries) {
                    const execution = await fncs.runQuery(config, databaseName, qt);
                    if (execution === null) {
                        console.error(cstyler.red(`Failed to execute query on table ${tableName} in database ${databaseName}. Query: ${qt}`));
                        return null;
                    }
                    else {
                        console.log(cstyler.green(`Successfully added foreignkey on table ${tableName} in database ${databaseName}. Query: ${qt}`));
                    }
                }
            }
            // lets add remaining foreign keys
            let foreignKeyQueries = [];
            for (const tbl of Object.keys(remainfk)) {
                for (const col of Object.keys(remainfk[tbl])) {
                    const fk = remainfk[tbl][col];
                    const fkquery = addForeignKeyWithIndexQuery(tbl, col, fk.table, fk.column, { onDelete: fk.deleteOption, onUpdate: fk.updateOption });
                    foreignKeyQueries.push(fkquery);
                    const execution = await fncs.runQuery(config, databaseName, fkquery);
                    if (execution === null) {
                        console.error(cstyler.red(`Failed to execute query on column ${col} on table ${tbl} in database ${databaseName}. Query: ${fkquery}`));
                        return null;
                    }
                    else {
                        console.log(cstyler.green(`Successfully added foreignkey on column ${col} on table ${tbl} in database ${databaseName}. Query: ${fkquery}`));
                    }
                }
            }
        }
        console.log(cstyler.cyan("Adding Column to tables are completed successfully."));
        return true;
    } catch (err) {
        console.error(err.message);
        return null;
    }
}

module.exports = {
    alterColumnQuery,
    alterTableQuery,
    alterColumnIfNeeded
}