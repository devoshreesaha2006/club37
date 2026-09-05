const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Uploads a photo buffer to Cloudinary. Runs entirely on the server —
 * the Cloudinary API secret is never exposed to the frontend.
 * Returns { url, publicId } or null if no buffer was provided.
 */
function uploadProfilePhoto(fileBuffer) {
  return new Promise((resolve, reject) => {
    if (!fileBuffer) return resolve(null);

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'club37/profile-photos',
        resource_type: 'image',
        transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }]
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );

    stream.end(fileBuffer);
  });
}

async function deleteProfilePhoto(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('[cloudinary] Failed to delete image:', err.message);
  }
}

module.exports = { uploadProfilePhoto, deleteProfilePhoto };
