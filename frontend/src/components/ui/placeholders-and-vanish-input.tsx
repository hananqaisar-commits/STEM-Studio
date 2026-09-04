"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Send, Mic, MicOff, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PlaceholdersAndVanishInputProps {
  placeholders?: string[];
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  value?: string;
  setValue?: (val: string) => void;
  disabled?: boolean;
  isListening?: boolean;
  onToggleListening?: () => void;
  speechLang?: string;
  onSelectLang?: (lang: "en-US" | "ur-PK" | "zh-CN") => void;
  className?: string;
}

export function PlaceholdersAndVanishInput({
  placeholders = [
    "Ask me anything...",
  ],
  onChange,
  onSubmit,
  value: valueProp,
  setValue: setValueProp,
  disabled = false,
  isListening = false,
  onToggleListening,
  speechLang = "en-US",
  onSelectLang,
  className,
}: PlaceholdersAndVanishInputProps) {
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const [internalValue, setInternalValue] = useState("");
  const [animating, setAnimating] = useState(false);

  const isControlled = valueProp !== undefined;
  const value = isControlled ? valueProp : internalValue;

  const setValue = useCallback(
    (val: string) => {
      if (!isControlled) {
        setInternalValue(val);
      }
      setValueProp?.(val);
    },
    [isControlled, setValueProp]
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const newDataRef = useRef<Array<{ x: number; y: number; r: number; color: string }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cycle placeholders automatically
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [placeholders.length]);

  // Particle Vanish Effect Canvas Animation
  const drawCanvas = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 800;
    ctx.clearRect(0, 0, 800, 800);

    const currentData = newDataRef.current;
    if (currentData.length === 0) {
      setAnimating(false);
      return;
    }

    const nextData = currentData.filter((pixel) => pixel.r > 0.1);
    nextData.forEach((pixel) => {
      pixel.x += (Math.random() - 0.5) * 4;
      pixel.y += (Math.random() - 0.5) * 4;
      pixel.r -= 0.05;

      ctx.beginPath();
      ctx.arc(pixel.x, pixel.y, Math.max(0, pixel.r), 0, Math.PI * 2);
      ctx.fillStyle = pixel.color;
      ctx.fill();
    });

    newDataRef.current = nextData;
    if (nextData.length > 0) {
      requestAnimationFrame(drawCanvas);
    } else {
      setAnimating(false);
    }
  }, []);

  const vanishAndSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!value.trim() || disabled) return;

    // Trigger particle vanish explosion
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const pixels: Array<{ x: number; y: number; r: number; color: string }> = [];
      const textLength = value.length;
      for (let i = 0; i < Math.min(textLength * 12, 120); i++) {
        pixels.push({
          x: Math.random() * rect.width,
          y: Math.random() * rect.height,
          r: Math.random() * 2.5 + 1,
          color: ["#a855f7", "#3b82f6", "#ec4899", "#6366f1"][Math.floor(Math.random() * 4)],
        });
      }
      newDataRef.current = pixels;
      setAnimating(true);
      requestAnimationFrame(drawCanvas);
    }

    onSubmit?.(e);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    onChange?.(e);
  };

  return (
    <div className="w-full flex flex-col gap-1.5">
      {onSelectLang && (
        <div className="flex items-center justify-between px-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">Voice Language</span>
          <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-neutral-800/90 p-0.5 rounded-full border border-slate-300 dark:border-neutral-700/60 shadow-sm">
            {(["en-US", "ur-PK", "zh-CN"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                className={cn(
                  "px-2 py-0.5 text-[10px] font-bold rounded-full transition-all",
                  speechLang === lang
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-foreground"
                )}
                onClick={() => onSelectLang(lang)}
              >
                {lang === "en-US" ? "EN" : lang === "ur-PK" ? "UR" : "ZH"}
              </button>
            ))}
          </div>
        </div>
      )}

      <form
        className={cn(
          "relative mx-auto flex h-11 w-full items-center overflow-hidden rounded-full border border-purple-300 dark:border-purple-900/60 bg-white text-slate-900 dark:bg-neutral-950 dark:text-neutral-100 p-1 pl-4 shadow-md dark:shadow-xl backdrop-blur-md transition-all duration-300 focus-within:border-purple-600 dark:focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-500/20",
          className
        )}
        onSubmit={vanishAndSubmit}
      >
        <canvas
          ref={canvasRef}
          className={cn(
            "pointer-events-none absolute inset-0 size-full filter blur-[0.5px]",
            !animating && "opacity-0"
          )}
        />

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          disabled={disabled}
          className={cn(
            "relative z-20 h-full w-full bg-transparent pl-1 pr-28 text-xs md:text-sm font-semibold text-slate-900 dark:text-neutral-100 outline-none border-none placeholder:text-transparent disabled:opacity-50 min-w-0 overflow-x-auto",
            animating && "text-transparent"
          )}
        />

        {/* Cycling Placeholder Text Animation */}
        <div className="pointer-events-none absolute inset-0 flex items-center pl-5 pr-28 overflow-hidden">
          <AnimatePresence mode="wait">
            {!value && (
              <motion.p
                key={currentPlaceholder}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 0.65 }}
                exit={{ y: -8, opacity: 0 }}
                transition={{ duration: 0.25, ease: "linear" }}
                className="truncate text-xs md:text-sm text-slate-500 dark:text-neutral-400 font-medium"
              >
                {placeholders[currentPlaceholder]}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Action Buttons: Voice Mic & Submit */}
        <div className="absolute right-1 z-30 flex items-center gap-1.5 pr-1">
          {onToggleListening && (
            <button
              type="button"
              onClick={onToggleListening}
              className={cn(
                "flex size-8 items-center justify-center rounded-full transition-all duration-200",
                isListening
                  ? "bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.6)] animate-pulse"
                  : "bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-500/10"
              )}
              title="Voice Input (Speech Recognition)"
            >
              {isListening ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
            </button>
          )}

          <button
            type="submit"
            disabled={!value.trim() || disabled}
            className="flex size-8 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md transition-all hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
            title="Send message to Octa AI Tutor"
          >
            <Send className="size-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
