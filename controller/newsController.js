const { validationResult } = require('express-validator')
const pool = require('../db/instance')
const adminn = require('firebase-admin')

async function createNews(req, res){
    const errors = validationResult(req)
    
    if(!errors.isEmpty()){
        return res.status(422).json({ message: "Invalid input, please check your data" })
    }

    const { createdby, title, category, content, summary } = req.body

    try{
        if(!req.files || !req.files.banner || !req.files.image){
            return res.status(400).json({ message: "News banner and image are required" })
        }

        const timestamp = Date.now()
        const storage = adminn.storage().bucket()

        const bannerFileName = `News Banner/${createdby}_${timestamp}_banner`
        const bannerFileUpload = storage.file(bannerFileName)

        const bannerBlobStream = bannerFileUpload.createWriteStream({
            metadata:{
                contentType: req.files.banner[0].mimetype
            },
            resumable: false
        })

        bannerBlobStream.on('finish', async() => {
            try{
                await bannerFileUpload.makePublic()
                const bannerPublic = `https://storage.googleapis.com/${storage.name}/${bannerFilename}`

                const imageFileName = `News Image/${createdby}_${timestamp}_image`
                const imageFileUpload = storage.file(imageFileName)

                const imageBlobStream = imageFileUpload.createWriteStream({
                    metadata: {
                        contentType: req.file.image[0].mimetype
                    },
                    resumable: false
                })

                imageBlobStream.on('error', error => {
                    return res.status(500).json({ message: error.message })
                })

                imageBlobStream.on('finish', async() => {
                    try{
                        await imageFileUpload.makePublic()
                        const imagePublic = `https://storage.googleapis.com/${storage.name}/${imageFilename}`

                        const newNews = await pool.query(
                            `INSERT INTO news (createdby, title, category, banner_url, image_url, content, summary)
                            VALUES ($1, $2, $3, $4, $5, $6, $7),
                            RETURNING *`, [createdby, title, category, bannerPublic, imagePublic, content, summary]
                        )

                        res.status(201).json({ message: "News created successfully", news: newNews.rows[0]})
                    }
                    catch(error){
                        res.status(500).json({ message: error.message })
                    }
                })

                imageBlobStream.end(req.files.image[0].buffer)
            }
            catch(error){
                res.status(500).json({ message: error.message })
            }
        })

        bannerBlobStream.end(req.files.banner[0].buffer)
    }
    catch(error){
        res.status(500).json({ message: error.message })
    }
}

async function saveNews(req, res) {
    const errors = validationResult(req)

    if(!errors.isEmpty()){
        return res.status(422).json({ message: "Invalid input, check your data" })
    }

    const { uid, newsid } = req.body

    try{
        await pool.query(
            `INSERT INTO savednews (uid, newsid)
            VALUES $1, $2 RETURNING *`, [uid, newsid]
        )
        return res.status(201).json({ message: "News successfully saved"})
    }
    catch(error){
        return res.status(500).json({ message: error.message })
    }
}

async function homePageNews(res) {
    try{
        const threeTop = await pool.query(
            `SELECT 
                banner_url, 
                category, 
                createdat::date AS created_date,
                title,
                summary
            FROM news
            WHERE createdat >= current_date - interval '1month'
            ORDER BY likes DESC
            LIMIT 3`
        )

        const latestAll = await pool.query(
            `SELECT 
                banner_url,
                category,
                createdat::date AS created_date,
                title
            FROM news
            ORDER BY createdat desc
            LIMIT 5`
        )
        
        const latestCategories = await pool.query(
            `SELECT *
            FROM (
                SELECT 
                    n.banner_url,
                    u.username,
                    n.category,
                    n.createdat::date as created_date,
                    n.title,
                    ROW_NUMBER() OVER (PARTITION BY category) AS rank
                FROM news AS n
                INNER JOIN users AS u
                ON n.createdby = u.uid
            ) ranked_news
            WHERE rank <= 5`
        )

        return res.status(200).json({ 
            message: "Fetch successfull",
            topNews: threeTop,
            latestAll: latestAll,
            latestCat: latestCategories
        })
    }
    catch(error){
        return res.status(500).json({ message: error.message })
    }
}

async function newsDetail(req, res) {
    const errors = validationResult(req)

    if(!errors.isEmpty()){
        return res.status(422).json({ message: "Invalid input, check your data" })
    }

    const newsid = req.params

    try{
        const newsDetail = await pool.query(
            `SELECT 
                n.newsid, 
                n.category, 
                n.title, 
                u.username, 
                n.createdat::date AS created_date, 
                n.likes, 
                n.image_url, 
                n.content 
            FROM news AS n
            INNER JOIN users as u
            ON n.createdby = u.uid
            WHERE newsid = $1`, [newsid]
        )
        return res.status(200).json({ message: "Fetch sucessfull", detail: newsDetail})
    }
    catch(error){
        return res.status(500).json({ message: error.message })
    }
}

async function allNews(res) {
    
}

async function savedNews(req, res) {
    
}

async function createdNews(req, res) {
    
}

async function changeLike(req, res) {
    
}

async function deleteNews(req, res) {
    
}

async function unsaveNews(req, res) {
    
}

module.exports = {
    createNews,
    saveNews,
    homePageNews,
    newsDetail,
}