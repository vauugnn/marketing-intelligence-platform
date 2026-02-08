import { useTheme } from '../components/theme-provider';
import Navigation from '../components/landing/Navigation';
import Hero from '../components/landing/Hero';
import HowItWorks from '../components/landing/HowItWorks';
import WorkflowSolutions from '../components/landing/WorkflowSolutions';
import Features from '../components/landing/Features';
import CTA from '../components/landing/CTA';
import Footer from '../components/landing/Footer';

export default function LandingPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';


  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#0a0e27]' : 'bg-white'}`}>
      <Navigation />
      <Hero />
      <HowItWorks />
      <WorkflowSolutions />
      <Features />
      <CTA />
      <Footer />
    </div>
  );
}
