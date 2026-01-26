/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./index.html", "./src/**/*.{ts,tsx}"],
	theme: {
		extend: {
			colors: {
				brand: {
					900: "#054542",
					800: "#1C837F",
					700: "#3EAEB0",
				},
				accent: "#61BACA",
				mint: "#9DD1CD",
				ice: "#9FD8E1",
				cloud: "#D7EAEE",
				mist: "#DDEFF1",
				paper: "#FDFDFD",
			},
		},
	},
	plugins: [
		require("daisyui")({
			themes: ["light"],
			darkTheme: false,
		}),
	],
};
