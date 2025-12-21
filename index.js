const fncs = require("./function");
const recordedjson = require("./tables");
const cstyler = require("cstyler");
const checker = require("./validation");




const moduleName = "dbtasker";
const truers = [true, 1, "1", "true", "True", "TRUE"];

async function runit(allconfig, table_json) {
    try {
        console.log(cstyler.blue("Initializing DBTASKER..."))
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
        for (const item of Object.keys(allconfig)) {
            if (donttouchkeys.includes(item.toLowerCase())) {
                if (Array.isArray(allconfig[item])) {
                    for (const dbs of allconfig[item]) {
                        if (typeof dbs !== "string") {
                            console.error("Non deletable database names must be string. Please provide valid data type.");
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
        const sepkeys = ['sep', 'Sep', 'Seperator', 'seperator'];
        for (const item of sepkeys) {
            if (allconfig.hasOwnProperty(item)) {
                seperator = allconfig[item];
                break;
            }
        }
        if (!fncs.isValidMySQLIdentifier(seperator)) {
            seperator = "_";
        }
        let dropdatabase;
        const dropdbkeys = ['dropdb', 'dropdatabase', 'deletedb', 'deletedatabase', 'drop_db', 'drop_database', 'delete_db', 'delete_database', 'removedb', 'removedatabase', 'remove_db', 'remove_database'];
        for (const item of Object.keys(allconfig)) {
            if (dropdbkeys.includes(item.toLowerCase())) {
                dropdatabase = allconfig[item];
            }
        }
        if (truers.includes(dropdatabase)) {
            dropdatabase = true;
        } else {
            dropdatabase = false;
        }
        let droptable;
        const droptablekeys = ['droptable', 'deletetable', 'drop_table', 'delete_table', 'removetable', 'remove_table', 'dropdbtable', 'deletedbtable', 'removedbtable', 'dropdatabasetable', 'deletedatabasetable', 'removedatabasetable', 'drop_db_table', 'delete_db_table', 'remove_db_table', 'drop_database_table', 'delete_database_table', 'remove_database_table',];
        for (const item of Object.keys(allconfig)) {
            if (droptablekeys.includes(item.toLowerCase())) {
                droptable = allconfig[item];
            }
        }
        if (truers.includes(droptable)) {
            droptable = true;
        } else {
            droptable = false;
        }
        let dropcolumn;
        const dropcolkeys = ['dropcol', 'dropcolumn', 'deletecol', 'deletecolumn', 'removecol', 'removecolumn', 'drop_col', 'drop_column', 'delete_col', 'delete_column', 'remove_col', 'remove_column',];
        for (const item of Object.keys(allconfig)) {
            if (dropcolkeys.includes(item.toLowerCase())) {
                dropcolumn = allconfig[item];
            }
        }
        if (truers.includes(dropcolumn)) {
            dropcolumn = true;
        } else {
            dropcolumn = false;
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
        /**
         * need to work on this section
         */
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
        if (checking.status === false) {
            console.log(cstyler.bold.underline.red("Please correct those information and try again."))
            return;
        }
        const jsondata = checking.data;
        console.log(JSON.stringify(checking, null, 2))
        console.log(cstyler.bold.purple("Lets start operation on databases."));
        const dbop = require("./dbop");
        const databaseop = await dbop.databaseAddDeleteAlter(config, jsondata, dropdatabase, donttouchdb, seperator);
        if (databaseop === null) {
            return;
        }
        // Drop tables
        if (droptable) {
            console.log(cstyler.bold.purple("Lets drop unlisted table if needed."));
            const droptableifneeded = await dbop.dropTable(config, jsondata, seperator);
            if (droptableifneeded === null) {
                return;
            }
        }

        console.log(cstyler.bold.purple("Lets start working on columns"));
        const colop = require("./columnop");
        const columnop = await colop.columnAddDeleteAlter(config, jsondata, dropcolumn, seperator);
        if (columnop === null) {
            return;
        }
        console.log(cstyler.green("All database work is done perfectly."));

        /**
         * Let's store on js file
         */
        //console.log(checking)
        // table json file checking done
        // lets work on tables
        //const tableAdded = await dbtask.dbTask(config, checkeing.data, seperator);
        console.log(cstyler.yellow("All work has done. You are good to go..."))

    } catch (err) {
        console.error(err.message);
        return;
    }
}







const { DBInfo } = require("./app");
const tables = require("./user_tables");
runit(DBInfo, tables);