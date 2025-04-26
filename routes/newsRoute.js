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

router.post('/save',
    [
        check('uid').not().isEmpty(),
        check('newsid').not().isEmpty()
    ], newsController.saveNews
)

router.get('/home', newsController.homePageNews)

router.get('/detail/:newsid',
    [
        check('uid').not().isEmpty()
    ], newsController.newsDetail
)

router.get('/all/:category',
    [
        check('category').not().isEmpty()
    ], newsController.allNews
)

router.get('/saved/:uid',
    [
        check('uid').not().isEmpty()
    ], newsController.savedNews
)

router.get('/created/:uid',
    [
        check('uid').not().isEmpty()
    ], newsController.createdNews
)

router.put('/like',
    [
        check('uid').not().isEmpty(),
        check('newsid').not().isEmpty(),
        check('pressed').not().isEmpty()
    ], newsController.changeLike
)

router.delete('/delete/:newsid',
    [
        check('newsid').not().isEmpty()
    ], newsController.deleteNews
)

router.delete('/unsave',
    [
        check('uid').not().isEmpty(),
        check('newsid').not().isEmpty()
    ], newsController.unsaveNews
)

module.exports = router