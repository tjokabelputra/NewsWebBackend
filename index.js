require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin')
const serviceAccount = require('./newsweb-ef5bf-firebase-adminsdk-fbsvc-3f13a54e64.json')
const bodyParser = require('body-parser');
//const commentRouter = require('./routes/commentRoute');
const newsRouter = require('./routes/newsRoute');
const userRouter = require('./routes/userRoute');
var cors = require('cors');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.STORAGE_BUCKET 
})

const port = process.env.PORT || 3000;
const app = express();
app.use(bodyParser.json());
app.use(cors());

//app.use('/comment', commentRouter);
app.use('/news', newsRouter)
app.use('/user', userRouter)

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})