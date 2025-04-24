const express = require('express')
const userController = require('../controller/userController')
const { check } = require('express-validator')
const multer = require('multer')

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if(file.mimetype.startsWith('image/')){
            cb(null, true)
        }
        else{
            cb(new Error('Not an image file'), false)
        }
    }
})

const router = express.Router()

router.post('/signup', 
    [
        check('username').not().isEmpty(),
        check('email').not().isEmpty(),
        check('password').not().isEmpty().isLength({ min: 8 })
    ], userController.createAccount
)

router.post('/login',
    [
        check('email').not().isEmpty(),
        check('password').not().isEmpty().isLength({ min: 8 })
    ], userController.loginAccount
)

router.post('/changeprofpic', upload.single('profilePicture'), userController.changeProfilePicture)
