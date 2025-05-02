const express = require('express')
const userController = require('../controller/userController')
const { check } = require('express-validator')
const { accessValidation, getUserId } = require("../middleware/auth");
const { handleProfilePictureUpload } = require("../middleware/imgUpload")

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

router.post('/changeprofpic/:uid',
    accessValidation,
    handleProfilePictureUpload,
    userController.changeProfilePicture)

module.exports = router