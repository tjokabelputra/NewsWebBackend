const { validationResult } = require('express-validator')
const jwt = require('jsonwebtoken')
const pool = require('../db/instance')
const bcrypt = require('bcrypt')
const admin = require('firebase-admin')

async function createAccount(req, res) {
    const errors = validationResult(req)
    
    if(!errors.isEmpty()){
        return res.status(422).json({ message: "Invalid input, please check your data" })
    }

    const { username, email, password } = req.body; 
    const hash = await bcrypt.hash(password, 10)

    try{
        const findAccount = await pool.query(
            `SELECT * FROM users WHERE email = $1`,[email]
        )

        if(findAccount.rowCount > 0){
            return res.status(400).json ({message: "User Already Exist"})
        }
        const newAccount = await pool.query(
            `INSERT INTO users (username, email, password)
            VALUES ($1, $2, $3) RETURNING *`, [username, email, hash]
        )
        return res.status(201).json({ message: "Account Created Successfully", account: newAccount.rows[0] })
    }
    catch(errors){
        return res.status(500).json({ message: errors.message })
    }
}

async function loginAccount(req, res){
    const errors = validationResult(req)

    if(!errors.isEmpty){
        return res.status(422).json({ message: "Invalid input, please check your data" })
    }

    const { email, password } = req.body
    
    try{
        const user = await pool.query(
            `SELECT * FROM users WHERE email = $1`, [email]
        );

        if (user.rowCount === 0) {
            return res.status(404).json({ message: "Account doesn't exist" });
        }

        const passwordMatch = await bcrypt.compare(password, user.rows[0].password);

        if (!passwordMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const payload = {
            uid: user.rows[0].uid,
            username: user.rows[0].username,
            email: user.rows[0].email,
            role: user.rows[0].role,
            profile_pic: user.rows[0].profile_pic
        }


        const secret = process.env.JWT_SECRET
        const token = jwt.sign(payload, secret, { expiresIn: '1d' })

        return res.status(200).json({
            message: "Login successful",
            account: payload,
            token: token,
        })
    }
    catch(errors){
        return res.status(500).json({ message: errors.message })
    }
}

async function changeProfilePicture (req, res) {
    try{
        if(!req.file){
            return res.status(400).json({ message: "No image file provided" })
        }

        const { uid } = req.params
        if(!uid){
            return res.status(400).json({ message: "User ID is required" })
        }

        const storage = admin.storage().bucket()
        const defaultProfilePicUrl = "https://firebasestorage.googleapis.com/v0/b/newsweb-ef5bf.firebasestorage.app/o/Profile%20Picture%2FDefault_Profile_Picture.jpg?alt=media&token=ed2096aa-24bf-459a-afbd-b5d1c2424396"

        try {
            const userProfPic = await pool.query(
                `SELECT profile_pic
                FROM users
                WHERE uid = $1`, [uid]
            )

            if(userProfPic.rowCount === 0){
                return res.status(404).json({ message: "User not found"})
            }

            const existingProfilePic = userProfPic.rows[0].profile_pic

            if(existingProfilePic && existingProfilePic !== defaultProfilePicUrl){
                if(existingProfilePic.includes(uid)){
                    const match = existingProfilePic.match(/Profile Picture\/([^?]+)/)
                    if(match && match[1]){
                        const existingFileName = match[1]
                        try{
                            const existingFile = storage.file(`Profile Picture/${existingFileName}`)
                            const [exists] = await existingFile.exists()

                            if(exists){
                                await existingFile.delete()
                            }
                        }
                        catch(error){
                            return res.status(500).json({ message: error.message })
                        }
                    }
                }
            }
        }
        catch(error){
            return res.status(500).json({ message: error.message })
        }

        const timestamp = Date.now()
        const filename = `Profile Picture/${uid}_${timestamp}`

        const fileUpload = storage.file(filename)

        const blobStream = fileUpload.createWriteStream({
            metadata:{
                contentType: req.file.mimetype
            },
            resumable: false
        })

        blobStream.on('error', error => {
            return res.status(500).json({ message: error.message })
        })

        blobStream.on('finish', async() => {
            try{
                await fileUpload.makePublic()

                const publicUrl = `https://storage.googleapis.com/${storage.name}/${filename}`

                const updateResult = await pool.query(
                    `UPDATE users SET profile_pic = $1
                    WHERE uid = $2 RETURNING *`, [publicUrl, uid]
                )

                if(updateResult.rowCount === 0){
                    return res.status(404).json({ message: "User not found"})
                }

                res.status(200).json({ message: "Profile picture changed successfully", profilePictureUrl: publicUrl })
            }
            catch(error){
                res.status(500).json({ message: error.message })
            }
        })

        blobStream.end(req.file.buffer)
    }
    catch(error){
        res.status(500).json({ message: error.message })
    }
}

module.exports = {
    createAccount,
    loginAccount,
    changeProfilePicture
}