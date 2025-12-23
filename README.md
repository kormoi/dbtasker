# DBTASKER

DBTASKER is a powerful MySQL schema intelligence and query generation module. It allows developers to define database schemas declaratively in JSON. DBTASKER automatically validates, normalizes, and generates correct SQL for tables, columns, indexes, defaults, foreign keys, and more.
It is engine-aware, handles MySQL constraints, and is fully compatible with ORMs or other automation tools.

#### Engine Awareness
DBTASKER supports MySQL engines and handles constraints accordingly:

- InnoDB
- MyISAM
- MEMORY
- CSV
- ARCHIVE
- BLACKHOLE
- FEDERATED
- NDB / NDBCLUSTER
- MRG_MYISAM
- Spider
- RocksDB
- TokuDB


#### Design Philosophy

- Schema-first, declarative JSON
- Validation before SQL generation
- Engine-aware and safe migrations
- Flexible key aliases and metadata support
- Supports both SQL-level and ORM-level annotations


#### Compatibility
- Node.js 16+
- MySQL 5.7+ / 8+


## Core Concept
DBTASKER uses a JSON-driven design:
```js 
Database → Tables → Columns → Column Properties
```

- Database: Name of the MySQL database
- Table: Table within the database
- Column: Column within the table
- Properties: Rules, types, defaults, and constraints


DBTASKER normalizes keys case-insensitively, so multiple naming styles are supported (camelCase, snake_case, uppercase, lowercase).

#### JSON Schema Structure
```js
{
  DatabaseName: {
    TableName: {
      ColumnName: {
        // Column properties
      }
    }
  }
}
```
Demo Schema Example
```js
{
  DatabaseName: {
    TableName: {
      ColumnName: {
        ColumnType: "varchar",
        lengthvalue: 255,
        Null: true,
        defaults: "guest",
        comment: "User email address"
      },
      ColumnTwo: {
        type: "int",
        zerofill: true,
        index: "key",
        Null: false,
        foreign_key: {
          table: "user",
          column: "id",
          delete: true,
          update: true
        }
      }
    }
  }
}
```

## Configuration File

DBTASKER requires a configuration JSON file to connect to your MySQL database and define runtime behavior. This config file allows you to:

- Set database connection credentials
- Control whether databases, tables, or columns are dropped
- Protect specific databases from accidental deletion
- Customize separators or other runtime options

**Basic Database Configuration**
```js
{
  user: "root",
  password: "password123",
  host: "localhost",
  port: 3306
}
```

1. user: MySQL username
2. password: MySQL password
3. host: MySQL host
4. port: MySQL port
5. Drop database
6. Do not delete database Array = []
7. Drop Table
8. Drop Column
9. Database structure as JSON Object

You can control dropping databases, tables, or columns using boolean flags. DBTASKER supports multiple aliases for each option.

#### Drop Database

### Aliases:
You can use these as key when declearing on config JSON object without caring for case sensitivity.
```js
dropdb, dropdatabase, deletedb, deletedatabase,
drop_db, drop_database, delete_db, delete_database,
removedb, removedatabase, remove_db, remove_database
```


**Example:**
```js
dropdb: true
```

### Drop Table
**Aliases:**
You can use these as key when declearing on config JSON object without caring for case sensitivity.
```js
droptable, deletetable, drop_table, delete_table,
removetable, remove_table,
dropdbtable, deletedbtable, removedbtable,
dropdatabasetable, deletedatabasetable, removedatabasetable,
drop_db_table, delete_db_table, remove_db_table,
drop_database_table, delete_database_table, remove_database_table
```


**Example:**
```js
droptable: true
```


### Drop Column
**Aliases:**
You can use these as key when declearing on config JSON object without caring for case sensitivity.
```js
dropcol, dropcolumn, deletecol, deletecolumn,
removecol, removecolumn,
drop_col, drop_column, delete_col, delete_column,
remove_col, remove_column
```


**Example:**
```js
dropcol: false
```

