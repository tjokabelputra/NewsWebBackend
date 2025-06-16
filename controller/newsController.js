const { validationResult} = require('express-validator')
const pool = require('../db/instance')
const admin = require('firebase-admin')

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
        const storage = admin.storage().bucket()

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

    const { uid } = req.query

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
            LIMIT 4`
        )
        
        const latestCategories = await pool.query(
            `SELECT *
            FROM (
                SELECT 
                    n.newsid,
                    n.banner_url,
                    u.profile_pic as auth_pp,
                    u.username,
                    n.category,
                    n.createdat::date as created_date,
                    n.title,
                    ROW_NUMBER() OVER (PARTITION BY category ORDER BY n.createdat DESC) AS rank
                FROM news AS n
                INNER JOIN users AS u
                ON n.createdby = u.uid
            ) ranked_news
            WHERE rank <= 4`
        )

        let savedNewsIds = []

        if(uid){
            const topNewsIds = threeTop.rows.map(news => news.newsid);
            const latestAllIds = latestAll.rows.map(news => news.newsid);
            const latestCatIds = latestCategories.rows.map(news => news.newsid);

            const allNewsIds = [...new Set([...topNewsIds, ...latestAllIds, ...latestCatIds])];

            if (allNewsIds.length > 0) {
                const savedNewsResult = await pool.query(
                    `SELECT newsid FROM savednews 
                     WHERE uid = $1 AND newsid = ANY($2::uuid[])`,
                    [uid, allNewsIds]
                );

                savedNewsIds = savedNewsResult.rows.map(row => row.newsid);
            }
        }

        return res.status(200).json({ 
            message: "Fetch successful",
            topNews: threeTop.rows,
            latestAll: latestAll.rows,
            latestCat: latestCategories.rows,
            savedNewsIds: savedNewsIds
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
    const { uid } = req.query

    try{
        const newsDetail = await pool.query(
            `SELECT 
                n.newsid, 
                n.category, 
                n.title, 
                u.profile_pic AS auth_pp,
                u.username AS author, 
                n.createdat::date AS created_date, 
                n.likes, 
                n.image_url, 
                n.content 
            FROM news AS n
            INNER JOIN users as u
            ON n.createdby = u.uid
            WHERE newsid = $1`, [newsid]
        )

        let userLikeStatus = null

        if (uid) {
            const likeInfo = await pool.query(
                `SELECT like_status
                FROM likednews
                WHERE uid = $1 AND newsid = $2`, [uid, newsid]
            )

            if (likeInfo.rows.length > 0) {
                userLikeStatus = likeInfo.rows[0].like_status
            }
        }

        return res.status(200).json({ message: "Fetch sucessfull", detail: newsDetail.rows[0], like_status: userLikeStatus })
    }
    catch(error){
        return res.status(500).json({ message: error.message })
    }
}

async function allNews(req, res) {
    
    const { category } = req.params 
    const { search, uid } = req.query

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

        if( category !== "Semua Berita" ){
            query += ` WHERE category = $1`
            value.push(category)
        }

        if(search){
            if(category !== "Semua Berita"){
                query += ` AND (title ILIKE $2 OR summary ILIKE $2)`
                value.push(`%${search}%`)
            }
            else{
                query += ` WHERE title ILIKE $1 OR summary ILIKE $1`
                value.push(`%${search}%`)
            }
        }

        query += ` ORDER BY createdat DESC`
        query += ` LIMIT 100`

        const result = await pool.query(query, value)

        let savedNewsIds = []

        if(uid){
            const categoriesNews = result.rows.map(news => news.newsid);

            if (categoriesNews.length > 0) {
                const savedNewsResult = await pool.query(
                    `SELECT newsid FROM savednews 
                     WHERE uid = $1 AND newsid = ANY($2::uuid[])`,
                    [uid, categoriesNews]
                );

                savedNewsIds = savedNewsResult.rows.map(row => row.newsid);
            }
        }

        return res.status(200).json({ message: "Fetch successful", news: result.rows, savedNewsIds: savedNewsIds })
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

        return res.status(200).json({ message: "Fetch successful", savedNews: savedNews.rows})
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
            WHERE createdby = $1
            ORDER BY createdat DESC`, [uid]
        )

        return res.status(200).json({ message: "Fetch successful", createdNews: createdNews.rows})
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

async function updateViews(req, res) {
    const errors = validationResult(req)

    if(!errors.isEmpty()){
        return res.status(422).json({ message: "Invalid input, please check your data" })
    }

    try{
        const { newsid } = req.params
        const updateView = await pool.query(
            `UPDATE news
            SET views = views + 1
            WHERE newsid = $1`, [newsid]
        )
        return res.status(200).json({ message: "Views updated successfully" })
    }
    catch (error){
        return res.status(500).json({ message: error.message })
    }
}

async function deleteNews(req, res) {
    const errors = validationResult(req)

    if(!errors.isEmpty()){
        return res.status(422).json({ message: "Invalid input, please check your data" })
    }

    const { newsid } = req.params
    const storage = admin.storage().bucket()

    try{
        const newsResult = await pool.query(
            `SELECT banner_url, image_url 
            FROM news 
            WHERE newsid = $1`, [newsid]
        )

        if(newsResult.rowCount === 0){
            return res.status(404).json({ message: "News not found" })
        }

        const news = newsResult.rows[0]

        try {
            if(news.banner_url){
                const bannerPath = news.banner_url.replace(`https://storage.googleapis.com/${storage.name}/`, '');
                await storage.file(bannerPath).delete()
            }
            if(news.image_url){
                const imagePath = news.image_url.replace(`https://storage.googleapis.com/${storage.name}/`, '');
                await storage.file(imagePath).delete()
            }
        }
        catch (error) {
            return res.status(500).json({ message: error.message })
        }

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
        const deletedNews = await pool.query(
            `DELETE FROM savednews
            WHERE uid = $1 AND newsid = $2
            RETURNING *`, [uid, newsid]
        )
        
        return res.status(200).json({ message: "News successfully removed" })
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
    updateViews,
    deleteNews,
    unsaveNews
}