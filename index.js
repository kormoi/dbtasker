const fncs = require("./function");
const recordedjson = require("./tables");
const cstyler = require("cstyler");
const checker = require("./validation");
const dbtask = require("./dbtask");




const moduleName = "databaser";

async function runit(config, table_json) {
    try {
        console.log(cstyler.blue("Initializing DBTASKER..."))
        let errorLog = [];
        let availabledatabases = {};
        let unavailabledbnames = [];
        // lets check database type
        const ifmysqldatabase = await fncs.isMySQLDatabase(config);
        if (ifmysqldatabase === false) {
            console.error("My SQL database is required to run ", moduleName, " module. Please install mysql2 to use this module. To install run this code on the terminal > npm install mysql2");
            return;
        }
        const isvalidmysqlversion = await fncs.isMySQL578OrAbove(config);
        if (isvalidmysqlversion === false) {
            console.error("My SQL version 5.7.8 or above is required. Please check if you have installed mysql2. To install: npm install mysql2");
            return;
        }
        // Lets check both json file is same or not
        if (fncs.isJsonObject(table_json)) {
            if (fncs.isJsonSame(table_json, recordedjson)) {
                console.log(cstyler.bold.italic.underline.green("All the tables are up to date. No changes needed"));
                return;
            }
        } else {
            console.error("Please provice a valid json file to continue.");
            return;
        }
        console.log(cstyler.bold.underline.yellow("Table need an upgrade."))
        // json file checking is done
        const databaseNames = Object.keys(table_json);
        if (Array.isArray(databaseNames)) {
            for (let dbName of databaseNames) {
                dbName = dbName.toLocaleLowerCase();
                if (fncs.isValidDatabaseName(dbName)) {
                    const ifexist = await fncs.checkDatabaseExists(config, dbName);
                    if (ifexist === false) {
                        const createDB = await fncs.createDatabase(config, dbName);
                        if (createDB === true) {
                            console.log(`${cstyler.purple('Database name:')} ${cstyler.blue(dbName)} ${cstyler.green('has created successfully.')}`)
                        } else if (createDB === false) {
                            console.log(`${cstyler.purple('Database name:')} ${cstyler.blue(dbName)} ${cstyler.yellow("is already created.")}`)
                        } else {
                            throw new Error("Can not perform. There is a database connection problem.");
                        }
                    } else if (ifexist === true) {
                        console.log(`${cstyler.purple('Database name:')} ${cstyler.blue(dbName)} ${cstyler.green('is available')}`);
                    } else {
                        throw new Error("Can not perform. There is a database connection problem.");
                    }
                } else {
                    errorLog.push(`${cstyler.purple('Database name:')} "${cstyler.yellow(dbName)}" ${cstyler.red("is not valid")}`);
                }
            }
            // Lets check how many database added
            const getalldbnames = await fncs.getAllDatabaseNames(config);
            if (getalldbnames === null) {
                throw new Error("Can not perform. There is a database connection problem.");
            }
            if (Array.isArray(getalldbnames)) {
                for (const items of databaseNames) {
                    if (!getalldbnames.includes(items.toLocaleLowerCase())) {
                        unavailabledbnames.push(items.toLocaleLowerCase());
                        console.error(`${cstyler.purple('Database name:')} ${items} is not available. Please try again.`);
                    } else {
                        availabledatabases[items] = table_json[items];
                    }
                }
            }
            if (Object.keys(availabledatabases).length === 0) {
                console.error("There is no available database to work on tables.");
                return;
            }
            if (unavailabledbnames.length > 0) {
                console.error("Check these databases that are not available.\n", cstyler.blue(unavailabledbnames.join(", ")));
            }
            // lets check all table name and column name
            const checkeing = await checker.JSONchecker(table_json, config);
            if (checkeing === false) {
                console.log(cstyler.bold.underline.red("Please correct those information and try again."))
                return;
            }
            //console.log(JSON.stringify(checkeing, null, 2))
            // table json file checking done
            // lets work on tables
            const tableAdded = await dbtask.dbTask(config, checkeing.data);

        }
    } catch (err) {
        console.error(err.message);
        return;
    }
}







const { DBInfo } = require("./app");
const tables = require("./user_tables");
runit(DBInfo, tables);