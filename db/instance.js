const { Pool } = require('pg')
const envFile = process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env.dev'
require('dotenv').config({ path: envFile })

function createPool() {
    return new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    })
}

let pool = createPool()

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err)

    if(err.code === '57P01'){
        console.log('Database connection terminated')
        pool.end().catch(err => console.error('Error terminating database connection', err))
        pool = createPool()

        pool.connect()
            .then(client => {
                console.log(`Reconnected to PostgreSQL database (${process.env.NODE_ENV || 'dev'} environment)`)
                client.headers
            })
            .catch(connectErr => {
                console.log('Failed to reconnect to PostgreSQL database: ', connectErr)
            })
    }
})

pool.connect((err, client, release) => {
    if (err) {
        console.error(`Error connecting to ${process.env.NODE_ENV || 'dev'} database: `, err);
    } else {
        console.log(`Connected to PostgreSQL database (${process.env.NODE_ENV || 'dev'} environment)`);
        release();
    }
});

module.exports = pool