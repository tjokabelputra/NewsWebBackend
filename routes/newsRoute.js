const express = require('express')
const newsController = require('../controller/newsController')
const { check } = require('express-validator')
const multer = require('multer')

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        filesize: 5 * 1024 * 1024
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

router.post('/create',
    upload.fields([
        { name: 'banner', maxCount: 1},
        { name: 'image', maxCount: 1}
    ]),
    [
        check('createdby').not().isEmpty(),
        check('title').not().isEmpty().isLength({ max: 255 }),
        check('category').not().isEmpty(),
        check('content').not().isEmpty(),
        check('summary').not().isEmpty().isLength({ max: 255 })
    ], newsController.createNews
)

module.exports = router