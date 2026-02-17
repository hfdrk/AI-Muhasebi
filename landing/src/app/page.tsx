import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import LogoCloud from "@/components/LogoCloud";
import FeaturesGrid from "@/components/FeaturesGrid";
import FeatureShowcase from "@/components/FeatureShowcase";
import StatsSection from "@/components/StatsSection";
import HowItWorks from "@/components/HowItWorks";
import PricingSection from "@/components/PricingSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <LogoCloud />
        <FeaturesGrid />
        <FeatureShowcase />
        <StatsSection />
        <HowItWorks />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
