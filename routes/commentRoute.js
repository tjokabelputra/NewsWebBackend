const express = require('express')
const commentController = require('../controller/commentController')
const { check } = require('express-validator')

const router = express.Router()

router.post('/create',
    [
        check('uid').not().isEmpty(),
        check('newsid').not().isEmpty(),
        check('comment').not().isEmpty().isLength({ max: 1000 })
    ], commentController.createComment
)

router.get('/newsComment',
    [
        check('uid').not().isEmpty(),
        check('newsid').not().isEmpty()
    ], commentController.readNewsComment
)

router.put('/like',
    [
        check('uid').not().isEmpty(),
        check('commentid').not().isEmpty(),
        check('pressed').not().isEmpty()
    ], commentController.updateLike
)

router.delete('/delete/:newsid', commentController.deleteComment)

module.exports = router