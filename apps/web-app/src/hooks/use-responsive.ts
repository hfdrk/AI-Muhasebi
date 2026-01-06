"use client";

import { useState, useEffect, useCallback } from "react";
import { breakpoints } from "@/styles/design-system";

// ==================== Types ====================

export type Breakpoint = "sm" | "md" | "lg" | "xl" | "2xl";

export interface WindowSize {
  width: number;
  height: number;
}

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  isTouch: boolean;
  isLandscape: boolean;
  isPortrait: boolean;
  breakpoint: Breakpoint;
}

// ==================== Breakpoint Values ====================

const breakpointValues: Record<Breakpoint, number> = {
  sm: parseInt(breakpoints.sm),
  md: parseInt(breakpoints.md),
  lg: parseInt(breakpoints.lg),
  xl: parseInt(breakpoints.xl),
  "2xl": parseInt(breakpoints["2xl"]),
};

// ==================== useWindowSize Hook ====================

/**
 * Hook to track window dimensions with debounced updates
 */
export function useWindowSize(debounceMs: number = 100): WindowSize {
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: typeof window !== "undefined" ? window.innerWidth : 1024,
    height: typeof window !== "undefined" ? window.innerHeight : 768,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, debounceMs);
    };

    // Set initial size
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
    };
  }, [debounceMs]);

  return windowSize;
}

// ==================== useMediaQuery Hook ====================

/**
 * Hook to check if a media query matches
 * @param query CSS media query string (e.g., "(min-width: 768px)")
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Modern API
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
    // Legacy API fallback
    mediaQuery.addListener(handler);
    return () => mediaQuery.removeListener(handler);
  }, [query]);

  return matches;
}

// ==================== useBreakpoint Hook ====================

/**
 * Hook to get the current breakpoint
 */
export function useBreakpoint(): Breakpoint {
  const { width } = useWindowSize();

  if (width >= breakpointValues["2xl"]) return "2xl";
  if (width >= breakpointValues.xl) return "xl";
  if (width >= breakpointValues.lg) return "lg";
  if (width >= breakpointValues.md) return "md";
  return "sm";
}

// ==================== useBreakpointValue Hook ====================

/**
 * Hook to get a value based on the current breakpoint
 * Similar to Chakra UI's useBreakpointValue
 */
export function useBreakpointValue<T>(values: Partial<Record<Breakpoint, T>>): T | undefined {
  const breakpoint = useBreakpoint();
  const breakpointOrder: Breakpoint[] = ["sm", "md", "lg", "xl", "2xl"];

  // Find the value for current breakpoint or closest smaller breakpoint
  const currentIndex = breakpointOrder.indexOf(breakpoint);

  for (let i = currentIndex; i >= 0; i--) {
    const bp = breakpointOrder[i];
    if (values[bp] !== undefined) {
      return values[bp];
    }
  }

  return undefined;
}

// ==================== useDevice Hook ====================

/**
 * Comprehensive hook for device detection
 */
export function useDevice(): DeviceInfo {
  const { width, height } = useWindowSize();

  const [isTouch, setIsTouch] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkTouch = () => {
      setIsTouch(
        "ontouchstart" in window ||
          navigator.maxTouchPoints > 0 ||
          // @ts-expect-error - msMaxTouchPoints is IE specific
          navigator.msMaxTouchPoints > 0
      );
    };

    checkTouch();
  }, []);

  const isMobile = width < breakpointValues.md;
  const isTablet = width >= breakpointValues.md && width < breakpointValues.lg;
  const isDesktop = width >= breakpointValues.lg && width < breakpointValues.xl;
  const isLargeDesktop = width >= breakpointValues.xl;
  const isLandscape = width > height;
  const isPortrait = height >= width;

  let breakpoint: Breakpoint = "sm";
  if (width >= breakpointValues["2xl"]) breakpoint = "2xl";
  else if (width >= breakpointValues.xl) breakpoint = "xl";
  else if (width >= breakpointValues.lg) breakpoint = "lg";
  else if (width >= breakpointValues.md) breakpoint = "md";

  return {
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    isTouch,
    isLandscape,
    isPortrait,
    breakpoint,
  };
}

// ==================== useMobileMenu Hook ====================

export interface MobileMenuState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Hook for managing mobile menu state with auto-close on resize
 */
export function useMobileMenu(): MobileMenuState {
  const [isOpen, setIsOpen] = useState(false);
  const { isMobile } = useDevice();

  // Auto-close menu when switching to desktop
  useEffect(() => {
    if (!isMobile && isOpen) {
      setIsOpen(false);
    }
  }, [isMobile, isOpen]);

  // Close menu when pressing Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return { isOpen, open, close, toggle };
}

// ==================== useScrollLock Hook ====================

