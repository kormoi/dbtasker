# dbtasker

DbTasker
DbTasker is a powerful MySQL schema intelligence and query generation module. It allows developers to define database schemas declaratively in JSON. DbTasker automatically validates, normalizes, and generates correct SQL for tables, columns, indexes, defaults, foreign keys, and more.
It is engine-aware, handles MySQL constraints, and is fully compatible with ORMs or other automation tools.

Core Concept
DbTasker uses a schema-first, JSON-driven design:
Database → Tables → Columns → Column Properties

Database: Name of the MySQL database


Table: Table within the database


Column: Column within the table


Properties: Rules, types, defaults, and constraints


DbTasker normalizes keys case-insensitively, so multiple naming styles are supported (camelCase, snake_case, uppercase, lowercase).

JSON Schema Structure
{
  DatabaseName: {
    TableName: {
      ColumnName: {
        // Column properties
      }
    }
  }
}

Demo Schema Example
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


Column Key Aliases (Case-Insensitive)
DbTasker allows multiple aliases for each column property. Keys are normalized internally.
Zerofill
zerofill, zero_fill, iszerofill, zerofillup

Defaults / Default Value
default, defaults, defaultvalue, default_value,
example, sample, columndefault, column_default

Signed / Unsigned
signed, issigned, numericunsigned, numeric_unsigned,
unsigned, isunsigned

Comments / Description / Notes
comment, comments, columncomment, column_comment,
description, label, helptext, hint, note

Null / Not Null
Disallow NULL / Required
notnull, not_null, nonnullable, notnullable,
required, disallownull, non_nullable, not_nullable, disallow_null

Allow NULL / Optional
null, nulls, nullable, optional, isnulable, allownull, canbenull

Index / Key
index, spatial, isspatial, fulltext, isfulltext,
isunique, isuniquekey, uniqueindex, uniquekey,
unique_index, unique_key,
primarykey, primary_key, primary, isprimary, isprimarykey,
indexkey, index_key, indexing

Auto Increment / Identity
autoincrement, auto_increment, increment,
serial, generated, isidentity, identity

Length / Size / Precision
lengthvalue, length_value, size, scale, lengths,
length, value, values, range, maxlength, max_length, precision

Column Type / Data Type
type, columntype, column_type,
datatype, data_type, typename, type_name


Foreign Key Definition
Foreign keys are defined inline to reference another table’s column:
foreign_key: {
  table: "user",
  column: "id",
  delete: true,
  update: true
}

Foreign Key Aliases (Case-Insensitive)
DbTasker accepts:
"fk", "foreign_key", "foreignkey"

Foreign Key Properties & Aliases
Property
Alias Options
Purpose
table
table, Table, TABLE, refTable, referenceTable
Referenced table name
column
column, Column, COLUMN, refColumn, referenceColumn
Referenced column name
delete
delete, Delete, onDelete, on_delete
ON DELETE CASCADE behavior
update
update, Update, onUpdate, on_update
ON UPDATE CASCADE behavior

Notes:
DbTasker automatically normalizes all keys internally.


Foreign key constraints are generated safely and include necessary indexes automatically.



Defaults (Advanced Usage)
Standard SQL: "defaults": "value" → DEFAULT 'value'


Computed / Expressions: "defaults": () => "CURRENT_TIMESTAMP" → SQL expression


JSON / Array: "defaults": [] → JSON default


ORM-only: "applyOnlyInORM": true → used only in runtime



ORM Context
An ORM (Object-Relational Mapping) maps database tables to programming language objects.
DbTasker is schema-driven, not a full ORM, but can complement ORMs.


DbTasker JSON can map directly to ORM objects (Sequelize, TypeORM, Prisma, etc.)


Example ORM object:


{
  id: 1,
  name: "Alice",
  email: "alice@example.com",
  isActive: true
}


Engine Awareness
DbTasker supports MySQL engines and handles constraints accordingly:
InnoDB


MyISAM


MEMORY


CSV


ARCHIVE


BLACKHOLE


FEDERATED


NDB / NDBCLUSTER


MRG_MYISAM


Spider


RocksDB


TokuDB



Design Philosophy
Schema-first, declarative JSON


Validation before SQL generation


Engine-aware and safe migrations


Flexible key aliases and metadata support


Supports both SQL-level and ORM-level annotations



Use Cases
Schema builders and migration tools


Admin dashboards


SaaS platforms and automation pipelines


Low-code / no-code backends



Compatibility
Node.js 16+


MySQL 5.7+ / 8+



License
MIT

Author
Manik
 Designed for safe, flexible, and high-quality MySQL schema automation.


