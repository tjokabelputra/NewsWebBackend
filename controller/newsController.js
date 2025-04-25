const { validationResult} = require('express-validator')
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
                const bannerPublic = `https://storage.googleapis.com/${storage.name}/${bannerFileName}`

                const imageFileName = `News Image/${createdby}_${timestamp}_image`
                const imageFileUpload = storage.file(imageFileName)

                const imageBlobStream = imageFileUpload.createWriteStream({
                    metadata: {
                        contentType: req.files.image[0].mimetype
                    },
                    resumable: false
                })

                imageBlobStream.on('error', error => {
                    return res.status(500).json({ message: error.message })
                })

                imageBlobStream.on('finish', async() => {
                    try{
                        await imageFileUpload.makePublic()
                        const imagePublic = `https://storage.googleapis.com/${storage.name}/${imageFileName}`

                        const newNews = await pool.query(
                            `INSERT INTO news (createdby, title, category, banner_url, image_url, content, summary)
                            VALUES ($1, $2, $3, $4, $5, $6, $7)
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
            VALUES ($1, $2) RETURNING *`, [uid, newsid]
        )
        return res.status(201).json({ message: "News successfully saved"})
    }
    catch(error){
        return res.status(500).json({ message: error.message })
    }
}

async function homePageNews(req, res) {
    try{
        const threeTop = await pool.query(
            `SELECT 
                newsid,
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
                newsid,
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
                    n.newsid,
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
            topNews: threeTop.rows,
            latestAll: latestAll.rows,
            latestCat: latestCategories.rows
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

    const { newsid } = req.params
    const { uid } = req.body

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

        const likeInfo = await pool.query(
            `SELECT liked_status
            FROM likednews
            WHERE uid = $1 AND newsid = $2`, [uid, newsid]
        )

        let userLikeStatus = null;
        if (likeInfo.rows.length > 0) {
            userLikeStatus = likeInfo.rows[0].liked_status;
        }

        const result = {
            ...newsDetail.rows[0],
            like_status: userLikeStatus
        }

        return res.status(200).json({ message: "Fetch sucessfull", detail: result })
    }
    catch(error){
        return res.status(500).json({ message: error.message })
    }
}

async function allNews(req, res) {
    
    const category = req.params 
    const { search = "" } = req.body

    try{
        let query = `
        SELECT 
            newsid,
            banner_url,
            title,
            summary,
            category,
            createdat::date as created_date
        FROM news`
        const value = []

        if( category !== "All" ){
            query += ` WHERE category = $1`
            value.push(category)
        }

        if(search){
            if(category !== "All"){
                query += ` AND title ILIKE $2`
                value.push(`%${search}%`)
            }
            else{
                query += ` AND title ILIKE $1`
                value.push(`%${search}%`)
            }
        }

        query += ` LIMIT 100`

        const result = await pool.query(query, value)

        return res.status(200).json({ message: "Fetch successfull", news: result.rows })
    }
    catch(error){
        return res.status(500).json({ message: error.message })
    }
}

async function savedNews(req, res) {
    const errors = validationResult(req)

    if(!errors.isEmpty()){
        return res.status(422).json({ message: "Invalid input, please check your data"})
    }

    const { uid } = req.params

    try{
        const savedNews = await pool.query(
            `SELECT
                n.newsid,
                n.banner_url,
                n.title,
                n.summary,
                n.category,
                n.createdat::date as created_date
            FROM news n
            INNER JOIN savednews s
            ON n.newsid = s.newsid
            INNER JOIN users u
            ON s.uid = u.uid
            WHERE s.uid = $1`, [uid]
        )

        return res.status(200).json({ message: "Fetch successfull", savedNews: savedNews.rows})
    }
    catch(error){
        return res.status(500).json({ message: error.message })
    }
}

async function createdNews(req, res) {
    const errors = validationResult(req)

    if(!errors.isEmpty()){
        return res.status(422).json({ message: "Invalid input, please check your data" })
    }

    const { uid } = req.params

    try{
        const createdNews = await pool.query(
            `SELECT
                newsid,
                banner_url,
                title,
                summary,
                category,
                createdat::date as created_date
            FROM news
            WHERE createdby = $1`, [uid]
        )

        return res.status(200).json({ message: "Fetch successfull", createdNews: createdNews.rows})
    }
    catch(error){
        return res.status(500).json({ message: error.message })
    }
}

async function changeLike(req, res) {
    const errors = validationResult(req)

    if(!errors.isEmpty()){
        return res.status(422).json({ message: "Invalid input, please check your data" })
    }

    const { uid, newsid, pressed } = req.body

    try{
        const likeStatus = await pool.query(
            `SELECT like_status
            FROM likednews
            WHERE uid = $1 AND newsid = $2`, [uid, newsid]
        )
        if(likeStatus.rowCount === 0){
            await pool.query(
                `INSERT INTO likednews (uid, newsid, like_status)
                VALUES ($1, $2, $3)`, [uid, newsid, pressed]
            )
            if(pressed === 'Like'){
                await pool.query(
                    `UPDATE news 
                    SET likes = likes + 1
                    WHERE newsid = $1`, [newsid]
                )
            }
            else{
                await pool.query(
                    `UPDATE news 
                    SET likes = likes - 1
                    WHERE newsid = $1`, [newsid]
                )
            }
        }
        else{
            const currentStatus = likeStatus.rows[0].like_status

            if(currentStatus === pressed){

                await pool.query(
                    `DELETE FROM likednews
                    WHERE uid = $1 AND newsid = $2`, [uid, newsid]
                )

                if(pressed === 'Like'){
                    await pool.query(
                        `UPDATE news
                        SET likes = likes - 1
                        WHERE newsid = $1`, [newsid]
                    )
                }

                else{
                    await pool.query(
                        `UPDATE news
                        SET likes = likes + 1
                        WHERE newsid = $1`, [newsid]
                    )
                }
            }
            else{

                await pool.query(
                    `UPDATE likednews
                    SET like_status = $1
                    WHERE uid = $2 AND newsid = $3`, [pressed, uid, newsid]
                )

                if(pressed === 'Like'){
                    await pool.query(
                        `UPDATE news
                        SET likes = likes + 2
                        WHERE newsid = $1`, [newsid]
                    )
                }  

                else{
                    await pool.query(
                        `UPDATE news
                        SET likes = likes -2
                        WHERE newsid = $1`, [newsid]
                    )
                }         
            }
        }
        return res.status(200).json({ message: "Like status updated successfully" })
    }
    catch(error){
        return res.status(500).json({ message: error.message })
    }
}

async function deleteNews(req, res) {
    const errors = validationResult(req)

    if(!errors.isEmpty()){
        return res.status(422).json({ message: "Invalid input, please check your data" })
    }

    const { newsid } = req.params

    try{
        await pool.query(
            `DELETE FROM news
            WHERE newsid = $1`, [newsid]
        )

        return res.status(200).json({ message: "News successfully deleted" })
    }
    catch(error){
        return res.status(500).json({ message: error.message })
    }
}

async function unsaveNews(req, res) {
    const errors = validationResult(req)

    if(!errors.isEmpty()){
        return res.status(422).json({ message: "Invalid input, please check your data" })
    }

    const { uid, newsid } = req.body

    try{
        await pool.query(
            `DELETE FROM savednews
            WHERE uid = $1 AND newsid = $2
            RETURNING *`, [uid, newsid]
        )
        
        return res.status(200).json({ message: "News sunccessfully removed" })
    }
    catch(error){
        return res.status(500).json({ message: error.message })
    }
}

module.exports = {
    createNews,
    saveNews,
    homePageNews,
    newsDetail,
    allNews,
    savedNews,
    createdNews,
    changeLike,
    deleteNews,
    unsaveNews
}