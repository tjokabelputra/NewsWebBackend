const express = require('express')
const newsController = require('../controller/newsController')
const { check } = require('express-validator')
const { accessValidation, isAdmin } = require("../middleware/auth");
const { handleNewsImagesUpload } = require("../middleware/imgUpload");

const router = express.Router()

router.post('/create',
    accessValidation,
    isAdmin,
    handleNewsImagesUpload,
    [
        check('createdby').not().isEmpty(),
        check('title').not().isEmpty().isLength({ max: 255 }),
        check('category').not().isEmpty(),
        check('content').not().isEmpty(),
        check('summary').not().isEmpty().isLength({ max: 255 })
    ], newsController.createNews
)

router.post('/save',
    accessValidation,
    [
        check('uid').not().isEmpty(),
        check('newsid').not().isEmpty()
    ], newsController.saveNews
)

router.get('/home', newsController.homePageNews)

router.get('/detail/:newsid',
    [
        check('newsid').not().isEmpty(),
    ], newsController.newsDetail
)

router.get('/all/:category',
    [
        check('category').not().isEmpty()
    ], newsController.allNews
)

router.get('/saved/:uid',
    accessValidation,
    [
        check('uid').not().isEmpty()
    ], newsController.savedNews
)

router.get('/created/:uid',
    accessValidation,
    isAdmin,
    [
        check('uid').not().isEmpty()
    ], newsController.createdNews
)

router.put('/like',
    accessValidation,
    [
        check('uid').not().isEmpty(),
        check('newsid').not().isEmpty(),
        check('pressed').not().isEmpty()
    ], newsController.changeLike
)

router.put('/views/:newsid',
    [
        check('newsid').not().isEmpty()
    ], newsController.updateViews
)

router.delete('/delete/:newsid',
    accessValidation,
    isAdmin,
    [
        check('newsid').not().isEmpty()
    ], newsController.deleteNews
)

router.delete('/unsave',
    accessValidation,
    [
        check('uid').not().isEmpty(),
        check('newsid').not().isEmpty()
    ], newsController.unsaveNews
)

module.exports = router