**Protect Databases from Deletion**
If you want to prevent certain databases from being dropped when dropdb is enabled, you can specify an array of database names under any of the aliases below:
You can use these as key when declearing on config JSON object without caring for case sensitivity.
```js
donttouch, donottouch, donttouchdb, donottouchdb,
donttouchdatabase, donottouchdatabase,
dontdelete, donotdelete, dontdeletedb, donotdeletedb,
dontdeletedatabase, donotdeletedatabase,
dont_touch, do_not_touch, dont_touch_db, do_not_touch_db,
dont_touch_database, do_not_touch_database,
dont_delete, do_not_delete, dont_delete_db, do_not_delete_db,
dont_delete_database, do_not_delete_database,
reserveddb, reserved_db
```

**Example:**
```js
donttouch: ["production_db", "legacy_db"]
```

### Separator Option

You can define a custom separator for internal operations:

**Aliases:**
You can use these as key when declearing on config JSON object without caring for case sensitivity.
sep, seperator


**Example:**
```js
sep: "_"
```
Full Example Config File
```js
{
  user: "root",
  password: "password123",
  host: "localhost",
  port: 3306,
  dropdb: true,
  droptable: true,
  dropcol: false,
  donttouch: ["production_db", "analytics_db"],
  sep: "_"
}
```

This configuration will:

- Connect to MySQL using the given credentials
- Drop databases and tables if they exist
- Preserve "production_db" and "analytics_db"
- Avoid dropping columns
- Use _ as a separator internally

## Installation

DBTASKER is available via npm.

Install it using either of the following commands:
```js
npm install DBTASKER
```

or
```js
npm i DBTASKER
```
Usage

DBTASKER is designed to be simple and declarative. You provide:

1. A configuration object (database credentials + behavior options)

2. A JSON schema object (database, tables, columns)

DBTASKER handles the rest.

#### Step 1: Import DBTASKER

Create a JavaScript file (for example: index.js) and import DBTASKER.
```js
Using require (CommonJS)
const DBTASKER = require("DBTASKER");

Using import (ES Module)
import DBTASKER from "DBTASKER";
```

#### Step 2: Create a Configuration Object

This object defines how DBTASKER connects to the database and how it behaves.
```js
const config = {
  host: "localhost",
  user: "root",
  password: "password",
  port: 3306
};
```

You can later extend this config with options like:

- Drop database
- Drop tables
- Drop columns
- Reserved / protected databases

#### Step 3: Define Your Schema JSON Object

Your schema is defined declaratively using a nested JSON structure:
```js
const schema = {
  MyDatabase: {
    users: {
      id: {
        type: "int",
        autoincrement: true,
        primarykey: true
      },
      email: {
        type: "varchar",
        length: 255,
        required: true,
        unique: true
      },
      created_at: {
        type: "timestamp",
        defaults: "CURRENT_TIMESTAMP"
      }
    }
  }
};
```

DBTASKER supports multiple aliases for column keys and is case-insensitive.

#### Step 4: Run DBTASKER

Call DBTASKER by passing the config first, then the schema object.
```js
DBTASKER(config, schema);
```

That’s it.

**DBTASKER will:**
- Connect to MySQL
- Validate your schema
- Create or alter databases, tables, and columns
- Apply indexes, foreign keys, defaults, and constraints

### Full Minimal Example
```js
const DBTASKER = require("DBTASKER");

const config = {
  host: "localhost",
  user: "root",
  password: "password",
  port: 3306,
  droptable: true,
  droptable: true,
  dropcolumn: true,
  donotdelete: ['test', 'example']
};

const schema = {
  app_db: {
    users: {
      id: {
        type: "int",
        primarykey: true,
        autoincrement: true
      },
      name: {
        type: "varchar",
        length: 100,
        required: true
      }
    }
  }
};

DBTASKER(config, schema);
```

**Notes**

### Important:
- The config object must always come first
- The schema JSON object must come second
- All keys are case-insensitive
- Multiple aliases are supported for maximum flexibility


## Column Key Aliases (Case-Insensitive)
DBTASKER allows multiple aliases for each column property. Keys are normalized internally.

**Length / Size / Precision**
You can use these as key when declearing column property inside table object inside JSON object without caring for case sensitivity.
```js
lengthvalue, length_value, size, scale, lengths,
length, value, values, range, maxlength, max_length, precision
```

**Column Type / Data Type**
You can use these as key when declearing column property inside table object inside JSON object without caring for case sensitivity.
```js
type, columntype, column_type,
datatype, data_type, typename, type_name
```

