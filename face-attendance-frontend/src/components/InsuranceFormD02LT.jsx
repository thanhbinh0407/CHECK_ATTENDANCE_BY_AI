import React, { useState, useEffect } from "react";
import { theme } from "../styles/theme.js";
import jsPDF from "jspdf";
import "jspdf-autotable";
import html2canvas from "html2canvas";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType } from "docx";
import { saveAs } from "file-saver";

export default function InsuranceFormD02LT() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingWord, setLoadingWord] = useState(false);
  const [message, setMessage] = useState("");
  const [companyInfo, setCompanyInfo] = useState({
    name: "",
    code: "",
    taxCode: "",
    address: "",
    phone: "",
    email: "",
    reportNumber: "",
    reportDate: new Date().toLocaleDateString('vi-VN')
  });
  const [employeeList, setEmployeeList] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    fetchEmployees();
    // Load company info from localStorage if available
    const saved = localStorage.getItem("companyInfo");
    if (saved) {
      try {
        setCompanyInfo({ ...companyInfo, ...JSON.parse(saved) });
      } catch (e) {
        console.error("Error loading company info:", e);
      }
    }
  }, []);

  // Load báo cáo D02-LT đã lưu (theo user admin hiện tại)
  useEffect(() => {
    const loadSavedReport = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const userStr = localStorage.getItem("user");
        if (!token || !userStr) return;

        const currentUser = JSON.parse(userStr);
        if (!currentUser?.id) return;

        const res = await fetch(`${apiBase}/api/insurance-forms/${currentUser.id}/D02_LT`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) return;

        const data = await res.json();
        if (data.status === "success" && data.data) {
          const saved = data.data;
          // companyInfo ưu tiên dữ liệu đã lưu trên server
          if (saved.companyInfo || saved.formData?.companyInfo) {
            setCompanyInfo(prev => ({
              ...prev,
              ...(saved.companyInfo || {}),
              ...(saved.formData?.companyInfo || {})
            }));
          }

          // employeeList: danh sách đã xử lý để preview/xuất file
          if (Array.isArray(saved.employeeList)) {
            setEmployeeList(saved.employeeList);
            // Đồng bộ lại danh sách id nhân viên được chọn (nếu có)
            const ids = saved.employeeList
              .map(e => e.id)
              .filter(id => id !== undefined && id !== null);
            if (ids.length > 0) {
              setSelectedEmployees(ids);
            }
          }

          setMessage("Loaded saved D02-LT report.");
        }
      } catch (err) {
        console.error("Error loading saved D02-LT report:", err);
        // Không show lỗi nếu chưa có dữ liệu
      }
    };

    loadSavedReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Save company info to localStorage when changed
    localStorage.setItem("companyInfo", JSON.stringify(companyInfo));
  }, [companyInfo]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setMessage("");
      const token = localStorage.getItem("authToken");
      
      if (!token) {
        setMessage("Error: Auth token not found. Please sign in again.");
        return;
      }

      const res = await fetch(`${apiBase}/api/admin/employees`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!res.ok) {
        if (res.status === 401) {
          setMessage("Authentication error: Invalid token. Please sign in again.");
          setTimeout(() => {
            window.location.href = "http://localhost:3000/";
          }, 2000);
          return;
        }
        const errorData = await res.json().catch(() => ({ message: "Unknown error" }));
        setMessage(`Failed to load employee list: ${errorData.message || res.statusText}`);
        return;
      }

      const data = await res.json();
      
      if (data.status === "success" && Array.isArray(data.employees)) {
        setEmployees(data.employees);
        // Auto-select all active employees
        const activeEmployees = data.employees.filter(emp => emp && emp.isActive !== false);
        setSelectedEmployees(activeEmployees.map(emp => emp.id));
        generateEmployeeList(activeEmployees);
        setMessage("");
      } else {
        setMessage("Error: Invalid employee data.");
        setEmployees([]);
        setEmployeeList([]);
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
      setMessage(`Failed to load employee list: ${err.message || "Connection error"}`);
      setEmployees([]);
      setEmployeeList([]);
    } finally {
      setLoading(false);
    }
  };

  const generateEmployeeList = (empList) => {
    if (!empList || !Array.isArray(empList) || empList.length === 0) {
      setEmployeeList([]);
      return;
    }

    try {
      const list = empList
        .filter(emp => emp && emp.id) // Filter out invalid employees
        .map((emp, idx) => {
          try {
            // Parse date of birth
            let dobStr = "";
            if (emp.dateOfBirth) {
              try {
                const dob = new Date(emp.dateOfBirth);
                if (!isNaN(dob.getTime())) {
                  dobStr = `${String(dob.getDate()).padStart(2, '0')}/${String(dob.getMonth() + 1).padStart(2, '0')}/${dob.getFullYear()}`;
                }
              } catch (e) {
                console.warn("Error parsing dateOfBirth for employee:", emp.id, e);
              }
            }
            
            // Determine position category (8-11)
            let positionCategory = { manager: false, highTech: false, midTech: false, other: true };
            const jobTitle = (emp.JobTitle?.name || emp.jobTitle || "").toLowerCase();
            if (jobTitle.includes("trưởng") || jobTitle.includes("phó") || jobTitle.includes("giám đốc") || jobTitle.includes("quản lý")) {
              positionCategory = { manager: true, highTech: false, midTech: false, other: false };
            } else if (jobTitle.includes("chuyên viên chính") || jobTitle.includes("kỹ sư") || jobTitle.includes("thạc sĩ") || jobTitle.includes("tiến sĩ")) {
              positionCategory = { manager: false, highTech: true, midTech: false, other: false };
            } else if (jobTitle.includes("chuyên viên") || jobTitle.includes("cử nhân")) {
              positionCategory = { manager: false, highTech: false, midTech: true, other: false };
            }

            // Contract type
            const contractType = emp.contractType || "";
            let contractStartDate = "";
            let contractEndDate = "";
            let contractOtherStart = "";
            let contractOtherEnd = "";
            
            try {
              if (contractType === "indefinite") {
                if (emp.startDate) {
                  const date = new Date(emp.startDate);
                  if (!isNaN(date.getTime())) {
                    contractStartDate = date.toLocaleDateString('vi-VN');
                  }
                }
              } else if (contractType === "1_year" || contractType === "3_year") {
                if (emp.startDate) {
                  const start = new Date(emp.startDate);
                  if (!isNaN(start.getTime())) {
                    contractStartDate = start.toLocaleDateString('vi-VN');
                    const end = new Date(start);
                    if (contractType === "1_year") {
                      end.setFullYear(end.getFullYear() + 1);
                    } else {
                      end.setFullYear(end.getFullYear() + 3);
                    }
                    contractEndDate = end.toLocaleDateString('vi-VN');
                  }
                }
              } else if (contractType === "probation") {
                if (emp.probationStartDate) {
                  const date = new Date(emp.probationStartDate);
                  if (!isNaN(date.getTime())) {
                    contractOtherStart = date.toLocaleDateString('vi-VN');
                  }
                }
                if (emp.probationEndDate) {
                  const date = new Date(emp.probationEndDate);
                  if (!isNaN(date.getTime())) {
                    contractOtherEnd = date.toLocaleDateString('vi-VN');
                  }
                }
              }
            } catch (e) {
              console.warn("Error parsing contract dates for employee:", emp.id, e);
            }

            // Insurance start/end dates
            let insuranceStartDate = "";
            let insuranceEndDate = "";
            try {
              if (emp.startDate) {
                const date = new Date(emp.startDate);
                if (!isNaN(date.getTime())) {
                  insuranceStartDate = date.toLocaleDateString('vi-VN');
                }
              }
              if (emp.employmentStatus === "terminated" || emp.employmentStatus === "resigned") {
                if (emp.updatedAt) {
                  const date = new Date(emp.updatedAt);
                  if (!isNaN(date.getTime())) {
                    insuranceEndDate = date.toLocaleDateString('vi-VN');
                  }
                }
              }
            } catch (e) {
              console.warn("Error parsing insurance dates for employee:", emp.id, e);
            }

            // Format salary and allowances
            const formatNumber = (value) => {
              if (!value || value === 0) return "";
              try {
                return parseFloat(value).toLocaleString('vi-VN');
              } catch (e) {
                return String(value);
              }
            };

            return {
              id: emp.id,
              stt: idx + 1,
              name: emp.name || "",
              socialInsuranceNumber: emp.socialInsuranceNumber || "",
              dateOfBirth: dobStr,
              gender: emp.gender === "male" ? "Male" : emp.gender === "female" ? "Female" : "",
              idNumber: emp.idNumber || "",
              position: `${emp.JobTitle?.name || emp.jobTitle || ""} ${emp.Department?.name || emp.department || ""}`.trim() || "-",
              positionCategory,
              salary: formatNumber(emp.baseSalary),
              salaryCoefficient: "", // Can be calculated if needed
              positionAllowance: formatNumber(emp.responsibilityAllowance),
              seniorityVK: "", // Thâm niên vượt khung (%)
              seniorityJob: "", // Thâm niên nghề (%)
              salaryAllowance: "", // Phụ cấp lương
              otherAllowances: [
                emp.lunchAllowance ? `Lunch: ${formatNumber(emp.lunchAllowance)}` : "",
                emp.transportAllowance ? `Transport: ${formatNumber(emp.transportAllowance)}` : "",
                emp.phoneAllowance ? `Phone: ${formatNumber(emp.phoneAllowance)}` : ""
              ].filter(Boolean).join(", "),
              hazardousStartDate: "",
              hazardousEndDate: "",
              contractStartDate,
              contractEndDate,
              contractOtherStart,
              contractOtherEnd,
              insuranceStartDate,
              insuranceEndDate,
              note: [
                emp.contractType ? `Contract: ${contractType}` : "",
                emp.healthInsuranceProvider ? `Clinic: ${emp.healthInsuranceProvider}` : ""
              ].filter(Boolean).join(" ") || ""
            };
          } catch (error) {
            console.error("Error processing employee:", emp.id, error);
            // Return a minimal valid entry to prevent breaking the list
            return {
              id: emp.id || idx,
              stt: idx + 1,
              name: emp.name || "N/A",
              socialInsuranceNumber: "",
              dateOfBirth: "",
              gender: "",
              idNumber: "",
              position: "-",
              positionCategory: { manager: false, highTech: false, midTech: false, other: true },
              salary: "",
              salaryCoefficient: "",
              positionAllowance: "",
              seniorityVK: "",
              seniorityJob: "",
              salaryAllowance: "",
              otherAllowances: "",
              hazardousStartDate: "",
              hazardousEndDate: "",
              contractStartDate: "",
              contractEndDate: "",
              contractOtherStart: "",
              contractOtherEnd: "",
              insuranceStartDate: "",
              insuranceEndDate: "",
              note: "Data processing error"
            };
          }
        });
      
      setEmployeeList(list);
    } catch (error) {
      console.error("Error generating employee list:", error);
      setMessage(`Failed to process employee list: ${error.message}`);
      setEmployeeList([]);
    }
  };

  const handleCompanyInfoChange = (field, value) => {
    setCompanyInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEmployeeSelection = (employeeId) => {
    setSelectedEmployees(prev => {
      if (prev.includes(employeeId)) {
        const newList = prev.filter(id => id !== employeeId);
        const selected = employees.filter(emp => newList.includes(emp.id));
        generateEmployeeList(selected);
        return newList;
      } else {
        const newList = [...prev, employeeId];
        const selected = employees.filter(emp => newList.includes(emp.id));
        generateEmployeeList(selected);
        return newList;
      }
    });
  };

  const selectAllEmployees = () => {
    const allIds = employees.map(emp => emp.id);
    setSelectedEmployees(allIds);
    generateEmployeeList(employees);
  };

  const deselectAllEmployees = () => {
    setSelectedEmployees([]);
    setEmployeeList([]);
  };

  // Lưu báo cáo D02-LT vào database
  const saveReport = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const userStr = localStorage.getItem("user");

      if (!token || !userStr) {
        setMessage("Error: Login information not found. Please sign in again.");
        return;
      }

      const currentUser = JSON.parse(userStr);
      if (!currentUser?.id) {
        setMessage("Error: Unable to determine current user.");
        return;
      }

      if (employeeList.length === 0) {
        setMessage("Error: No employee data to save the report.");
        return;
      }

      setIsSaving(true);
      setMessage("Saving D02-LT report...");

      const res = await fetch(`${apiBase}/api/insurance-forms/save`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: currentUser.id,
          formType: "D02_LT",
          formData: {
            companyInfo,
            selectedEmployeeIds: selectedEmployees
          },
          companyInfo,
          employeeList
        })
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        setMessage("✅ D02-LT report saved successfully!");
      } else {
        setMessage("❌ Failed to save D02-LT report: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Error saving D02-LT report:", err);
      setMessage("❌ Failed to save D02-LT report: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const exportToPDF = async () => {
    try {
      setLoading(true);
      setMessage("Generating PDF...");

      const printDiv = document.createElement('div');
      printDiv.style.position = 'absolute';
      printDiv.style.left = '-9999px';
      printDiv.style.width = '297mm'; // A4 landscape width
      printDiv.style.padding = '10mm';
      printDiv.style.fontFamily = 'Arial, sans-serif';
      printDiv.style.fontSize = '9pt';
      printDiv.style.backgroundColor = 'white';
      printDiv.style.color = 'black';

      let htmlContent = `
        <div style="margin-bottom: 15px;">
          <div style="text-align: center; font-size: 10pt; margin-bottom: 10px;">
            <strong>Form D02-LT</strong><br/>
            (Issued with Decision No. 1040/QĐ-BHXH dated 18/08/2020 of Vietnam Social Security)
          </div>
          <div style="margin-bottom: 15px;">
            <div><strong>EMPLOYER NAME:</strong> ${companyInfo.name || "_________________"}</div>
            <div>No.: ${companyInfo.reportNumber || "_____"} /………</div>
            <div>Unit code: ${companyInfo.code || "_____"}; Tax code: ${companyInfo.taxCode || "_____"}</div>
            <div>Address: ${companyInfo.address || "_____"}</div>
            <div>Phone: ${companyInfo.phone || "_____"}; Email: ${companyInfo.email || "_____"}</div>
          </div>
          <div style="text-align: center; margin-bottom: 15px;">
            <div style="font-size: 11pt; font-weight: bold;">SOCIALIST REPUBLIC OF VIETNAM</div>
            <div style="font-size: 11pt; font-weight: bold;">Independence - Freedom - Happiness</div>
            <div style="margin-top: 10px;">…., … / … / …</div>
          </div>
          <div style="text-align: center; font-size: 11pt; font-weight: bold; margin-bottom: 15px;">
            EMPLOYMENT STATUS REPORT AND LIST OF PARTICIPATION IN SI, HI, UI
          </div>
        </div>
      `;

      // Table header
      htmlContent += `
        <table style="width: 100%; border-collapse: collapse; font-size: 7pt; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f0f0f0;">
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 2%;">No.</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 6%;">Full name</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 4%;">Social Insurance No.</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 3%;">Date of birth</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 2%;">Gender</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 4%;">Citizen ID/ID</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 5%;">Position/Title</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 2%;">Manager</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 2%;">High-skilled</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 2%;">Mid-skilled</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 2%;">Other</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 3%;">Salary</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 2%;">Position allowance</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 2%;">Seniority VK (%)</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 2%;">Job seniority (%)</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 2%;">Salary allowance</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 3%;">Other allowances</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 2%;">Hazard start</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 2%;">Hazard end</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 2%;">Indefinite contract start</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 2%;">Fixed-term contract start</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 2%;">Fixed-term contract end</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 2%;">Other contract start</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 2%;">Other contract end</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 2%;">SI start</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 2%;">SI end</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 4%;">Notes</th>
            </tr>
          </thead>
          <tbody>
      `;

      employeeList.forEach(emp => {
        htmlContent += `
          <tr>
            <td style="border: 1px solid #000; padding: 4px; text-align: center;">${emp.stt}</td>
            <td style="border: 1px solid #000; padding: 4px;">${emp.name}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: center;">${emp.socialInsuranceNumber || ""}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: center;">${emp.dateOfBirth}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: center;">${emp.gender}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: center;">${emp.idNumber || ""}</td>
            <td style="border: 1px solid #000; padding: 4px;">${emp.position}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: center;">${emp.positionCategory.manager ? "X" : ""}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: center;">${emp.positionCategory.highTech ? "X" : ""}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: center;">${emp.positionCategory.midTech ? "X" : ""}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: center;">${emp.positionCategory.other ? "X" : ""}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: right;">${emp.salary}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: center;">${emp.positionAllowance || ""}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: center;">${emp.seniorityVK || ""}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: center;">${emp.seniorityJob || ""}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: center;">${emp.salaryAllowance || ""}</td>
            <td style="border: 1px solid #000; padding: 4px;">${emp.otherAllowances || ""}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: center;">${emp.hazardousStartDate || ""}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: center;">${emp.hazardousEndDate || ""}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: center;">${emp.contractStartDate || ""}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: center;">${emp.contractEndDate || ""}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: center;"></td>
            <td style="border: 1px solid #000; padding: 4px; text-align: center;">${emp.contractOtherStart || ""}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: center;">${emp.contractOtherEnd || ""}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: center;">${emp.insuranceStartDate || ""}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: center;">${emp.insuranceEndDate || ""}</td>
            <td style="border: 1px solid #000; padding: 4px;">${emp.note || ""}</td>
          </tr>
        `;
      });

      htmlContent += `
            <tr>
              <td colspan="27" style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">Total: ${employeeList.length}</td>
            </tr>
          </tbody>
        </table>
        <div style="margin-top: 30px; text-align: right;">
          <div style="margin-bottom: 20px;"><strong>EMPLOYER REPRESENTATIVE</strong></div>
          <div>(Signature, full name, and seal)</div>
        </div>
      `;

      printDiv.innerHTML = htmlContent;
      document.body.appendChild(printDiv);

      const canvas = await html2canvas(printDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      document.body.removeChild(printDiv);

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 297; // A4 landscape width in mm
      const pageHeight = 210; // A4 landscape height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      const doc = new jsPDF('landscape', 'mm', 'a4');
      let position = 0;

      doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const filename = `D02-LT-${companyInfo.name.replace(/\s+/g, "-")}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      setMessage("PDF exported successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      setMessage("Failed to export PDF: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToWord = async () => {
    try {
      setLoadingWord(true);
      setMessage("Generating Word file...");

      const children = [];

      // Header
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Form D02-LT",
              bold: true
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "(Issued with Decision No. 1040/QĐ-BHXH dated 18/08/2020 of Vietnam Social Security)",
              italics: true
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "EMPLOYER NAME: ", bold: true }),
            new TextRun({ text: companyInfo.name || "_________________" })
          ],
          spacing: { after: 150 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `No.: ${companyInfo.reportNumber || "_____"} /………` })
          ],
          spacing: { after: 150 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Unit code: ${companyInfo.code || "_____"}; ` }),
            new TextRun({ text: `Tax code: ${companyInfo.taxCode || "_____"}` })
          ],
          spacing: { after: 150 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Address: ${companyInfo.address || "_____"}` })
          ],
          spacing: { after: 150 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Phone: ${companyInfo.phone || "_____"}; ` }),
            new TextRun({ text: `Email: ${companyInfo.email || "_____"}` })
          ],
          spacing: { after: 300 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "SOCIALIST REPUBLIC OF VIETNAM",
              bold: true
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Independence - Freedom - Happiness",
              bold: true
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "…., … / … / …" })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "EMPLOYMENT STATUS REPORT AND LIST OF PARTICIPATION IN SI, HI, UI",
              bold: true
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        })
      );

      // Table
      const tableRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "No.", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Full name", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Social Insurance No.", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Date of birth", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Gender", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Citizen ID/ID", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Position/Title", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Manager", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "High-skilled", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Mid-skilled", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Other", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Salary", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Position allowance", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Seniority VK", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Job seniority", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Salary allowance", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Other allowances", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Hazard start", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Hazard end", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Indefinite contract start", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Fixed-term contract start", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Fixed-term contract end", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Other contract start", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Other contract end", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "SI start", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "SI end", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Notes", bold: true })] })] })
          ]
        })
      ];

      employeeList.forEach(emp => {
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(emp.stt) })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.name })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.socialInsuranceNumber || "" })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.dateOfBirth })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.gender })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.idNumber || "" })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.position })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.positionCategory.manager ? "X" : "" })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.positionCategory.highTech ? "X" : "" })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.positionCategory.midTech ? "X" : "" })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.positionCategory.other ? "X" : "" })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.salary })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.positionAllowance || "" })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.seniorityVK || "" })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.seniorityJob || "" })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.salaryAllowance || "" })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.otherAllowances || "" })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.hazardousStartDate || "" })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.hazardousEndDate || "" })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.contractStartDate || "" })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.contractEndDate || "" })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "" })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.contractOtherStart || "" })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.contractOtherEnd || "" })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.insuranceStartDate || "" })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.insuranceEndDate || "" })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.note || "" })] })] })
            ]
          })
        );
      });

      // Total row
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: `Total: ${employeeList.length}`, bold: true })] })],
              columnSpan: 27
            })
          ]
        })
      );

      children.push(
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "EMPLOYER REPRESENTATIVE", bold: true })
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { before: 600, after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "(Signature, full name, and seal)" })
          ],
          alignment: AlignmentType.RIGHT
        })
      );

      const doc = new Document({
        sections: [{
          children: children
        }]
      });

      const blob = await Packer.toBlob(doc);
      const filename = `D02-LT-${companyInfo.name.replace(/\s+/g, "-")}-${new Date().toISOString().split('T')[0]}.docx`;
      saveAs(blob, filename);
      setMessage("Word file exported successfully!");
    } catch (error) {
      console.error("Error generating Word document:", error);
      setMessage("Failed to export Word file: " + error.message);
    } finally {
      setLoadingWord(false);
    }
  };

  const containerStyle = {
    padding: theme.spacing.xl,
    backgroundColor: theme.neutral.white,
    borderRadius: theme.radius.lg,
    boxShadow: theme.shadows.md,
    maxWidth: "1400px",
    margin: "0 auto"
  };

  const formSectionStyle = {
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.lg,
    backgroundColor: theme.neutral.gray50,
    borderRadius: theme.radius.md,
    border: `1px solid ${theme.neutral.gray200}`
  };

  const inputStyle = {
    width: "100%",
    padding: theme.spacing.sm,
    border: `1px solid ${theme.neutral.gray300}`,
    borderRadius: theme.radius.sm,
    fontSize: theme.typography.body.fontSize,
    fontFamily: theme.typography.fontFamily
  };

  const labelStyle = {
    display: "block",
    marginBottom: theme.spacing.xs,
    fontWeight: "600",
    color: theme.neutral.gray700,
    fontSize: theme.typography.small.fontSize
  };

  const buttonStyle = {
    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
    backgroundColor: theme.primary.main,
    color: theme.neutral.white,
    border: "none",
    borderRadius: theme.radius.md,
    cursor: "pointer",
    fontWeight: "600",
    fontSize: theme.typography.body.fontSize,
    marginRight: theme.spacing.md
  };

  const isSuccessMessage = typeof message === "string" && message.trim().startsWith("✅");

  return (
    <div style={containerStyle}>
      <h2 style={{ marginBottom: theme.spacing.lg, color: theme.neutral.gray900 }}>
        📊 Employment Status & SI/HI/UI Participation Report (Form D02-LT)
      </h2>

      {/* Company Information */}
      <div style={formSectionStyle}>
        <h3 style={{ marginBottom: theme.spacing.md, color: theme.primary.main }}>
          Employer information
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
          <div>
            <label style={labelStyle}>Employer name: *</label>
            <input
              type="text"
              style={inputStyle}
              value={companyInfo.name}
              onChange={(e) => handleCompanyInfoChange("name", e.target.value)}
              placeholder="Company/organization name"
            />
          </div>
          <div>
            <label style={labelStyle}>Unit code:</label>
            <input
              type="text"
              style={inputStyle}
              value={companyInfo.code}
              onChange={(e) => handleCompanyInfoChange("code", e.target.value)}
              placeholder="Unit code issued by VSS"
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
          <div>
            <label style={labelStyle}>Tax code:</label>
            <input
              type="text"
              style={inputStyle}
              value={companyInfo.taxCode}
              onChange={(e) => handleCompanyInfoChange("taxCode", e.target.value)}
              placeholder="Tax code"
            />
          </div>
          <div>
            <label style={labelStyle}>Report number:</label>
            <input
              type="text"
              style={inputStyle}
              value={companyInfo.reportNumber}
              onChange={(e) => handleCompanyInfoChange("reportNumber", e.target.value)}
              placeholder="Report number"
            />
          </div>
        </div>

        <div style={{ marginBottom: theme.spacing.md }}>
          <label style={labelStyle}>Address:</label>
          <input
            type="text"
            style={inputStyle}
            value={companyInfo.address}
            onChange={(e) => handleCompanyInfoChange("address", e.target.value)}
            placeholder="Head office address"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md }}>
          <div>
            <label style={labelStyle}>Phone:</label>
            <input
              type="text"
              style={inputStyle}
              value={companyInfo.phone}
              onChange={(e) => handleCompanyInfoChange("phone", e.target.value)}
              placeholder="Phone number"
            />
          </div>
          <div>
            <label style={labelStyle}>Email:</label>
            <input
              type="email"
              style={inputStyle}
              value={companyInfo.email}
              onChange={(e) => handleCompanyInfoChange("email", e.target.value)}
              placeholder="Company email"
            />
          </div>
        </div>
      </div>

      {/* Employee Selection */}
      <div style={formSectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: theme.spacing.md }}>
          <h3 style={{ margin: 0, color: theme.primary.main }}>
            Employees ({selectedEmployees.length}/{employees.length})
            {loading && <span style={{ marginLeft: theme.spacing.sm, fontSize: theme.typography.small.fontSize, color: theme.neutral.gray500 }}>⏳ Loading...</span>}
          </h3>
          <div style={{ display: "flex", gap: theme.spacing.sm }}>
            <button
              style={{
                ...buttonStyle,
                backgroundColor: theme.success.main,
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                fontSize: theme.typography.small.fontSize
              }}
              onClick={selectAllEmployees}
              disabled={loading || employees.length === 0}
            >
              Select all
            </button>
            <button
              style={{
                ...buttonStyle,
                backgroundColor: theme.error.main,
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                fontSize: theme.typography.small.fontSize
              }}
              onClick={deselectAllEmployees}
              disabled={loading}
            >
              Deselect all
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: theme.spacing.xl, color: theme.neutral.gray600 }}>
            ⏳ Loading employees...
          </div>
        ) : employees.length === 0 ? (
          <div style={{ textAlign: "center", padding: theme.spacing.xl, color: theme.error.main }}>
            ❌ No employees found
          </div>
        ) : (
          <div style={{
            maxHeight: "400px",
            overflowY: "auto",
            border: `1px solid ${theme.neutral.gray300}`,
            borderRadius: theme.radius.sm,
            padding: theme.spacing.sm
          }}>
            {employees.map(emp => (
              <label
                key={emp.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: theme.spacing.sm,
                  cursor: "pointer",
                  borderRadius: theme.radius.sm,
                  marginBottom: theme.spacing.xs,
                  backgroundColor: selectedEmployees.includes(emp.id) ? theme.primary.light : "transparent"
                }}
                onMouseEnter={(e) => {
                  if (!selectedEmployees.includes(emp.id)) {
                    e.currentTarget.style.backgroundColor = theme.neutral.gray100;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!selectedEmployees.includes(emp.id)) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedEmployees.includes(emp.id)}
                  onChange={() => handleEmployeeSelection(emp.id)}
                  style={{ marginRight: theme.spacing.sm }}
                  disabled={loading}
                />
                <span>
                  <strong>{emp.employeeCode || "N/A"}</strong> - {emp.name || "N/A"} {emp.isActive === false ? "(Inactive)" : ""}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Preview Table */}
      {employeeList.length > 0 && (
        <div style={formSectionStyle}>
          <h3 style={{ marginBottom: theme.spacing.md, color: theme.primary.main }}>
            Report preview ({employeeList.length} employees)
          </h3>
          <div style={{
            overflowX: "auto",
            border: `1px solid ${theme.neutral.gray300}`,
            borderRadius: theme.radius.sm
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: theme.typography.tiny.fontSize }}>
              <thead>
                <tr style={{ backgroundColor: theme.primary.main, color: theme.neutral.white }}>
                  <th style={{ padding: theme.spacing.xs, border: "1px solid #ddd", textAlign: "center" }}>No.</th>
                  <th style={{ padding: theme.spacing.xs, border: "1px solid #ddd", textAlign: "left" }}>Full name</th>
                  <th style={{ padding: theme.spacing.xs, border: "1px solid #ddd", textAlign: "center" }}>Social Insurance No.</th>
                  <th style={{ padding: theme.spacing.xs, border: "1px solid #ddd", textAlign: "center" }}>Date of birth</th>
                  <th style={{ padding: theme.spacing.xs, border: "1px solid #ddd", textAlign: "center" }}>Gender</th>
                  <th style={{ padding: theme.spacing.xs, border: "1px solid #ddd", textAlign: "center" }}>Citizen ID/ID</th>
                  <th style={{ padding: theme.spacing.xs, border: "1px solid #ddd", textAlign: "left" }}>Position/Title</th>
                  <th style={{ padding: theme.spacing.xs, border: "1px solid #ddd", textAlign: "center" }}>Salary</th>
                  <th style={{ padding: theme.spacing.xs, border: "1px solid #ddd", textAlign: "center" }}>SI start</th>
                  <th style={{ padding: theme.spacing.xs, border: "1px solid #ddd", textAlign: "left" }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {employeeList.slice(0, 10).map(emp => (
                  <tr key={emp.id}>
                    <td style={{ padding: theme.spacing.xs, border: "1px solid #ddd", textAlign: "center" }}>{emp.stt}</td>
                    <td style={{ padding: theme.spacing.xs, border: "1px solid #ddd" }}>{emp.name}</td>
                    <td style={{ padding: theme.spacing.xs, border: "1px solid #ddd", textAlign: "center" }}>{emp.socialInsuranceNumber || "-"}</td>
                    <td style={{ padding: theme.spacing.xs, border: "1px solid #ddd", textAlign: "center" }}>{emp.dateOfBirth}</td>
                    <td style={{ padding: theme.spacing.xs, border: "1px solid #ddd", textAlign: "center" }}>{emp.gender}</td>
                    <td style={{ padding: theme.spacing.xs, border: "1px solid #ddd", textAlign: "center" }}>{emp.idNumber || "-"}</td>
                    <td style={{ padding: theme.spacing.xs, border: "1px solid #ddd" }}>{emp.position || "-"}</td>
                    <td style={{ padding: theme.spacing.xs, border: "1px solid #ddd", textAlign: "right" }}>{emp.salary || "-"}</td>
                    <td style={{ padding: theme.spacing.xs, border: "1px solid #ddd", textAlign: "center" }}>{emp.insuranceStartDate || "-"}</td>
                    <td style={{ padding: theme.spacing.xs, border: "1px solid #ddd" }}>{emp.note || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {employeeList.length > 10 && (
              <div style={{ padding: theme.spacing.sm, textAlign: "center", color: theme.neutral.gray600 }}>
                ... and {employeeList.length - 10} more employees (will be included in the exported file)
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: theme.spacing.md, marginTop: theme.spacing.xl }}>
        <button
          style={{
            ...buttonStyle,
            backgroundColor: isSaving ? theme.neutral.gray400 : theme.primary.main,
            cursor: isSaving ? "not-allowed" : "pointer",
            opacity: isSaving ? 0.7 : 1
          }}
          onClick={saveReport}
          disabled={isSaving || loading || employeeList.length === 0}
        >
          {isSaving ? "⏳ Saving..." : "💾 Save"}
        </button>
        <button
          style={{
            ...buttonStyle,
            backgroundColor: loadingWord ? theme.neutral.gray400 : theme.primary.main,
            cursor: loadingWord ? "not-allowed" : "pointer",
            opacity: loadingWord ? 0.7 : 1
          }}
          onClick={exportToWord}
          disabled={loadingWord || loading || employeeList.length === 0}
        >
          {loadingWord ? "⏳ Generating Word..." : "📝 Export Word"}
        </button>
        <button
          style={{
            ...buttonStyle,
            backgroundColor: loading ? theme.neutral.gray400 : theme.success.main,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1
          }}
          onClick={exportToPDF}
          disabled={loading || loadingWord || employeeList.length === 0}
        >
          {loading ? "⏳ Generating PDF..." : "📄 Export PDF"}
        </button>
      </div>

      {message && (
        <div style={{
          marginTop: theme.spacing.md,
          padding: theme.spacing.md,
          backgroundColor: isSuccessMessage ? theme.success.light : theme.error.light,
          color: isSuccessMessage ? theme.success.dark : theme.error.dark,
          borderRadius: theme.radius.md
        }}>
          {message}
        </div>
      )}
    </div>
  );
}

