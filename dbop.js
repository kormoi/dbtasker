const fncs = require("./function");
const cstyler = require("cstyler");
const mysql = require('mysql2/promise');




const defaultdb = ['information_schema', 'mysql', 'performance_schema', 'sys', 'world'];

async function alterDatabaseCharsetCollate(config, databaseName, characterSet, collate) {
    if (!databaseName || typeof databaseName !== "string")
        throw new Error("Invalid database name.");

    if (!characterSet || typeof characterSet !== "string")
        throw new Error("Invalid character set.");

    if (!collate || typeof collate !== "string")
        throw new Error("Invalid collation.");

    // Validate MySQL naming patterns (alphanumeric, underscore, dash)
    const validName = /^[A-Za-z0-9_-]+$/;
    if (!validName.test(databaseName))
        throw new Error(`Invalid database name format: ${databaseName}`);

    let connection;
    try {
        connection = await mysql.createConnection(config);

        const query = `
            ALTER DATABASE \`${databaseName}\`
            CHARACTER SET ${characterSet}
            COLLATE ${collate};
        `;

        await connection.query(query);
        console.log(`${cstyler.purple('Database:')} '${cstyler.blue(databaseName)}' character set changed to '${cstyler.yellow(characterSet)}' and collation to '${cstyler.yellow(collate)}'.`);
        return true;
    } catch (err) {
        console.error("Error altering database:", err.message);
        return null;
    } finally {
        if (connection) await connection.end();
    }
}
async function createDatabase(config, databaseName, characterSet = null, collate = null) {
    if (!databaseName || typeof databaseName !== "string")
        throw new Error("Invalid database name.");

    // Validate MySQL naming patterns (alphanumeric, underscore, dash)
    const validName = /^[A-Za-z0-9_-]+$/;
    if (!validName.test(databaseName))
        throw new Error(`Invalid database name format: ${databaseName}`);

    // Validate optional charset + collate
    if (characterSet !== null && typeof characterSet !== "string")
        throw new Error("Invalid character set (must be string or null).");

    if (collate !== null && typeof collate !== "string")
        throw new Error("Invalid collation (must be string or null).");

    let connection;
    try {
        connection = await mysql.createConnection(config);

        // Build query dynamically depending on optional charset/collation
        let query = `CREATE DATABASE \`${databaseName}\``;

        if (characterSet) query += ` CHARACTER SET ${characterSet}`;
        if (collate) query += ` COLLATE ${collate}`;

        query += ";";

        await connection.query(query);

        console.log(
            `${cstyler.purple('Database:')} '${cstyler.blue(databaseName)}'` +
            (characterSet ? ` created with CHARACTER SET '${cstyler.yellow(characterSet)}'` : "") +
            (collate ? ` and COLLATE '${cstyler.yellow(collate)}'` : "")
        );
        return true;
    } catch (err) {
        console.error("Error creating database:", err.message);
        return null;
    } finally {
        if (connection) await connection.end();
    }
}
async function dropTable(config, json_data, seperator = "_") {
    try {
        console.log("Starting dropping the table.");
        for (const jsondb of Object.keys(json_data)) {
            let dbname = fncs.perseDatabaseNameWithLoop(jsondb, seperator);
            if (dbname === false) {
                console.error("There must be some mistake. Please re install the module.");
            }
            const alltables = await fncs.getTableNames(config, dbname.loopname);
            if (alltables === null) {
                console.error("Having problem getting all the table name of the Database: ", cstyler.yellow(dbname.loopname), ". Please re-install the module.");
                return null;
            }
            let tables = {};
            for (const tableName of (alltables)) {
                const revlpnm = fncs.reverseLoopName(tableName);
                if (!Object.keys(json_data[jsondb]).includes(revlpnm[0]) && !Object.keys(json_data[jsondb]).includes(revlpnm[1])) {
                    const droptable = await fncs.dropTable(config, dbname.loopname, tableName);
                    if (droptable === null) {
                        console.error("Having problem dropping table. Please check database connection.");
                        return null;
                    }
                    console.log(cstyler.purple("Database: "), cstyler.blue(dbname.loopname),cstyler.purple("Table: "), cstyler.blue(tableName), "- has dropped successfully.")
                }
            }
            console.log(cstyler.green("Successfully dropped all unlisted tables."));
            return true;
        }
    } catch (err) {
        console.error(err.message);
        return null;
    }
}
async function databaseAddDeleteAlter(allconfig, jsondata, dropdb = false, donttouchdb = [], seperator = "_") {
    try {
        // lets add databases and drop databases
        let config;
        if (fncs.isValidMySQLConfig(allconfig)) {
            config = { "port": allconfig.port, "host": allconfig.host, "user": allconfig.user, "password": allconfig.password }
        } else {
            console.error(cstyler.bold("Invalid config"));
            return null;
        }
        let jsondbnames = Object.keys(jsondata);
        const avldblist = await fncs.getAllDatabaseNames(config);
        if (!Array.isArray(avldblist)) {
            console.error(cstyler.red.bold("There is a problem connecting to the database. Please check database info or connection."));
            return null;
        }
        // Lets add databases
        for (const jsondb of jsondbnames) {
            let data = {};
            data.name = fncs.perseDatabaseNameWithLoop(jsondb, seperator).loopname;
            if (fncs.isJsonObject(jsondata[jsondb])) {
                if (jsondata[jsondb].hasOwnProperty("_collate_")) {
                    data.collate = jsondata[jsondb]._collate_;
                } else {
                    data.collate = null;
                }
                if (jsondata[jsondb].hasOwnProperty("_charset_")) {
                    data.charset = jsondata[jsondb]._charset_;
                } else {
                    data.charset = null;
                }
            } else {
                console.error("Pleaes re-install the module. Some functions are missing.");
                return null;
            }
            if (avldblist.includes(data.name)) {
                // Let's Alter database if needed
                console.log(cstyler.purple("Database Name: "), cstyler.blue(data.name), " is exist. Checking for charactar set and collate configuration");
                const dbdetails = await fncs.getDatabaseCharsetAndCollation(config, data.name);
                if (!fncs.isJsonObject(dbdetails)) {
                    console.error(cstyler.bold("Having problem getting database character set and collate."));
                    return null;
                } else {
                    if ((data.charset === null || dbdetails.characterSet === data.charset) && (data.collate === null || dbdetails.collation === data.collate)) {
                        console.log(cstyler.purple("Database: "), cstyler.blue(data.name), cstyler.yellow(" no changes needed."))
                    } else {
                        // lets alter the database charset and collate
                        if (data.charset === null) {
                            data.charset = dbdetails.characterSet;
                        }
                        if (data.collate === null) {
                            data.collate = dbdetails.collation;
                        }
                        const altered = await alterDatabaseCharsetCollate(config, data.name, data.charset, data.collate);
                        if (altered === null) {
                            return null;
                        }
                    }
                }

            } else {
                // Let's Create database
                console.log(cstyler.purple("Database Name: "), cstyler.blue(data.name), " do not exist.");
                console.log("Lets create Database: ", cstyler.yellow(jsondb));
                const createdb = await createDatabase(config, data.name, data.charset, data.collate);
                if (createdb === true) {
                    console.log(cstyler.purple("Database Name: "), cstyler.blue(jsondb), cstyler.green(" have created successfully"));
                } else if (createdb === false) {
                    console.error("Trying to create this ", cstyler.blue(jsondb), " database when it do not exist on the list all existing database. But when creating server says it already exist. There must be a database problem.");
                    console.log(cstyler.purple("All available Database names are: "), cstyler.blue(avldblist.join(", ")));
                    return null;
                } else {
                    return null;
                }
            }
        }
        // Lets drop database
        if (dropdb) {
            // Lets get all database name
            const avldblist = await fncs.getAllDatabaseNames(config);
            if (!Array.isArray(avldblist)) {
                console.error(cstyler.red.bold("There is a problem connecting to the database. Please check database info or connection."));
                return null;
            }
            // Let's arrange database names
            let arrngdbnms = {};
            for (const dbnms of avldblist) {
                if ([...defaultdb, ...donttouchdb].includes(dbnms)) { continue }
                const getrev = fncs.reverseLoopName(dbnms);
                if (arrngdbnms.hasOwnProperty(getrev)[0]) {
                    arrngdbnms[getrev[0]].push(dbnms);
                } else if (arrngdbnms.hasOwnProperty(getrev)[1]) {
                    arrngdbnms[getrev[1]].push(dbnms);
                } else {
                    arrngdbnms[getrev] = [dbnms];
                }
            }
            for (const databaseName of Object.keys(arrngdbnms)) {
                if (!jsondbnames.includes(databaseName)) {
                    for (const items of arrngdbnms[databaseName]) {
                        await fncs.dropDatabase(config, items);
                    }
                }
            }
        }
        return true;
    } catch (err) {
        console.error(err.message);
        return null;
    }
}

module.exports = {
    databaseAddDeleteAlter,
    dropTable
}