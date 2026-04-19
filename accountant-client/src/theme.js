// Design System – Professional accountant UI (gray + teal accent)
export const theme = {
  // Primary – header, nav active, text
  primary: {
    main: "#1e293b",
    light: "#334155",
    dark: "#0f172a",
  },
  // Accent – primary buttons, links, highlights (single accent, no gradient)
  accent: {
    main: "#0d9488",
    hover: "#0f766e",
    light: "#ccfbf1",
    dark: "#134e4a",
  },
  // Colors (backward compatibility)
  colors: {
    primary: "#1e293b",
    secondary: "#0d9488",
    light: "#f8fafc",
    border: "#e2e8f0",
  },
  
  // Neutral Colors
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

  success: {
    main: "#10b981",
    light: "#d1fae5",
    dark: "#059669",
  },
  error: {
    main: "#ef4444",
    light: "#fee2e2",
    dark: "#dc2626",
  },
  warning: {
    main: "#f59e0b",
    bg: "#fffbeb",
    text: "#92400e",
  },

  typography: {
    fontFamily:
      "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    body: { fontSize: "1rem", fontWeight: "400", lineHeight: "1.6" },
    small: { fontSize: "0.875rem", fontWeight: "400", lineHeight: "1.5" },
    tiny: { fontSize: "0.75rem", fontWeight: "400", lineHeight: "1.4" },
  },
  
  // Spacing (8px base)
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "48px",
  },
  
  // Border Radius
  radius: {
    sm: "4px",
    md: "8px",
    lg: "12px",
    xl: "16px",
  },
  
  // Shadows
  shadows: {
    sm: "0 1px 2px rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px rgba(0, 0, 0, 0.1)",
    lg: "0 10px 15px rgba(0, 0, 0, 0.1)",
  },

  /** Hero headers (shared with salary-grade / insurance config screens). */
  gradients: {
    primary: "linear-gradient(135deg, #0f766e 0%, #0d9488 45%, #14b8a6 100%)",
  },
};

