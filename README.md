# 🗄️ DBTASKER

The Intelligent MySQL Schema Automation Engine
`dbtasker` is a powerful, engine-aware MySQL schema intelligence and query generation module. It allows developers to define database structures declaratively using JSON, providing automated validation, normalization, and SQL generation for tables, columns, indexes, and foreign keys.



## 🚀 Key Features
- **Declarative Schema:** Define your entire database structure in a single JSON object.
- **Engine Awareness:** Optimized for MySQL engines including InnoDB, MyISAM, RocksDB, and more.
- **Validation First:** Validates and normalizes your schema before any SQL is executed.
- **Intelligent Migration:** Safe handling of ALTER, DROP, and CREATE operations.
- **Alias Flexibility:** Case-insensitive keys and multiple naming aliases (camelCase, snake_case, etc.).



## 📦 Installation
`Bash`
```js
npm install dbtasker
```



## 🛠️ Configurationd
btasker requires a configuration object to manage connection credentials and safety behaviors.
Property | Description
| :--- | :--- |
| **host** | MySQL Host (e.g., `localhost`) |
| **user** | Database Username |
| **password** | Database Password |
| **port** | Connection Port (Default: `3306`) |
| **drop database** | `Boolean`: If true, allows dropping databases. |
| **drop table** | `Boolean`: If true, allows dropping tables. |
| **drop column** | `Boolean`: If true, allows dropping columns. |
| **do not touch** | `Array`: List of database names protected from deletion. |
| **force delete column** | `Boolean`: If true, allow dropping column even if referanced by any other column. |
| **force update column** | `Boolean`: It is set `default: false` If true, allow updating column even if referanced by any other column. This one is very powerful. If you turn it on it will remove any foreign key that is referanced to the column is being updated then update the column then add the foreign key to those column again and if the column is set to `UNIQUE` it will remove all the column value that are simillar. |

### Configuration Example
`JavaScript`
```js
const config = {
  user: "root",
  password: "password123",
  host: "localhost",
  port: 3306,
  dropdb: true,
  droptable: true,
  dropcol: false,
  donttouch: ["production_db", "analytics_db"],
  sep: "_" 
};
```



## 📐 Schema Structure
The schema follows a strict nested hierarchy:

```Database ➔ Table ➔ Column ➔ Properties```

`JavaScript`
```js
const schema = {
  app_db: {
    users: {
      id: {
        type: "int",
        primarykey: true,
        autoincrement: true
      },
      email: {
        type: "varchar",
        length: 255,
        required: true,
        unique: true,
        comment: "User email address"
      },
      created_at: {
        type: "timestamp",
        defaults: "CURRENT_TIMESTAMP"
      }
    }
  }
};
```



## 🔗 Foreign Keys
Foreign keys are defined inline within the column property to reference another table's column.
`JavaScript`
```js
ColumnTwo: {
  type: "int",
  index: "key",
  foreign_key: {
    table: "user",
    column: "id",
    delete: "CASCADE", // Options: true, "SET NULL", "RESTRICT", etc.
    update: true
  }
}
```
### Foreign Key Properties
| Property | Description |
| :---: | :--- |
| `table` | Referenced table name |
| `column` | Referenced column name |
| `delete` | `ON DELETE` behavior (CASCADE, SET NULL, RESTRICT, NO ACTION) |
| `update` | `ON UPDATE` behavior (CASCADE, SET NULL, RESTRICT, NO ACTION) |



## 📑 Property Aliases
`dbtasker` is highly flexible and accepts multiple aliases for each column property. All keys are **case-insensitive.**

