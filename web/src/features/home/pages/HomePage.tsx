import {
	HeaderLanding,
	HeroSection,
	SobreNosotrosSection,
	ServiciosSection,
	ContactanosSection,
	FooterLanding,
} from "../components";

const HomePage = () => {
	return (
		<div className="min-h-screen bg-gradient-to-b from-[#E0F7FA] via-white to-[#C7F5FF] text-slate-800">
			<HeaderLanding />
			<HeroSection />
			<SobreNosotrosSection />
			<ServiciosSection />
			<ContactanosSection />
			<FooterLanding />
		</div>
	);
};

export default HomePage;