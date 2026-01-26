// Modern Design System 2024-2025
// Professional Gray, Black & White Theme
// Inter font family, Modern Minimal style, Generous whitespace
// No icons - Clean, professional design

export const theme = {
  // Primary Colors - Professional Gray Scale
  primary: {
    main: "#1f2937", // Gray 800
    light: "#374151", // Gray 700
    dark: "#111827", // Gray 900
    gradient: "linear-gradient(135deg, #1f2937 0%, #111827 100%)",
    subtle: "rgba(31, 41, 55, 0.1)",
  },
  
  // Secondary Colors
  secondary: {
    main: "#ec4899", // Pink 500
    light: "#f472b6", // Pink 400
    dark: "#db2777", // Pink 600
    gradient: "linear-gradient(135deg, #ec4899 0%, #f59e0b 100%)",
  },
  
  // Success Colors
  success: {
    main: "#10b981", // Emerald 500
    light: "#34d399", // Emerald 400
    dark: "#059669", // Emerald 600
    bg: "rgba(16, 185, 129, 0.1)",
    border: "rgba(16, 185, 129, 0.2)",
    text: "#065f46",
  },
  
  // Warning Colors
  warning: {
    main: "#f59e0b", // Amber 500
    light: "#fbbf24", // Amber 400
    dark: "#d97706", // Amber 600
    bg: "rgba(245, 158, 11, 0.1)",
    border: "rgba(245, 158, 11, 0.2)",
    text: "#92400e",
  },
  
  // Error/Danger Colors
  error: {
    main: "#ef4444", // Red 500
    light: "#f87171", // Red 400
    dark: "#dc2626", // Red 600
    bg: "rgba(239, 68, 68, 0.1)",
    border: "rgba(239, 68, 68, 0.2)",
    text: "#991b1b",
  },
  
  // Info Colors
  info: {
    main: "#3b82f6", // Blue 500
    light: "#60a5fa", // Blue 400
    dark: "#2563eb", // Blue 600
    bg: "rgba(59, 130, 246, 0.1)",
    border: "rgba(59, 130, 246, 0.2)",
    text: "#1e40af",
  },
  
  // Neutral Colors - Modern grayscale
  neutral: {
    white: "#ffffff",
    gray50: "#f9fafb",
    gray100: "#f3f4f6",
    gray200: "#e5e7eb",
    gray300: "#d1d5db",
    gray400: "#9ca3af",
    gray500: "#6b7280",
    gray600: "#4b5563",
    gray700: "#374151",
    gray800: "#1f2937",
    gray900: "#111827",
    black: "#030712",
  },
  
  // Special Gradients - Monochrome professional
  gradients: {
    primary: "linear-gradient(135deg, #1f2937 0%, #111827 100%)",
    secondary: "linear-gradient(135deg, #374151 0%, #1f2937 100%)",
    dark: "linear-gradient(135deg, #111827 0%, #030712 100%)",
    light: "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
    glass: "linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)",
  },
  
  // Modern Shadows - Softer, more subtle
  shadows: {
    xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    sm: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
    "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)",
    card: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
    cardHover: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
  },
  
  // Border Radius - More generous curves
  radius: {
    none: "0",
    sm: "0.375rem", // 6px
    md: "0.5rem",   // 8px
    lg: "0.75rem",  // 12px
    xl: "1rem",     // 16px
    "2xl": "1.25rem", // 20px
    "3xl": "1.5rem",  // 24px
    full: "9999px",
  },
  
  // Spacing - 8px base scale (generous whitespace)
  spacing: {
    xs: "0.25rem",   // 4px
    sm: "0.5rem",    // 8px
    md: "1rem",      // 16px
    lg: "1.5rem",    // 24px
    xl: "2rem",      // 32px
    "2xl": "3rem",   // 48px
    "3xl": "4rem",   // 64px
    "4xl": "6rem",   // 96px
  },
  
  // Typography - Inter font family
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif",
    h1: {
      fontSize: "3rem",      // 48px
      fontWeight: "800",
      lineHeight: "1.1",
      letterSpacing: "-0.025em",
    },
    h2: {
      fontSize: "2.25rem",   // 36px
      fontWeight: "700",
      lineHeight: "1.2",
      letterSpacing: "-0.025em",
    },
    h3: {
      fontSize: "1.875rem",  // 30px
      fontWeight: "600",
      lineHeight: "1.3",
      letterSpacing: "-0.025em",
    },
    h4: {
      fontSize: "1.5rem",    // 24px
      fontWeight: "600",
      lineHeight: "1.4",
    },
    h5: {
      fontSize: "1.25rem",   // 20px
      fontWeight: "600",
      lineHeight: "1.5",
    },
    h6: {
      fontSize: "1.125rem",  // 18px
      fontWeight: "600",
      lineHeight: "1.5",
    },
    body: {
      fontSize: "1rem",      // 16px
      fontWeight: "400",
      lineHeight: "1.6",
    },
    small: {
      fontSize: "0.875rem",  // 14px
      fontWeight: "400",
      lineHeight: "1.5",
    },
    tiny: {
      fontSize: "0.75rem",   // 12px
      fontWeight: "400",
      lineHeight: "1.4",
    },
  },
  
  // Transitions - Smooth, natural easing
  transitions: {
    fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
    normal: "200ms cubic-bezier(0.4, 0, 0.2, 1)",
    slow: "300ms cubic-bezier(0.4, 0, 0.2, 1)",
    spring: "400ms cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
  
  // Z-index scale
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
};

