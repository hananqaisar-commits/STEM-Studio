"use client";
import React from "react";
import { SparklesCore } from "@/components/ui/sparkles";

export function SparklesDivider() {
  return (
    <div className="w-full flex flex-col items-center justify-center overflow-hidden my-4 relative pointer-events-none select-none">
      <div className="w-full max-w-5xl h-20 relative">
        {/* Glowing Gradients replacing simple line */}
        <div className="absolute inset-x-8 top-0 bg-gradient-to-r from-transparent via-purple-500 to-transparent h-[3px] w-11/12 blur-sm opacity-80" />
        <div className="absolute inset-x-8 top-0 bg-gradient-to-r from-transparent via-purple-400 to-transparent h-px w-11/12" />
        <div className="absolute inset-x-32 top-0 bg-gradient-to-r from-transparent via-sky-400 to-transparent h-[4px] w-2/3 blur-sm opacity-90" />
        <div className="absolute inset-x-32 top-0 bg-gradient-to-r from-transparent via-sky-300 to-transparent h-px w-2/3" />

        {/* Particle sparkles effect */}
        <SparklesCore
          background="transparent"
          minSize={0.4}
          maxSize={1.4}
          particleDensity={600}
          className="w-full h-full"
          particleColor="#c084fc"
        />

        {/* Mask gradient to blend edges */}
        <div className="absolute inset-0 w-full h-full [mask-image:radial-gradient(450px_90px_at_top,transparent_20%,white)]"></div>
      </div>
    </div>
  );
}

export default function SparklesPreview() {
  return (
    <div className="h-[40rem] w-full bg-black flex flex-col items-center justify-center overflow-hidden rounded-md">
      <h1 className="md:text-7xl text-3xl lg:text-9xl font-bold text-center text-white relative z-20">
        Aceternity
      </h1>
      <div className="w-[40rem] h-40 relative">
        {/* Gradients */}
        <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-[2px] w-3/4 blur-sm" />
        <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-px w-3/4" />
        <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-[5px] w-1/4 blur-sm" />
        <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-px w-1/4" />

        {/* Core component */}
        <SparklesCore
          background="transparent"
          minSize={0.4}
          maxSize={1}
          particleDensity={1200}
          className="w-full h-full"
          particleColor="#FFFFFF"
        />

        {/* Radial Gradient to prevent sharp edges */}
        <div className="absolute inset-0 w-full h-full bg-black [mask-image:radial-gradient(350px_200px_at_top,transparent_20%,white)]"></div>
      </div>
    </div>
  );
}
