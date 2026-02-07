/**
 * Form validation utilities
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Remove digits from name input */
export const filterNumbersFromName = (value) => {
  return value.replace(/\d/g, "");
};

/** Validate full name: required, min 2 chars, no numbers */
export const validateName = (name) => {
  if (!name || !name.trim()) return { valid: false, message: "Full name is required" };
  if (name.trim().length < 2) return { valid: false, message: "Full name must be at least 2 characters" };
  if (/\d/.test(name)) return { valid: false, message: "Full name cannot contain numbers" };
  return { valid: true };
};

/** Validate email: required, valid format */
export const validateEmail = (email) => {
  if (!email || !email.trim()) return { valid: false, message: "Email is required" };
  if (!EMAIL_REGEX.test(email.trim())) return { valid: false, message: "Please enter a valid email address" };
  return { valid: true };
};

/** Validate employee code: required */
export const validateEmployeeCode = (code) => {
  if (!code || !code.trim()) return { valid: false, message: "Employee code is required" };
  return { valid: true };
};

/** Validate password: min 6 chars when required */
export const validatePassword = (password, required = false) => {
  if (!required) return { valid: true };
  if (!password || password.length < 6) return { valid: false, message: "Password must be at least 6 characters" };
  return { valid: true };
};
