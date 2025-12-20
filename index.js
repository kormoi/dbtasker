const fncs = require("./function");
const recordedjson = require("./tables");
const cstyler = require("cstyler");
const checker = require("./validation");
const dbtask = require("./dbtask");




const moduleName = "databaser";

async function runit(allconfig, table_json) {
    try {
        console.log(cstyler.blue("Initializing DBTASKER..."))
        let errorLog = [];
        let availabledatabases = {};
        let unavailabledbnames = [];
        // check if enough database available on table json
        const databaseNames = Object.keys(table_json);
        if (databaseNames.length === 0) {
            console.error(cstyler.bold("No data in table information object. Please add some database and tables."));
            return;
        }
        // Check config
        console.log("Lets check config");
        const isvalidconfig = fncs.isValidMySQLConfig(allconfig);
        if (isvalidconfig === false) {
            console.error("Please check your config object. It may requires more information...");
            return;
        }
        const config = {
            'host': allconfig.host,
            'user': allconfig.user,
            'password': allconfig.password,
            'port': allconfig.port,
            'waitForConnections': true,
            'connectionLimit': 100
        }
        // get don't touch database
        let donttouchdb = [];
        const donttouchkeys = ['donttouch', 'donottouch', 'donttouchdb', 'donottouchdb', 'donttouchdatabase', 'donottouchdatabase', 'dontdelete', 'donotdelete', 'dontdeletedb', 'donotdeletedb', 'dontdeletedatabase', 'donotdeletedatabase', 'dont_touch', 'do_not_touch', 'dont_touch_db', 'do_not_touch_db', 'dont_touch_database', 'do_not_touch_database', 'dont_delete', 'do_not_delete', 'dont_delete_db', 'do_not_delete_db', 'dont_delete_database', 'do_not_delete_database', 'reserveddb', 'reserved_db'];
        for(const item of donttouchkeys){
            if(allconfig.hasOwnProperty(item)){
                if(Array.isArray(allconfig[item])){
                    for(const dbs of allconfig[item]){
                        if(typeof dbs !== "string"){
                            console.error("Non deletable database names must string. Please provide valid data type.");
                            return;
                        }
                    }
                    donttouchdb = allconfig[item];
                } else {
                    console.error(cstyler.bold("Please provide database name as an array that can not be deleted."));
                    return;
                }
            }
        }
        // Declare seperator
        let seperator = "_";
        if (allconfig.seperator && fncs.isValidMySQLIdentifier(allconfig.seperator)) {
            seperator = allconfig.seperator;
        }
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
        // lets check all table name and column name
        const checking = await checker.JSONchecker(table_json, config, seperator);
        if (checking === false) {
            console.log(cstyler.bold.underline.red("Please correct those information and try again."))
            return;
        }
        //console.log(checking)
        console.log(JSON.stringify(checking, null, 2))
        // table json file checking done
        // lets work on tables
        //const tableAdded = await dbtask.dbTask(config, checkeing.data, seperator);


    } catch (err) {
        console.error(err.message);
        return;
    }
}







const { DBInfo } = require("./app");
const tables = require("./user_tables");
runit(DBInfo, tables);