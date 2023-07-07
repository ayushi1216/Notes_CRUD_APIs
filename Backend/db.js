// Mysql and node.js ( Connecting mysql with Node.js)

const mysql = require('mysql');

const db = mysql.createConnection({
    host : "localhost",
    user : "root",
    password : "",
    database : "book"
});

db.connect((err)=>{
    if(err) throw err;
    console.log("connected with sql");
})


module.exports = db;