**Zerofill**
You can use these as key when declearing column property inside table object inside JSON object without caring for case sensitivity.
```js
zerofill, zero_fill, iszerofill, zerofillup
```

**Auto Increment / Identity**
You can use these as key when declearing column property inside table object inside JSON object without caring for case sensitivity.
```js
autoincrement, auto_increment, increment,
serial, generated, isidentity, identity
```

**Signed / Unsigned**
You can use these as key when declearing column property inside table object inside JSON object without caring for case sensitivity.
```js
signed, issigned, numericunsigned, numeric_unsigned,
unsigned, isunsigned
```

**Defaults / Default Value**
You can use these as key when declearing column property inside table object inside JSON object without caring for case sensitivity.
```js
default, defaults, defaultvalue, default_value,
example, sample, columndefault, column_default
```

**Null / Not Null**
You can use these as key when declearing column property inside table object inside JSON object without caring for case sensitivity.
Disallow NULL / Required
```js
notnull, not_null, nonnullable, notnullable,
required, disallownull, non_nullable, not_nullable, disallow_null
```

**Allow NULL / Optional**
```js
null, nulls, nullable, optional, isnulable, allownull, canbenull
```

**Index / Key**
You can use these as key when declearing column property inside table object inside JSON object without caring for case sensitivity.
```js
index, spatial, isspatial, fulltext, isfulltext,
isunique, isuniquekey, uniqueindex, uniquekey,
unique_index, unique_key,
primarykey, primary_key, primary, isprimary, isprimarykey,
indexkey, index_key, indexing
```

**Comments / Description / Notes**
You can use these as key when declearing column property inside table object inside JSON object without caring for case sensitivity.
```js
comment, comments, columncomment, column_comment,
description, label, helptext, hint, note
```


**Foreign Key Definition**
Foreign keys are defined inline to reference another table’s column:
```js
foreign_key: {
  table: "user",
  column: "id",
  delete: true,
  update: true
}
```
## Foreign Key Aliases (Case-Insensitive)
DBTASKER accepts:
```js
"fk", "foreign_key", "foreignkey"
```

Foreign Key Properties & Aliases
Property
### Alias Options
#### Purpose
**Table**
```js
"table", "fktable", "fk_table", "foreignkeytable", "foreign_key_table"
```
Referenced table name

**column**
```js
"column", "fkcolumn", "fk_column", "foreignkeycolumn", "foreign_key_column"
```
Referenced column name

**delete**
```js
"delete", "ondelete", "on_delete", "when_Delete", "whenDelete", 'ifdelete', 'if_delete'
```
ON DELETE CASCADE behavior

**update**
```js
"update", "onupdate", "on_update", "ifupdate", "if_update", "when_update", "whenupdate"
```
ON UPDATE CASCADE behavior

You can use value of delete and update option as:
**values**
```js
null, "NULL", "SET NULL", true, "DL", "DEL", "DELETE", "CASCADE", "DEFAULT", "SET DEFAULT", "RESTRICT", "NO ACTION"
```

> Notes:
> DBTASKER automatically normalizes all keys internally.


Foreign key constraints are generated safely and include necessary indexes automatically.



Defaults (Advanced Usage)
Standard SQL: "defaults": "value" → DEFAULT 'value'

Computed / Expressions: "defaults": () => "CURRENT_TIMESTAMP" → SQL expression

JSON / Array: "defaults": [] → JSON default

ORM-only: "applyOnlyInORM": true → used only in runtime



ORM Context
An ORM (Object-Relational Mapping) maps database tables to programming language objects.
DBTASKER is schema-driven, not a full ORM, but can complement ORMs.


DBTASKER JSON can map directly to ORM objects (Sequelize, TypeORM, Prisma, etc.)


Example ORM object:


```js
{
  id: 1,
  name: "Alice",
  email: "alice@example.com",
  isActive: true
}
```


#### Use Cases
Schema builders and migration tools


#### Admin dashboards
Low-code / no-code backends



#### License
MIT


#### Author
Md Nasiruddin Ahmed (Manik)

---Designed for safe, flexible, and high-quality MySQL schema automation.


