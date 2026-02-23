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

// CORS Configuration
const corsOptions = {
	origin: function (origin, callback) {
		const allowedOrigins = [
			"http://localhost:3001",
			"http://localhost:5173",
			"https://garbis.online",
			"https://www.garbis.online",
			"https://garvis.mjeimports.store",
		];
		// Allow requests with no origin (like mobile apps or curl)
		if (!origin || allowedOrigins.indexOf(origin) !== -1) {
			callback(null, true);
		} else {
			callback(new Error("Not allowed by CORS"));
		}
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
