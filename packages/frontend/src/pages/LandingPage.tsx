

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../stores/themeStore';
import { 
  BarChart3, 
  Network, 
  Zap, 
  Target, 
  TrendingUp, 
  Shield, 
  ArrowRight, 
  CheckCircle2,
  Menu,
  X,
  Twitter,
  Linkedin,
  Github,
  Mail,
  Eye,
  Sparkles,
  Layers,
  RefreshCw,
  Moon,
  Sun
} from 'lucide-react';

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

function Navigation() {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode, setDarkMode } = useThemeStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Force light mode on mount - clear persisted dark preference
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    setDarkMode(false);
    // Also clear persisted storage so hydration doesn't override
    localStorage.removeItem('theme-storage-v2');
  }, []);

  // Sync dark class with store state on toggle
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/80 dark:bg-[#0a0e27]/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg shadow-gray-200/20 dark:shadow-black/20' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <motion.div 
            className="flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fc763f] to-[#e05a2b] flex items-center justify-center shadow-lg shadow-orange-500/25">
              <Network className="w-5 h-5 text-white" />
            </div>
            <span className={`font-bold text-xl tracking-tight transition-colors ${
              isScrolled ? 'text-gray-900 dark:text-white' : 'text-gray-900 dark:text-white'
            }`}>
              Marketing Intelligence Platform
            </span>
          </motion.div>

          <div className="hidden lg:flex items-center gap-8">
            {[
              { label: 'Product', id: 'how-it-works' },
              { label: 'Capabilities', id: 'intelligence-layers' },
              { label: 'Solutions', id: 'workflow-solutions' },
              { label: 'Features', id: 'product-features' }
            ].map((item) => (
              <motion.button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`text-sm font-medium transition-colors hover:text-[#fc763f] ${
                  isScrolled ? 'text-gray-600 dark:text-gray-300' : 'text-gray-600 dark:text-gray-300'
                }`}
                whileHover={{ y: -2 }}
              >
                {item.label}
              </motion.button>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleDarkMode}
              className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <AnimatePresence mode="wait">
                {isDarkMode ? (
                  <motion.div
                    key="sun"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Sun className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon"
                    initial={{ opacity: 0, rotate: 90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: -90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Moon className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/auth')}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#fc763f] to-[#e05a2b] text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-shadow"
            >
              Get Started
            </motion.button>
          </div>

          <button 
            className="lg:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className={`w-6 h-6 ${isScrolled ? 'text-gray-900 dark:text-white' : 'text-gray-900 dark:text-white'}`} />
            ) : (
              <Menu className={`w-6 h-6 ${isScrolled ? 'text-gray-900 dark:text-white' : 'text-gray-900 dark:text-white'}`} />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white dark:bg-[#0a0e27] border-t border-gray-100 dark:border-gray-700"
          >
            <div className="px-6 py-4 space-y-4">
              {[
                { label: 'Product', id: 'how-it-works' },
                { label: 'Capabilities', id: 'intelligence-layers' },
                { label: 'Solutions', id: 'workflow-solutions' },
                { label: 'Features', id: 'product-features' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="block w-full text-left text-gray-600 dark:text-gray-300 font-medium py-2 hover:text-[#fc763f]"
                >
                  {item.label}
                </button>
              ))}
              
              <div className="flex items-center gap-3 py-2">
                <span className="text-gray-600 dark:text-gray-300 text-sm">Theme</span>
                <button
                  onClick={toggleDarkMode}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                >
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  <span className="text-sm">{isDarkMode ? 'Light' : 'Dark'}</span>
                </button>
              </div>
              
              <button 
                onClick={() => navigate('/auth')}
                className="w-full px-6 py-2.5 rounded-full bg-gradient-to-r from-[#fc763f] to-[#e05a2b] text-white font-semibold text-sm"
              >
                Get Started
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

function Hero() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });
  
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section ref={containerRef} className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-[#0a0e27] dark:via-[#0f1535] dark:to-[#0a0e27]">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#fc763f]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#e05a2b]/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-[#fc763f]/5 to-[#e05a2b]/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <motion.div 
            style={{ y, opacity }}
            className="space-y-8"
          >
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#fc763f]/10 border border-[#fc763f]/20"
            >
              <Sparkles className="w-4 h-4 text-[#fc763f]" />
              <span className="text-sm font-semibold text-[#e05a2b]">Marketing Intelligence Platform</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white leading-[1.1] tracking-tight"
            >
              See Your Marketing{' '}
              <span className="bg-gradient-to-r from-[#fc763f] to-[#e05a2b] bg-clip-text text-transparent">
                As a System
              </span>
              , Not Scattered Channels
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-lg"
            >
              A channel-agnostic system that evaluates marketing as an interconnected ecosystem. Map synergies, verify platform truth, and get AI recommendations with financial impact.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-wrap gap-4"
            >
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 20px 40px -10px rgba(252, 118, 63, 0.4)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/auth')}
              className="px-8 py-4 rounded-full bg-gradient-to-r from-[#fc763f] to-[#e05a2b] text-white font-semibold text-lg shadow-xl shadow-orange-500/30 flex items-center gap-2"
            >
              Experience the Platform
              <ArrowRight className="w-5 h-5" />
            </motion.button>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#fc763f]" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#fc763f]" />
                <span>14-day free trial</span>
              </div>
            </motion.div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8, rotateY: -15 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="relative w-full aspect-square">
              <motion.div
                animate={{ 
                  rotateX: [0, 10, 0],
                  rotateY: [0, -10, 0],
                }}
                transition={{ 
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0"
                style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
              >
                <svg viewBox="0 0 600 600" className="w-full h-full">
                  <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fc763f" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#e05a2b" stopOpacity="0.6" />
                    </linearGradient>
                    <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#e05a2b" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#fc763f" stopOpacity="0.7" />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>

                  <motion.g 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.5 }}
                  >
                    <path d="M300 100 L450 200 L450 400 L300 500 L150 400 L150 200 Z" 
                          fill="url(#grad1)" opacity="0.3" />
                    <path d="M300 150 L400 220 L400 380 L300 450 L200 380 L200 220 Z" 
                          fill="url(#grad2)" opacity="0.5" />
                    
                    <motion.path 
                      d="M300 180 L370 230 L370 370 L300 420 L230 370 L230 230 Z" 
                      fill="#fc763f" 
                      opacity="0.9"
                      animate={{ 
                        fill: ['#fc763f', '#e05a2b', '#fc763f'],
                      }}
                      transition={{ duration: 3, repeat: Infinity }}
                    />

                    <motion.circle cx="300" cy="100" r="12" fill="#fc763f" filter="url(#glow)"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <motion.circle cx="450" cy="200" r="8" fill="#e05a2b" filter="url(#glow)"
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
                    />
                    <motion.circle cx="450" cy="400" r="10" fill="#fc763f" filter="url(#glow)"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2.2, repeat: Infinity, delay: 0.6 }}
                    />
                    <motion.circle cx="300" cy="500" r="14" fill="#e05a2b" filter="url(#glow)"
                      animate={{ scale: [1, 1.25, 1] }}
                      transition={{ duration: 2.8, repeat: Infinity, delay: 0.9 }}
                    />
                    <motion.circle cx="150" cy="400" r="8" fill="#fc763f" filter="url(#glow)"
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 2.3, repeat: Infinity, delay: 1.2 }}
                    />
                    <motion.circle cx="150" cy="200" r="10" fill="#e05a2b" filter="url(#glow)"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2.6, repeat: Infinity, delay: 1.5 }}
                    />

                    <motion.path 
                      d="M300 100 L450 200" stroke="#fc763f" strokeWidth="2" opacity="0.6"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.5, delay: 0.8 }}
                    />
                    <motion.path 
                      d="M450 200 L450 400" stroke="#fc763f" strokeWidth="2" opacity="0.6"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.5, delay: 1 }}
                    />
                    <motion.path 
                      d="M450 400 L300 500" stroke="#fc763f" strokeWidth="2" opacity="0.6"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.5, delay: 1.2 }}
                    />
                    <motion.path 
                      d="M300 500 L150 400" stroke="#fc763f" strokeWidth="2" opacity="0.6"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.5, delay: 1.4 }}
                    />
                    <motion.path 
                      d="M150 400 L150 200" stroke="#fc763f" strokeWidth="2" opacity="0.6"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.5, delay: 1.6 }}
                    />
                    <motion.path 
                      d="M150 200 L300 100" stroke="#fc763f" strokeWidth="2" opacity="0.6"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.5, delay: 1.8 }}
                    />

                    <motion.path 
                      d="M300 100 L300 180" stroke="#e05a2b" strokeWidth="3" opacity="0.8"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1, delay: 2 }}
                    />
                    <motion.path 
                      d="M450 200 L370 230" stroke="#e05a2b" strokeWidth="3" opacity="0.8"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1, delay: 2.1 }}
                    />
                    <motion.path 
                      d="M450 400 L370 370" stroke="#e05a2b" strokeWidth="3" opacity="0.8"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1, delay: 2.2 }}
                    />
                    <motion.path 
                      d="M300 500 L300 420" stroke="#e05a2b" strokeWidth="3" opacity="0.8"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1, delay: 2.3 }}
                    />
                    <motion.path 
                      d="M150 400 L230 370" stroke="#e05a2b" strokeWidth="3" opacity="0.8"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1, delay: 2.4 }}
                    />
                    <motion.path 
                      d="M150 200 L230 230" stroke="#e05a2b" strokeWidth="3" opacity="0.8"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1, delay: 2.5 }}
                    />
                  </motion.g>
                </svg>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 1 }}
                className="absolute -top-4 -right-4 bg-white dark:bg-[#162044] rounded-2xl p-4 shadow-xl border border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#fc763f] to-[#e05a2b] flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Revenue Impact</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">+47%</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 1.2 }}
                className="absolute -bottom-4 -left-4 bg-white dark:bg-[#162044] rounded-2xl p-4 shadow-xl border border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e05a2b] to-[#fc763f] flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Attribution Accuracy</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">99.2%</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function WorkflowSolutions() {
  const [activeTeam, setActiveTeam] = useState(0);
  
  const teams = [
    {
      icon: BarChart3,
      title: 'For Operations Teams',
      description: 'Create efficient, repeatable processes that reduce manual work, speed up decisions, and keep your entire operation running smoothly.',
      benefits: [
        'Automate repetitive, high-volume tasks',
        'Maintain consistency across daily workflows',
        'Reduce human error with intelligent checks',
        'Enable faster coordination across departments'
      ]
    },
    {
      icon: Target,
      title: 'For Marketing Teams',
      description: 'Understand your marketing ecosystem as a whole, not just individual channels.',
      benefits: [
        'See channel synergies and isolation visually',
        'Identify underperforming parts system-wide',
        'Get actionable recommendations with ROI impact',
        'Cross-verify platform claims with actual data'
      ]
    },
    {
      icon: TrendingUp,
      title: 'For Growth Leaders',
      description: 'Make data-driven decisions with confidence using verified, cross-platform insights.',
      benefits: [
        'Understand system-level performance',
        'Track momentum across all channels',
        'Verify attribution accuracy',
        'Predict financial impact of changes'
      ]
    },
    {
      icon: Shield,
      title: 'For Business Analysts',
      description: 'Clean, reliable data that actually matches your financial reality.',
      benefits: [
        'Platform truth verification',
        'Custom pixel + GA4 cross-check',
        'Automated anomaly detection',
        'Professional-grade reporting'
      ]
    }
  ];

  return (
    <section id="workflow-solutions" className="py-32 bg-white dark:bg-[#162044]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <motion.span 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-gray-600 dark:text-gray-300 mb-6"
            >
              <Network className="w-4 h-4" />
              Workflow Solutions
            </motion.span>
            
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              Designed for Every{' '}
              <span className="bg-gradient-to-r from-[#fc763f] to-[#e05a2b] bg-clip-text text-transparent">
                Workflow
              </span>
              , Across Every Team
            </h2>
            
            <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
              Whether you're analyzing data, creating content, or automating operations, the platform adapts effortlessly to your team's unique needs.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-100 dark:border-gray-700">
              <motion.div 
                className="absolute inset-0 bg-gradient-to-br from-[#fc763f]/5 to-[#e05a2b]/5 rounded-3xl"
                animate={{ 
                  background: [
                    'linear-gradient(to bottom right, rgba(252, 118, 63, 0.05), rgba(224, 90, 43, 0.05))',
                    'linear-gradient(to bottom right, rgba(224, 90, 43, 0.05), rgba(252, 118, 63, 0.05))',
                    'linear-gradient(to bottom right, rgba(252, 118, 63, 0.05), rgba(224, 90, 43, 0.05))'
                  ]
                }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              
              <svg viewBox="0 0 400 400" className="w-full relative z-10">
                <defs>
                  <linearGradient id="sphereGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fc763f" />
                    <stop offset="50%" stopColor="#e05a2b" />
                    <stop offset="100%" stopColor="#fc763f" />
                  </linearGradient>
                </defs>
                
                <motion.circle 
                  cx="200" cy="200" r="80" 
                  fill="url(#sphereGrad)" 
                  opacity="0.9"
                  animate={{ 
                    scale: [1, 1.05, 1],
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                
                <motion.ellipse 
                  cx="200" cy="200" rx="120" ry="40" 
                  fill="none" 
                  stroke="#fc763f" 
                  strokeWidth="2"
                  opacity="0.4"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  style={{ transformOrigin: '200px 200px' }}
                />
                
                <motion.ellipse 
                  cx="200" cy="200" rx="40" ry="120" 
                  fill="none" 
                  stroke="#e05a2b" 
                  strokeWidth="2"
                  opacity="0.4"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                  style={{ transformOrigin: '200px 200px' }}
                />
                
                {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                  <motion.circle
                    key={angle}
                    cx={200 + 140 * Math.cos((angle * Math.PI) / 180)}
                    cy={200 + 140 * Math.sin((angle * Math.PI) / 180)}
                    r="8"
                    fill="#fc763f"
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1, 0.8, 1] }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                  />
                ))}
              </svg>
            </div>
          </motion.div>
        </div>

        <motion.div 
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-20"
        >
          {teams.map((team, index) => (
            <motion.div
              key={team.title}
              variants={fadeInUp}
              whileHover={{ y: -8, boxShadow: '0 25px 50px -12px rgba(252, 118, 63, 0.15)' }}
              onClick={() => setActiveTeam(index)}
              className={`p-6 rounded-2xl cursor-pointer transition-all duration-300 ${
                activeTeam === index 
                  ? 'bg-gradient-to-br from-[#fc763f] to-[#e05a2b] text-white shadow-xl shadow-orange-500/25' 
                  : 'bg-gray-50 dark:bg-[#162044] hover:bg-white dark:hover:bg-[#1e2d5c] border border-transparent hover:border-gray-100 dark:border-gray-700'
              }`}
            >
              <team.icon className={`w-8 h-8 mb-4 ${activeTeam === index ? 'text-white' : 'text-[#fc763f]'}`} />
              <h3 className={`font-bold mb-2 ${activeTeam === index ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                {team.title}
              </h3>
            </motion.div>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTeam}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="mt-12 p-8 bg-gray-50 dark:bg-[#111936] rounded-3xl"
          >
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{teams[activeTeam].title}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{teams[activeTeam].description}</p>
            <ul className="grid sm:grid-cols-2 gap-3">
              {teams[activeTeam].benefits.map((benefit, i) => (
                <motion.li 
                  key={benefit}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 text-gray-700"
                >
                  <div className="w-6 h-6 rounded-full bg-[#fc763f]/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-[#fc763f]" />
                  </div>
                  {benefit}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: Eye,
      title: 'Dual Tracking',
      description: 'Custom pixel + Google Analytics 4 cross-verification for complete visibility.',
      color: '#fc763f'
    },
    {
      icon: Shield,
      title: 'Platform Truth Verification',
      description: 'Cross-reference platform claims against actual payment data to verify accuracy.',
      color: '#e05a2b'
    },
    {
      icon: Network,
      title: 'System Intelligence',
      description: 'Visual network mapping of channel synergies and isolation across your ecosystem.',
      color: '#fc763f'
    },
    {
      icon: Sparkles,
      title: 'AI Recommendations',
      description: 'Specific actions with financial impact predictions to optimize performance.',
      color: '#e05a2b'
    },
    {
      icon: RefreshCw,
      title: 'CAPI Feedback Loop',
      description: 'Send verified conversions back to platforms for better optimization.',
      color: '#fc763f'
    }
  ];

  return (
    <section id="how-it-works" className="py-32 bg-gradient-to-b from-gray-50 to-white dark:from-[#0a0e27] dark:to-[#0f1535]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#fc763f]/10 border border-[#fc763f]/20 text-sm font-semibold text-[#e05a2b] mb-6">
            <Zap className="w-4 h-4" />
            How It Works
          </span>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            From Data to Decisions
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            A seamless workflow that transforms scattered marketing data into actionable system intelligence.
          </p>
        </motion.div>

        <div className="relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#fc763f] via-[#e05a2b] to-[#fc763f] hidden lg:block" />
          
          <div className="space-y-12 lg:space-y-24">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`relative flex flex-col lg:flex-row items-center gap-8 ${
                  index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
                }`}
              >
                <div className={`flex-1 ${index % 2 === 0 ? 'lg:text-right' : 'lg:text-left'}`}>
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="bg-white dark:bg-[#162044] p-8 rounded-3xl shadow-lg shadow-gray-200/50 border border-gray-100 dark:border-gray-700 inline-block"
                  >
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{step.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300 max-w-md">{step.description}</p>
                  </motion.div>
                </div>

                <motion.div 
                  className="relative z-10 flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#fc763f] to-[#e05a2b] shadow-xl shadow-orange-500/30"
                  whileHover={{ scale: 1.1, rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  <step.icon className="w-8 h-8 text-white" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white dark:bg-[#162044] flex items-center justify-center shadow-lg">
                    <span className="text-sm font-bold text-[#fc763f]">{index + 1}</span>
                  </div>
                </motion.div>

                <div className="flex-1" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      icon: BarChart3,
      title: 'Smart Understanding',
      subtitle: 'Understands your documents and data.',
      description: 'Advanced AI processes your marketing documents, reports, and data sources to extract meaningful insights.',
      highlights: ['Document parsing', 'Data extraction', 'Insight generation']
    },
    {
      icon: Layers,
      title: 'High-Fidelity Reasoning',
      subtitle: 'Thinks through information clearly.',
      description: 'Multi-layered analysis that connects dots across your entire marketing ecosystem.',
      highlights: ['System-level view', 'Cross-channel analysis', 'Trend identification']
    },
    {
      icon: Zap,
      title: 'Automated Execution',
      subtitle: 'Handles tasks automatically.',
      description: 'Set up workflows that execute automatically based on triggers and conditions you define.',
      highlights: ['Workflow automation', 'Trigger-based actions', 'Scheduled reports']
    },
    {
      icon: Sparkles,
      title: 'Instant Creation',
      subtitle: 'Creates content instantly.',
      description: 'Generate reports, summaries, and recommendations with professional quality in seconds.',
      highlights: ['Report generation', 'AI recommendations', 'Financial forecasts']
    }
  ];

  return (
    <section id="product-features" className="py-32 bg-white dark:bg-[#162044]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-gray-600 dark:text-gray-300 mb-6">
            <Zap className="w-4 h-4" />
            Product Features
          </span>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Features Crafted for{' '}
            <span className="bg-gradient-to-r from-[#fc763f] to-[#e05a2b] bg-clip-text text-transparent">
              Intelligence
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Each feature enhances a different part of your workflow, together forming a seamless, powerful AI experience.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -8, boxShadow: '0 30px 60px -15px rgba(252, 118, 63, 0.15)' }}
              className="group p-8 rounded-3xl bg-gray-50 dark:bg-[#162044] hover:bg-white dark:hover:bg-[#1e2d5c] border border-transparent hover:border-gray-100 dark:border-gray-700 transition-all duration-300"
            >
              <div className="flex items-start gap-6">
                <motion.div 
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#fc763f]/20 to-[#e05a2b]/20 flex items-center justify-center flex-shrink-0"
                >
                  <feature.icon className="w-8 h-8 text-[#fc763f]" />
                </motion.div>
                
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                  <p className="text-[#fc763f] font-semibold mb-3">{feature.subtitle}</p>
                  <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">{feature.description}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {feature.highlights.map((highlight) => (
                      <span 
                        key={highlight}
                        className="px-3 py-1 rounded-full bg-white dark:bg-[#162044] text-sm font-medium text-gray-700 border border-gray-200 dark:border-gray-700"
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  const navigate = useNavigate();
  return (
    <section className="py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#fc763f] to-[#e05a2b]" />
      
      <motion.div 
        animate={{ 
          background: [
            'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
            'radial-gradient(circle at 80% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
            'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)'
          ]
        }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute inset-0"
      />

      <div className="max-w-4xl mx-auto px-6 lg:px-8 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <motion.span 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-[#162044]/20 backdrop-blur-sm text-sm font-semibold text-white mb-8"
          >
            <Sparkles className="w-4 h-4" />
            Intelligent Marketing Starts Here
          </motion.span>
          
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Unlock a Smarter Way to Market
          </h2>
          
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            Experience a refined AI platform built for clarity, intelligence, and exceptional marketing performance.
          </p>
          
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/auth')}
            className="px-8 py-4 rounded-full bg-white dark:bg-[#162044] text-[#e05a2b] font-bold text-lg shadow-xl flex items-center gap-2"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fc763f] to-[#e05a2b] flex items-center justify-center">
                <Network className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl">Marketing Intelligence Platform</span>
            </div>
            <p className="text-gray-400 mb-6">
              See your marketing as a system, not scattered channels.
            </p>
            <div className="flex gap-4">
              {[Twitter, Linkedin, Github, Mail].map((Icon, i) => (
                <motion.a
                  key={i}
                  href="#"
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[#fc763f] transition-colors"
                >
                  <Icon className="w-5 h-5" />
                </motion.a>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <h4 className="font-bold text-lg mb-6">Solutions</h4>
            <ul className="space-y-4">
              {['Marketing Operations', 'Business Analytics', 'Growth Teams', 'Data Science'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-gray-400 hover:text-[#fc763f] transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <h4 className="font-bold text-lg mb-6">Product</h4>
            <ul className="space-y-4">
              {['Overview', 'How It Works', 'Pricing', 'Integrations', 'API Docs'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-gray-400 hover:text-[#fc763f] transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <h4 className="font-bold text-lg mb-6">Stay Updated</h4>
            <p className="text-gray-400 mb-4">Get the latest updates on marketing intelligence.</p>
            <div className="flex gap-2">
              <input 
                type="email" 
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-[#fc763f]"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#fc763f] to-[#e05a2b] font-semibold"
              >
                Subscribe
              </motion.button>
            </div>
          </motion.div>
        </div>

        <div className="pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            © 2025 Marketing Intelligence Platform. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-gray-500 dark:text-gray-400">
            <a href="#" className="hover:text-[#fc763f] transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-[#fc763f] transition-colors">Terms of Use</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const { isDarkMode } = useThemeStore();
  
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
