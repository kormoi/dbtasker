const fncs = require("./function");
const recordedjson = require("./tables");
const cstyler = require("cstyler");
const checker = require("./validation");
const dbtask = require("./dbtask");

const defaultdb = ['information_schema', 'mysql', 'performance_schema', 'sys'];

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
        return `✅ Database '${databaseName}' character set changed to '${characterSet}' and collation to '${collate}'.`;

    } catch (err) {
        console.error("❌ Error altering database:", err.message);
        throw err;
    } finally {
        if (connection) await connection.end();
    }
}

async function dbop(config, jsondata, dropdb = false) {
    try {
        let jsondbnames = undefined;
        if (fncs.isJsonObject(jsondata)) {
            jsondbnames = Object.keys(jsondata);
        } else return false;
        const avldblist = await fncs.getAllDatabaseNames(config);
        if (!Array.isArray(avldblist)) {
            console.error(cstyler.red.bold("There is a problem connecting to the database. Please check database info or connection."));
            return null;
        }
        // Lets add databases
        for (const jsondb of jsondbnames) {
            let data = {};
            data.name = jsondb.toLowerCase();
            if (fncs.isJsonObject(jsondata[jsondb])) {
                if (jsondata[jsondb].hasOwnProperty("_collate_")) {
                    data.collate = jsondata[jsondb]._collate_;
                }
                if (jsondata[jsondb].hasOwnProperty("_charset_")) {
                    data.charset = jsondata[jsondb]._charset_;
                }
            } else {
                console.error("Pleaes re-install the module. Some functions are missing.");
                return null;
            }
            if (avldblist.includes(jsondb)) {
                // Alter database
                console.log(cstyler.purple("Database Name: "), cstyler.blue(jsondb), " is exist. Checking for charactar set and collate configuration");
                const dbdetails = {characterSet, collation} = await fncs.getDatabaseCharsetAndCollation(config, jsondb);
            } else {
                // create database
                console.log(cstyler.purple("Database Name: "), cstyler.blue(jsondb), " do not exist.");
                const createdb = await fncs.createDatabase(config, data);
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
            const keepdb = [...defaultdb, ...jsondbnames];
            for (const databaseName of avldblist) {
                if (!keepdb.includes(databaseName.toLowerCase())) {
                    const dropdb = await fncs.dropDatabase(config, databaseName);
                    avldblist = fncs.removefromarray(avldblist, databaseName);
                }
            }

        }
    } catch (err) {
        console.error(err.message);
        return null;
    }
}