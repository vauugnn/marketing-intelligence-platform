import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Mail, MessageSquare, Globe, ShoppingCart, Smartphone, Zap, TrendingUp, ArrowUpRight, DollarSign, Users, Activity } from 'lucide-react';

const SATELLITES = [
    {
        Icon: Mail,
        color: '#EA4335',
        angle: 210,
        radius: 180,
        delay: 0,
        label: 'Email',
        stat: { value: '+45%', label: 'Open Rate', icon: ArrowUpRight },
        description: 'Direct response channel'
    },
    {
        Icon: MessageSquare,
        color: '#34A853',
        angle: 150,
        radius: 220,
        delay: 0.2,
        label: 'Social',
        stat: { value: '12k', label: 'Engagements', icon: Users },
        description: 'Community growth'
    },
    {
        Icon: Globe,
        color: '#4285F4',
        angle: 90,
        radius: 260,
        delay: 0.4,
        label: 'Web',
        stat: { value: '-20%', label: 'Bounce Rate', icon: Activity },
        description: 'Traffic quality'
    },
    {
        Icon: ShoppingCart,
        color: '#FBBC05',
        angle: 330,
        radius: 240,
        delay: 0.6,
        label: 'Sales',
        stat: { value: '$1.2M', label: 'Revenue', icon: DollarSign },
        description: 'Conversion tracking'
    },
    {
        Icon: Smartphone,
        color: '#8E24AA',
        angle: 30,
        radius: 200,
        delay: 0.8,
        label: 'Mobile',
        stat: { value: '+85%', label: 'Retention', icon: TrendingUp },
        description: 'App engagement'
    },
    {
        Icon: Zap,
        color: '#FF6D00',
        angle: 270,
        radius: 190,
        delay: 1.0,
        label: 'Ads',
        stat: { value: '3.5x', label: 'ROAS', icon: TargetIcon },
        description: 'Ad performance'
    },
];

function TargetIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
        </svg>
    )
}

export default function SystemMap() {
    const [hoveredNode, setHoveredNode] = useState<number | null>(null);

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
                    const isHovered = hoveredNode === i;
                    const isAnyHovered = hoveredNode !== null;

                    return (
                        <g key={i}>
                            {/* Static Line - Thicker and Interactive */}
                            <motion.line
                                x1={0} y1={0} x2={x} y2={y}
                                stroke={isHovered ? node.color : (isAnyHovered ? "#e5e7eb" : node.color)}
                                strokeWidth={isHovered ? 4 : (isAnyHovered ? 1 : 2)}
                                strokeOpacity={isHovered ? 1 : (isAnyHovered ? 0.1 : 0.5)}
                                strokeDasharray={isHovered ? "none" : "4 4"}
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{
                                    pathLength: 1,
                                    opacity: isHovered ? 1 : (isAnyHovered ? 0.1 : 0.5),
                                    strokeWidth: isHovered ? 4 : (isAnyHovered ? 1 : 2),
                                    stroke: isHovered ? node.color : (isAnyHovered ? "#e5e7eb" : node.color)
                                }}
                                transition={{ duration: 0.3 }}
                            />

                            {/* Active Data Beam on Hover */}
                            {isHovered && (
                                <motion.line
                                    x1={0} y1={0} x2={x} y2={y}
                                    stroke={node.color}
                                    strokeWidth="6" // Even thicker for the beam
                                    strokeOpacity="0.4"
                                    strokeLinecap="round"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 0.3, ease: "easeOut" }}
                                />
                            )}

                            {/* Data Packet Moving Out - Always visible but subdued */}
                            <motion.circle r={isHovered ? 6 : 3} fill={node.color}>
                                <animateMotion
                                    dur={isHovered ? "1s" : "3s"} // Faster on hover
                                    repeatCount="indefinite"
                                    path={`M 0 0 L ${x} ${y}`}
                                    keyPoints="0;1"
                                    keyTimes="0;1"
                                    begin={`${node.delay}s`}
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
                const x = Math.cos(radian) * node.radius;
                const y = Math.sin(radian) * node.radius;
                const isHovered = hoveredNode === i;

                return (
                    <motion.div
                        key={i}
                        className="absolute z-20"
                        style={{ x, y }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                            scale: 1,
                            opacity: 1,
                            zIndex: isHovered ? 50 : 20 // Bring to front on hover
                        }}
                        transition={{ delay: node.delay, type: "spring", stiffness: 200, damping: 20 }}
                        onMouseEnter={() => setHoveredNode(i)}
                        onMouseLeave={() => setHoveredNode(null)}
                    >
                        {/* Hover Floating Animation */}
                        <motion.div
                            animate={{
                                y: isHovered ? 0 : [-5, 5, -5],
                                scale: isHovered ? 1.2 : 1
                            }}
                            transition={{
                                y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 },
                                scale: { duration: 0.2 }
                            }}
                            className="group relative cursor-pointer"
                        >
                            <div className={`absolute inset-0 bg-white dark:bg-[#1f2937] rounded-2xl shadow-lg transform transition-transform duration-300 ${isHovered ? 'scale-110 shadow-xl ring-4 ring-offset-2 ring-offset-white dark:ring-offset-[#0a0e27]' : ''}`}
                                style={{ boxShadow: isHovered ? `0 10px 30px -5px ${node.color}50` : '' }}
                            />

                            <div className={`relative w-14 h-14 flex items-center justify-center rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-[#1f2937] z-10`}>
                                <node.Icon className="w-6 h-6" style={{ color: node.color }} />
                                {/* Status Dot */}
                                {!isHovered && (
                                    <span className="absolute top-0 right-0 w-3 h-3 -mt-1 -mr-1 rounded-full border-2 border-white dark:border-[#1f2937]" style={{ backgroundColor: node.color }} />
                                )}
                            </div>

                            {/* Floating Analytics Card */}
                            <AnimatePresence>
                                {isHovered && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8, y: 10, x: '-50%' }}
                                        animate={{ opacity: 1, scale: 1, y: 20, x: '-50%' }}
                                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                                        className="absolute left-1/2 top-full w-48 bg-white dark:bg-[#162044] rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 p-4 z-50 pointer-events-none"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{node.label}</span>
                                            <node.stat.icon className="w-4 h-4" style={{ color: node.color }} />
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl font-bold text-gray-900 dark:text-white">{node.stat.value}</span>
                                            <span className="text-xs font-medium text-green-500">{node.stat.label}</span>
                                        </div>
                                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-2">
                                            {node.description}
                                        </div>

                                        {/* Connector Arrow */}
                                        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-[#162044] rotate-45 border-l border-t border-gray-100 dark:border-gray-700" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </motion.div>
                );
            })}
        </div>
    );
}
