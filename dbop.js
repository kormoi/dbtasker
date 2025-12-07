const fncs = require("./function");
const recordedjson = require("./tables");
const cstyler = require("cstyler");
const checker = require("./validation");
const dbtask = require("./dbtask");

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

async function databaseAddDeleteAlter(config, jsondata, dropdb = false, seperator = "_") {
    try {
        // lets add databases and drop databases
        let jsondbnames = Object.keys(jsondata);

        const avldblist = await fncs.getAllDatabaseNames(config);
        if (!Array.isArray(avldblist)) {
            console.error(cstyler.red.bold("There is a problem connecting to the database. Please check database info or connection."));
            return null;
        }
        // Lets add databases
        for (const jsondb of jsondbnames) {
            let data = {};
            data.name = fncs.perseDatabaseNameWithLoop(jsondb, seperator);
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
                console.log(cstyler.purple("Database Name: "), cstyler.blue(jsondb), " is exist. Checking for charactar set and collate configuration");
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
                console.log(cstyler.purple("Database Name: "), cstyler.blue(jsondb), " do not exist.");
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
                if (defaultdb.includes(dbnms)) { continue }
                const getrev = fncs.reverseLoopName(dbnms);
                if (arrngdbnms.hasOwnProperty(getrev)) {
                    arrngdbnms[getrev].push(dbnms);
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
    } catch (err) {
        console.error(err.message);
        return null;
    }
}

module.exports = {
    databaseAddDeleteAlter
}