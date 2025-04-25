const { validationResult } = require('express-validator')
const pool = require('../db/instance')
const bycrypt = require('bcrypt')
const admin = require('firebase-admin')

async function createAccount(req, res) {
    const errors = validationResult(req)
    
    if(!errors.isEmpty()){
        return res.status(422).json({ message: "Invalid input, please check your data" })
    }

    const { username, email, password } = req.body; 
    const hash = bycrypt.hash(password, 10)

    try{
        const findAccount = await pool.query(
            `SELECT * FROM users WHERE email = $1`,[email]
        )

        if(findAccount.rowCount > 0){
            return res.status(400).json ({message: "User Already Exist"})
        }
        const newAccount = await pool.query(
            `INSERT INTO users (username, email, password)
            VALUES $1, $2, $3 RETURNING *`, [username, email, hash] 
        )
        return res.status(201).json({ message: "Account Created Successfully", account: newAccount })
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
    const hash = bycrypt.hash(password, 10)
    
    try{
        const user = await pool.query(
            `SELECT * FROM users
            WHERE email = $1 AND PASSWORD = $2`, [email, hash]
        )
        if(user.rowCount > 0){
            return res.status(200).json({ message: "Log in successful", account: user })
        }
        else{
            return res.status(404).json({ message: "Account doesn't exist" })
        }
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

        const userId = req.body.userId
        if(!userId){
            return res.status(400).json({ message: "User ID is required" })
        }

        const timestamp = Date.now()
        const filename = `Profile Picture/${userId}_${timestamp}`

        const storage = admin.storage().bucket()

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
                    WHERE uid = $2 RETURNING *`, [publicUrl, userId]
                )

                if(updateResult.rowCount === 0){
                    return res.status(404).json({ message: "User not found"})
                }

                res.status(200).json({ message: "Profile picture changed successfully", 
                    profilePictureUrl: publicUrl, 
                    user: updateResult.rows[0]
                })
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