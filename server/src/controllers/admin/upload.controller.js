const { HttpError } = require('../../middleware/errorHandler');

function uploadImage(req, res, next) {
  try {
    if (!req.file) throw new HttpError(400, 'No image file was uploaded.');
    // Embedded directly as a data URI — no disk, no external bucket, no
    // account/card needed anywhere. Goes straight into Product.images.
    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    res.status(201).json({ url: dataUri });
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadImage };
