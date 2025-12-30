const fncs = require("./function");
const cstyler = require("cstyler");



async function addForeignKeyWithIndexQuery(config, databaseName, tableName, columnName, refTable, refColumn, options = {}) {
    const ACTIONS = new Set(["RESTRICT", "CASCADE", "SET NULL", "NO ACTION"]);

    const onDelete = ACTIONS.has(options.onDelete) ? options.onDelete : "RESTRICT";
    const onUpdate = ACTIONS.has(options.onUpdate) ? options.onUpdate : "RESTRICT";

    const indexName = `idx_${tableName}_${columnName}`;
    const constraintName = `fk_${tableName}_${columnName}`;

    // Combine both ADD INDEX and ADD CONSTRAINT into a single statement
    // Using a comma to separate the actions
    const combinedQuery = `
        ALTER TABLE \`${tableName}\`
        ADD INDEX \`${indexName}\` (\`${columnName}\`),
        ADD CONSTRAINT \`${constraintName}\`
            FOREIGN KEY (\`${columnName}\`)
            REFERENCES \`${refTable}\` (\`${refColumn}\`)
            ON DELETE ${onDelete}
            ON UPDATE ${onUpdate}
    `.trim();

    const runquery = await fncs.runQuery(config, databaseName, combinedQuery);
    return runquery;
}
async function addColumnQuery(columndata, columnName, tableName, databaseName, config) {
    try {
        if (!columndata || !columndata.columntype) {
            throw new Error("columntype is required to add a column. Table: " + tableName + " Column name: " + columnName);
        }

        // Simple identifier escaping for MySQL identifiers
        const escId = (s) => `\`${String(s).replace(/`/g, '``')}\``;

        let queryText = `ALTER TABLE ${escId(tableName)} ADD COLUMN ${escId(columnName)}`;

        // column type
        queryText += ` ${columndata.columntype}`;

        // length / enum / set
        if (columndata.hasOwnProperty("length_value")) {
            const lengthval = columndata.length_value;

            if (typeof lengthval === "number") {
                queryText += `(${lengthval})`;
            } else if (
                Array.isArray(lengthval) &&
                lengthval.length === 2 &&
                lengthval.every(v => typeof v === "number")
            ) {
                queryText += `(${lengthval[0]},${lengthval[1]})`;
            } else if (
                Array.isArray(lengthval) &&
                lengthval.every(v => typeof v === "string")
            ) {
                const escaped = lengthval.map(v => `'${v.replace(/'/g, "''")}'`);
                queryText += `(${escaped.join(",")})`;
            }
        }
        queryText += " ";

        if (columndata.unsigned === true) queryText += "UNSIGNED ";
        if (columndata.zerofill === true) queryText += "ZEROFILL ";

        if (columndata.hasOwnProperty("defaults")) {
            const d = columndata.defaults;
            if (d === null) queryText += "DEFAULT NULL ";
            else if (typeof d === "number") queryText += `DEFAULT ${d} `;
            else if (/^CURRENT_TIMESTAMP$/i.test(String(d))) queryText += `DEFAULT ${d} `;
            else queryText += `DEFAULT '${String(d).replace(/'/g, "''")}' `;
        }

        if (columndata.autoincrement === true) {
            queryText += "AUTO_INCREMENT ";
        }

        if (columndata._charset_) queryText += `CHARACTER SET ${columndata._charset_} `;
        if (columndata._collate_) queryText += `COLLATE ${columndata._collate_} `;

        if (columndata.hasOwnProperty("nulls")) {
            queryText += columndata.nulls ? "NULL " : "NOT NULL ";
        }
        if (columndata.comment) {
            queryText += `COMMENT '${String(columndata.comment).replace(/'/g, "''")}' `;
        }

        // If no index specified, return the column add SQL
        if (!columndata.hasOwnProperty("index") || columndata.index === undefined || columndata.index === null || columndata.index === '') {
            return queryText.trim();
        }

        // index is provided — interpret it as a string describing index type
        let rawIndex = columndata.index;
        if (typeof rawIndex !== 'string') {
            // defensively convert to string if possible
            rawIndex = String(rawIndex);
        }
        const idxToken = rawIndex.trim().toUpperCase();

        // Optional explicit index name
        const idxNameRaw = columndata.index_name || columndata.indexName || null;
        const idxName = idxNameRaw ? escId(idxNameRaw) : null;

        // Optional prefix length for index (integer)
        let idxLength = null;
        if (Number.isInteger(columndata.index_length) && columndata.index_length > 0) {
            idxLength = columndata.index_length;
        } else if (Number.isInteger(columndata.indexLength) && columndata.indexLength > 0) {
            idxLength = columndata.indexLength;
        }

        const colRef = idxLength ? `${escId(columnName)}(${idxLength})` : escId(columnName);

        // normalize common variants to canonical type
        let idxType = 'INDEX';
        if (idxToken === 'PRIMARY' || idxToken === 'PRIMARY KEY') idxType = 'PRIMARY';
        else if (idxToken === 'UNIQUE' || idxToken === 'UNIQUE KEY' || idxToken === 'UNIQUE INDEX') idxType = 'UNIQUE';
        else if (idxToken === 'FULLTEXT' || idxToken === 'FULLTEXT KEY' || idxToken === 'FULLTEXT INDEX') idxType = 'FULLTEXT';
        else if (idxToken === 'SPATIAL' || idxToken === 'SPATIAL KEY' || idxToken === 'SPATIAL INDEX') idxType = 'SPATIAL';
        else idxType = 'INDEX'; // covers INDEX, KEY and others

        // Build index clause. Prepend with comma because we already used ALTER TABLE ... ADD COLUMN ...
        let indexClause = '';
        switch (idxType) {
            case 'PRIMARY':
                // primary key doesn't accept a name
                indexClause = `, ADD PRIMARY KEY (${colRef})`;
                break;
            case 'UNIQUE':
                {
                    const name = idxName || escId(`uniq_${String(tableName).replace(/\W+/g, '_')}_${String(columnName).replace(/\W+/g, '_')}`);
                    indexClause = `, ADD UNIQUE KEY ${name} (${colRef})`;
                }
                break;
            case 'FULLTEXT':
                {
                    const name = idxName || escId(`ft_${String(tableName).replace(/\W+/g, '_')}_${String(columnName).replace(/\W+/g, '_')}`);
                    indexClause = `, ADD FULLTEXT KEY ${name} (${colRef})`;
                }
                break;
            case 'SPATIAL':
                {
                    const name = idxName || escId(`sp_${String(tableName).replace(/\W+/g, '_')}_${String(columnName).replace(/\W+/g, '_')}`);
                    indexClause = `, ADD SPATIAL KEY ${name} (${colRef})`;
                }
                break;
            case 'INDEX':
            default:
                {
                    const name = idxName || escId(`idx_${String(tableName).replace(/\W+/g, '_')}_${String(columnName).replace(/\W+/g, '_')}`);
                    indexClause = `, ADD INDEX ${name} (${colRef})`;
                }
                break;
        }

        queryText += indexClause + ' ';

        queryText = queryText.trim();
        const runquery = await fncs.runQuery(config, databaseName, queryText);
        return runquery;
    } catch (err) {
        console.error(err && err.message ? err.message : String(err));
        return null;
    }
}
async function addColumnIfNeeded(config, jsondata, separator) {
    try {
        console.log(cstyler.bold.yellow("Let's initiate addColumn to table if needed..."));
        for (const jsondb of Object.keys(jsondata)) {
            let remainfk = {};
            const loopdb = fncs.perseDatabaseNameWithLoop(jsondb, separator);
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
                if (fncs.isJsonObject(jsondata[jsondb][jsontable]) === false) { continue }
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
                    if (allcols.includes(jsoncolumn) || fncs.isJsonObject(jsondata[jsondb][jsontable][jsoncolumn]) === false) {
                        // column exists, skip
                        continue;
                    }
                    // lets add the column
                    const columndata = jsondata[jsondb][jsontable][jsoncolumn];
                    const addcolquery = await addColumnQuery(columndata, jsoncolumn, tableName, databaseName, config);
                    if (addcolquery === null) {
                        console.error(cstyler.red(`Failed to add column ${jsoncolumn} to table ${tableName} in database ${databaseName}. Skipping...`));
                        return null;
                    }
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
                        const fkquery = await addForeignKeyWithIndexQuery(config, databaseName, tableName, jsoncolumn, fk.table, fk.column, { onDelete: fk.deleteOption, onUpdate: fk.updateOption });
                        if (fkquery === null) {
                            console.error(cstyler.red(`Failed to prepare foreign key query for column ${jsoncolumn} on table ${tableName} in database ${databaseName}. Skipping...`));
                            return null;
                        }
                    }
                }
            }
            // lets add remaining foreign keys
            let foreignKeyQueries = [];
            for (const tbl of Object.keys(remainfk)) {
                for (const col of Object.keys(remainfk[tbl])) {
                    const fk = remainfk[tbl][col];
                    const fkquery = await addForeignKeyWithIndexQuery(config, databaseName, tbl, col, fk.table, fk.column, { onDelete: fk.deleteOption, onUpdate: fk.updateOption });
                    if (fkquery === null) {
                        console.error(cstyler.red(`Failed to execute query on column ${col} on table ${tbl} in database ${databaseName}. Query: ${fkquery}`));
                        return null;
                    }
                    else {
                        console.log(cstyler.green(`Successfully added foreignkey on column ${col} on table ${tbl} in database ${databaseName}. Query: ${fkquery}`));
                    }
                }
            }
        }
        console.log(cstyler.bold.underline.hex("#b700ffff")("Adding Column to tables are completed successfully."));
        return true;
    } catch (err) {
        console.error(err.message);
        return null;
    }
}

module.exports = {
    addColumnQuery,
    addForeignKeyWithIndexQuery,
    addColumnIfNeeded
};