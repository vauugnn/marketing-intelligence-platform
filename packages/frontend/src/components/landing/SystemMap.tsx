import { motion } from 'framer-motion';
import { Database, Mail, MessageSquare, Globe, ShoppingCart, Smartphone, Zap } from 'lucide-react';

const SATELLITES = [
    { Icon: Mail, color: '#EA4335', angle: 210, radius: 180, delay: 0, label: 'Email' },
    { Icon: MessageSquare, color: '#34A853', angle: 150, radius: 220, delay: 0.2, label: 'Social' },
    { Icon: Globe, color: '#4285F4', angle: 90, radius: 260, delay: 0.4, label: 'Web' },
    { Icon: ShoppingCart, color: '#FBBC05', angle: 330, radius: 240, delay: 0.6, label: 'Sales' },
    { Icon: Smartphone, color: '#8E24AA', angle: 30, radius: 200, delay: 0.8, label: 'Mobile' },
    { Icon: Zap, color: '#FF6D00', angle: 270, radius: 190, delay: 1.0, label: 'Ads' },
];

export default function SystemMap() {
    return (
        <div className="relative w-full aspect-square max-w-[600px] mx-auto flex items-center justify-center">

            {/* Ambient Background Glow */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute inset-0 rounded-full blur-3xl pointer-events-none"
                style={{
                    background: 'radial-gradient(circle, rgba(252,118,63,0.3) 0%, rgba(224,90,43,0.1) 40%, rgba(0,0,0,0) 70%)'
                }}
            />

            {/* Orbit Rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                    className="w-[360px] h-[360px] border border-dashed border-gray-200 dark:border-white/10 rounded-full"
                />
                <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
                    className="absolute w-[500px] h-[500px] border border-dashed border-gray-200 dark:border-white/5 rounded-full opacity-50"
                />
            </div>

            {/* Connecting Lines Layer - SVG with 0,0 center */}
            <svg
                className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
                viewBox="-300 -300 600 600"
            >
                {SATELLITES.map((node, i) => {
                    const radian = (node.angle * Math.PI) / 180;
                    const x = Math.cos(radian) * node.radius;
                    const y = Math.sin(radian) * node.radius;

                    return (
                        <g key={i}>
                            {/* Static Line */}
                            <motion.line
                                x1={0} y1={0} x2={x} y2={y}
                                stroke={node.color}
                                strokeWidth="1.5"
                                strokeOpacity="0.2"
                                strokeDasharray="4 4"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 0.2 }}
                                transition={{ duration: 1.5, delay: node.delay }}
                            />

                            {/* Data Packet Moving Out */}
                            <motion.circle r="3" fill={node.color}>
                                <animateMotion
                                    dur="3s"
                                    repeatCount="indefinite"
                                    path={`M 0 0 L ${x} ${y}`}
                                    keyPoints="0;1"
                                    keyTimes="0;1"
                                    begin={`${node.delay}s`}
                                    calcMode="linear"
                                />
                            </motion.circle>

                            {/* Data Packet Moving In (Echo) */}
                            <motion.circle r="2" fill={node.color} opacity="0.6">
                                <animateMotion
                                    dur="4s"
                                    repeatCount="indefinite"
                                    path={`M ${x} ${y} L 0 0`}
                                    keyPoints="0;1"
                                    keyTimes="0;1"
                                    begin={`${node.delay + 1.5}s`}
                                    calcMode="linear"
                                />
                            </motion.circle>
                        </g>
                    );
                })}
            </svg>

            {/* Central Node - Core System */}
            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, type: "spring" }}
                className="relative z-20 w-32 h-32 flex items-center justify-center"
            >
                {/* Pulsing Core BG */}
                <div className="absolute inset-0 bg-white dark:bg-[#1f2937] rounded-full shadow-2xl border-4 border-[#fc763f]/10 z-10" />
                <motion.div
                    animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.2, 0.5] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="absolute inset-[-4px] rounded-full bg-gradient-to-br from-[#fc763f] to-[#e05a2b] z-0 blur-sm"
                />

                <div className="relative z-20 flex flex-col items-center">
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl mb-1">
                        <Database className="w-8 h-8 text-[#fc763f]" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Core</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">System</span>
                </div>
            </motion.div>

            {/* Satellite Nodes */}
            {SATELLITES.map((node, i) => {
                const radian = (node.angle * Math.PI) / 180;
                // We use standard CSS transform for positioning from center 
                // x = cos(a) * r, y = sin(a) * r
                // Since container is flex center, absolute position with transform translate is easiest
                const x = Math.cos(radian) * node.radius;
                const y = Math.sin(radian) * node.radius;

                return (
                    <motion.div
                        key={i}
                        className="absolute z-20"
                        style={{ x, y }} // Framer motion handles the translate transform
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: node.delay, type: "spring", stiffness: 200, damping: 20 }}
                    >
                        {/* Hover Floating Animation */}
                        <motion.div
                            animate={{ y: [-5, 5, -5] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
                            className="group relative"
                        >
                            <div className="absolute inset-0 bg-white dark:bg-[#1f2937] rounded-2xl shadow-lg transform transition-transform duration-300 group-hover:scale-110" />
                            <div className={`relative w-14 h-14 flex items-center justify-center rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-[#1f2937]`}>
                                <node.Icon className="w-6 h-6" style={{ color: node.color }} />

                                {/* Status Dot */}
                                <span className="absolute top-0 right-0 w-3 h-3 -mt-1 -mr-1 rounded-full border-2 border-white dark:border-[#1f2937]" style={{ backgroundColor: node.color }} />
                            </div>

                            {/* Label */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 whitespace-nowrap">
                                <span className="px-3 py-1 bg-white/90 dark:bg-black/80 backdrop-blur text-xs font-semibold text-gray-700 dark:text-gray-200 rounded-full shadow-sm border border-gray-100 dark:border-gray-700">
                                    {node.label}
                                </span>
                            </div>
                        </motion.div>
                    </motion.div>
                );
            })}
        </div>
    );
}
