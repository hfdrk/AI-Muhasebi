"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, spacing, borderRadius, typography, transitions, shadows } from '../../styles/design-system';
import { useTheme } from '../../contexts/ThemeContext';
import { Icon } from './Icon';

interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
  icon?: keyof typeof import('lucide-react');
  disabled?: boolean;
}

interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  defaultOpen?: string[];
  className?: string;
  style?: React.CSSProperties;
}

export function Accordion({
  items,
  allowMultiple = false,
  defaultOpen = [],
  className = '',
  style,
}: AccordionProps) {
  const { themeColors } = useTheme();
  const [openItems, setOpenItems] = useState<string[]>(defaultOpen);

  const toggleItem = (itemId: string) => {
    setOpenItems((prev) => {
      if (prev.includes(itemId)) {
        return prev.filter((id) => id !== itemId);
      } else {
        return allowMultiple ? [...prev, itemId] : [itemId];
      }
    });
  };

  return (
    <div className={className} style={style}>
      {items.map((item) => {
        const isOpen = openItems.includes(item.id);
        return (
          <div
            key={item.id}
            style={{
              marginBottom: spacing.md,
              border: `1px solid ${themeColors.border}`,
              borderRadius: borderRadius.lg,
              backgroundColor: themeColors.white,
              overflow: 'hidden',
              boxShadow: shadows.sm,
            }}
          >
            <button
              onClick={() => !item.disabled && toggleItem(item.id)}
              disabled={item.disabled}
              style={{
                width: '100%',
                padding: spacing.lg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: isOpen ? themeColors.gray[50] : themeColors.white,
                border: 'none',
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                transition: `background-color ${transitions.normal} ease`,
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (!item.disabled && !isOpen) {
                  e.currentTarget.style.backgroundColor = themeColors.gray[50];
                }
              }}
              onMouseLeave={(e) => {
                if (!item.disabled && !isOpen) {
                  e.currentTarget.style.backgroundColor = themeColors.white;
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, flex: 1 }}>
                {item.icon && (
                  <Icon
                    name={item.icon}
                    size={20}
                    color={item.disabled ? themeColors.text.muted : colors.primary}
                  />
                )}
                <span
                  style={{
                    fontSize: typography.fontSize.base,
                    fontWeight: typography.fontWeight.semibold,
                    color: item.disabled ? themeColors.text.muted : themeColors.text.primary,
                  }}
                >
                  {item.title}
                </span>
              </div>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <Icon
                  name="ChevronDown"
                  size={20}
                  color={item.disabled ? themeColors.text.muted : themeColors.text.secondary}
                />
              </motion.div>
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div
                    style={{
                      padding: spacing.lg,
                      paddingTop: spacing.md,
                      borderTop: `1px solid ${themeColors.border}`,
                      backgroundColor: themeColors.white,
                    }}
                  >
                    {item.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

