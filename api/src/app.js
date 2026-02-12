const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const path = require("path");
const { auth } = require("express-openid-connect");
const routes = require("./routes/index");

const server = express();

const config = {
	authRequired: false,
	auth0Logout: true,
	secret: process.env.AUTH0_SECRET,
	baseURL: process.env.AUTH0_BASEURL,
	clientID: process.env.AUTH0_CLIENTID,
	issuerBaseURL: process.env.AUTH0_ISSUERBASEURL,
};

server.use(
	cors({
		origin: [
			"http://localhost:3001",
			"http://localhost:5173",
			"https://garbis.online",
			"https://www.garbis.online",
			"https://garvis.mjeimports.store",
		],
		credentials: true,
	}),
);

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

server.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Main Rutes
// server.use(auth(config));
server.use("/", routes);

module.exports = server;