// Common component styles - Modern 2024-2025 patterns
export const commonStyles = {
  card: {
    backgroundColor: theme.neutral.white,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    boxShadow: theme.shadows.card,
    border: `1px solid ${theme.neutral.gray200}`,
    transition: theme.transitions.slow,
  },
  
  cardHover: {
    transform: "translateY(-2px) scale(1.01)",
    boxShadow: theme.shadows.cardHover,
  },
  
  glassCard: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: theme.radius.xl,
    border: `1px solid rgba(255, 255, 255, 0.3)`,
    boxShadow: theme.shadows.lg,
  },
  
  button: {
    primary: {
      padding: `${theme.spacing.md} ${theme.spacing.xl}`,
      backgroundColor: theme.primary.main,
      color: theme.neutral.white,
      border: "none",
      borderRadius: theme.radius.lg,
      fontSize: theme.typography.body.fontSize,
      fontWeight: "600",
      cursor: "pointer",
      transition: theme.transitions.normal,
      boxShadow: theme.shadows.sm,
      "&:hover": {
        backgroundColor: theme.primary.dark,
        transform: "translateY(-1px)",
        boxShadow: theme.shadows.md,
      },
      "&:active": {
        transform: "translateY(0)",
      },
    },
    secondary: {
      padding: `${theme.spacing.md} ${theme.spacing.xl}`,
      backgroundColor: theme.neutral.white,
      color: theme.primary.main,
      border: `2px solid ${theme.primary.main}`,
      borderRadius: theme.radius.lg,
      fontSize: theme.typography.body.fontSize,
      fontWeight: "600",
      cursor: "pointer",
      transition: theme.transitions.normal,
      "&:hover": {
        backgroundColor: theme.primary.subtle,
        transform: "translateY(-1px)",
        boxShadow: theme.shadows.md,
      },
    },
    success: {
      padding: `${theme.spacing.md} ${theme.spacing.xl}`,
      backgroundColor: theme.success.main,
      color: theme.neutral.white,
      border: "none",
      borderRadius: theme.radius.lg,
      fontSize: theme.typography.body.fontSize,
      fontWeight: "600",
      cursor: "pointer",
      transition: theme.transitions.normal,
      boxShadow: theme.shadows.sm,
      "&:hover": {
        backgroundColor: theme.success.dark,
        transform: "translateY(-1px)",
        boxShadow: theme.shadows.md,
      },
    },
    danger: {
      padding: `${theme.spacing.md} ${theme.spacing.xl}`,
      backgroundColor: theme.error.main,
      color: theme.neutral.white,
      border: "none",
      borderRadius: theme.radius.lg,
      fontSize: theme.typography.body.fontSize,
      fontWeight: "600",
      cursor: "pointer",
      transition: theme.transitions.normal,
      boxShadow: theme.shadows.sm,
      "&:hover": {
        backgroundColor: theme.error.dark,
        transform: "translateY(-1px)",
        boxShadow: theme.shadows.md,
      },
    },
    ghost: {
      padding: `${theme.spacing.md} ${theme.spacing.xl}`,
      backgroundColor: "transparent",
      color: theme.neutral.gray700,
      border: "none",
      borderRadius: theme.radius.lg,
      fontSize: theme.typography.body.fontSize,
      fontWeight: "600",
      cursor: "pointer",
      transition: theme.transitions.normal,
      "&:hover": {
        backgroundColor: theme.neutral.gray100,
        color: theme.neutral.gray900,
      },
    },
  },
  
  input: {
    width: "100%",
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    border: `1px solid ${theme.neutral.gray300}`,
    borderRadius: theme.radius.lg,
    fontSize: theme.typography.body.fontSize,
    transition: theme.transitions.normal,
    backgroundColor: theme.neutral.white,
    fontFamily: theme.typography.fontFamily,
    "&:focus": {
      outline: "none",
      borderColor: theme.primary.main,
      boxShadow: `0 0 0 3px ${theme.primary.subtle}`,
    },
    "&::placeholder": {
      color: theme.neutral.gray400,
    },
  },
  
  badge: {
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    borderRadius: theme.radius.full,
    fontSize: theme.typography.tiny.fontSize,
    fontWeight: "600",
    letterSpacing: "0.025em",
    display: "inline-flex",
    alignItems: "center",
  },
  
  sidebar: {
    backgroundColor: theme.neutral.white,
    borderRight: `1px solid ${theme.neutral.gray200}`,
    minHeight: "100vh",
    boxShadow: theme.shadows.sm,
  },
  
  sidebarItem: {
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    borderRadius: theme.radius.lg,
    margin: `0 ${theme.spacing.md} ${theme.spacing.sm} ${theme.spacing.md}`,
    cursor: "pointer",
    transition: theme.transitions.normal,
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.md,
    fontSize: theme.typography.body.fontSize,
    fontWeight: "500",
    color: theme.neutral.gray700,
    "&:hover": {
      backgroundColor: theme.neutral.gray100,
      color: theme.primary.main,
    },
  },
  
  sidebarItemActive: {
    backgroundColor: theme.primary.subtle,
    color: theme.primary.main,
    fontWeight: "600",
  },
};

export default theme;

