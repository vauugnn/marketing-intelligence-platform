import { motion } from 'framer-motion';

import Logo from '../../Logo.svg';

export default function Footer() {
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
                            <img src={Logo} alt="Neuralys" className="w-10 h-10" />
                            <span className="font-bold text-xl">Neuralys</span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm">
                            The complete marketing intelligence platform for modern growth teams.
                        </p>
                        <div className="flex gap-4">
                            {/* Social links would go here */}
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
