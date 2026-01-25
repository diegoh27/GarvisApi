require("dotenv").config();
const cloudinary = require("cloudinary").v2;

// Usar CLOUDINARY_NAME o CLOUDINARY_CLOUD_NAME (compatibilidad)
const cloudName = process.env.CLOUDINARY_NAME || process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
	console.warn(
		"⚠️  Advertencia: Variables de Cloudinary no configuradas. Verifica tu archivo .env"
	);
}

cloudinary.config({
	cloud_name: cloudName,
	api_key: apiKey,
	api_secret: apiSecret,
});

module.exports = cloudinary;
