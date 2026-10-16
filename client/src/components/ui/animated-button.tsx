"use client";

import React from "react";
import { motion, MotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

export type AnimatedButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  MotionProps & {
    children?: React.ReactNode;
    as?: any;
  };

/**
 * AnimatedButton
 * - Luxury Copper / Charcoal styled with smooth shine animation
 */
export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children = "Browse Components",
  className = "",
  as = "button",
  ...rest
}) => {
  const Component = (motion as any)[as] || motion.button;

  return (
    <Component
      {...rest}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.97 }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 30,
        mass: 0.5,
      }}
      className={cn(
        "group inline-flex items-center justify-center px-6 py-2 rounded-xl relative overflow-hidden bg-[#11131c] border border-[rgba(255,255,255,0.08)]",
        "text-[#f8fafc] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ffffff] disabled:pointer-events-none disabled:opacity-50",
        "[--shine:rgba(255,255,255,0.5)]",
        className,
      )}
    >
      {/* Text with shine mask */}
      <motion.span
        className="tracking-wide font-light flex items-center justify-center h-full w-full relative z-10"
        style={{
          WebkitMaskImage:
            "linear-gradient(-75deg, #f8fafc calc(var(--mask-x) + 20%), transparent calc(var(--mask-x) + 30%), #f8fafc calc(var(--mask-x) + 100%))",
          maskImage:
            "linear-gradient(-75deg, #f8fafc calc(var(--mask-x) + 20%), transparent calc(var(--mask-x) + 30%), #f8fafc calc(var(--mask-x) + 100%))",
        }}
        initial={{ ["--mask-x" as any]: "100%" } as any}
        animate={{ ["--mask-x" as any]: "-100%" } as any}
        transition={{
          repeat: Infinity,
          duration: 1,
          ease: "linear",
          repeatDelay: 1,
        }}
      >
        {children}
      </motion.span>

      {/* Border shine effect uses the --shine variable */}
      <motion.span
        className="block absolute inset-0 rounded-xl p-px"
        style={{
          background:
            "linear-gradient(-75deg, transparent 30%, var(--shine) 50%, transparent 70%)",
          backgroundSize: "200% 100%",
          mask: "linear-gradient(#f8fafc 0 0) content-box, linear-gradient(#f8fafc 0 0)",
          maskComposite: "exclude",
          WebkitMask:
            "linear-gradient(#f8fafc 0 0) content-box, linear-gradient(#f8fafc 0 0)",
          WebkitMaskComposite: "xor",
        }}
        initial={{ backgroundPosition: "100% 0", opacity: 0 }}
        animate={{ backgroundPosition: ["100% 0", "0% 0"], opacity: [0, 1, 0] }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "linear",
          repeatDelay: 1,
        }}
      />
    </Component>
  );
};

export default AnimatedButton;
