import React, { useState, useEffect } from "react";
import { theme } from "../styles/theme.js";
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
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
        console.log("Active employees count:", activeEmployees.length);
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

            // Contract type - Tách riêng cho từng loại hợp đồng
            const contractType = emp.contractType || "";
            let indefiniteContractStart = "";
            let fixedTermContractStart = "";
            let fixedTermContractEnd = "";
            let otherContractStart = "";
            let otherContractEnd = "";
            
            try {
              if (contractType === "indefinite") {
                // Hợp đồng không xác định thời hạn
                if (emp.startDate) {
                  const date = new Date(emp.startDate);
                  if (!isNaN(date.getTime())) {
                    indefiniteContractStart = date.toLocaleDateString('vi-VN');
                  }
                }
              } else if (contractType === "1_year" || contractType === "3_year") {
                // Hợp đồng xác định thời hạn
                if (emp.startDate) {
                  const start = new Date(emp.startDate);
                  if (!isNaN(start.getTime())) {
                    fixedTermContractStart = start.toLocaleDateString('vi-VN');
                    const end = new Date(start);
                    if (contractType === "1_year") {
                      end.setFullYear(end.getFullYear() + 1);
                    } else {
                      end.setFullYear(end.getFullYear() + 3);
                    }
                    fixedTermContractEnd = end.toLocaleDateString('vi-VN');
                  }
                }
              } else if (contractType === "probation" || contractType === "other") {
                // Hợp đồng thử việc hoặc loại khác
                if (emp.probationStartDate) {
                  const date = new Date(emp.probationStartDate);
                  if (!isNaN(date.getTime())) {
                    otherContractStart = date.toLocaleDateString('vi-VN');
                  }
                } else if (emp.startDate) {
                  const date = new Date(emp.startDate);
                  if (!isNaN(date.getTime())) {
                    otherContractStart = date.toLocaleDateString('vi-VN');
                  }
                }
                if (emp.probationEndDate) {
                  const date = new Date(emp.probationEndDate);
                  if (!isNaN(date.getTime())) {
                    otherContractEnd = date.toLocaleDateString('vi-VN');
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
              indefiniteContractStart,
              fixedTermContractStart,
              fixedTermContractEnd,
              otherContractStart,
              otherContractEnd,
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
              indefiniteContractStart: "",
              fixedTermContractStart: "",
              fixedTermContractEnd: "",
              otherContractStart: "",
              otherContractEnd: "",
              insuranceStartDate: "",
              insuranceEndDate: "",
              note: "Data processing error"
            };
          }
        });
      
      console.log("Generated employee list:", list.length, "items");
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
      console.log("exportToPDF called, employeeList length:", employeeList.length);
      setLoading(true);
      setMessage("Generating PDF...");

      // Create temporary container
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.width = '1400px'; // Wider for more columns
      container.style.padding = '20px';
      container.style.backgroundColor = '#ffffff';
      container.style.fontFamily = 'Arial, sans-serif';
      
      // Build HTML content
      container.innerHTML = `
        <div style="margin-bottom: 20px;">
          <div style="text-align: center; font-size: 11px; font-weight: bold; margin-bottom: 10px;">Form D02-LT</div>
          <div style="text-align: center; font-size: 8px; margin-bottom: 15px; font-style: italic;">
            (Issued with Decision No. 1040/QĐ-BHXH dated 18/08/2020 of Vietnam Social Security)
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <div style="flex: 1; font-size: 9px;">
              <div style="margin-bottom: 3px;"><strong>EMPLOYER NAME:</strong> ${companyInfo.name || "_________________"}</div>
              <div style="margin-bottom: 3px;">No.: ${companyInfo.reportNumber || "_____"} /………</div>
              <div style="margin-bottom: 3px;">Unit code: ${companyInfo.code || "_____"}; Tax code: ${companyInfo.taxCode || "_____"}</div>
              <div style="margin-bottom: 3px;">Address: ${companyInfo.address || "_____"}</div>
              <div>Phone: ${companyInfo.phone || "_____"}; Email: ${companyInfo.email || "_____"}</div>
            </div>
            
            <div style="flex: 0 0 250px; text-align: center; font-size: 9px;">
              <div style="font-weight: bold; margin-bottom: 3px;">SOCIALIST REPUBLIC OF VIETNAM</div>
              <div style="font-weight: bold; margin-bottom: 8px;">Independence - Freedom - Happiness</div>
              <div>…., … / … / …</div>
            </div>
          </div>
          
          <div style="text-align: center; font-size: 11px; font-weight: bold; margin: 20px 0;">
            EMPLOYMENT STATUS REPORT AND LIST OF PARTICIPATION IN SI, HI, UI
          </div>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 7px;">
          <thead>
            <tr style="background-color: #dbeafe; color: #1e40af; font-weight: 600;">
              <th style="border: 1px solid #93c5fd; padding: 3px; text-align: center; min-width: 25px;">No.</th>
              <th style="border: 1px solid #93c5fd; padding: 3px; text-align: center; min-width: 80px;">Full name</th>
              <th style="border: 1px solid #93c5fd; padding: 3px; text-align: center; min-width: 60px;">SI No.</th>
              <th style="border: 1px solid #93c5fd; padding: 3px; text-align: center; min-width: 50px;">DoB</th>
              <th style="border: 1px solid #93c5fd; padding: 3px; text-align: center; min-width: 30px;">Gender</th>
              <th style="border: 1px solid #93c5fd; padding: 3px; text-align: center; min-width: 60px;">ID</th>
              <th style="border: 1px solid #93c5fd; padding: 3px; text-align: center; min-width: 100px;">Position</th>
              <th style="border: 1px solid #93c5fd; padding: 3px; text-align: center; min-width: 30px;">Mgr</th>
              <th style="border: 1px solid #93c5fd; padding: 3px; text-align: center; min-width: 30px;">High</th>
              <th style="border: 1px solid #93c5fd; padding: 3px; text-align: center; min-width: 30px;">Mid</th>
              <th style="border: 1px solid #93c5fd; padding: 3px; text-align: center; min-width: 30px;">Oth</th>
              <th style="border: 1px solid #93c5fd; padding: 3px; text-align: center; min-width: 60px;">Salary</th>
              <th style="border: 1px solid #93c5fd; padding: 3px; text-align: center; min-width: 40px;">Pos Allow</th>
              <th style="border: 1px solid #93c5fd; padding: 3px; text-align: center; min-width: 35px;">Sen VK</th>
              <th style="border: 1px solid #93c5fd; padding: 3px; text-align: center; min-width: 35px;">Sen Job</th>
              <th style="border: 1px solid #93c5fd; padding: 3px; text-align: center; min-width: 40px;">Sal Allow</th>
              <th style="border: 1px solid #93c5fd; padding: 3px; text-align: center; min-width: 80px;">Other Allow</th>
              <th style="border: 1px solid #93c5fd; padding: 3px; text-align: center; min-width: 45px;">Haz Start</th>
              <th style="border: 1px solid #93c5fd; padding: 3px; text-align: center; min-width: 45px;">Haz End</th>
              <th style="border: 1px solid #93c5fd; padding: 3px; text-align: center; min-width: 50px;">Indef Start</th>
              <th style="border: 1px solid #93c5fd; padding: 3px; text-align: center; min-width: 50px;">Fixed Start</th>
              <th style="border: 1px solid #93c5fd; padding: 3px; text-align: center; min-width: 50px;">Fixed End</th>
              <th style="border: 1px solid #93c5fd; padding: 3px; text-align: center; min-width: 50px;">Other Start</th>
              <th style="border: 1px solid #93c5fd; padding: 3px; text-align: center; min-width: 50px;">Other End</th>
              <th style="border: 1px solid #93c5fd; padding: 3px; text-align: center; min-width: 50px;">SI Start</th>
              <th style="border: 1px solid #93c5fd; padding: 3px; text-align: center; min-width: 50px;">SI End</th>
              <th style="border: 1px solid #93c5fd; padding: 3px; text-align: center; min-width: 80px;">Notes</th>
            </tr>
          </thead>
          <tbody>
            ${employeeList.map((emp, idx) => `
              <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f0f9ff'};">
                <td style="border: 1px solid #e0e7ff; padding: 3px; text-align: center;">${emp.stt}</td>
                <td style="border: 1px solid #e0e7ff; padding: 3px;">${emp.name}</td>
                <td style="border: 1px solid #e0e7ff; padding: 3px; text-align: center;">${emp.socialInsuranceNumber || ''}</td>
                <td style="border: 1px solid #e0e7ff; padding: 3px; text-align: center;">${emp.dateOfBirth}</td>
                <td style="border: 1px solid #e0e7ff; padding: 3px; text-align: center;">${emp.gender === 'Male' ? 'M' : emp.gender === 'Female' ? 'F' : ''}</td>
                <td style="border: 1px solid #e0e7ff; padding: 3px; text-align: center;">${emp.idNumber || ''}</td>
                <td style="border: 1px solid #e0e7ff; padding: 3px;">${emp.position}</td>
                <td style="border: 1px solid #e0e7ff; padding: 3px; text-align: center;">${emp.positionCategory.manager ? 'X' : ''}</td>
                <td style="border: 1px solid #e0e7ff; padding: 3px; text-align: center;">${emp.positionCategory.highTech ? 'X' : ''}</td>
                <td style="border: 1px solid #e0e7ff; padding: 3px; text-align: center;">${emp.positionCategory.midTech ? 'X' : ''}</td>
                <td style="border: 1px solid #e0e7ff; padding: 3px; text-align: center;">${emp.positionCategory.other ? 'X' : ''}</td>
                <td style="border: 1px solid #e0e7ff; padding: 3px; text-align: right;">${emp.salary}</td>
                <td style="border: 1px solid #e0e7ff; padding: 3px; text-align: center;">${emp.positionAllowance || ''}</td>
                <td style="border: 1px solid #e0e7ff; padding: 3px; text-align: center;">${emp.seniorityVK || ''}</td>
                <td style="border: 1px solid #e0e7ff; padding: 3px; text-align: center;">${emp.seniorityJob || ''}</td>
                <td style="border: 1px solid #e0e7ff; padding: 3px; text-align: center;">${emp.salaryAllowance || ''}</td>
                <td style="border: 1px solid #e0e7ff; padding: 3px; font-size: 6px;">${emp.otherAllowances || ''}</td>
                <td style="border: 1px solid #e0e7ff; padding: 3px; text-align: center;">${emp.hazardousStartDate || ''}</td>
                <td style="border: 1px solid #e0e7ff; padding: 3px; text-align: center;">${emp.hazardousEndDate || ''}</td>
                <td style="border: 1px solid #e0e7ff; padding: 3px; text-align: center;">${emp.indefiniteContractStart || ''}</td>
                <td style="border: 1px solid #e0e7ff; padding: 3px; text-align: center;">${emp.fixedTermContractStart || ''}</td>
                <td style="border: 1px solid #e0e7ff; padding: 3px; text-align: center;">${emp.fixedTermContractEnd || ''}</td>
                <td style="border: 1px solid #e0e7ff; padding: 3px; text-align: center;">${emp.otherContractStart || ''}</td>
                <td style="border: 1px solid #e0e7ff; padding: 3px; text-align: center;">${emp.otherContractEnd || ''}</td>
                <td style="border: 1px solid #e0e7ff; padding: 3px; text-align: center;">${emp.insuranceStartDate || ''}</td>
                <td style="border: 1px solid #e0e7ff; padding: 3px; text-align: center;">${emp.insuranceEndDate || ''}</td>
                <td style="border: 1px solid #e0e7ff; padding: 3px; font-size: 6px;">${emp.note || ''}</td>
              </tr>
            `).join('')}
            <tr style="background-color: #dbeafe;">
              <td colspan="27" style="border: 1px solid #93c5fd; padding: 5px; text-align: center; font-weight: bold; color: #1e40af;">
                Total: ${employeeList.length} employees
              </td>
            </tr>
          </tbody>
        </table>
        
        <div style="margin-top: 30px; text-align: right; font-size: 9px;">
          <div style="font-weight: bold; margin-bottom: 5px;">EMPLOYER REPRESENTATIVE</div>
          <div style="font-size: 8px;">(Signature, full name, and seal)</div>
        </div>
      `;
      
      document.body.appendChild(container);
      
      // Capture with html2canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 1400,
        windowWidth: 1400
      });
      
      document.body.removeChild(container);
      
      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
      
      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      const filename = `D02-LT-${companyInfo.name.replace(/\s+/g, "-")}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
      
      setMessage("✅ PDF exported successfully with all columns!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      setMessage("❌ Failed to export PDF: " + error.message);
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
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.indefiniteContractStart || "" })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.fixedTermContractStart || "" })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.fixedTermContractEnd || "" })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.otherContractStart || "" })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.otherContractEnd || "" })] })] }),
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
                  backgroundColor: selectedEmployees.includes(emp.id) ? "#e0f2fe" : "transparent",
                  border: selectedEmployees.includes(emp.id) ? "1px solid #bae6fd" : "1px solid transparent"
                }}
                onMouseEnter={(e) => {
                  if (!selectedEmployees.includes(emp.id)) {
                    e.currentTarget.style.backgroundColor = "#f0f9ff";
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
                <tr style={{ backgroundColor: "#dbeafe", color: "#1e40af", fontWeight: "600" }}>
                  <th style={{ padding: theme.spacing.xs, border: "1px solid #93c5fd", textAlign: "center" }}>No.</th>
                  <th style={{ padding: theme.spacing.xs, border: "1px solid #93c5fd", textAlign: "left" }}>Full name</th>
                  <th style={{ padding: theme.spacing.xs, border: "1px solid #93c5fd", textAlign: "center" }}>Social Insurance No.</th>
                  <th style={{ padding: theme.spacing.xs, border: "1px solid #93c5fd", textAlign: "center" }}>Date of birth</th>
                  <th style={{ padding: theme.spacing.xs, border: "1px solid #93c5fd", textAlign: "center" }}>Gender</th>
                  <th style={{ padding: theme.spacing.xs, border: "1px solid #93c5fd", textAlign: "center" }}>Citizen ID/ID</th>
                  <th style={{ padding: theme.spacing.xs, border: "1px solid #93c5fd", textAlign: "left" }}>Position/Title</th>
                  <th style={{ padding: theme.spacing.xs, border: "1px solid #93c5fd", textAlign: "center" }}>Salary</th>
                  <th style={{ padding: theme.spacing.xs, border: "1px solid #93c5fd", textAlign: "center" }}>SI start</th>
                  <th style={{ padding: theme.spacing.xs, border: "1px solid #93c5fd", textAlign: "left" }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {employeeList.slice(0, 10).map((emp, idx) => (
                  <tr key={emp.id} style={{ backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f0f9ff" }}>
                    <td style={{ padding: theme.spacing.xs, border: "1px solid #e0e7ff", textAlign: "center" }}>{emp.stt}</td>
                    <td style={{ padding: theme.spacing.xs, border: "1px solid #e0e7ff" }}>{emp.name}</td>
                    <td style={{ padding: theme.spacing.xs, border: "1px solid #e0e7ff", textAlign: "center" }}>{emp.socialInsuranceNumber || "-"}</td>
                    <td style={{ padding: theme.spacing.xs, border: "1px solid #e0e7ff", textAlign: "center" }}>{emp.dateOfBirth}</td>
                    <td style={{ padding: theme.spacing.xs, border: "1px solid #e0e7ff", textAlign: "center" }}>{emp.gender}</td>
                    <td style={{ padding: theme.spacing.xs, border: "1px solid #e0e7ff", textAlign: "center" }}>{emp.idNumber || "-"}</td>
                    <td style={{ padding: theme.spacing.xs, border: "1px solid #e0e7ff" }}>{emp.position || "-"}</td>
                    <td style={{ padding: theme.spacing.xs, border: "1px solid #e0e7ff", textAlign: "right" }}>{emp.salary || "-"}</td>
                    <td style={{ padding: theme.spacing.xs, border: "1px solid #e0e7ff", textAlign: "center" }}>{emp.insuranceStartDate || "-"}</td>
                    <td style={{ padding: theme.spacing.xs, border: "1px solid #e0e7ff" }}>{emp.note || "-"}</td>
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

      {/* Debug info */}
      {employeeList.length === 0 && selectedEmployees.length > 0 && (
        <div style={{
          marginTop: theme.spacing.md,
          padding: theme.spacing.sm,
          backgroundColor: theme.warning.bg,
          color: theme.warning.text,
          borderRadius: theme.radius.md,
          fontSize: theme.typography.small.fontSize
        }}>
          ℹ️ Processing {selectedEmployees.length} employees... If this persists, try refreshing the page.
        </div>
      )}

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

