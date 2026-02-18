"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface RippleEffect {
  x: number;
  y: number;
  id: number;
}

type PaymentState = "idle" | "processing" | "success";

interface PaymentButtonProps {
  onPayment?: () => Promise<void> | void;
  className?: string;
  autoResetDelay?: number;
}

export function PaymentButton({
  onPayment,
  className = "",
  autoResetDelay
}: PaymentButtonProps) {
  const [state, setState] = useState<PaymentState>("idle");
  const [ripples, setRipples] = useState<RippleEffect[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rippleIdRef = useRef(0);

  useEffect(() => {
    if (state === "success" && autoResetDelay) {
      const timer = setTimeout(() => {
        setState("idle");
      }, autoResetDelay);
      return () => clearTimeout(timer);
    }
  }, [state, autoResetDelay]);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (state !== "idle") return;

    // Create ripple effect from click position
    const button = buttonRef.current;
    if (button) {
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const newRipple = { x, y, id: rippleIdRef.current++ };
      setRipples((prev) => [...prev, newRipple]);

      // Clean up ripple after animation
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 600);
    }

    setState("processing");

    // Simulate payment processing or call the provided handler
    if (onPayment) {
      await onPayment();
    } else {
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    setState("success");
  };

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <motion.button
        ref={buttonRef}
        onClick={handleClick}
        disabled={state !== "idle"}
        className="relative overflow-hidden rounded-lg px-8 py-4 font-medium text-white focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:cursor-not-allowed"
        style={{
          minWidth: "220px",
          minHeight: "56px",
          backgroundColor: "#000000",
        }}
        initial={{ backgroundColor: "#000000" }}
        animate={{
          scale: state === "success" ? [1, 1.05, 1] : 1,
          backgroundColor: state === "success" ? "#16a34a" : "#000000",
        }}
        transition={{
          duration: 0.4,
          ease: "easeOut",
        }}
      >
        {/* Ripple effects */}
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            className="absolute rounded-full bg-white/30"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: 10,
              height: 10,
              marginLeft: -5,
              marginTop: -5,
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 40, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        ))}

        {/* Button content */}
        <AnimatePresence mode="wait">
          {state === "idle" && (
            <motion.span
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 flex items-center justify-center gap-2"
            >
              Pay Now
            </motion.span>
          )}

          {state === "processing" && (
            <motion.span
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 flex items-center justify-center"
            >
              <motion.div
                className="h-5 w-5 rounded-full border-2 border-white border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </motion.span>
          )}

          {state === "success" && (
            <motion.span
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.3,
                ease: [0.34, 1.56, 0.64, 1], // Custom bounce easing
              }}
              className="relative z-10 flex items-center justify-center gap-2"
            >
              {/* Animated checkmark */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                className="text-white"
              >
                <motion.path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{
                    duration: 0.4,
                    delay: 0.1,
                    ease: "easeOut",
                  }}
                />
              </svg>
              <span>Payment Successful</span>
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

    </div>
  );
}

export default PaymentButton;
