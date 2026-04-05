import jsPDF from "jspdf";
import { applyPlugin } from "jspdf-autotable";
import nodemailer from "nodemailer";
import Salary from "../models/pg/Salary.js";
import User from "../models/pg/User.js";
import Department from "../models/pg/Department.js";
import SalaryAdvance from "../models/pg/SalaryAdvance.js";
import { calculateInsurance } from "./insuranceService.js";
import { calculatePersonalIncomeTax } from "./taxService.js";

applyPlugin(jsPDF);

// Email transporter configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Generate payslip PDF
export const generatePayslipPDF = async (salaryId) => {
  try {
    const salary = await Salary.findByPk(salaryId, {
      include: [
        {
          model: User,
          include: [
            { model: Department },
            { model: User, as: 'Manager', attributes: ['name'] }
          ]
        }
      ]
    });

    if (!salary) {
      throw new Error("Salary not found");
    }

    const user = salary.User;
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text("PAYSLIP", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Period: ${salary.month}/${salary.year}`, 105, 30, { align: "center" });

    // Employee Information
    let yPos = 45;
    doc.setFontSize(10);
    doc.text(`Employee Name: ${user.name}`, 20, yPos);
    yPos += 7;
    doc.text(`Employee Code: ${user.employeeCode || "-"}`, 20, yPos);
    yPos += 7;
    doc.text(`Department: ${user.Department?.name || "-"}`, 20, yPos);
    yPos += 7;
    doc.text(`Position: ${user.JobTitle?.name || "-"}`, 20, yPos);
    yPos += 7;
    doc.text(`Bank Account: ${user.bankAccount || "-"}`, 20, yPos);
    yPos += 7;
    doc.text(`Bank Name: ${user.bankName || "-"}`, 20, yPos);

    // BH + thuế (đồng bộ với bước tính lương; salary.deduction = phạt + ứng + BH + thuế)
    const insurance = await calculateInsurance(user.id, salary.month, salary.year);
    const tax = await calculatePersonalIncomeTax(user.id, salary.grossSalary || 0, salary.month, salary.year);
    const advanceDeduction = parseFloat(salary.advanceDeduction) || 0;
    const totalDeductionStored = parseFloat(salary.deduction) || 0;
    const ruleAndMiscDeductions = Math.max(
      0,
      totalDeductionStored - insurance.employee.total - tax.taxAmount - advanceDeduction
    );

    const fmt = (n) => new Intl.NumberFormat("en-US").format(Math.round(n)) + " VND";

    // Salary Breakdown Table
    yPos += 15;
    const tableData = [
      ["Base Salary", fmt(user.baseSalary || 0)],
      ["Allowances", fmt(
        (user.lunchAllowance || 0) +
        (user.transportAllowance || 0) +
        (user.phoneAllowance || 0) +
        (user.responsibilityAllowance || 0)
      )],
      ["Bonus", fmt(salary.bonus || 0)],
      ["Gross Salary", fmt(salary.grossSalary || 0)],
      ["", ""],
      ["Deductions:", ""],
      ["Social Insurance (Employee)", fmt(insurance.employee.socialInsurance)],
      ["Health Insurance (Employee)", fmt(insurance.employee.healthInsurance)],
      ["Unemployment Insurance (Employee)", fmt(insurance.employee.unemploymentInsurance)],
      ["Personal Income Tax", fmt(tax.taxAmount)],
      ["Salary Advance Deduction", fmt(advanceDeduction)],
      ["Other deductions (attendance rules, etc.)", fmt(ruleAndMiscDeductions)],
      ["Total Deductions", fmt(totalDeductionStored)],
      ["", ""],
      ["NET SALARY", fmt(salary.finalSalary || 0)]
    ];

    doc.autoTable({
      startY: yPos,
      head: [["Item", "Amount"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 }
    });

    // Footer
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(8);
    doc.text("This is a confidential document. Please keep it secure.", 105, finalY, { align: "center" });
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-US')}`, 105, finalY + 5, { align: "center" });

    return doc;
  } catch (error) {
    console.error("[Payslip Service] Error generating PDF:", error);
    throw error;
  }
};

// Send payslip via email
export const sendPayslipEmail = async (salaryId) => {
  try {
    const salary = await Salary.findByPk(salaryId, {
      include: [{ model: User }]
    });

    if (!salary) {
      throw new Error("Salary not found");
    }

    const user = salary.User;
    if (!user.companyEmail && !user.personalEmail) {
      throw new Error("User has no email address");
    }

    // Generate PDF
    const pdfDoc = await generatePayslipPDF(salaryId);
    const pdfBuffer = Buffer.from(pdfDoc.output("arraybuffer"));

    // Create transporter
    const transporter = createTransporter();
    if (!transporter) {
      throw new Error("Email configuration not set");
    }

    // Send email
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: user.companyEmail || user.personalEmail,
      subject: `Payslip for ${salary.month}/${salary.year} - ${user.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Your Payslip for ${salary.month}/${salary.year}</h2>
          <p>Dear ${user.name},</p>
          <p>Please find attached your payslip for the period ${salary.month}/${salary.year}.</p>
          <p>This is a confidential document. Please keep it secure.</p>
          <p>If you have any questions, please contact HR.</p>
          <br>
          <p>Best regards,<br>HR Department</p>
        </div>
      `,
      attachments: [
        {
          filename: `payslip_${user.employeeCode}_${salary.month}_${salary.year}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf"
        }
      ]
    };

    await transporter.sendMail(mailOptions);

    console.log(`[Payslip Service] Payslip sent to ${user.companyEmail || user.personalEmail}`);
    return { success: true, message: "Payslip sent successfully" };
  } catch (error) {
    console.error("[Payslip Service] Error sending payslip:", error);
    throw error;
  }
};

// Send payslips for all approved salaries in a month
export const sendMonthlyPayslips = async (month, year) => {
  try {
    const salaries = await Salary.findAll({
      where: {
        month: parseInt(month),
        year: parseInt(year),
        status: 'approved'
      },
      include: [{ model: User }]
    });

    const results = [];
    for (const salary of salaries) {
      try {
        await sendPayslipEmail(salary.id);
        results.push({ salaryId: salary.id, status: 'success' });
      } catch (error) {
        console.error(`[Payslip Service] Error sending payslip for salary ${salary.id}:`, error);
        results.push({ salaryId: salary.id, status: 'error', error: error.message });
      }
    }

    return {
      total: salaries.length,
      success: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length,
      results
    };
  } catch (error) {
    console.error("[Payslip Service] Error sending monthly payslips:", error);
    throw error;
  }
};



