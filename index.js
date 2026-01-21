require("dotenv").config();

const server = require("./src/app.js");
const { PORT } = process.env;

const { testConnection } = require("./src/db.js");

(async () => {
	try {
		await testConnection();

		server.listen(PORT, () => {
			console.log("listening at port", PORT);
		});
	} catch (err) {
		console.error("❌ Error conectando a MySQL:", err.message);
		process.exit(1);
	}
})();