/**
 * Hook to lock/unlock body scroll
 */
export function useScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const originalStyle = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    if (isLocked) {
      // Get scrollbar width
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalStyle;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isLocked]);
}

// ==================== useOrientation Hook ====================

export type Orientation = "portrait" | "landscape";

/**
 * Hook to detect device orientation
 */
export function useOrientation(): Orientation {
  const [orientation, setOrientation] = useState<Orientation>(() => {
    if (typeof window === "undefined") return "portrait";
    return window.innerWidth > window.innerHeight ? "landscape" : "portrait";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOrientationChange = () => {
      // Use screen.orientation if available
      if (screen.orientation) {
        setOrientation(screen.orientation.type.includes("portrait") ? "portrait" : "landscape");
      } else {
        setOrientation(window.innerWidth > window.innerHeight ? "landscape" : "portrait");
      }
    };

    // Try screen.orientation API first
    if (screen.orientation) {
      screen.orientation.addEventListener("change", handleOrientationChange);
      handleOrientationChange();
      return () => screen.orientation.removeEventListener("change", handleOrientationChange);
    }

    // Fallback to resize event
    window.addEventListener("resize", handleOrientationChange);
    return () => window.removeEventListener("resize", handleOrientationChange);
  }, []);

  return orientation;
}

// ==================== Responsive Style Utilities ====================

/**
 * Create responsive inline styles based on breakpoint
 */
export function createResponsiveStyles<T extends Record<string, unknown>>(
  baseStyles: T,
  responsiveOverrides: Partial<Record<Breakpoint, Partial<T>>>
): (breakpoint: Breakpoint) => T {
  return (breakpoint: Breakpoint): T => {
    const breakpointOrder: Breakpoint[] = ["sm", "md", "lg", "xl", "2xl"];
    const currentIndex = breakpointOrder.indexOf(breakpoint);

    let mergedStyles = { ...baseStyles };

    // Apply overrides from smallest to current breakpoint
    for (let i = 0; i <= currentIndex; i++) {
      const bp = breakpointOrder[i];
      if (responsiveOverrides[bp]) {
        mergedStyles = { ...mergedStyles, ...responsiveOverrides[bp] };
      }
    }

    return mergedStyles;
  };
}

/**
 * Helper to check if current breakpoint is at or above a given breakpoint
 */
export function isBreakpointUp(current: Breakpoint, target: Breakpoint): boolean {
  const breakpointOrder: Breakpoint[] = ["sm", "md", "lg", "xl", "2xl"];
  return breakpointOrder.indexOf(current) >= breakpointOrder.indexOf(target);
}

/**
 * Helper to check if current breakpoint is at or below a given breakpoint
 */
export function isBreakpointDown(current: Breakpoint, target: Breakpoint): boolean {
  const breakpointOrder: Breakpoint[] = ["sm", "md", "lg", "xl", "2xl"];
  return breakpointOrder.indexOf(current) <= breakpointOrder.indexOf(target);
}

// ==================== Touch Detection ====================

/**
 * Hook to detect touch vs mouse interactions
 */
export function useTouchDetection(): { isTouch: boolean; lastInputType: "touch" | "mouse" } {
  const [isTouch, setIsTouch] = useState(false);
  const [lastInputType, setLastInputType] = useState<"touch" | "mouse">("mouse");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleTouchStart = () => {
      setIsTouch(true);
      setLastInputType("touch");
    };

    const handleMouseMove = () => {
      setLastInputType("mouse");
    };

    // Initial detection
    setIsTouch(
      "ontouchstart" in window ||
        navigator.maxTouchPoints > 0
    );

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return { isTouch, lastInputType };
}

// ==================== Safe Area Insets (for notched devices) ====================

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Hook to get safe area insets for notched devices
 */
export function useSafeAreaInsets(): SafeAreaInsets {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof CSS === "undefined") return;

    // Check if env() is supported
    if (CSS.supports("padding-top", "env(safe-area-inset-top)")) {
      // Create a temporary element to measure safe area insets
      const el = document.createElement("div");
      el.style.cssText = `
        position: fixed;
        top: env(safe-area-inset-top, 0px);
        right: env(safe-area-inset-right, 0px);
        bottom: env(safe-area-inset-bottom, 0px);
        left: env(safe-area-inset-left, 0px);
        visibility: hidden;
        pointer-events: none;
      `;
      document.body.appendChild(el);

      const computed = getComputedStyle(el);
      setInsets({
        top: parseInt(computed.top) || 0,
        right: parseInt(computed.right) || 0,
        bottom: parseInt(computed.bottom) || 0,
        left: parseInt(computed.left) || 0,
      });

      document.body.removeChild(el);
    }
  }, []);

  return insets;
}
