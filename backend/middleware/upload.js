const multer = require('multer');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error('INVALID_FILE_TYPE'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES }
});

// Wraps multer's single-file upload so upload errors turn into clean
// JSON responses instead of raw multer exceptions.
function handleProfilePhotoUpload(req, res, next) {
  const single = upload.single('profilePhoto');
  single(req, res, (err) => {
    if (!err) return next();

    if (err.message === 'INVALID_FILE_TYPE') {
      return res.status(400).json({
        success: false,
        message: 'Profile photo must be a JPEG, PNG, or WEBP image.'
      });
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Profile photo must be smaller than 5MB.'
      });
    }
    return res.status(400).json({ success: false, message: 'Unable to process the uploaded file.' });
  });
}

module.exports = { handleProfilePhotoUpload };
