const multer = require('multer');

const storage = multer.memoryStorage()

const fileSize = 5 * 1024 * 1024
const imageFilter = (req, file, cb) => {
    if(file.mimetype.startsWith('image/')){
        cb(null, true)
    }
    else{
        cb(new Error('Not an image file'), false)
    }
}

const uploadConfig = {
    storage: storage,
    limits: {
        fileSize: fileSize
    },
    fileFilter: imageFilter
}

const uploadProfilePicture = multer(uploadConfig).single('profilePicture')

const uploadNewsImages = multer(uploadConfig).fields([
    { name: 'banner', maxCount: 1},
    { name: 'image', maxCount: 1}
])

const handleProfilePictureUpload = (req, res, next) => {
    uploadProfilePicture(req, res, (err) => {
        if(err instanceof multer.MulterError){
            return res.status(400).json({ message: err.message })
        }
        else if(err){
            return res.status(400).json({ message: err.message })
        }
        next()
    })
}

const handleNewsImagesUpload = (req, res, next) => {
    uploadNewsImages(req, res, (err) => {
        if(err instanceof multer.MulterError){
            return res.status(400).json({ message: err.message })
        }
        else if(err){
            return res.status(400).json({ message: err.message })
        }
        next()
    })
}

module.exports = {
    handleProfilePictureUpload,
    handleNewsImagesUpload
}