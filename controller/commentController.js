const { validationResult } = require('express-validator')
const pool = require('../db/instance')

async function createComment(req, res) {
    const errors = validationResult(req)

    if(!errors.isEmpty()){
        return res.status(422).json({ message: "Invalid input, please check your data" })
    }

    const { uid, newsid, comment } = req.body

    try{
        const insertResult = await pool.query(
            `INSERT INTO comment (uid, newsid, comment)
            VALUES ($1, $2, $3) RETURNING *`, [uid, newsid, comment]
        )

        if (insertResult.rows.length === 0) {
            return res.status(500).json({ message: "Failed to create comment." })
        }

        const newCommentId = insertResult.rows[0].commentid;

        const selectResult = await pool.query(
            `SELECT c.*, u.profile_pic as commentator_pp, u.username
             FROM comment c
             INNER JOIN users u ON c.uid = u.uid
             WHERE c.commentid = $1`,
            [newCommentId]
        )

        if (selectResult.rows.length === 0) {
            return res.status(500).json({ message: "Failed to retrieve comment data." })
        }

        return res.status(201).json({ message: "Comment successfully created", comment: selectResult.rows[0]})
    }
    catch(error){
        return res.status(500).json({ message: error.message })
    }
}

async function readNewsComment(req, res) {
    const errors = validationResult(req)

    if(!errors.isEmpty()){
        return res.status(422).json({ message: "Invalid input, please check your data" })
    }

    const { uid, newsid } = req.query

    try{
        const newsComment = await pool.query(
            `SELECT 
                c.commentid,
                u.uid,
                u.profile_pic as commentator_pp,
                u.username, 
                c.createdat, 
                c.comment, 
                c.votes
            FROM comment AS c
            INNER JOIN users AS u
            ON c.uid = u.uid
            WHERE c.newsid = $1
            ORDER BY createdat DESC `, [newsid]
        )

        let likeStatus = []

        if(uid) {
            const likeQuery = await pool.query(
                `SELECT l.commentid, l.like_status
                 FROM likedcomment AS l
                          INNER JOIN comment AS c
                                     ON l.commentid = c.commentid
                 WHERE c.newsid = $1
                   AND l.uid = $2`, [newsid, uid]
            )

            likeStatus = likeQuery.rows
        }

        return res.status(200).json({ message: "Fetch successful", comments: newsComment.rows, likeStatus})
    }
    catch(error){
        return res.status(500).json({ message: error.message })
    }
}

async function updateLike(req, res) {
    const errors = validationResult(req)

    if(!errors.isEmpty()){
        return res.status(422).json({ message: "Invalid input, please check your data" })
    }

    const { uid, commentid, pressed } = req.body

    try{
        const likeStatus = await pool.query(
            `SELECT like_status
            FROM likedcomment
            WHERE uid = $1 AND commentid = $2`, [uid, commentid]
        )

        if(likeStatus.rowCount === 0){
            await pool.query(
                `INSERT INTO likedcomment (uid, commentid, like_status)
                VALUES ($1, $2, $3)`, [uid, commentid, pressed]
            )
            if(pressed === 'Like'){
                await pool.query(
                    `UPDATE comment
                    SET votes = votes + 1
                    WHERE commentid = $1`,[commentid]
                )
            }
            else{
                await pool.query(
                    `UPDATE comment
                    SET votes = votes - 1
                    WHERE commentid = $1`,[commentid]
                )
            }
        }
        else{
            const currentStatus = likeStatus.rows[0].like_status

            if(currentStatus === pressed){
                await pool.query(
                    `DELETE FROM likedcomment
                    WHERE uid = $1 AND commentid = $2`,[uid, commentid]
                )
            
                if(pressed === 'Like'){
                    await pool.query(
                        `UPDATE comment
                        SET votes = votes - 1
                        WHERE commentid = $1`,[commentid]
                    )
                }
                else{
                    await pool.query(
                        `UPDATE comment
                        SET votes = votes + 1
                        WHERE commentid = $1`,[commentid]
                    )
                }
            }
            else{
                await pool.query(
                    `UPDATE likedcomment
                    SET like_status = $1
                    WHERE uid = $2 AND commentid = $3`,[pressed, uid, commentid]
                )

                if(pressed === 'Like'){
                    await pool.query(
                        `UPDATE comment
                        SET votes = votes + 2
                        WHERE commentid = $1`,[commentid]
                    )
                }
                else{
                    await pool.query(
                        `UPDATE comment
                        SET votes = votes - 2
                        WHERE commentid = $1`,[commentid]
                    )
                }
            }
        }
        return res.status(200).json({ message: "Like status changed successfully"})
    }
    catch(error){
        return res.status(500).json({ message: error.message })
    }
}

async function deleteComment(req, res) {
    
    const { commentid } = req.params

    try{
        await pool.query(
            `DELETE FROM comment
            WHERE commentid = $1`,[commentid]
        )
        
        return res.status(200).json({ message: "Comment successfully deleted" })
    }
    catch(error){
        return res.status(500).json({ message: error.message })
    }
}

module.exports = {
    createComment,
    readNewsComment,
    updateLike,
    deleteComment
}