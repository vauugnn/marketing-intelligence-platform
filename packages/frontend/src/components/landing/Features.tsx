import { motion } from 'framer-motion';
import { BarChart3, Layers, Zap, Sparkles } from 'lucide-react';

export default function Features() {
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
                                                className="px-3 py-1 rounded-full bg-white dark:bg-[#162044] text-sm font-medium text-gray-700 dark:text-white border border-gray-200 dark:border-gray-700"
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
