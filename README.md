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
| **dropdb** | `Boolean`: If true, allows dropping databases. |
| **droptable** | `Boolean`: If true, allows dropping tables. |
| **dropcol** | `Boolean`: If true, allows dropping columns. |
| **donttouch** | `Array`: List of database names protected from deletion. |

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
| **Type** | `type, columntype, column_type, datatype, data_type, typename, type_name` |
| **Length** | `length, size, scale, value, range, precision, maxlength, lengthvalue` |
| **Identity** | `autoincrement, auto_increment, serial, identity` |
| **Default** | `default, defaults, defaultvalue, sample` |
| **Index** | `primarykey, unique_key, fulltext, spatial, index` |
| **Nullability** | `notnull, required, disallownull (vs optional, nullable)` |
| **Comments** | `comment, description, label, note, hint` |

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