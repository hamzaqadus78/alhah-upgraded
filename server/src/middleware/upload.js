const multer = require('multer');
const { HttpError } = require('./errorHandler');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// Images are stored as base64 data URIs directly in the Product row (see
// upload.controller.js) rather than on disk or an external bucket — this
// works unchanged on any host, including ones with ephemeral/no persistent
// filesystem, and needs no third-party storage account. memoryStorage keeps
// the file in RAM only, nothing ever touches disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new HttpError(400, 'Only JPEG, PNG, WebP, or GIF images are allowed.'));
    }
    cb(null, true);
  },
});

module.exports = { upload };
