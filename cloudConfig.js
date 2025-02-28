const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,  //api_key,cloud_name and api_secret shouls be same always
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'Travel_Roots_DATA',
      allowedFormats: ["png", "jpg","jpeg"],
    },
});

module.exports = {
    cloudinary,
    storage,
};

  