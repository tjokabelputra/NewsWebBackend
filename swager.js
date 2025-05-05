process.env.NODE_ENV = 'test'

const envFile = `.env.${process.env.NODE_ENV}`
require('dotenv').config({ path: envFile })

const express = require('express')
const admin = require('firebase-admin')
const serviceAccount = require('./newsweb-ef5bf-firebase-adminsdk-fbsvc-3f13a54e64.json')
const bodyParser = require('body-parser')
const commentRouter = require('./routes/commentRoute');
const newsRouter = require('./routes/newsRoute');
const userRouter = require('./routes/userRoute');
const cors = require('cors')
const swaggerUi = require("swagger-ui-express");
const YAML = require('yamljs');
const swaggerDocument = YAML.load('./swagger.yaml');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.STORAGE_BUCKET
})

const option = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'News Web API',
            version: '1.0.0',
        },
        servers:[
            {
                url: 'http://localhost:3000/'
            }
        ]
    },
    apis: ['./routes/*.js']
}

const port = process.env.PORT || 3000;
const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))

app.use('/comment', commentRouter);
app.use('/news', newsRouter)
app.use('/user', userRouter)

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})