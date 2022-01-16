const Mysql = require('sync-mysql')
const env = require('dotenv').config();
const connection = new Mysql({
    host: env.parsed.mysql_host,
    user: env.parsed.mysql_username,
    password: env.parsed.mysql_password,
    database: env.parsed.mysql_database
});

function getWords(word) {
    let query = `SELECT * FROM words where name='${word}';`;
    return connection.query(query);
}

function getWordsByArray(words_array) {
    const inClause = words_array.map(word=>"'"+word+"'").join();
    let query = `SELECT * FROM words where name IN(${inClause})`;
    return connection.query(query);
}

module.exports = {getWords, getWordsByArray}
