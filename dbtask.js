const mysql = require("mysql2/promise");
const fncs = require("./function");
const cstyler = require("cstyler");

let x = [
      "CREATE TABLE IF NOT EXISTS cart (id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, buyer_id BIGINT NULL COMMENT 'Foreign key referencing users table', session_id VARCHAR(255) NULL COMMENT 'Stores session ID for guest users', item_type VARCHAR(100) NOT NULL DEFAULT 'sell_item', item_id BIGINT NOT NULL, currency VARCHAR(5) NOT NULL DEFAULT 'BDT', price FLOAT NOT NULL DEFAULT '0', quantity INT NOT NULL DEFAULT '1', platform_charge FLOAT NOT NULL DEFAULT '0' COMMENT 'Platform charge in percentage.', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE SET NULL) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
]

async function dbTask(config, table_config, availabledatabase) {
    try {
        for (const databaseName of Object.keys(availabledatabase)) {
            config.database = databaseName.toLocaleLowerCase();
            const dbTableNames = await fncs.getTableNames(config, databaseName.toLocaleLowerCase());
            if (dbTableNames === null) return null;
            const JSONTableNames = Object.keys(availabledatabase[databaseName]).map(name => name.toLocaleLowerCase());
            for (const JSONTableName of JSONTableNames) {
                if (dbTableNames.includes(JSONTableName)) {
                    // alter table
                    // Drop Column
                } else {
                    // insert table
                    let queryText = `CREATE TABLE IF NOT EXISTS ${JSONTableName.toLocaleLowerCase()} (`;


                    queryText += ") CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
                }
            }
            // Drop Table
            if (table_config.drop_table === true && dbTableNames.length > 0) {
                let dropTableList = [];
                for (const dbTableName of dbTableNames) {
                    if (!JSONTableNames.includes(dbTableName)) {
                        dropTableList.push(dbTableName);
                    }
                }
                await fncs.dropTables(config, databaseName.toLocaleLowerCase(), dropTableList);
            }
        }
    } catch (err) {
        console.error(err.message);
        return null;
    }
}

module.exports = {
    dbTask
}