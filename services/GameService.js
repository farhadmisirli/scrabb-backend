const Mysql = require('sync-mysql')

const connection = new Mysql({
    host:'localhost',
    user:'root',
    password:'secret123',
    database:'scrabb'
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
