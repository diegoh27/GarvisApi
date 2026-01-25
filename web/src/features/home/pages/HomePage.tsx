import {
	HeaderLanding,
	HeroSection,
	SobreNosotrosSection,
	ServiciosSection,
	ContactanosSection,
} from "../components";

const HomePage = () => {
	return (
		<div className="bg-[#E0F2F1]">
			<HeaderLanding />
			<HeroSection />
			<SobreNosotrosSection />
			<ServiciosSection />
			<ContactanosSection />
		</div>
	);
};

export default HomePage;
