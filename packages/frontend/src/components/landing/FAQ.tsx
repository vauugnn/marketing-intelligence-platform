import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, HelpCircle } from 'lucide-react';

const faqs = [
    {
        question: "How does the platform verify my data?",
        answer: "We use a dual-tracking system that combines a custom pixel with server-side validation. This allows us to cross-reference platform claims against actual transaction data, ensuring 99.2% attribution accuracy."
    },
    {
        question: "Do I need technical expertise to set this up?",
        answer: "Not at all. Our one-click integration works with major platforms like Shopify, WooCommerce, and Magento. For custom sites, we provide a simple copy-paste snippet that takes less than 5 minutes to install."
    },
    {
        question: "Is it compliant with privacy regulations?",
        answer: "Yes, we are fully GDPR and CCPA compliant. We use first-party data collection and server-side tracking which respects user privacy while still providing accurate attribution."
    },
    {
        question: "Can I track offline conversions?",
        answer: "Absolutely. You can upload offline sales data (CSV or API) and our engine will match it with online user journeys to give you a complete picture of your marketing impact."
    },
    {
        question: "How is this different from Google Analytics?",
        answer: "Google Analytics relies on cookies and often under-reports due to ad blockers and privacy updates (iOS 14+). We use server-side tracking and identity resolution to see the complete journey that GA4 often misses."
    }
];

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section id="faq" className="py-24 bg-gray-50 dark:bg-[#0a0e27]">
            <div className="max-w-4xl mx-auto px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#fc763f]/10 border border-[#fc763f]/20 text-sm font-semibold text-[#e05a2b] mb-6">
                        <HelpCircle className="w-4 h-4" />
                        Common Questions
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        Frequently Asked Questions
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300">
                        Everything you need to know about the platform and billing.
                    </p>
                </motion.div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white dark:bg-[#162044] rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden"
                        >
                            <button
                                onClick={() => setOpenIndex(active => active === index ? null : index)}
                                className="w-full flex items-center justify-between p-6 text-left"
                            >
                                <span className="font-semibold text-gray-900 dark:text-white pr-8">
                                    {faq.question}
                                </span>
                                <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${openIndex === index ? 'bg-[#fc763f] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                                    {openIndex === index ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                </span>
                            </button>
                            <AnimatePresence>
                                {openIndex === index && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-6 pb-6 text-gray-600 dark:text-gray-300 leading-relaxed">
                                            {faq.answer}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
