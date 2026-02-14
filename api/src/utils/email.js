const { Resend } = require("resend");

const sendEmail = async ({ to, subject, html, text }) => {
	const apiKey = process.env.RESEND_API_KEY;
	const from = process.env.RESEND_FROM;

	if (!apiKey || !from) {
		console.warn("Resend no configurado. Email omitido.");
		return { skipped: true };
	}

	const resend = new Resend(apiKey);
	const payload = {
		from,
		to: Array.isArray(to) ? to : [to],
		subject,
		html,
		text,
	};

	const response = await resend.emails.send(payload);
	return response;
};

module.exports = {
	sendEmail,
};
