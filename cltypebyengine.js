

const ENGINE_COLUMN_TYPES = {
  INNODB: [
    // Numeric
    "BIT","TINYINT","SMALLINT","MEDIUMINT","INT","INTEGER","BIGINT",
    "DECIMAL","NUMERIC","FLOAT","DOUBLE","REAL","BOOL","BOOLEAN",
    // Date & Time
    "DATE","TIME","DATETIME","TIMESTAMP","YEAR",
    // Character
    "CHAR","VARCHAR","TINYTEXT","TEXT","MEDIUMTEXT","LONGTEXT",
    // Binary
    "BINARY","VARBINARY","TINYBLOB","BLOB","MEDIUMBLOB","LONGBLOB",
    // Enum / Set
    "ENUM","SET",
    // JSON
    "JSON",
    // Spatial
    "GEOMETRY","POINT","LINESTRING","POLYGON",
    "MULTIPOINT","MULTILINESTRING","MULTIPOLYGON","GEOMETRYCOLLECTION"
  ],
  MYISAM: [
    // same as InnoDB
    "BIT","TINYINT","SMALLINT","MEDIUMINT","INT","INTEGER","BIGINT",
    "DECIMAL","NUMERIC","FLOAT","DOUBLE","REAL","BOOL","BOOLEAN",
    "DATE","TIME","DATETIME","TIMESTAMP","YEAR",
    "CHAR","VARCHAR","TINYTEXT","TEXT","MEDIUMTEXT","LONGTEXT",
    "BINARY","VARBINARY","TINYBLOB","BLOB","MEDIUMBLOB","LONGBLOB",
    "ENUM","SET",
    "JSON",
    "GEOMETRY","POINT","LINESTRING","POLYGON",
    "MULTIPOINT","MULTILINESTRING","MULTIPOLYGON","GEOMETRYCOLLECTION"
  ],
  MEMORY: [
    "TINYINT","SMALLINT","MEDIUMINT","INT","INTEGER","BIGINT",
    "DECIMAL","NUMERIC","FLOAT","DOUBLE","REAL","BOOL","BOOLEAN",
    "DATE","TIME","DATETIME","TIMESTAMP","YEAR",
    "CHAR","VARCHAR",
    "ENUM","SET"
  ],
  CSV: [
    "TINYINT","SMALLINT","MEDIUMINT","INT","INTEGER","BIGINT",
    "DECIMAL","NUMERIC","FLOAT","DOUBLE","REAL",
    "DATE","TIME","DATETIME","TIMESTAMP","YEAR",
    "CHAR","VARCHAR"
  ],
  ARCHIVE: [
    "TINYINT","SMALLINT","MEDIUMINT","INT","INTEGER","BIGINT",
    "DECIMAL","NUMERIC","FLOAT","DOUBLE","REAL",
    "DATE","TIME","DATETIME","TIMESTAMP","YEAR",
    "CHAR","VARCHAR"
  ],
  BLACKHOLE: [
    "TINYINT","SMALLINT","MEDIUMINT","INT","INTEGER","BIGINT",
    "DECIMAL","NUMERIC","FLOAT","DOUBLE","REAL",
    "CHAR","VARCHAR",
    "DATE","TIME","DATETIME","TIMESTAMP","YEAR"
  ],
  FEDERATED: [
    "TINYINT","SMALLINT","MEDIUMINT","INT","INTEGER","BIGINT",
    "DECIMAL","NUMERIC","FLOAT","DOUBLE","REAL",
    "CHAR","VARCHAR",
    "DATE","TIME","DATETIME","TIMESTAMP","YEAR"
  ],
  MRG_MYISAM: [
    "TINYINT","SMALLINT","MEDIUMINT","INT","INTEGER","BIGINT",
    "DECIMAL","NUMERIC","FLOAT","DOUBLE","REAL",
    "CHAR","VARCHAR","TINYTEXT","TEXT","MEDIUMTEXT","LONGTEXT",
    "BINARY","VARBINARY","TINYBLOB","BLOB","MEDIUMBLOB","LONGBLOB",
    "ENUM","SET",
    "DATE","TIME","DATETIME","TIMESTAMP","YEAR"
  ],
  NDB: [
    "TINYINT","SMALLINT","MEDIUMINT","INT","INTEGER","BIGINT",
    "DECIMAL","NUMERIC","FLOAT","DOUBLE","REAL",
    "CHAR","VARCHAR",
    "DATE","TIME","DATETIME","TIMESTAMP","YEAR",
    "ENUM","SET"
  ],
  NDBCLUSTER: [
    "TINYINT","SMALLINT","MEDIUMINT","INT","INTEGER","BIGINT",
    "DECIMAL","NUMERIC","FLOAT","DOUBLE","REAL",
    "CHAR","VARCHAR",
    "DATE","TIME","DATETIME","TIMESTAMP","YEAR",
    "ENUM","SET"
  ],
  EXAMPLE: [],  // stub engine, no real column support
  TOKUDB: [
    "TINYINT","SMALLINT","MEDIUMINT","INT","INTEGER","BIGINT",
    "DECIMAL","NUMERIC","FLOAT","DOUBLE","REAL",
    "CHAR","VARCHAR","TEXT","BLOB","DATE","DATETIME","TIMESTAMP","YEAR",
    "ENUM","SET"
  ],
  ROCKSDB: [
    "TINYINT","SMALLINT","MEDIUMINT","INT","INTEGER","BIGINT",
    "DECIMAL","NUMERIC","FLOAT","DOUBLE","REAL",
    "CHAR","VARCHAR","TEXT","BLOB","DATE","DATETIME","TIMESTAMP","YEAR",
    "ENUM","SET"
  ],
  SPIDER: [
    "TINYINT","SMALLINT","MEDIUMINT","INT","INTEGER","BIGINT",
    "DECIMAL","NUMERIC","FLOAT","DOUBLE","REAL",
    "CHAR","VARCHAR","TEXT","BLOB","DATE","DATETIME","TIMESTAMP","YEAR",
    "ENUM","SET"
  ]
};
// Check if a column type is allowed for an engine
function isColumnTypeAllowed(type, engine) {
  if (!type || !engine) return false;

  const baseType = type.toUpperCase().replace(/\(.*?\)/g, "").split(/\s+/)[0];
  const types = ENGINE_COLUMN_TYPES[engine] || [];
  return types.includes(baseType);
}
const ENGINE_CAPABILITIES = {
  INNODB: {
    Null: true,
    Index: true,
    Primary: true,
    Unique: true,
    AutoIncrement: true,
    ZeroFill: true,
    Default: true
  },
  MYISAM: {
    Null: true,
    Index: true,
    Primary: true,
    Unique: true,
    AutoIncrement: true,
    ZeroFill: true,
    Default: true
  },
  MEMORY: {
    Null: true,
    Index: true,
    Primary: true,
    Unique: true,
    AutoIncrement: true,
    ZeroFill: true,
    Default: true
  },
  CSV: {
    Null: false,
    Index: false,
    Primary: false,
    Unique: false,
    AutoIncrement: false,
    ZeroFill: false,
    Default: true
  },
  ARCHIVE: {
    Null: false,
    Index: false,
    Primary: false,
    Unique: false,
    AutoIncrement: false,
    ZeroFill: false,
    Default: true
  },
  BLACKHOLE: {
    Null: true,
    Index: false,
    Primary: false,
    Unique: false,
    AutoIncrement: false,
    ZeroFill: false,
    Default: false
  },
  FEDERATED: {
    Null: true,
    Index: false,       // depends on remote
    Primary: false,
    Unique: false,
    AutoIncrement: false,
    ZeroFill: false,
    Default: true       // allows literals
  },
  MRG_MYISAM: {
    Null: true,
    Index: true,        // inherits from underlying MyISAM tables
    Primary: true,
    Unique: true,
    AutoIncrement: true,
    ZeroFill: true,
    Default: true
  },
  NDB: {
    Null: true,
    Index: true,
    Primary: true,
    Unique: true,
    AutoIncrement: true,
    ZeroFill: true,
    Default: true
  },
  NDBCLUSTER: {       // same as NDB
    Null: true,
    Index: true,
    Primary: true,
    Unique: true,
    AutoIncrement: true,
    ZeroFill: true,
    Default: true
  },
  EXAMPLE: {
    Null: true,
    Index: false,
    Primary: false,
    Unique: false,
    AutoIncrement: false,
    ZeroFill: false,
    Default: false
  },
  TOKUDB: {
    Null: true,
    Index: true,
    Primary: true,
    Unique: true,
    AutoIncrement: true,
    ZeroFill: true,
    Default: true
  },
  ROCKSDB: {
    Null: true,
    Index: true,
    Primary: true,
    Unique: true,
    AutoIncrement: true,
    ZeroFill: true,
    Default: true
  },
  SPIDER: {
    Null: true,
    Index: true,
    Primary: true,
    Unique: true,
    AutoIncrement: true,
    ZeroFill: true,
    Default: true
  }
};
function isEngineFeatureAllowed(engine, feature) {
  const caps = ENGINE_CAPABILITIES[engine.toUpperCase()];
  if (!caps) return null; // unknown engine
  return !!caps[feature];
}

module.exports = {
    isColumnTypeAllowed,
    isEngineFeatureAllowed
}