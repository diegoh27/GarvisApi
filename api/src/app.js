const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const path = require("path");
const { auth } = require("express-openid-connect");
const routes = require("./routes/index");
const { getUploadsDir } = require("./utils/uploadToLocal");
const { auditoriaMid } = require("./middleware/auditoriaMid");

const server = express();

const config = {
	authRequired: false,
	auth0Logout: true,
	secret: process.env.AUTH0_SECRET,
	baseURL: process.env.AUTH0_BASEURL,
	clientID: process.env.AUTH0_CLIENTID,
	issuerBaseURL: process.env.AUTH0_ISSUERBASEURL,
};

// CORS — en producción solo orígenes del frontend; en dev permite todo
const DEFAULT_CORS_ORIGINS = [
	"http://localhost:5173",
	"http://localhost:3000",
	"https://garbis.online",
	"https://www.garbis.online",
];

function parseCorsOrigins() {
	const fromEnv = [
		process.env.FRONTEND_URL,
		process.env.WEB_BASE_URL,
		process.env.URL_BASE_FRONT,
	]
		.filter(Boolean)
		.flatMap((v) => v.split(","))
		.map((v) => v.trim().replace(/\/$/, ""))
		.filter(Boolean);
	return [...new Set([...DEFAULT_CORS_ORIGINS, ...fromEnv])];
}

const allowedOrigins = parseCorsOrigins();
const isProduction = process.env.NODE_ENV === "production";

const corsOptions = {
	origin(origin, callback) {
		if (!origin || !isProduction) {
			return callback(null, true);
		}
		const normalized = origin.replace(/\/$/, "");
		if (allowedOrigins.includes(normalized)) {
			return callback(null, true);
		}
		return callback(new Error(`CORS: origen no permitido (${origin})`));
	},
	credentials: true,
	methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
	allowedHeaders: [
		"Content-Type",
		"Authorization",
		"X-Requested-With",
		"Accept",
	],
	exposeHeaders: ["Content-Length", "Content-Type"],
	preflightContinue: false,
	optionsSuccessStatus: 204,
};

server.use(cors(corsOptions));

// Handle preflight requests
server.options("*", cors(corsOptions));

server.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
server.use(bodyParser.json({ limit: "50mb" }));
server.use(cookieParser());
server.use(morgan("dev"));

server.use((err, req, res, next) => {
	const status = err.status || 500;
	const message = err.message || err;
	console.error(err);
	res.status(status).send(message);
});

server.use(express.json());
server.use(express.urlencoded({ extended: true }));

server.use(
	"/uploads",
	express.static(getUploadsDir(), {
		setHeaders(res, filePath) {
			const ext = path.extname(filePath).toLowerCase();
			if (ext === ".dcm" || ext === ".dicom") {
				res.set("Content-Type", "application/dicom");
				res.set("Accept-Ranges", "bytes");
			}
		},
	}),
);

// Middleware de auditoría (antes de las rutas para capturar todos los eventos)
server.use(auditoriaMid);

// Main Rutes
// server.use(auth(config));
server.use("/", routes);

module.exports = server;
