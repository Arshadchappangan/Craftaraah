const multer = require('multer');
const { file } = require('pdfkit');
const path = require('path');


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/uploads/product-images/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const profileStorage = multer.diskStorage({
    destination: (req,file,cb) => {
        cb(null,"public/uploads/user-images/")
    },
    filename:(req,file,cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `DP-${Date.now()}${ext}`)
    }
})


const upload = multer({ storage: storage });
const dpUpload = multer({ storage:profileStorage})
module.exports = {
    upload,
    dpUpload
}