| Feature | Supported Aliases |
| :--- | :--- |
| **Do not touch** | `'donttouch', 'donottouch', 'donttouchdb', 'donottouchdb', 'donttouchdatabase', donottouchdatabase', 'dontdelete', 'donotdelete', 'dontdeletedb', 'donotdeletedb', 'dontdeletedatabase', 'donotdeletedatabase', 'dont_touch', 'do_not_touch', 'dont_touch_db', 'do_not_touch_db', 'dont_touch_database', 'do_not_touch_database', 'dont_delete', 'do_not_delete', 'dont_delete_db', 'do_not_delete_db', 'dont_delete_database', 'do_not_delete_database', 'reserveddb', 'reserved_db'` |
| **Drop Database** | `'dropdb', 'dropdatabase', 'deletedb', 'deletedatabase', 'drop_db', 'drop_database', 'delete_db', 'delete_database', 'removedb', 'removedatabase', 'remove_db', 'remove_database'` |
| **Drop Table** | `'droptable', 'deletetable', 'drop_table', 'delete_table', 'removetable', 'remove_table', 'dropdbtable', 'deletedbtable', 'removedbtable', 'dropdatabasetable', 'deletedatabasetable', 'removedatabasetable', 'drop_db_table', 'delete_db_table', 'remove_db_table', 'drop_database_table', 'delete_database_table', 'remove_database_table'` |
| **Drop Column** | `'dropcol', 'dropcolumn', 'deletecol', 'deletecolumn', 'removecol', 'removecolumn', 'drop_col', 'drop_column', 'delete_col', 'delete_column', 'remove_col', 'remove_column'` |
| **Force Drop Column** | `'forcedropcol', 'forcedropcolumn', 'forcedeletecol', 'forcedeletecolumn', 'forceremovecol', 'forceremovecolumn', 'force_drop_col', 'force_drop_column', 'force_delete_col', 'force_delete_column', 'force_remove_col', 'force_remove_column'` |
| **Force Update Column** | `'forceupdatecol', 'forcemodifycol', 'forceupdatecolumn', 'forcemodifycolumn', 'force_update_col', 'force_modify_col', 'force_update_column', 'force_modify_column', 'forcealtercol', 'forcealtercolumn', 'force_alter_col', 'force_alter_column'` |
| **Type** | `type, columntype, column_type, datatype, data_type, typename, type_name` |
| **Length** | `length, size, scale, value, range, precision, maxlength, lengthvalue` |
| **Zerofill** | `zerofill, zero_fill, iszerofill, zerofillup, zero, fillzero, fill_zero, iszero` |
| **Unsigned** | `unsigned, signed, issigned, isunsigned, numericsigned, numericunsigned` |
| **Identity** | `autoincrement, auto_increment, increment, generated, isidentity, serial, identity` |
| **Default** | `default, defaults, defaultvalue, default_value, example, sample, columndefault, column_default` |
| **Index** | `index, indexkey, index_key, indexing` |
| `PrimaryKey` | `primarykey, primary_key, primary, isprimary, isprimarykey` |
| `UniqueKey` | `unique, isunique, isuniquekey, uniqueindex, uniquekey, unique_index, unique_key` |
| `FulltextKey` | `fulltext, fulltextindex, isfulltextkey, fulltextkey, fulltext_key, isfulltext` |
| `SpatialKey` | `spatial, spatialindex, isspatialkey, spatialkey, spatial_key, isspatial` |
| **Nullability** | `null, nulls, nullable, optional, isnulable, allownull, canbenull, notnull, not_null, nonnullable, notnullable, required, disallownull, non_nullable, not_nullable, disallow_null` |
| **Comments** | `comment, comments, columncomment, column_comment, description, label, helptext, hint, note` |
| **ForeignKey** | `fk, fuck, foreign_key, foreignkey` |



## 🛡️ Compatibility & Engines
- **Node.js:** 16.x or higher
- **MySQL:** 5.7+ / 8.0+
- **Engines:** InnoDB, MyISAM, MEMORY, RocksDB, TokuDB, and more.



## 🏁 Quick Start
`JavaScript`
```js
const dbtasker = require("dbtasker");

const config = { 
  host: "localhost", 
  user: "root", 
  password: "password" 
};

const schema = {
  store_db: {
    products: {
      id: { type: "int", primarykey: true, autoincrement: true },
      name: { type: "varchar", length: 100, required: true }
    }
  }
};

// Connect, Validate, and Automate
dbtasker(config, schema);
```



## 👨‍💻 Author
**Md Nasiruddin Ahmed (Manik)** Designed for safe, flexible, and high-quality MySQL schema automation. 🌐 Visit us at: kormoi.com

**License:** MIT