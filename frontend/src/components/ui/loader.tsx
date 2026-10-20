"use client";

import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface LoaderOneProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * LoaderOne - Premium AI thinking loader animation with pulsing rings & glowing particle orbit.
 */
export function LoaderOne({ className, size = "md" }: LoaderOneProps) {
  const sizeClasses = {
    sm: "size-6",
    md: "size-9",
    lg: "size-12",
  };

  const ringSizes = {
    sm: 24,
    md: 36,
    lg: 48,
  };

  const actualSize = ringSizes[size];

  return (
    <div className={cn("relative inline-flex items-center justify-center p-1", className)}>
      <motion.div
        className={cn("relative flex items-center justify-center", sizeClasses[size])}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Outer glowing pulsing aura */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/30 via-indigo-500/30 to-violet-500/30 blur-md"
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Orbiting Ring 1 */}
        <motion.svg
          width={actualSize}
          height={actualSize}
          viewBox="0 0 40 40"
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke="url(#loaderGradient1)"
            strokeWidth="3"
            strokeDasharray="60 30"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="loaderGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
        </motion.svg>

        {/* Counter Orbiting Ring 2 */}
        <motion.svg
          width={actualSize}
          height={actualSize}
          viewBox="0 0 40 40"
          className="absolute inset-0"
          animate={{ rotate: -360 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <circle
            cx="20"
            cy="20"
            r="10"
            fill="none"
            stroke="url(#loaderGradient2)"
            strokeWidth="2.5"
            strokeDasharray="30 20"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="loaderGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </motion.svg>

        {/* Center glowing core dot */}
        <motion.div
          className="size-2.5 rounded-full bg-purple-500 shadow-[0_0_10px_#a855f7]"
          animate={{
            scale: [0.8, 1.3, 0.8],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>
    </div>
  );
}
