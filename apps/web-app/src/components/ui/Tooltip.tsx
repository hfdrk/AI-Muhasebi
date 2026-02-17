"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, spacing, borderRadius, typography, shadows, zIndex } from '../../styles/design-system';
import { useTheme } from "@/contexts/ThemeContext";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  disabled?: boolean;
  className?: string;
}

export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 300,
  disabled = false,
  className = '',
}: TooltipProps) {
  const { themeColors } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    if (disabled) return;
    const id = setTimeout(() => setIsVisible(true), delay);
    setTimeoutId(id);
  };

  const hideTooltip = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [timeoutId]);

  const getPositionStyles = (): React.CSSProperties => {
    if (!triggerRef.current) return {};

    const gap = 8;

    switch (position) {
      case 'top':
        return {
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: gap,
        };
      case 'bottom':
        return {
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: gap,
        };
      case 'left':
        return {
          right: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          marginRight: gap,
        };
      case 'right':
        return {
          left: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          marginLeft: gap,
        };
      default:
        return {};
    }
  };

  return (
    <div
      ref={triggerRef}
      className={className}
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              zIndex: zIndex.tooltip,
              ...getPositionStyles(),
              backgroundColor: themeColors.gray[900],
              color: colors.white,
              padding: `${spacing.xs} ${spacing.sm}`,
              borderRadius: borderRadius.md,
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.medium,
              whiteSpace: 'nowrap',
              boxShadow: shadows.lg,
              pointerEvents: 'none',
              maxWidth: '200px',
            }}
          >
            {content}
            {/* Arrow */}
            <div
              style={{
                position: 'absolute',
                ...(position === 'top' && {
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderTop: `4px solid ${themeColors.gray[900]}`,
                }),
                ...(position === 'bottom' && {
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderBottom: `4px solid ${themeColors.gray[900]}`,
                }),
                ...(position === 'left' && {
                  left: '100%',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  borderTop: '4px solid transparent',
                  borderBottom: '4px solid transparent',
                  borderLeft: `4px solid ${themeColors.gray[900]}`,
                }),
                ...(position === 'right' && {
                  right: '100%',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  borderTop: '4px solid transparent',
                  borderBottom: '4px solid transparent',
                  borderRight: `4px solid ${themeColors.gray[900]}`,
                }),
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

