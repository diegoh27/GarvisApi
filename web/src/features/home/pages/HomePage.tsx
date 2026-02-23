import {
	HeaderLanding,
	HeroSection,
	SobreNosotrosSection,
	ServiciosSection,
	ContactanosSection,
	FooterLanding,
} from "../components";
// import { EmailVerificationBanner } from "../../../shared";

const HomePage = () => {
	return (
		<div className="min-h-screen bg-gradient-to-b from-[#E0F7FA] via-white to-[#C7F5FF] text-slate-800">
			<HeaderLanding />
			<div className="px-4 pt-4">
				{/* <EmailVerificationBanner /> */}
			</div>
			<HeroSection />
			<SobreNosotrosSection />
			<ServiciosSection />
			<ContactanosSection />
			<FooterLanding />
		</div>
	);
};

export default HomePage;