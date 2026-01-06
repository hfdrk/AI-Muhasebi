// Mobile-First Responsive Components
// These components are optimized for touch interfaces and mobile screens

// Navigation
export { BottomNavigation } from "./bottom-navigation";
export { MobileHeader, IconButton, SearchHeader } from "./mobile-header";

// Cards & Lists
export {
  MobileCard,
  MobileListItem,
  MobileAccordion,
  MobileSection,
  MobileStatCard,
} from "./mobile-card";

// Re-export hooks for convenience
export {
  useWindowSize,
  useMediaQuery,
  useBreakpoint,
  useBreakpointValue,
  useDevice,
  useMobileMenu,
  useScrollLock,
  useOrientation,
  useTouchDetection,
  useSafeAreaInsets,
  createResponsiveStyles,
  isBreakpointUp,
  isBreakpointDown,
} from "@/hooks/use-responsive";

export type {
  Breakpoint,
  WindowSize,
  DeviceInfo,
  MobileMenuState,
  Orientation,
  SafeAreaInsets,
} from "@/hooks/use-responsive";
