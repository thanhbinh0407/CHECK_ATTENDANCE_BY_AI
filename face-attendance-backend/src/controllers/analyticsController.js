import { getDashboardAnalytics } from "../services/analyticsService.js";

// Get dashboard analytics
export const getDashboardAnalyticsController = async (req, res) => {
  try {
    const { month, year } = req.query;
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const analytics = await getDashboardAnalytics(targetMonth, targetYear);

    return res.json({
      status: "success",
      analytics
    });
  } catch (err) {
    console.error("Error generating dashboard analytics:", err);
    return res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};
