"use client";

import React, { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, spacing, borderRadius, typography, transitions, shadows } from '../../styles/design-system';
import { Icon } from './Icon';

interface TabItem {
  id: string;
  label: string;
  icon?: keyof typeof import('lucide-react');
  content: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  items: TabItem[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  className?: string;
  style?: React.CSSProperties;
}

export function Tabs({
  items,
  defaultTab,
  onChange,
  variant = 'default',
  className = '',
  style,
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || items[0]?.id || '');

  const handleTabChange = (tabId: string) => {
    if (items.find(item => item.id === tabId)?.disabled) return;
    setActiveTab(tabId);
    if (onChange) onChange(tabId);
  };

  const activeTabContent = items.find(item => item.id === activeTab)?.content;

  const getTabButtonStyles = (isActive: boolean, isDisabled: boolean) => {
    const baseStyles: React.CSSProperties = {
      padding: `${spacing.sm} ${spacing.md}`,
      border: 'none',
      backgroundColor: 'transparent',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      color: isDisabled ? colors.text.muted : isActive ? colors.primary : colors.text.secondary,
      fontSize: typography.fontSize.sm,
      fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.medium,
      display: 'flex',
      alignItems: 'center',
      gap: spacing.sm,
      transition: `all ${transitions.normal} ease`,
      position: 'relative',
      opacity: isDisabled ? 0.5 : 1,
    };

    if (variant === 'pills') {
      return {
        ...baseStyles,
        backgroundColor: isActive ? colors.primary : colors.gray[100],
        color: isActive ? colors.white : colors.text.secondary,
        borderRadius: borderRadius.full,
        padding: `${spacing.sm} ${spacing.lg}`,
      };
    }

    if (variant === 'underline') {
      return {
        ...baseStyles,
        borderBottom: isActive ? `2px solid ${colors.primary}` : '2px solid transparent',
        paddingBottom: spacing.sm,
      };
    }

    // default variant
    return {
      ...baseStyles,
      borderBottom: isActive ? `2px solid ${colors.primary}` : '2px solid transparent',
      paddingBottom: spacing.sm,
    };
  };

  return (
    <div className={className} style={style}>
      <div
        style={{
          display: 'flex',
          gap: variant === 'pills' ? spacing.sm : spacing.md,
          borderBottom: variant === 'default' || variant === 'underline' ? `1px solid ${colors.border}` : 'none',
          marginBottom: spacing.lg,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {items.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              disabled={item.disabled}
              style={getTabButtonStyles(isActive, !!item.disabled)}
              onMouseEnter={(e) => {
                if (!item.disabled && !isActive) {
                  e.currentTarget.style.color = colors.primary;
                  e.currentTarget.style.backgroundColor = variant === 'pills' ? colors.gray[200] : colors.primaryLighter;
                }
              }}
              onMouseLeave={(e) => {
                if (!item.disabled && !isActive) {
                  e.currentTarget.style.color = colors.text.secondary;
                  e.currentTarget.style.backgroundColor = variant === 'pills' ? colors.gray[100] : 'transparent';
                }
              }}
            >
              {item.icon && <Icon name={item.icon} size={16} />}
              {item.label}
              {isActive && variant === 'default' && (
                <motion.div
                  layoutId="activeTab"
                  style={{
                    position: 'absolute',
                    bottom: -1,
                    left: 0,
                    right: 0,
                    height: '2px',
                    backgroundColor: colors.primary,
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTabContent}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

