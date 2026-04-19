import React, { useState, useEffect } from "react";
import { theme } from "../theme.js";
import jsPDF from "jspdf";
import 'jspdf-autotable';
import html2canvas from "html2canvas";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, PageOrientation, UnderlineType, BorderStyle } from "docx";
import { saveAs } from "file-saver";

export default function D02LTReport() {
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
            window.location.href = "/";
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
                return parseFloat(value).toLocaleString("en-US");
              } catch (e) {
                return String(value);
              }
            };

            // Thâm niên công tác (số năm từ ngày vào làm) và thâm niên vượt khung (%)
            let seniorityJobStr = ""; // Thâm niên công tác (năm)
            let seniorityVKStr = "";  // Thâm niên vượt khung (%)
            const refDate = emp.employmentStatus === "terminated" || emp.employmentStatus === "resigned"
              ? (emp.updatedAt ? new Date(emp.updatedAt) : new Date())
              : new Date();
            const startDateRaw = emp.startDate || emp.hireDate;
            if (startDateRaw) {
              try {
                const start = new Date(startDateRaw);
                if (!isNaN(start.getTime()) && start <= refDate) {
                  const years = (refDate - start) / (1000 * 60 * 60 * 24 * 365.25);
                  const fullYears = Math.floor(years);
                  if (fullYears >= 0) seniorityJobStr = fullYears === 0 ? "< 1 year" : `${fullYears} yr`;
                }
              } catch (e) {
                console.warn("Error parsing startDate for seniority:", emp.id, e);
              }
            }
            // Thâm niên vượt khung: nếu có trường từ backend thì dùng, không thì để trống hoặc "-"
            if (emp.seniorityVK != null && emp.seniorityVK !== "") {
              seniorityVKStr = String(emp.seniorityVK);
            }

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
              seniorityVK: seniorityVKStr,
              seniorityJob: seniorityJobStr,
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

  // Search employees by code or name
  const [employeeSearch, setEmployeeSearch] = useState("");
  const filteredEmployees = employees.filter((emp) => {
    if (!employeeSearch.trim()) return true;
    const term = employeeSearch.trim().toLowerCase();
    const code = (emp.employeeCode || emp.code || "").toLowerCase();
    const name = (emp.name || "").toLowerCase();
    return code.includes(term) || name.includes(term);
  });

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

  // Vietnamese translations for export (UI remains in English)
  const viTranslate = {
    gender: (g) => (g === "Male" ? "Nam" : g === "Female" ? "Nữ" : g || ""),
    shortGender: (g) => (g === "Male" ? "Nam" : g === "Female" ? "Nữ" : g || ""),
    seniority: (s) => {
      if (!s) return "";
      if (s === "< 1 year") return "Dưới 1 năm";
      return String(s).replace(/\s*yr$/i, " năm").replace(/\s*year(s)?$/i, " năm");
    },
    otherAllowances: (a) => {
      if (!a) return "";
      return String(a)
        .replace(/Lunch:/gi, "Ăn trưa:")
        .replace(/Transport:/gi, "Xăng xe:")
        .replace(/Phone:/gi, "Điện thoại:");
    },
    note: (n) => {
      if (!n) return "";
      return String(n)
        .replace(/Contract:\s*indefinite/gi, "HĐ: Không xác định thời hạn")
        .replace(/Contract:\s*1_year/gi, "HĐ: Xác định thời hạn 1 năm")
        .replace(/Contract:\s*3_year/gi, "HĐ: Xác định thời hạn 3 năm")
        .replace(/Contract:\s*probation/gi, "HĐ: Thử việc")
        .replace(/Contract:\s*other/gi, "HĐ: Khác")
        .replace(/Clinic:/gi, "Nơi KCB:")
        .replace(/Data processing error/gi, "Lỗi xử lý dữ liệu");
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
      
      const escapeHtml = (s) => String(s ?? "")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      const thBase = "border:1px solid #000; padding:3px; text-align:center; vertical-align:middle; background-color:#f3f4f6; font-weight:600; color:#111;";
      const tdBase = "border:1px solid #000; padding:3px; vertical-align:middle;";
      const tdCenter = tdBase + " text-align:center;";
      const tdRight = tdBase + " text-align:right;";

      // Build HTML content — Vietnamese format theo Mẫu D02-LT chuẩn BHXH Việt Nam
      container.innerHTML = `
        <div style="margin-bottom: 18px; font-family: 'Times New Roman', Times, serif;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
            <div style="flex: 1; font-size: 11px; line-height: 1.5;">
              <div style="margin-bottom: 2px;"><strong>TÊN ĐƠN VỊ SỬ DỤNG LAO ĐỘNG:</strong> ${escapeHtml(companyInfo.name) || "……………………………………"}</div>
              <div style="margin-bottom: 2px;">Số: &nbsp;${escapeHtml(companyInfo.reportNumber) || "……"} /………</div>
              <div style="margin-bottom: 2px;">Mã đơn vị: ${escapeHtml(companyInfo.code) || "…………………"};</div>
              <div style="margin-bottom: 2px;">Mã số thuế: ${escapeHtml(companyInfo.taxCode) || "…………………"}</div>
              <div style="margin-bottom: 2px;">Địa chỉ: ${escapeHtml(companyInfo.address) || "………………………………"}</div>
              <div>Điện thoại: ${escapeHtml(companyInfo.phone) || "…………………"}; Email: ${escapeHtml(companyInfo.email) || "…………………"}</div>
            </div>

            <div style="flex: 0 0 340px; text-align: center; font-size: 11px; line-height: 1.5;">
              <div style="text-align: right; font-weight: bold; margin-bottom: 2px;">Mẫu D02-LT</div>
              <div style="text-align: right; font-style: italic; font-size: 10px; margin-bottom: 10px;">
                (Ban hành kèm theo Quyết định số 1040/QĐ-BHXH<br/>
                ngày 18/8/2020 của BHXH Việt Nam)
              </div>
              <div style="font-weight: bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div style="font-weight: bold; text-decoration: underline; margin-bottom: 4px;">Độc lập - Tự do - Hạnh phúc</div>
              <div style="font-style: italic;">……, ngày …… tháng …… năm ………</div>
            </div>
          </div>

          <div style="text-align: center; font-size: 13px; font-weight: bold; margin: 16px 0 12px 0; text-transform: uppercase;">
            Báo cáo tình hình sử dụng lao động<br/>và danh sách tham gia BHXH, BHYT, BHTN
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 8px; font-family: 'Times New Roman', Times, serif;">
          <thead>
            <tr>
              <th rowspan="3" style="${thBase} min-width:22px;">STT</th>
              <th rowspan="3" style="${thBase} min-width:90px;">Họ và tên</th>
              <th rowspan="3" style="${thBase} min-width:60px;">Mã số BHXH</th>
              <th rowspan="3" style="${thBase} min-width:55px;">Ngày tháng năm sinh</th>
              <th rowspan="3" style="${thBase} min-width:35px;">Giới tính</th>
              <th rowspan="3" style="${thBase} min-width:60px;">Số CCCD/ CMND/ Hộ chiếu</th>
              <th rowspan="3" style="${thBase} min-width:95px;">Cấp bậc, chức vụ, chức danh nghề, nơi làm việc</th>
              <th colspan="4" style="${thBase}">Vị trí việc làm</th>
              <th colspan="6" style="${thBase}">Tiền lương</th>
              <th colspan="2" style="${thBase}">Ngành/nghề nặng nhọc, độc hại</th>
              <th colspan="5" style="${thBase}">Loại và hiệu lực hợp đồng lao động</th>
              <th rowspan="3" style="${thBase} min-width:58px;">Thời điểm đơn vị bắt đầu đóng BHXH</th>
              <th rowspan="3" style="${thBase} min-width:58px;">Thời điểm đơn vị kết thúc đóng BHXH</th>
              <th rowspan="3" style="${thBase} min-width:70px;">Ghi chú</th>
            </tr>
            <tr>
              <th rowspan="2" style="${thBase} min-width:32px;">Nhà quản lý</th>
              <th rowspan="2" style="${thBase} min-width:40px;">Chuyên môn kỹ thuật bậc cao</th>
              <th rowspan="2" style="${thBase} min-width:40px;">Chuyên môn kỹ thuật bậc trung</th>
              <th rowspan="2" style="${thBase} min-width:30px;">Khác</th>
              <th rowspan="2" style="${thBase} min-width:48px;">Hệ số/ Mức lương</th>
              <th colspan="5" style="${thBase}">Phụ cấp</th>
              <th rowspan="2" style="${thBase} min-width:45px;">Ngày bắt đầu</th>
              <th rowspan="2" style="${thBase} min-width:45px;">Ngày kết thúc</th>
              <th rowspan="2" style="${thBase} min-width:55px;">Ngày bắt đầu HĐLĐ Không xác định thời hạn</th>
              <th colspan="2" style="${thBase}">Hiệu lực HĐLĐ Xác định thời hạn</th>
              <th colspan="2" style="${thBase}">Hiệu lực HĐLĐ Khác (Dưới 1 tháng, thử việc)</th>
            </tr>
            <tr>
              <th style="${thBase} min-width:38px;">Chức vụ</th>
              <th style="${thBase} min-width:42px;">Thâm niên VK (%)</th>
              <th style="${thBase} min-width:42px;">Thâm niên nghề (%)</th>
              <th style="${thBase} min-width:45px;">Phụ cấp lương</th>
              <th style="${thBase} min-width:55px;">Các khoản bổ sung</th>
              <th style="${thBase} min-width:45px;">Ngày bắt đầu</th>
              <th style="${thBase} min-width:45px;">Ngày kết thúc</th>
              <th style="${thBase} min-width:45px;">Ngày bắt đầu</th>
              <th style="${thBase} min-width:45px;">Ngày kết thúc</th>
            </tr>
            <tr>
              ${Array.from({ length: 27 }, (_, i) => `<th style="${thBase} font-style:italic; font-weight:500;">(${i + 1})</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${employeeList.map((emp) => `
              <tr>
                <td style="${tdCenter}">${emp.stt}</td>
                <td style="${tdBase}">${escapeHtml(emp.name)}</td>
                <td style="${tdCenter}">${escapeHtml(emp.socialInsuranceNumber)}</td>
                <td style="${tdCenter}">${escapeHtml(emp.dateOfBirth)}</td>
                <td style="${tdCenter}">${escapeHtml(viTranslate.shortGender(emp.gender))}</td>
                <td style="${tdCenter}">${escapeHtml(emp.idNumber)}</td>
                <td style="${tdBase}">${escapeHtml(emp.position)}</td>
                <td style="${tdCenter}">${emp.positionCategory?.manager ? 'x' : ''}</td>
                <td style="${tdCenter}">${emp.positionCategory?.highTech ? 'x' : ''}</td>
                <td style="${tdCenter}">${emp.positionCategory?.midTech ? 'x' : ''}</td>
                <td style="${tdCenter}">${emp.positionCategory?.other ? 'x' : ''}</td>
                <td style="${tdRight}">${escapeHtml(emp.salary)}</td>
                <td style="${tdRight}">${escapeHtml(emp.positionAllowance)}</td>
                <td style="${tdCenter}">${escapeHtml(emp.seniorityVK)}</td>
                <td style="${tdCenter}">${escapeHtml(viTranslate.seniority(emp.seniorityJob))}</td>
                <td style="${tdRight}">${escapeHtml(emp.salaryAllowance)}</td>
                <td style="${tdBase} font-size:7px;">${escapeHtml(viTranslate.otherAllowances(emp.otherAllowances))}</td>
                <td style="${tdCenter}">${escapeHtml(emp.hazardousStartDate)}</td>
                <td style="${tdCenter}">${escapeHtml(emp.hazardousEndDate)}</td>
                <td style="${tdCenter}">${escapeHtml(emp.indefiniteContractStart)}</td>
                <td style="${tdCenter}">${escapeHtml(emp.fixedTermContractStart)}</td>
                <td style="${tdCenter}">${escapeHtml(emp.fixedTermContractEnd)}</td>
                <td style="${tdCenter}">${escapeHtml(emp.otherContractStart)}</td>
                <td style="${tdCenter}">${escapeHtml(emp.otherContractEnd)}</td>
                <td style="${tdCenter}">${escapeHtml(emp.insuranceStartDate)}</td>
                <td style="${tdCenter}">${escapeHtml(emp.insuranceEndDate)}</td>
                <td style="${tdBase} font-size:7px;">${escapeHtml(viTranslate.note(emp.note))}</td>
              </tr>
            `).join('')}
            <tr>
              <td style="${tdBase} text-align:right; font-weight:bold;" colspan="11">Tổng</td>
              <td style="${tdBase}" colspan="16">&nbsp;</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 28px; font-family: 'Times New Roman', Times, serif; font-size: 11px;">
          <div style="float: right; text-align: center; min-width: 320px;">
            <div style="font-weight: bold; text-transform: uppercase;">Đại diện đơn vị sử dụng lao động</div>
            <div style="font-style: italic;">(Ký, ghi rõ họ tên, đóng dấu)</div>
          </div>
          <div style="clear: both;"></div>
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
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toTimeString().slice(0, 5).replace(":", "-");

      const children = [];

      // Header 2 cột giống mẫu, không có khung (no visible borders)
      const noBorder = { style: BorderStyle.NONE };
      const headerTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: noBorder,
          left: noBorder,
          right: noBorder,
          bottom: noBorder,
          insideH: noBorder,
          insideV: noBorder
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 55, type: WidthType.PERCENTAGE },
                borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: "TÊN ĐƠN VỊ SỬ DỤNG LAO ĐỘNG: ", bold: true }),
                      new TextRun({ text: companyInfo.name || "……………………………………………" })
                    ],
                    spacing: { after: 100 }
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Số: ", bold: true }),
                      new TextRun({ text: (companyInfo.reportNumber || "………") + " /………" })
                    ],
                    spacing: { after: 100 }
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Mã đơn vị: ", bold: true }),
                      new TextRun({ text: (companyInfo.code || "………………") + ";" })
                    ],
                    spacing: { after: 100 }
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Mã số thuế: ", bold: true }),
                      new TextRun({ text: companyInfo.taxCode || "…………………………" })
                    ],
                    spacing: { after: 100 }
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Địa chỉ: ", bold: true }),
                      new TextRun({ text: companyInfo.address || "…………………………………" })
                    ],
                    spacing: { after: 100 }
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Điện thoại: ", bold: true }),
                      new TextRun({ text: companyInfo.phone || "………………………" }),
                      new TextRun({ text: "; Email: ", bold: true }),
                      new TextRun({ text: companyInfo.email || "………………………" })
                    ],
                    spacing: { after: 0 }
                  })
                ]
              }),
              new TableCell({
                width: { size: 45, type: WidthType.PERCENTAGE },
                borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: "Mẫu D02-LT", bold: true })],
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 80 }
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "(Ban hành kèm theo Quyết định số 1040/QĐ-BHXH",
                        italics: true
                      })
                    ],
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 40 }
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "ngày 18/8/2020 của BHXH Việt Nam)",
                        italics: true
                      })
                    ],
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 240 }
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", bold: true })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 80 }
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "Độc lập - Tự do - Hạnh phúc",
                        bold: true,
                        underline: { type: UnderlineType.SINGLE }
                      })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 160 }
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: "……, ngày …… tháng …… năm ………", italics: true })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 0 }
                  })
                ]
              })
            ]
          })
        ]
      });
      children.push(headerTable);

      // Tiêu đề chính (căn giữa) — theo mẫu
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "BÁO CÁO TÌNH HÌNH SỬ DỤNG LAO ĐỘNG VÀ DANH SÁCH THAM GIA BHXH, BHYT, BHTN",
              bold: true,
              size: 26
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 320, after: 320 }
        })
      );

      // Helpers cho table dữ liệu: có viền đầy đủ, căn giữa
      const th = (text, opts = {}) => new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text, bold: true, size: 16 })],
          alignment: AlignmentType.CENTER
        })],
        verticalAlign: "center",
        ...opts
      });
      const tn = (text) => new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text, italics: true, size: 14 })],
          alignment: AlignmentType.CENTER
        })]
      });
      const td = (text, opts = {}) => new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: text || "", size: 14 })],
          alignment: AlignmentType.CENTER
        })],
        verticalAlign: "center",
        ...opts
      });
      const tdLeft = (text, opts = {}) => new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: text || "", size: 14 })],
          alignment: AlignmentType.LEFT
        })],
        verticalAlign: "center",
        ...opts
      });

      // Table với header phân cấp theo đúng mẫu D02-LT (27 cột)
      const tableRows = [
        // Hàng 1 của header
        new TableRow({
          tableHeader: true,
          children: [
            th("STT", { rowSpan: 3 }),
            th("Họ và tên", { rowSpan: 3 }),
            th("Mã số BHXH", { rowSpan: 3 }),
            th("Ngày tháng năm sinh", { rowSpan: 3 }),
            th("Giới tính", { rowSpan: 3 }),
            th("Số CCCD/ CMND/ Hộ chiếu", { rowSpan: 3 }),
            th("Cấp bậc, chức vụ, chức danh nghề, nơi làm việc", { rowSpan: 3 }),
            th("Vị trí việc làm", { columnSpan: 4 }),
            th("Tiền lương", { columnSpan: 6 }),
            th("Ngành/nghề nặng nhọc, độc hại", { columnSpan: 2 }),
            th("Loại và hiệu lực hợp đồng lao động", { columnSpan: 5 }),
            th("Thời điểm đơn vị bắt đầu đóng BHXH", { rowSpan: 3 }),
            th("Thời điểm đơn vị kết thúc đóng BHXH", { rowSpan: 3 }),
            th("Ghi chú", { rowSpan: 3 })
          ]
        }),
        // Hàng 2 của header
        new TableRow({
          tableHeader: true,
          children: [
            th("Nhà quản lý", { rowSpan: 2 }),
            th("Chuyên môn kỹ thuật bậc cao", { rowSpan: 2 }),
            th("Chuyên môn kỹ thuật bậc trung", { rowSpan: 2 }),
            th("Khác", { rowSpan: 2 }),
            th("Hệ số/ Mức lương", { rowSpan: 2 }),
            th("Phụ cấp", { columnSpan: 5 }),
            th("Ngày bắt đầu", { rowSpan: 2 }),
            th("Ngày kết thúc", { rowSpan: 2 }),
            th("Ngày bắt đầu HĐLĐ Không xác định thời hạn", { rowSpan: 2 }),
            th("Hiệu lực HĐLĐ Xác định thời hạn", { columnSpan: 2 }),
            th("Hiệu lực HĐLĐ Khác (Dưới 1 tháng, thử việc)", { columnSpan: 2 })
          ]
        }),
        // Hàng 3 của header (các ô con)
        new TableRow({
          tableHeader: true,
          children: [
            th("Chức vụ"),
            th("Thâm niên VK (%)"),
            th("Thâm niên nghề (%)"),
            th("Phụ cấp lương"),
            th("Các khoản bổ sung"),
            th("Ngày bắt đầu"),
            th("Ngày kết thúc"),
            th("Ngày bắt đầu"),
            th("Ngày kết thúc")
          ]
        }),
        // Hàng đánh số cột (1)..(27)
        new TableRow({
          tableHeader: true,
          children: Array.from({ length: 27 }, (_, i) => tn(`(${i + 1})`))
        })
      ];

      employeeList.forEach(emp => {
        tableRows.push(
          new TableRow({
            children: [
              td(String(emp.stt)),
              tdLeft(emp.name),
              td(emp.socialInsuranceNumber),
              td(emp.dateOfBirth),
              td(viTranslate.gender(emp.gender)),
              td(emp.idNumber),
              tdLeft(emp.position),
              td(emp.positionCategory?.manager ? "x" : ""),
              td(emp.positionCategory?.highTech ? "x" : ""),
              td(emp.positionCategory?.midTech ? "x" : ""),
              td(emp.positionCategory?.other ? "x" : ""),
              td(emp.salary),
              td(emp.positionAllowance),
              td(emp.seniorityVK),
              td(viTranslate.seniority(emp.seniorityJob)),
              td(emp.salaryAllowance),
              tdLeft(viTranslate.otherAllowances(emp.otherAllowances)),
              td(emp.hazardousStartDate),
              td(emp.hazardousEndDate),
              td(emp.indefiniteContractStart),
              td(emp.fixedTermContractStart),
              td(emp.fixedTermContractEnd),
              td(emp.otherContractStart),
              td(emp.otherContractEnd),
              td(emp.insuranceStartDate),
              td(emp.insuranceEndDate),
              tdLeft(viTranslate.note(emp.note))
            ]
          })
        );
      });

      // Hàng "Tổng" theo mẫu
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: "Tổng", bold: true, size: 16 })],
                alignment: AlignmentType.CENTER
              })],
              columnSpan: 11
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "" })] })],
              columnSpan: 16
            })
          ]
        })
      );

      // Footer chữ ký nằm bên phải, căn giữa trong vùng phải
      const signatureTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: noBorder, left: noBorder, right: noBorder, bottom: noBorder,
          insideH: noBorder, insideV: noBorder
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
                children: [new Paragraph({ children: [new TextRun({ text: "" })] })]
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: "ĐẠI DIỆN ĐƠN VỊ SỬ DỤNG LAO ĐỘNG", bold: true })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 80 }
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: "(Ký, ghi rõ họ tên, đóng dấu)", italics: true })],
                    alignment: AlignmentType.CENTER
                  })
                ]
              })
            ]
          })
        ]
      });

      children.push(
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE }
        }),
        new Paragraph({ children: [new TextRun({ text: "" })], spacing: { before: 320 } }),
        signatureTable
      );

      // A4 landscape, kích thước và lề gần giống mẫu chuẩn D02-LT
      const doc = new Document({
        sections: [{
          properties: {
            page: {
              size: {
                // Theo docx: truyền kích thước A4 dọc (21cm x 29.7cm),
                // orientation = LANDSCAPE sẽ tự xoay ngang (swap width/height).
                width: "21cm",
                height: "29.7cm",
                orientation: PageOrientation.LANDSCAPE
              },
              margin: {
                // Lề gần giống mẫu: khoảng 2cm trên/dưới, 1.5cm trái/phải
                top: "2cm",
                right: "1.5cm",
                bottom: "2cm",
                left: "1.5cm"
              }
            }
          },
          children: children
        }]
      });

      const blob = await Packer.toBlob(doc);
      const safeName = (companyInfo.name || "Report").replace(/\s+/g, "-");
      const filename = `D02-LT-${safeName}-${dateStr}-${timeStr}.docx`;
      saveAs(blob, filename);
      setMessage("Word file exported successfully! Open the new file (check time in filename).");
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

  const isSuccessMessage =
    typeof message === "string" &&
    (message.trim().startsWith("✅") || /successfully/i.test(message));

  return (
    <div style={containerStyle}>
      <h2 style={{ marginBottom: theme.spacing.lg, color: theme.neutral.gray900 }}>
        📊 Employment &amp; social/health/unemployment insurance participation (Form D02-LT)
      </h2>

      {/* Company Information */}
      <div style={formSectionStyle}>
        <h3 style={{ marginBottom: theme.spacing.md, color: theme.primary.main }}>
          Reporting unit
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
          <div>
            <label style={labelStyle}>Unit name: *</label>
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
              placeholder="Unit code (per VSS)"
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
              placeholder="Tax identification number"
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
          <div style={{ display: "flex", gap: theme.spacing.sm, alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search by code or name..."
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              style={{
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                borderRadius: theme.radius.sm,
                border: `1px solid ${theme.neutral.gray300}`,
                fontSize: theme.typography.small.fontSize,
                minWidth: "220px"
              }}
            />
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
            {filteredEmployees.map(emp => (
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
            backgroundColor: loading ? theme.neutral.gray400 : theme.primary.main,
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

