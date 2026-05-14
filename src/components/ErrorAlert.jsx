import React, { useEffect } from 'react';
import { ERROR_SEVERITY } from '../utils/errorHandler';

/**
 * ErrorAlert Component
 * Displays user-friendly error messages in a clean, dismissible banner
 * Integrates with the existing dark theme
 */
export default function ErrorAlert({ 
  error, 
  onDismiss,
  autoClose = true,
  autoCloseDelay = 6000,
}) {
  // Auto-dismiss error after delay
  useEffect(() => {
    if (autoClose && error) {
      const timer = setTimeout(onDismiss, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [error, autoClose, autoCloseDelay, onDismiss]);

  if (!error) return null;

  const { userMessage, severity } = error;

  // Determine styling based on severity
  const severityStyles = {
    [ERROR_SEVERITY.INFO]: {
      container: 'error-alert error-alert--info',
      icon: 'ℹ️',
    },
    [ERROR_SEVERITY.WARNING]: {
      container: 'error-alert error-alert--warning',
      icon: '⚠️',
    },
    [ERROR_SEVERITY.ERROR]: {
      container: 'error-alert error-alert--error',
      icon: '❌',
    },
    [ERROR_SEVERITY.CRITICAL]: {
      container: 'error-alert error-alert--critical',
      icon: '🚨',
    },
  };

  const styles = severityStyles[severity] || severityStyles[ERROR_SEVERITY.ERROR];

  return (
    <div className={styles.container} role="alert">
      <div className="error-alert-content">
        <span className="error-alert-icon" aria-hidden="true">
          {styles.icon}
        </span>
        <p className="error-alert-message">{userMessage}</p>
        <button
          className="error-alert-close"
          onClick={onDismiss}
          aria-label="Dismiss error"
          type="button"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
