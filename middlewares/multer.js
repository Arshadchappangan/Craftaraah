const multer = require('multer');
const { file } = require('pdfkit');
const path = require('path');


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/uploads/product-images/');
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  });

  const categoryStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/uploads/category-images/');
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
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
const dpUpload = multer({ storage:profileStorage});
const categoryUpload = multer({storage:categoryStorage});
module.exports = {
    upload,
    dpUpload,
    categoryUpload
}
