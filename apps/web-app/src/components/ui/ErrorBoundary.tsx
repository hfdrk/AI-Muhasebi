"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { colors, spacing, borderRadius, shadows, typography, transitions } from '../../styles/design-system';
import { Icon } from './Icon';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            padding: spacing.xxl,
            backgroundColor: colors.gray[50],
          }}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            style={{
              backgroundColor: colors.white,
              borderRadius: borderRadius.xl,
              padding: spacing.xxl,
              maxWidth: '600px',
              width: '100%',
              boxShadow: shadows.xl,
              border: `2px solid ${colors.danger}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                marginBottom: spacing.xl,
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor: colors.dangerLight,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: spacing.lg,
                }}
              >
                <Icon name="AlertTriangle" size={40} color={colors.danger} />
              </div>
              <h2
                style={{
                  fontSize: typography.fontSize['2xl'],
                  fontWeight: typography.fontWeight.bold,
                  color: colors.text.primary,
                  marginBottom: spacing.sm,
                }}
              >
                Bir Hata Oluştu
              </h2>
              <p
                style={{
                  fontSize: typography.fontSize.base,
                  color: colors.text.secondary,
                  marginBottom: spacing.md,
                  lineHeight: typography.lineHeight.relaxed,
                }}
              >
                Üzgünüz, beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.
              </p>
              {this.state.error && (
                <details
                  style={{
                    width: '100%',
                    marginTop: spacing.md,
                    padding: spacing.md,
                    backgroundColor: colors.gray[50],
                    borderRadius: borderRadius.md,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <summary
                    style={{
                      cursor: 'pointer',
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                      fontWeight: typography.fontWeight.medium,
                      marginBottom: spacing.xs,
                    }}
                  >
                    Hata Detayları
                  </summary>
                  <pre
                    style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.danger,
                      overflow: 'auto',
                      margin: 0,
                      padding: spacing.sm,
                      backgroundColor: colors.white,
                      borderRadius: borderRadius.sm,
                      border: `1px solid ${colors.border}`,
                      maxHeight: '200px',
                    }}
                  >
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                gap: spacing.md,
                justifyContent: 'center',
              }}
            >
              <Button
                variant="primary"
                onClick={this.handleReset}
                icon={<Icon name="RefreshCw" size={16} />}
              >
                Tekrar Dene
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                icon={<Icon name="RotateCw" size={16} />}
              >
                Sayfayı Yenile
              </Button>
            </div>
          </motion.div>
        </motion.div>
      );
    }

    return this.props.children;
  }
}

