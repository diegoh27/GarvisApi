/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./index.html", "./src/**/*.{ts,tsx}"],
	theme: {
		extend: {
			fontFamily: {
				headline: ["Manrope", "sans-serif"],
			},
			colors: {
				brand: {
					100: "#E6F5F4",
					200: "#B3E3E1",
					300: "#80D1CE",
					400: "#4DBFBA",
					500: "#1C9E98",
					600: "#0D7A76",
					700: "#3EAEB0",
					800: "#1C837F",
					900: "#054542",
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
