import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Menu, X } from 'lucide-react';
import { useTheme } from '../theme-provider';
import Logo from '../../Logo.svg';

export default function Navigation() {
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
    const isDarkMode = theme === 'dark';
    const toggleDarkMode = () => setTheme(isDarkMode ? 'light' : 'dark');
    const setDarkMode = (isDark: boolean) => setTheme(isDark ? 'dark' : 'light');
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
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
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
                        <img src={Logo} alt="Neuralys" className="w-10 h-10" />
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#fc763f] to-[#e05a2b]">
                            Neuralys
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
                                className={`text-sm font-medium transition-colors hover:text-[#fc763f] ${isScrolled ? 'text-gray-600 dark:text-gray-300' : 'text-gray-600 dark:text-gray-300'
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
                            onClick={() => navigate('/auth')} // Changed /auth to /login? or /signup? Assuming /auth exists or user wants that. Code had /auth.
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
