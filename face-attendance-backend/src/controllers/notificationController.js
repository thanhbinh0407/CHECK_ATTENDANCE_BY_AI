import Notification from "../models/pg/Notification.js";
import User from "../models/pg/User.js";
import AttendanceLog from "../models/pg/AttendanceLog.js";
import LeaveRequest from "../models/pg/LeaveRequest.js";
import { Op } from "sequelize";
import nodemailer from "nodemailer";

// Email transporter setup (configure in .env)
const getEmailTransporter = () => {
  if (!process.env.SMTP_HOST) return null;
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Send notification (creates DB record and optionally sends email)
export const sendNotification = async (req, res) => {
  try {
    const { userId, type, title, message, metadata, sendEmail = false } = req.body;

    if (!type || !title || !message) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields: type, title, message"
      });
    }

    const notification = await Notification.create({
      userId: userId || null,
      type,
      title,
      message,
      metadata: metadata || {}
    });

    // Send email if requested and configured
    if (sendEmail && userId) {
      const user = await User.findByPk(userId);
      if (user && user.email) {
        const transporter = getEmailTransporter();
        if (transporter) {
          try {
            await transporter.sendMail({
              from: process.env.SMTP_FROM || "noreply@company.com",
              to: user.email,
              subject: title,
              text: message,
              html: `<p>${message}</p>`
            });
            console.log(`Email sent to ${user.email}`);
          } catch (emailErr) {
            console.error("Email send failed:", emailErr);
          }
        }
      }
    }

    return res.json({
      status: "success",
      message: "Notification sent",
      notification
    });
  } catch (err) {
    console.error("Error sending notification:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Get notifications for user
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { unreadOnly = false } = req.query;

    const where = {
      [Op.or]: [
        { userId: userId },
        { userId: null } // Broadcast notifications
      ]
    };

    if (unreadOnly) {
      where.read = false;
    }

    const notifications = await Notification.findAll({
      where,
      include: [{
        model: User,
        attributes: ['id', 'name', 'email'],
        required: false
      }],
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    return res.json({
      status: "success",
      notifications,
      unreadCount: notifications.filter(n => !n.read).length
    });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const notification = await Notification.findByPk(id);
    if (!notification) {
      return res.status(404).json({
        status: "error",
        message: "Notification not found"
      });
    }

    // Check permission
    if (notification.userId && notification.userId !== userId) {
      return res.status(403).json({
        status: "error",
        message: "Access denied"
      });
    }

    await notification.update({
      read: true,
      readAt: new Date()
    });

    return res.json({
      status: "success",
      message: "Notification marked as read"
    });
  } catch (err) {
    console.error("Error marking notification as read:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Mark all as read
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;

    await Notification.update(
      {
        read: true,
        readAt: new Date()
      },
      {
        where: {
          [Op.or]: [
            { userId: userId },
            { userId: null }
          ],
          read: false
        }
      }
    );

    return res.json({
      status: "success",
      message: "All notifications marked as read"
    });
  } catch (err) {
    console.error("Error marking all as read:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Delete notification
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const notification = await Notification.findByPk(id);
    if (!notification) {
      return res.status(404).json({
        status: "error",
        message: "Notification not found"
      });
    }

    // Check permission
    if (notification.userId && notification.userId !== userId) {
      return res.status(403).json({
        status: "error",
        message: "Access denied"
      });
    }

    await notification.destroy();

    return res.json({
      status: "success",
      message: "Notification deleted"
    });
  } catch (err) {
    console.error("Error deleting notification:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// Auto-create notifications for late arrivals
export const checkLateArrivals = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all late arrivals today
    const lateLogs = await AttendanceLog.findAll({
      where: {
        timestamp: { [Op.between]: [today, tomorrow] },
        isLate: true,
        userId: { [Op.ne]: null }
      },
      include: [{
        model: User,
        as: "User",
        attributes: ['id', 'name', 'email']
      }]
    });

    for (const log of lateLogs) {
      // Check if notification already exists for this late arrival
      const existing = await Notification.findOne({
        where: {
          userId: log.userId,
          type: 'late',
          metadata: {
            logId: log.id
          },
          createdAt: {
            [Op.gte]: today
          }
        }
      });

      if (!existing) {
        await Notification.create({
          userId: log.userId,
          type: 'late',
          title: 'Cảnh báo: Điểm danh muộn',
          message: `Bạn đã điểm danh muộn vào ${new Date(log.timestamp).toLocaleString('vi-VN')}`,
          metadata: { logId: log.id }
        });

        // Send email if configured
        const transporter = getEmailTransporter();
        if (transporter && log.User?.email) {
          try {
            await transporter.sendMail({
              from: process.env.SMTP_FROM || "noreply@company.com",
              to: log.User.email,
              subject: 'Cảnh báo: Điểm danh muộn',
              text: `Bạn đã điểm danh muộn vào ${new Date(log.timestamp).toLocaleString('vi-VN')}`,
              html: `<p>Bạn đã điểm danh muộn vào ${new Date(log.timestamp).toLocaleString('vi-VN')}</p>`
            });
          } catch (emailErr) {
            console.error("Email send failed:", emailErr);
          }
        }
      }
    }

    console.log(`Checked late arrivals: ${lateLogs.length} found`);
  } catch (err) {
    console.error("Error checking late arrivals:", err);
  }
};

// Auto-create notification when leave request is approved/rejected
export const notifyLeaveStatusChange = async (leaveRequestId, status, approverId) => {
  try {
    const leaveRequest = await LeaveRequest.findByPk(leaveRequestId, {
      include: [{
        model: User,
        as: 'User',
        attributes: ['id', 'name', 'email']
      }]
    });

    if (!leaveRequest) return;

    const title = status === 'approved' 
      ? 'Đơn nghỉ phép đã được duyệt'
      : 'Đơn nghỉ phép bị từ chối';
    
    const message = status === 'approved'
      ? `Đơn nghỉ phép của bạn từ ${new Date(leaveRequest.startDate).toLocaleDateString('vi-VN')} đến ${new Date(leaveRequest.endDate).toLocaleDateString('vi-VN')} đã được duyệt.`
      : `Đơn nghỉ phép của bạn từ ${new Date(leaveRequest.startDate).toLocaleDateString('vi-VN')} đến ${new Date(leaveRequest.endDate).toLocaleDateString('vi-VN')} đã bị từ chối.${leaveRequest.rejectionReason ? ` Lý do: ${leaveRequest.rejectionReason}` : ''}`;

    await Notification.create({
      userId: leaveRequest.userId,
      type: 'leave',
      title,
      message,
      metadata: { leaveRequestId, status }
    });

    // Send email
    const transporter = getEmailTransporter();
    if (transporter && leaveRequest.User?.email) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || "noreply@company.com",
          to: leaveRequest.User.email,
          subject: title,
          text: message,
          html: `<p>${message}</p>`
        });
      } catch (emailErr) {
        console.error("Email send failed:", emailErr);
      }
    }
  } catch (err) {
    console.error("Error notifying leave status change:", err);
  }
};

