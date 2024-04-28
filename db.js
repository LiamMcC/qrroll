const mysql = require('mysql2');
require('dotenv').config();

// Create a connection pool
const db = mysql.createConnection({
    connectionLimit: 10,
    port: process.env.DB_PORT,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_DATABASE,
    multipleStatements: true
});

// Test the connection pool
db.connect((err, connection) => {
    if (err) throw err; // not connected!
    console.log('MySQL Database is connected Successfully');
});

module.exports = db;