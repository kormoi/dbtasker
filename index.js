const fncs = require("./function");
const recordedjson = require("./tableop");
const cstyler = require("cstyler");
const checker = require("./validation");




const moduleName = "dbtasker";
const truers = [true, 1, "1", "true", "True", "TRUE"];
const falsers = [false, 0, "0", "false", "False", "FALSE"];

module.exports = async function (allconfig, table_json) {
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
            'port': allconfig.port
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
        // Declare separator
        let separator = "_";
        const sepkeys = ['sep', 'separator'];
        for (const item of Object.keys(allconfig)) {
            if (sepkeys.includes(item.toLowerCase())) {
                separator = allconfig[item];
                break;
            }
        }
        if (!fncs.isValidMySQLIdentifier(separator)) {
            separator = "_";
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
        const droptablekeys = ['droptable', 'deletetable', 'drop_table', 'delete_table', 'removetable', 'remove_table', 'dropdbtable', 'deletedbtable', 'removedbtable', 'dropdatabasetable', 'deletedatabasetable', 'removedatabasetable', 'drop_db_table', 'delete_db_table', 'remove_db_table', 'drop_database_table', 'delete_database_table', 'remove_database_table'];
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
        const dropcolkeys = ['dropcol', 'dropcolumn', 'deletecol', 'deletecolumn', 'removecol', 'removecolumn', 'drop_col', 'drop_column', 'delete_col', 'delete_column', 'remove_col', 'remove_column'];
        for (const item of Object.keys(allconfig)) {
            if (dropcolkeys.includes(item.toLowerCase())) {
                dropcolumn = allconfig[item];
            }
        }
        if (truers.includes(dropcolumn)) {
            dropcolumn = true;
        } else if (falsers.includes(dropcolumn)) {
            dropcolumn = false;
        } else {
            dropcolumn = true;
        }
        let forcedropcolumn;
        const frocedropcolkey = ['forcedropcol', 'forcedropcolumn', 'forcedeletecol', 'forcedeletecolumn', 'forceremovecol', 'forceremovecolumn', 'force_drop_col', 'force_drop_column', 'force_delete_col', 'force_delete_column', 'force_remove_col', 'force_remove_column'];
        for (const item of Object.keys(allconfig)) {
            if (frocedropcolkey.includes(item.toLowerCase())) {
                forcedropcolumn = allconfig[item];
            }
        }
        if (truers.includes(forcedropcolumn)) {
            forcedropcolumn = true;
        } else if (falsers.includes(forcedropcolumn)) {
            forcedropcolumn = false;
        } else {
            forcedropcolumn = false;
        }
        let forceupdatecolumn;
        const forceupdatecolkey = ['forceupdatecol', 'forcemodifycol', 'forceupdatecolumn', 'forcemodifycolumn', 'force_update_col', 'force_modify_col', 'force_update_column', 'force_modify_column', 'forcealtercol', 'forcealtercolumn', 'force_alter_col', 'force_alter_column'];
        for (const item of Object.keys(allconfig)) {
            if (forceupdatecolkey.includes(item.toLowerCase())) {
                forceupdatecolumn = allconfig[item];
            }
        }
        if (truers.includes(forceupdatecolumn)) {
            forceupdatecolumn = true;
        } else if (falsers.includes(forceupdatecolumn)) {
            forceupdatecolumn = false;
        } else {
            forceupdatecolumn = false;
        }
        console.log(cstyler.bold.underline.yellow("Lets check if the table need an upgrade"))
        // lets check all table name and column name
        const checking = await checker.JSONchecker(table_json, config, separator);
        if (checking.status === false) {
            console.log(cstyler.bold.underline.red("Please correct those information and try again."))
            return;
        }
        const jsondata = checking.data;
        console.log(cstyler.bold.purple("Lets start operation on databases."));
        const dbop = require("./dbop");
        const databaseop = await dbop.databaseAddDeleteAlter(config, jsondata, dropdatabase, donttouchdb, separator);
        if (databaseop === null) {
            console.log(cstyler.bold.underline.red("Error occurred during database operation."));
            return;
        }
        // lets create tables if needed
        const tableop = require("./tableop");
        const createtable = await tableop.createTable(config, jsondata, separator);
        if (createtable === null) {
            console.log(cstyler.bold.underline.red("Error occurred during creating tables."));
            return;
        }
        // Drop tables
        if (droptable) {
            console.log(cstyler.bold.purple("Lets drop unlisted table if needed."));
            const droptableifneeded = await tableop.dropTable(config, jsondata, separator);
            if (droptableifneeded === null) {
                console.log(cstyler.bold.underline.red("Error occurred during dropping tables."));
                return;
            }
        }
        console.log(cstyler.bold.purple("Lets start working on columns"));
        const colop = require("./dropcolumn");

        // lets drop columns if needed
        console.log(cstyler.bold.purple("Lets drop unlisted columns if needed."));
        if (dropcolumn) {
            const dropcolifneeded = await colop.dropcolumn(config, jsondata, forcedropcolumn, forceupdatecolumn, separator);
            if (dropcolifneeded === null) {
                console.log(cstyler.bold.underline.red("Error occurred during dropping columns."));
                return;
            }
        }
        // lets add columns if needed
        const addcolumn = require("./addcolumn");
        console.log(cstyler.bold.purple("Lets add columns if needed."));
        const addcolifneeded = await addcolumn.addColumnIfNeeded(config, jsondata, separator);
        if (addcolifneeded === null) {
            console.log(cstyler.bold.underline.red("Error occurred during adding columns."));
            return;
        }
        // lets alter columns if needed
        const altercolop = require("./altercolumn");
        console.log(cstyler.bold.purple("Lets alter columns if needed."));
        const altercolifneeded = await altercolop.alterColumnIfNeeded(config, jsondata, separator);
        if (altercolifneeded === null) {
            console.log(cstyler.bold.underline.red("Error occurred during altering columns."));
            return;
        }





        console.log(cstyler.bold.underline.green("<<<All database work is done perfectly>>>"));
    } catch (err) {
        console.error(err.message);
        return;
    }
}

