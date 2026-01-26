import User from "../models/pg/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRE = "7d";

// Register new user (Admin only for creating other admins)
export const register = async (req, res) => {
  try {
    const { name, email, password, employeeCode, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Name, email, and password are required"
      });
    }

    // Check if user exists
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({
        status: "error",
        message: "Email already registered"
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      employeeCode: employeeCode || `EMP${Date.now()}`,
      role: role || "employee",
      isActive: true
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    console.log(`User registered: ${name} (${user.role})`);

    return res.json({
      status: "success",
      message: "Registration successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeCode: user.employeeCode
      }
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email and password required"
      });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.log(`Login attempt failed: User not found - ${email}`);
      return res.status(401).json({
        status: "error",
        message: "Invalid credentials"
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        status: "error",
        message: "User account is inactive"
      });
    }

    // Check if user has a password set
    if (!user.password) {
      console.log(`Login attempt failed: User has no password set - ${email}`);
      return res.status(401).json({
        status: "error",
        message: "Password not set. Please contact administrator to set your password."
      });
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      console.log(`Login attempt failed: Invalid password - ${email}`);
      return res.status(401).json({
        status: "error",
        message: "Invalid credentials"
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    console.log(`User logged in: ${email} (${user.role})`);

    return res.json({
      status: "success",
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeCode: user.employeeCode
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get current user from token
export const getCurrentUser = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        status: "error",
        message: "No token provided"
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found"
      });
    }

    return res.json({
      status: "success",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeCode: user.employeeCode
      }
    });
  } catch (err) {
    return res.status(401).json({
      status: "error",
      message: "Invalid token"
    });
  }
};
