require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
var cors = require('cors');

const port = process.env.PORT || 3000;
const app = express();
app.use(bodyParser.json());
app.use(cors());

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})