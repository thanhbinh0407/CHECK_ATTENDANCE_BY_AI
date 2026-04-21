import React, { useState, useEffect } from "react";
import { theme } from "../theme.js";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { html2canvasIsolated } from "../utils/html2canvasIsolated.js";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, UnderlineType, BorderStyle, PageBreak } from "docx";
import { saveAs } from "file-saver";
import { countries, vietnamProvinces } from "../data/countries.js";

// Trạng thái form mặc định dùng chung cho load lần đầu và khi đổi nhân viên
const initialFormData = {
  // Phần I: Người chưa có mã số BHXH
  name: "",
  dateOfBirth: "",
  gender: "",
  nationality: "VN",
  nationalityName: "Vietnam",
  ethnicity: "",
  birthPlaceCountry: "VN",
  birthPlaceCountryName: "Vietnam",
  birthPlaceWard: "",
  birthPlaceDistrict: "",
  birthPlaceProvince: "",
  birthPlaceProvinceCode: "",
  addressCountry: "VN",
  addressCountryName: "Vietnam",
  addressStreet: "",
  addressWard: "",
  addressDistrict: "",
  addressProvince: "",
  addressProvinceCode: "",
  idNumber: "",
  idIssueDate: "",
  idIssuePlace: "",
  phoneNumber: "",
  parentGuardianName: "",
  contributionAmount: "",
  contributionMethod: "",
  healthInsuranceProvider: "",
  // Phần II: Người đã có mã số BHXH
  socialInsuranceNumber: "",
  changeContent: "",
  attachedDocuments: "",
  // Phụ lục: Thành viên hộ gia đình
  householdHeadName: "",
  householdHeadPhone: "",
  householdAddressCountry: "VN",
  householdAddressCountryName: "Vietnam",
  householdAddressWard: "",
  householdAddressDistrict: "",
  householdAddressProvince: "",
  householdAddressProvinceCode: "",
  householdMembers: [],
  declarationPlace: "",
  declarationDate: new Date().toISOString().split("T")[0]
};

export default function TK1TSForm() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingWord, setLoadingWord] = useState(false);
  const [formType, setFormType] = useState("new"); // "new" or "update"
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState(initialFormData);
  const [householdMember, setHouseholdMember] = useState({
    name: "",
    socialInsuranceNumber: "",
    dateOfBirth: "",
    gender: "",
    birthPlace: "",
    relationship: "",
    idNumber: "",
    note: ""
  });

  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  const formatDateDDMMYYYY = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (!selectedEmployee) return;

    // Đảm bảo: luôn load thông tin nhân viên trước,
    // sau đó mới áp dữ liệu form đã lưu để không bị ghi đè
    const loadAll = async () => {
      try {
        await loadEmployeeData();
        await loadSavedFormData();
      } catch (err) {
        console.error("Error loading employee + saved form data:", err);
      }
    };

    loadAll();
  }, [selectedEmployee, formType]);

  // Load saved form data
  const loadSavedFormData = async () => {
    if (!selectedEmployee) return;
    
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/insurance-forms/${selectedEmployee.id}/TK1_TS`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && data.data && data.data.formData) {
          const saved = data.data.formData || {};

          // Không ghi đè auto-fill Appendix address nếu giá trị lưu trong DB trống
          const {
            householdAddressWard,
            householdAddressDistrict,
            householdAddressProvince,
            householdAddressProvinceCode,
            ...restSaved
          } = saved;

          const overrideHouseholdAddress = {
            ...(householdAddressWard && householdAddressWard.trim()
              ? { householdAddressWard }
              : {}),
            ...(householdAddressDistrict && householdAddressDistrict.trim()
              ? { householdAddressDistrict }
              : {}),
            ...(householdAddressProvince && householdAddressProvince.trim()
              ? { householdAddressProvince }
              : {}),
            ...(householdAddressProvinceCode && householdAddressProvinceCode.trim()
              ? { householdAddressProvinceCode }
              : {})
          };

          setFormData(prev => ({
            ...prev,
            ...restSaved,
            ...overrideHouseholdAddress
          }));
          setMessage("Loaded saved form data.");
        }
      }
    } catch (err) {
      console.error("Error loading saved form:", err);
      // Không hiển thị lỗi nếu chưa có dữ liệu
    }
  };

  // Basic form validation following TK1-TS required fields
  const validateForm = () => {
    if (!selectedEmployee) {
      setMessage("Please select an employee first.");
      return false;
    }

    const missing = [];
    const errors = {};

    if (formType === "new") {
      if (!formData.name.trim()) {
        missing.push("[01] Full name");
        errors.name = true;
      }
      if (!formData.dateOfBirth.trim()) {
        missing.push("[02] Date of birth");
        errors.dateOfBirth = true;
      }
      if (!formData.gender) {
        missing.push("[03] Gender");
        errors.gender = true;
      }
      const missingAddressParts = [];
      if (!formData.addressStreet.trim()) {
        missingAddressParts.push("[07.1] Street/hamlet");
        errors.addressStreet = true;
      }
      if (!formData.addressWard.trim()) {
        missingAddressParts.push("[07.2] Hamlet");
        errors.addressWard = true;
      }
      if (!formData.addressDistrict.trim()) {
        missingAddressParts.push("[07.3] Commune/ward");
        errors.addressDistrict = true;
      }
      if (!formData.addressProvince.trim()) {
        missingAddressParts.push("[07.4] Province/City");
        errors.addressProvince = true;
      }
      if (missingAddressParts.length > 0) {
        missing.push(...missingAddressParts);
      }
    } else {
      // update mode (has SI number)
      if (!formData.name.trim()) {
        missing.push("[01] Full name");
        errors.name = true;
      }
      if (!formData.dateOfBirth) {
        missing.push("[02] Date of birth");
        errors.dateOfBirth = true;
      }
      if (!formData.socialInsuranceNumber.trim()) {
        missing.push("[03] Social Insurance number");
        errors.socialInsuranceNumber = true;
      }
      if (!formData.changeContent.trim()) {
        missing.push("[04] Requested changes");
        errors.changeContent = true;
      }
    }

    if (missing.length > 0) {
      setMessage("Please fill all required fields: " + missing.join(", "));
      setFieldErrors(errors);
      return false;
    }

    setFieldErrors({});
    return true;
  };

  // Save form data
  const saveFormData = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setMessage("Saving...");
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/insurance-forms/save`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: selectedEmployee.id,
          formType: 'TK1_TS',
          formData: formData
        })
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setMessage("✅ Form saved successfully!");
      } else {
        setMessage("❌ Failed to save form: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Error saving form:", err);
      setMessage("❌ Failed to save form: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/admin/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
      setMessage("Failed to load employee list.");
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiBase}/api/admin/employees/${selectedEmployee.id}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        const emp = data.employee;
        // Family / Dependents from backend (can be 'Dependents' or 'dependents')
        const dependents = emp?.Dependents || emp?.dependents || [];
        const householdHeadFromFamily = dependents && dependents.length > 0
          ? (dependents[0].fullName || dependents[0].name || "")
          : "";
        const householdHeadPhoneFromFamily = dependents && dependents.length > 0
          ? (dependents[0].phoneNumber || "")
          : "";

        // Parse main address for section [07]
        const parseAddress = (address) => {
          if (!address) return { street: "", ward: "", district: "", province: "" };
          const parts = address.split(",").map(s => s.trim());
          return {
            street: parts[0] || "",
            ward: parts[1] || "",
            district: parts[2] || "",
            province: parts[3] || ""
          };
        };

        const tempAddr = parseAddress(emp.temporaryAddress || emp.address);

        // Parse province from address
        const provinceCode = vietnamProvinces.find(p =>
          tempAddr.province && tempAddr.province.includes(p.name)
        )?.code || "";

        // Household address (Appendix)
        // 1) Ưu tiên dùng 3 trường backend đã tách sẵn: addressHamlet / addressCommune / addressProvince
        // 2) Nếu backend chưa có (rỗng), fallback tách trực tiếp từ Address giống frontend cũ
        const parseHouseholdAddressFallback = (address) => {
          if (!address) return { hamlet: "", commune: "", province: "" };
          let parts = address.split("-").map(s => s.trim()).filter(Boolean);
          if (parts.length < 3) {
            parts = address.split(",").map(s => s.trim()).filter(Boolean);
          }
          const hamlet = parts[0] || "";
          const commune = parts[1] || "";
          const province = parts[2] || "";
          return { hamlet, commune, province };
        };

        let householdAddr = {
          hamlet: emp.addressHamlet || "",
          commune: emp.addressCommune || "",
          province: emp.addressProvince || ""
        };

        if (!householdAddr.hamlet && !householdAddr.commune && !householdAddr.province) {
          // Ưu tiên dùng địa chỉ của người phụ thuộc (nếu có), ví dụ: "Ấp 1 - Cái Bè - Tiền Giang"
          const primaryDependent = dependents && dependents.length > 0 ? dependents[0] : null;
          const dependentAddressSource = primaryDependent?.address || "";

          const employeeAddressSource =
            emp.address || emp.permanentAddress || emp.temporaryAddress || "";

          const source = dependentAddressSource || employeeAddressSource || "";
          householdAddr = parseHouseholdAddressFallback(source);
        }

        const householdProvinceCode = vietnamProvinces.find(p =>
          householdAddr.province && householdAddr.province.includes(p.name)
        )?.code || "";

        // Khi đổi nhân viên, luôn reset form về mặc định rồi mới fill dữ liệu nhân viên.
        // Những field không có dữ liệu sẽ tự động để trống.
        setFormData(() => ({
          ...initialFormData,
          name: (emp.name || "").toUpperCase(),
          // Hiển thị theo format YYYY-MM-DD cho input type="date"
          dateOfBirth: emp.dateOfBirth
            ? new Date(emp.dateOfBirth).toISOString().split("T")[0]
            : "",
          gender: emp.gender === "male" ? "Male" : emp.gender === "female" ? "Female" : "",
          nationality: "VN",
          nationalityName: "Vietnam",
          ethnicity: "",
          birthPlaceCountry: "VN",
          birthPlaceCountryName: "Vietnam",
          birthPlaceWard: "",
          birthPlaceDistrict: "",
          birthPlaceProvince: "",
          birthPlaceProvinceCode: "",
          addressCountry: "VN",
          addressCountryName: "Vietnam",
          addressStreet: tempAddr.street,
          addressWard: tempAddr.ward,
          addressDistrict: tempAddr.district,
          addressProvince: tempAddr.province,
          addressProvinceCode: provinceCode,
          idNumber: emp.idNumber || "",
          idIssueDate: emp.idIssueDate
            ? new Date(emp.idIssueDate).toISOString().split("T")[0]
            : "",
          idIssuePlace: emp.idIssuePlace || "",
          phoneNumber: emp.phoneNumber || "",
          parentGuardianName: "",
          contributionAmount: "",
          contributionMethod: "",
          healthInsuranceProvider: emp.healthInsuranceProvider || "",
          socialInsuranceNumber: emp.socialInsuranceNumber || "",
          changeContent: "",
          attachedDocuments: "",
          // Household head info pre-filled from first Dependent (Family tab)
          householdHeadName: householdHeadFromFamily,
          householdHeadPhone: householdHeadPhoneFromFamily,
          householdAddressCountry: "VN",
          householdAddressCountryName: "Vietnam",
          // Pre-fill from free-form Address, e.g. "Ấp 1 - Cái Bè - Tiền Giang"
          householdAddressWard: householdAddr.hamlet,
          householdAddressDistrict: householdAddr.commune,
          householdAddressProvince: householdAddr.province,
          householdAddressProvinceCode: householdProvinceCode,
          householdMembers: []
        }));
      }
    } catch (err) {
      console.error("Error loading employee data:", err);
      setMessage("Failed to load employee details.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addHouseholdMember = () => {
    if (!householdMember.name) {
      setMessage("Please enter the member's name.");
      return;
    }
    setFormData(prev => ({
      ...prev,
      householdMembers: [...prev.householdMembers, { ...householdMember }]
    }));
    setHouseholdMember({
      name: "",
      socialInsuranceNumber: "",
      dateOfBirth: "",
      gender: "",
      birthPlace: "",
      relationship: "",
      idNumber: "",
      note: ""
    });
  };

  const removeHouseholdMember = (index) => {
    setFormData(prev => ({
      ...prev,
      householdMembers: prev.householdMembers.filter((_, i) => i !== index)
    }));
  };

  // Helpers chuyển dữ liệu sang tiếng Việt cho file xuất (UI vẫn dùng tiếng Anh)
  const viGender = (g) => (g === "Male" ? "Nam" : g === "Female" ? "Nữ" : g || "");
  const viCountry = (c) => {
    if (!c) return "";
    if (/^vietnam$/i.test(c) || c === "VN") return "Việt Nam";
    return c;
  };
  const splitDateParts = (d) => {
    if (!d) return { day: "", month: "", year: "" };
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return { day: "", month: "", year: "" };
    return {
      day: String(dt.getDate()).padStart(2, "0"),
      month: String(dt.getMonth() + 1).padStart(2, "0"),
      year: String(dt.getFullYear())
    };
  };
  const escapeHtml = (s) => String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const exportToPDF = async () => {
    if (!validateForm()) return;
    try {
      setLoading(true);
      setMessage("Generating PDF...");
      
      // Tạo hidden div để render
      const printDiv = document.createElement('div');
      printDiv.style.position = 'absolute';
      printDiv.style.left = '-9999px';
      printDiv.style.width = '210mm'; // A4 width
      printDiv.style.padding = '20mm';
      printDiv.style.fontFamily = "'Times New Roman', Times, serif";
      printDiv.style.fontSize = '13pt';
      printDiv.style.lineHeight = '1.5';
      printDiv.style.backgroundColor = 'white';
      printDiv.style.color = 'black';

      const dob = splitDateParts(formData.dateOfBirth);
      const idIssue = splitDateParts(formData.idIssueDate);
      const decl = splitDateParts(formData.declarationDate);
      const dots = (n = 10) => "…".repeat(n);

      // Build HTML content — mẫu TK1-TS (ban hành kèm QĐ 888/QĐ-BHXH ngày 16/7/2017)
      let htmlContent = `
        <table style="width:100%; border-collapse:collapse; margin-bottom: 10px;">
          <tr>
            <td style="width:50%; vertical-align:top; text-align:center; font-size:13pt;">
              <div style="font-weight:bold;"><u>BẢO HIỂM XÃ HỘI VIỆT NAM</u></div>
            </td>
            <td style="width:50%; vertical-align:top; text-align:right; font-size:12pt;">
              <div style="font-weight:bold;">Mẫu TK1-TS</div>
              <div style="font-style:italic; font-size:11pt;">(Ban hành kèm theo QĐ số: 888/QĐ-BHXH</div>
              <div style="font-style:italic; font-size:11pt;">ngày 16/7/2017 của BHXH Việt Nam)</div>
            </td>
          </tr>
          <tr>
            <td></td>
            <td style="text-align:center; padding-top:14px; font-size:13pt;">
              <div style="font-weight:bold;">CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div style="font-weight:bold;"><u>Độc lập - Tự do - Hạnh phúc</u></div>
            </td>
          </tr>
        </table>

        <div style="text-align:center; margin: 14px 0 6px 0;">
          <div style="font-size:16pt; font-weight:bold;">TỜ KHAI</div>
          <div style="font-size:13pt; font-weight:bold;">THAM GIA, ĐIỀU CHỈNH THÔNG TIN BẢO HIỂM XÃ HỘI, BẢO HIỂM Y TẾ</div>
          <div style="font-size:12pt; font-style:italic;">(Áp dụng đối với người tham gia chưa được cấp mã số BHXH và thay đổi thông tin)</div>
        </div>
      `;

      if (formType === "new") {
        htmlContent += `
          <div style="margin-top:14px;">
            <div style="margin-bottom:8px;"><strong>I. Đối với người chưa được cấp mã số BHXH</strong> <em>(người tham gia chỉ kê khai từ chỉ tiêu [01] đến chỉ tiêu [13] dưới đây).</em></div>
            <div style="margin-bottom:6px;"><strong>[01].</strong> Họ và tên <em>(viết chữ in hoa)</em>: ${escapeHtml(formData.name) || dots(60)}</div>
            <div style="margin-bottom:6px;"><strong>[02].</strong> Ngày, tháng, năm sinh: ${dob.day || "……"}/${dob.month || "……"}/${dob.year || "………"} &nbsp;&nbsp;&nbsp; <strong>[03].</strong> Giới tính: ${escapeHtml(viGender(formData.gender)) || dots(10)}</div>
            <div style="margin-bottom:6px;"><strong>[04].</strong> Quốc tịch: ${escapeHtml(viCountry(formData.nationalityName || formData.nationality)) || dots(15)} &nbsp;&nbsp;&nbsp; <strong>[05].</strong> Dân tộc: ${escapeHtml(formData.ethnicity) || dots(15)}</div>
            <div style="margin-bottom:6px;"><strong>[06].</strong> Nơi đăng ký giấy khai sinh: <strong>[06.1].</strong> Xã <em>(phường, thị trấn)</em>: ${escapeHtml(formData.birthPlaceWard) || dots(25)}</div>
            <div style="margin-bottom:6px;"><strong>[06.2].</strong> Huyện <em>(quận, thị xã, Tp thuộc tỉnh)</em>: ${escapeHtml(formData.birthPlaceDistrict) || dots(25)} &nbsp; <strong>[06.3].</strong> Tỉnh <em>(Tp)</em>: ${escapeHtml(formData.birthPlaceProvince) || dots(18)}</div>
            <div style="margin-bottom:6px;"><strong>[07].</strong> Địa chỉ nhận kết quả: <strong>[07.1].</strong> Số nhà, đường phố, thôn xóm: ${escapeHtml(formData.addressStreet) || dots(35)}</div>
            <div style="margin-bottom:6px;"><strong>[07.2].</strong> Xã <em>(phường, thị trấn)</em>: ${escapeHtml(formData.addressWard) || dots(20)} &nbsp; <strong>[07.3].</strong> Huyện <em>(quận, thị xã, Tp thuộc tỉnh)</em>: ${escapeHtml(formData.addressDistrict) || dots(18)}</div>
            <div style="margin-bottom:6px;"><strong>[07.4].</strong> Tỉnh <em>(Tp)</em>: ${escapeHtml(formData.addressProvince) || dots(25)}</div>
            <div style="margin-bottom:6px;"><strong>[08].</strong> Số CMND/ Hộ chiếu/ Thẻ căn cước: ${escapeHtml(formData.idNumber) || dots(20)} &nbsp; <strong>[09].</strong> Số điện thoại liên hệ: ${escapeHtml(formData.phoneNumber) || dots(18)}</div>
            ${(formData.idIssueDate || formData.idIssuePlace) ? `<div style="margin-bottom:6px; padding-left:18px; font-style:italic; font-size:12pt;">Ngày cấp: ${idIssue.day || "……"}/${idIssue.month || "……"}/${idIssue.year || "………"} &nbsp; Nơi cấp: ${escapeHtml(formData.idIssuePlace) || dots(25)}</div>` : ""}
            <div style="margin-bottom:6px;"><strong>[10].</strong> Họ tên cha/ mẹ/ người giám hộ <em>(đối với trẻ em dưới 6 tuổi)</em>: ${escapeHtml(formData.parentGuardianName) || dots(35)}</div>
            <div style="margin-bottom:6px;"><strong>[11].</strong> Mức tiền đóng: ${escapeHtml(formData.contributionAmount) || dots(18)} &nbsp; <strong>[12].</strong> Phương thức đóng: ${escapeHtml(formData.contributionMethod) || dots(18)}</div>
            <div style="margin-bottom:6px; font-style:italic; font-size:12pt;">(Chỉ tiêu [11], [12] chỉ áp dụng đối với người tham gia BHXH tự nguyện)</div>
            <div style="margin-bottom:6px;"><strong>[13].</strong> Nơi đăng ký khám bệnh, chữa bệnh ban đầu <em>(không áp dụng đối với người tham gia BHXH tự nguyện)</em>: ${escapeHtml(formData.healthInsuranceProvider) || dots(35)}</div>
            <div style="margin-bottom:6px;"><strong>[14].</strong> Trường hợp người tham gia BHYT theo hộ gia đình được giảm trừ mức đóng thì kê khai thêm Phụ lục <em>(Phụ lục kèm theo)</em> và không phải nộp, xuất trình sổ hộ khẩu, chứng minh thư, thẻ căn cước.</div>
          </div>
        `;
      } else {
        htmlContent += `
          <div style="margin-top:14px;">
            <div style="margin-bottom:8px;"><strong>II. Đối với người đã được cấp mã số BHXH thay đổi thông tin ghi trên sổ BHXH, thẻ BHYT</strong> <em>(người tham gia chỉ kê khai từ chỉ tiêu [01] đến chỉ tiêu [05] dưới đây)</em></div>
            <div style="margin-bottom:6px;"><strong>[01].</strong> Họ và tên <em>(viết chữ in hoa)</em>: ${escapeHtml(formData.name) || dots(60)}</div>
            <div style="margin-bottom:6px;"><strong>[02].</strong> Ngày, tháng, năm sinh: ${dob.day || "……"}/${dob.month || "……"}/${dob.year || "………"} &nbsp;&nbsp;&nbsp; <strong>[03].</strong> Mã số BHXH: ${escapeHtml(formData.socialInsuranceNumber) || dots(25)}</div>
            <div style="margin-bottom:6px;"><strong>[04].</strong> Nội dung thay đổi, yêu cầu:</div>
            <div style="margin-bottom:6px; min-height:40px; white-space:pre-wrap; padding-left:18px;">${escapeHtml(formData.changeContent) || dots(90)}</div>
            <div style="margin-bottom:6px;"><strong>[05].</strong> Hồ sơ kèm theo <em>(nếu có)</em>:</div>
            <div style="margin-bottom:6px; min-height:30px; white-space:pre-wrap; padding-left:18px;">${escapeHtml(formData.attachedDocuments) || dots(90)}</div>
          </div>
        `;
      }

      // Khu vực chữ ký: 2 cột — Trái "XÁC NHẬN CỦA ĐƠN VỊ", Phải "Người kê khai"
      htmlContent += `
        <table style="width:100%; border-collapse:collapse; margin-top: 26px;">
          <tr>
            <td style="width:50%; vertical-align:top; text-align:center; font-size:12pt;">
              <div style="font-weight:bold; text-transform:uppercase;">Xác nhận của đơn vị</div>
              <div style="font-style:italic;">(chỉ áp dụng đối với người lao động đang tham gia BHXH bắt buộc thay đổi họ, tên đệm, tên; ngày, tháng, năm sinh)</div>
            </td>
            <td style="width:50%; vertical-align:top; text-align:center; font-size:12pt;">
              <div>Tôi cam đoan những nội dung kê khai là đúng và chịu trách nhiệm trước pháp luật về những nội dung đã kê khai.</div>
              <div style="font-style:italic; margin-top:10px;">${escapeHtml(formData.declarationPlace) || "…………"}, ngày ${decl.day || "……"} tháng ${decl.month || "……"} năm ${decl.year || "………"}</div>
              <div style="margin-top:14px; font-weight:bold;">Người kê khai</div>
              <div style="font-style:italic;">(Ký, ghi rõ họ tên)</div>
            </td>
          </tr>
        </table>
      `;

      // Phụ lục thành viên hộ gia đình (Vietnamese)
      if (formData.householdMembers.length > 0) {
        htmlContent += `
          <div style="page-break-before: always; margin-top: 10px; font-family:'Times New Roman', Times, serif;">
            <div style="text-align:center; margin-bottom: 12px;">
              <div style="font-size:14pt; font-weight:bold; text-transform:uppercase;">Phụ lục thành viên hộ gia đình</div>
              <div style="font-size:11pt; font-style:italic;">(Kèm theo Tờ khai TK1-TS)</div>
            </div>
            <div style="margin-bottom:8px;"><strong>Họ và tên chủ hộ:</strong> ${escapeHtml(formData.householdHeadName) || dots(35)} &nbsp; <strong>Số điện thoại <em>(nếu có)</em>:</strong> ${escapeHtml(formData.householdHeadPhone) || dots(18)}</div>
            <div style="margin-bottom:8px;"><strong>Địa chỉ:</strong> ${escapeHtml(formData.householdAddressWard) || "……"} - ${escapeHtml(formData.householdAddressDistrict) || "……"} - ${escapeHtml(formData.householdAddressProvince) || "……"}</div>

            <table style="width:100%; border-collapse: collapse; margin-top: 10px; font-size: 11pt;">
              <thead>
                <tr>
                  <th style="border:1px solid #000; padding:5px; text-align:center; background-color:#f3f4f6;">STT</th>
                  <th style="border:1px solid #000; padding:5px; text-align:center; background-color:#f3f4f6;">Họ và tên</th>
                  <th style="border:1px solid #000; padding:5px; text-align:center; background-color:#f3f4f6;">Mã số BHXH</th>
                  <th style="border:1px solid #000; padding:5px; text-align:center; background-color:#f3f4f6;">Ngày, tháng, năm sinh</th>
                  <th style="border:1px solid #000; padding:5px; text-align:center; background-color:#f3f4f6;">Giới tính</th>
                  <th style="border:1px solid #000; padding:5px; text-align:center; background-color:#f3f4f6;">Nơi đăng ký khai sinh</th>
                  <th style="border:1px solid #000; padding:5px; text-align:center; background-color:#f3f4f6;">Mối quan hệ với chủ hộ</th>
                  <th style="border:1px solid #000; padding:5px; text-align:center; background-color:#f3f4f6;">Số CMND/ Hộ chiếu/ Thẻ căn cước</th>
                  <th style="border:1px solid #000; padding:5px; text-align:center; background-color:#f3f4f6;">Ghi chú</th>
                </tr>
                <tr>
                  ${Array.from({ length: 9 }, (_, i) => `<th style="border:1px solid #000; padding:3px; text-align:center; font-style:italic; font-weight:500; background-color:#f9fafb;">(${i + 1})</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${formData.householdMembers.map((member, idx) => `
                  <tr>
                    <td style="border:1px solid #000; padding:5px; text-align:center;">${idx + 1}</td>
                    <td style="border:1px solid #000; padding:5px;">${escapeHtml(member.name)}</td>
                    <td style="border:1px solid #000; padding:5px; text-align:center;">${escapeHtml(member.socialInsuranceNumber)}</td>
                    <td style="border:1px solid #000; padding:5px; text-align:center;">${escapeHtml(formatDateDDMMYYYY(member.dateOfBirth) || member.dateOfBirth)}</td>
                    <td style="border:1px solid #000; padding:5px; text-align:center;">${escapeHtml(viGender(member.gender))}</td>
                    <td style="border:1px solid #000; padding:5px;">${escapeHtml(member.birthPlace)}</td>
                    <td style="border:1px solid #000; padding:5px; text-align:center;">${escapeHtml(member.relationship)}</td>
                    <td style="border:1px solid #000; padding:5px; text-align:center;">${escapeHtml(member.idNumber)}</td>
                    <td style="border:1px solid #000; padding:5px;">${escapeHtml(member.note)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <table style="width:100%; border-collapse:collapse; margin-top: 26px;">
              <tr>
                <td style="width:50%; vertical-align:top; text-align:center; font-size:12pt;">
                  <div style="font-weight:bold; text-transform:uppercase;">Xác nhận của đơn vị</div>
                  <div style="font-style:italic;">(nếu có)</div>
                </td>
                <td style="width:50%; vertical-align:top; text-align:center; font-size:12pt;">
                  <div>Tôi cam đoan những nội dung kê khai là đúng và chịu trách nhiệm trước pháp luật về những nội dung đã kê khai.</div>
                  <div style="font-style:italic; margin-top:10px;">${escapeHtml(formData.declarationPlace) || "…………"}, ngày ${decl.day || "……"} tháng ${decl.month || "……"} năm ${decl.year || "………"}</div>
                  <div style="margin-top:14px; font-weight:bold;">Người kê khai</div>
                  <div style="font-style:italic;">(Ký, ghi rõ họ tên)</div>
                </td>
              </tr>
            </table>
          </div>
        `;
      }
      
      printDiv.innerHTML = htmlContent;
      const canvas = await html2canvasIsolated(printDiv, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      const doc = new jsPDF('p', 'mm', 'a4');
      let position = 0;
      
      // Add first page
      doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Save PDF
      const filename = `TK1-TS-${formData.name.replace(/\s+/g, "-")}-${new Date().toISOString().split('T')[0]}.pdf`;
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
      const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
      const noBorders = {
        top: noBorder, bottom: noBorder, left: noBorder, right: noBorder,
        insideH: noBorder, insideV: noBorder
      };

      const dob = splitDateParts(formData.dateOfBirth);
      const idIssue = splitDateParts(formData.idIssueDate);
      const decl = splitDateParts(formData.declarationDate);

      // ===== Header 2 cột: Trái = BẢO HIỂM XÃ HỘI VIỆT NAM, Phải = Mẫu TK1-TS + Quốc hiệu =====
      const headerTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: noBorders,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: noBorders,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({ text: "BẢO HIỂM XÃ HỘI VIỆT NAM", bold: true, size: 26, underline: { type: UnderlineType.SINGLE } })
                    ],
                    spacing: { after: 120 }
                  })
                ]
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: noBorders,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: "Mẫu TK1-TS", bold: true, size: 24 })],
                    spacing: { after: 80 }
                  }),
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: "(Ban hành kèm theo QĐ số: 888/QĐ-BHXH", italics: true, size: 22 })],
                    spacing: { after: 40 }
                  }),
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: "ngày 16/7/2017 của BHXH Việt Nam)", italics: true, size: 22 })],
                    spacing: { after: 200 }
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: "CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM", bold: true, size: 24 })],
                    spacing: { after: 80 }
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({ text: "Độc lập - Tự do - Hạnh phúc", bold: true, size: 24, underline: { type: UnderlineType.SINGLE } })
                    ],
                    spacing: { after: 120 }
                  })
                ]
              })
            ]
          })
        ]
      });
      children.push(headerTable);

      // Tiêu đề chính
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "TỜ KHAI", bold: true, size: 32 })],
          spacing: { before: 280, after: 140 }
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "THAM GIA, ĐIỀU CHỈNH THÔNG TIN BẢO HIỂM XÃ HỘI, BẢO HIỂM Y TẾ", bold: true, size: 26 })],
          spacing: { after: 80 }
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "(Áp dụng đối với người tham gia chưa được cấp mã số BHXH và thay đổi thông tin)", italics: true, size: 22 })],
          spacing: { after: 300 }
        })
      );

      if (formType === "new") {
        // Phần I: Người chưa được cấp mã số BHXH
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: "I. Đối với người chưa được cấp mã số BHXH ", bold: true, size: 24 }),
              new TextRun({ text: "(người tham gia chỉ kê khai từ chỉ tiêu [01] đến chỉ tiêu [13] dưới đây).", italics: true, size: 22 })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[01]. ", bold: true }),
              new TextRun({ text: "Họ và tên " }),
              new TextRun({ text: "(viết chữ in hoa)", italics: true }),
              new TextRun({ text: ": " }),
              new TextRun({ text: formData.name || "……………………………………………", bold: true })
            ],
            spacing: { after: 160 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[02]. ", bold: true }),
              new TextRun({ text: "Ngày, tháng, năm sinh: " }),
              new TextRun({ text: `${dob.day || "……"}/${dob.month || "……"}/${dob.year || "………"}` }),
              new TextRun({ text: "     [03]. ", bold: true }),
              new TextRun({ text: "Giới tính: " }),
              new TextRun({ text: viGender(formData.gender) || "…………" })
            ],
            spacing: { after: 160 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[04]. ", bold: true }),
              new TextRun({ text: "Quốc tịch: " }),
              new TextRun({ text: viCountry(formData.nationalityName || formData.nationality) || "…………………" }),
              new TextRun({ text: "     [05]. ", bold: true }),
              new TextRun({ text: "Dân tộc: " }),
              new TextRun({ text: formData.ethnicity || "…………………" })
            ],
            spacing: { after: 160 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[06]. ", bold: true }),
              new TextRun({ text: "Nơi đăng ký giấy khai sinh: " }),
              new TextRun({ text: "[06.1]. ", bold: true }),
              new TextRun({ text: "Xã " }),
              new TextRun({ text: "(phường, thị trấn)", italics: true }),
              new TextRun({ text: ": " }),
              new TextRun({ text: formData.birthPlaceWard || "……………………………" })
            ],
            spacing: { after: 160 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[06.2]. ", bold: true }),
              new TextRun({ text: "Huyện " }),
              new TextRun({ text: "(quận, thị xã, Tp thuộc tỉnh)", italics: true }),
              new TextRun({ text: ": " }),
              new TextRun({ text: formData.birthPlaceDistrict || "………………" }),
              new TextRun({ text: "   [06.3]. ", bold: true }),
              new TextRun({ text: "Tỉnh " }),
              new TextRun({ text: "(Tp)", italics: true }),
              new TextRun({ text: ": " }),
              new TextRun({ text: formData.birthPlaceProvince || "………………" })
            ],
            spacing: { after: 160 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[07]. ", bold: true }),
              new TextRun({ text: "Địa chỉ nhận kết quả: " }),
              new TextRun({ text: "[07.1]. ", bold: true }),
              new TextRun({ text: "Số nhà, đường phố, thôn xóm: " }),
              new TextRun({ text: formData.addressStreet || "……………………………" })
            ],
            spacing: { after: 160 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[07.2]. ", bold: true }),
              new TextRun({ text: "Xã " }),
              new TextRun({ text: "(phường, thị trấn)", italics: true }),
              new TextRun({ text: ": " }),
              new TextRun({ text: formData.addressWard || "…………………" }),
              new TextRun({ text: "   [07.3]. ", bold: true }),
              new TextRun({ text: "Huyện " }),
              new TextRun({ text: "(quận, thị xã, Tp thuộc tỉnh)", italics: true }),
              new TextRun({ text: ": " }),
              new TextRun({ text: formData.addressDistrict || "………………" })
            ],
            spacing: { after: 160 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[07.4]. ", bold: true }),
              new TextRun({ text: "Tỉnh " }),
              new TextRun({ text: "(Tp)", italics: true }),
              new TextRun({ text: ": " }),
              new TextRun({ text: formData.addressProvince || "………………………………" })
            ],
            spacing: { after: 160 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[08]. ", bold: true }),
              new TextRun({ text: "Số CMND/ Hộ chiếu/ Thẻ căn cước: " }),
              new TextRun({ text: formData.idNumber || "…………………………" }),
              new TextRun({ text: "   [09]. ", bold: true }),
              new TextRun({ text: "Số điện thoại liên hệ: " }),
              new TextRun({ text: formData.phoneNumber || "……………………" })
            ],
            spacing: { after: (formData.idIssueDate || formData.idIssuePlace) ? 80 : 160 }
          })
        );

        if (formData.idIssueDate || formData.idIssuePlace) {
          children.push(
            new Paragraph({
              indent: { left: 400 },
              children: [
                new TextRun({
                  text: `Ngày cấp: ${idIssue.day || "……"}/${idIssue.month || "……"}/${idIssue.year || "………"}   Nơi cấp: ${formData.idIssuePlace || "……………………"}`,
                  italics: true
                })
              ],
              spacing: { after: 160 }
            })
          );
        }

        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: "[10]. ", bold: true }),
              new TextRun({ text: "Họ tên cha/ mẹ/ người giám hộ " }),
              new TextRun({ text: "(đối với trẻ em dưới 6 tuổi)", italics: true }),
              new TextRun({ text: ": " }),
              new TextRun({ text: formData.parentGuardianName || "………………………………" })
            ],
            spacing: { after: 160 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[11]. ", bold: true }),
              new TextRun({ text: "Mức tiền đóng: " }),
              new TextRun({ text: formData.contributionAmount || "…………………" }),
              new TextRun({ text: "   [12]. ", bold: true }),
              new TextRun({ text: "Phương thức đóng: " }),
              new TextRun({ text: formData.contributionMethod || "…………………" })
            ],
            spacing: { after: 80 }
          }),
          new Paragraph({
            children: [new TextRun({ text: "(Chỉ tiêu [11], [12] chỉ áp dụng đối với người tham gia BHXH tự nguyện)", italics: true, size: 22 })],
            spacing: { after: 160 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[13]. ", bold: true }),
              new TextRun({ text: "Nơi đăng ký khám bệnh, chữa bệnh ban đầu " }),
              new TextRun({ text: "(không áp dụng đối với người tham gia BHXH tự nguyện)", italics: true }),
              new TextRun({ text: ": " }),
              new TextRun({ text: formData.healthInsuranceProvider || "………………………………" })
            ],
            spacing: { after: 160 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[14]. ", bold: true }),
              new TextRun({ text: "Trường hợp người tham gia BHYT theo hộ gia đình được giảm trừ mức đóng thì kê khai thêm Phụ lục " }),
              new TextRun({ text: "(Phụ lục kèm theo)", italics: true }),
              new TextRun({ text: " và không phải nộp, xuất trình sổ hộ khẩu, chứng minh thư, thẻ căn cước." })
            ],
            spacing: { after: 200 }
          })
        );
      } else {
        // Phần II: Người đã có mã số BHXH
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: "II. Đối với người đã được cấp mã số BHXH thay đổi thông tin ghi trên sổ BHXH, thẻ BHYT ", bold: true, size: 24 }),
              new TextRun({ text: "(người tham gia chỉ kê khai từ chỉ tiêu [01] đến chỉ tiêu [05] dưới đây)", italics: true, size: 22 })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[01]. ", bold: true }),
              new TextRun({ text: "Họ và tên " }),
              new TextRun({ text: "(viết chữ in hoa)", italics: true }),
              new TextRun({ text: ": " }),
              new TextRun({ text: formData.name || "……………………………………………", bold: true })
            ],
            spacing: { after: 160 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[02]. ", bold: true }),
              new TextRun({ text: "Ngày, tháng, năm sinh: " }),
              new TextRun({ text: `${dob.day || "……"}/${dob.month || "……"}/${dob.year || "………"}` }),
              new TextRun({ text: "     [03]. ", bold: true }),
              new TextRun({ text: "Mã số BHXH: " }),
              new TextRun({ text: formData.socialInsuranceNumber || "………………………" })
            ],
            spacing: { after: 160 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[04]. ", bold: true }),
              new TextRun({ text: "Nội dung thay đổi, yêu cầu:" })
            ],
            spacing: { after: 120 }
          }),
          new Paragraph({
            indent: { left: 400 },
            children: [new TextRun({ text: formData.changeContent || "…………………………………………………………………………………" })],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[05]. ", bold: true }),
              new TextRun({ text: "Hồ sơ kèm theo " }),
              new TextRun({ text: "(nếu có)", italics: true }),
              new TextRun({ text: ":" })
            ],
            spacing: { after: 120 }
          }),
          new Paragraph({
            indent: { left: 400 },
            children: [new TextRun({ text: formData.attachedDocuments || "…………………………………………………………………………………" })],
            spacing: { after: 200 }
          })
        );
      }

      // Khu vực chữ ký: 2 cột (Xác nhận của đơn vị | Người kê khai)
      const signatureTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: noBorders,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: noBorders,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: "XÁC NHẬN CỦA ĐƠN VỊ", bold: true })],
                    spacing: { after: 80 }
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: "(chỉ áp dụng đối với người lao động đang tham gia BHXH bắt buộc thay đổi họ, tên đệm, tên; ngày, tháng, năm sinh)",
                        italics: true,
                        size: 20
                      })
                    ]
                  })
                ]
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: noBorders,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: "Tôi cam đoan những nội dung kê khai là đúng và chịu trách nhiệm trước pháp luật về những nội dung đã kê khai." })],
                    spacing: { after: 160 }
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: `${formData.declarationPlace || "…………"}, ngày ${decl.day || "……"} tháng ${decl.month || "……"} năm ${decl.year || "………"}`,
                        italics: true
                      })
                    ],
                    spacing: { after: 200 }
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: "Người kê khai", bold: true })],
                    spacing: { after: 80 }
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: "(Ký, ghi rõ họ tên)", italics: true })]
                  })
                ]
              })
            ]
          })
        ]
      });
      children.push(
        new Paragraph({ children: [new TextRun({ text: "" })], spacing: { before: 240 } }),
        signatureTable
      );

      // Phụ lục thành viên hộ gia đình (tiếng Việt)
      if (formData.householdMembers.length > 0) {
        children.push(
          new Paragraph({
            children: [new PageBreak()]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "PHỤ LỤC THÀNH VIÊN HỘ GIA ĐÌNH", bold: true, size: 28 })],
            spacing: { after: 80 }
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "(Kèm theo Tờ khai TK1-TS)", italics: true, size: 22 })],
            spacing: { after: 300 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Họ và tên chủ hộ: ", bold: true }),
              new TextRun({ text: formData.householdHeadName || "……………………………" }),
              new TextRun({ text: "     Số điện thoại ", bold: true }),
              new TextRun({ text: "(nếu có)", italics: true }),
              new TextRun({ text: ": ", bold: true }),
              new TextRun({ text: formData.householdHeadPhone || "………………" })
            ],
            spacing: { after: 160 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Địa chỉ: ", bold: true }),
              new TextRun({
                text: `${formData.householdAddressWard || "……"} - ${formData.householdAddressDistrict || "……"} - ${formData.householdAddressProvince || "……"}`
              })
            ],
            spacing: { after: 240 }
          })
        );

        // Helpers cho table phụ lục
        const thCell = (text) => new TableCell({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text, bold: true, size: 20 })]
          })],
          verticalAlign: "center"
        });
        const numCell = (text) => new TableCell({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text, italics: true, size: 18 })]
          })]
        });
        const tdCell = (text, { left = false } = {}) => new TableCell({
          children: [new Paragraph({
            alignment: left ? AlignmentType.LEFT : AlignmentType.CENTER,
            children: [new TextRun({ text: text || "", size: 20 })]
          })],
          verticalAlign: "center"
        });

        const tableRows = [
          new TableRow({
            tableHeader: true,
            children: [
              thCell("STT"),
              thCell("Họ và tên"),
              thCell("Mã số BHXH"),
              thCell("Ngày, tháng, năm sinh"),
              thCell("Giới tính"),
              thCell("Nơi đăng ký khai sinh"),
              thCell("Mối quan hệ với chủ hộ"),
              thCell("Số CMND/ Hộ chiếu/ Thẻ căn cước"),
              thCell("Ghi chú")
            ]
          }),
          new TableRow({
            tableHeader: true,
            children: Array.from({ length: 9 }, (_, i) => numCell(`(${i + 1})`))
          })
        ];

        formData.householdMembers.forEach((member, idx) => {
          tableRows.push(
            new TableRow({
              children: [
                tdCell(String(idx + 1)),
                tdCell(member.name, { left: true }),
                tdCell(member.socialInsuranceNumber),
                tdCell(formatDateDDMMYYYY(member.dateOfBirth) || member.dateOfBirth),
                tdCell(viGender(member.gender)),
                tdCell(member.birthPlace, { left: true }),
                tdCell(member.relationship),
                tdCell(member.idNumber),
                tdCell(member.note, { left: true })
              ]
            })
          );
        });

        children.push(
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE }
          })
        );

        // Signature block for appendix
        const appendixSignature = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: noBorders,
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: noBorders,
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: "XÁC NHẬN CỦA ĐƠN VỊ", bold: true })],
                      spacing: { after: 80 }
                    }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: "(nếu có)", italics: true, size: 20 })]
                    })
                  ]
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: noBorders,
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: "Tôi cam đoan những nội dung kê khai là đúng và chịu trách nhiệm trước pháp luật về những nội dung đã kê khai." })],
                      spacing: { after: 160 }
                    }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: `${formData.declarationPlace || "…………"}, ngày ${decl.day || "……"} tháng ${decl.month || "……"} năm ${decl.year || "………"}`,
                          italics: true
                        })
                      ],
                      spacing: { after: 200 }
                    }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: "Người kê khai", bold: true })],
                      spacing: { after: 80 }
                    }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: "(Ký, ghi rõ họ tên)", italics: true })]
                    })
                  ]
                })
              ]
            })
          ]
        });
        children.push(
          new Paragraph({ children: [new TextRun({ text: "" })], spacing: { before: 240 } }),
          appendixSignature
        );
      }

      // Create document with Times New Roman default font
      const doc = new Document({
        styles: {
          default: {
            document: {
              run: { font: "Times New Roman", size: 24 }
            }
          }
        },
        sections: [{
          properties: {
            page: {
              margin: { top: "2cm", right: "1.8cm", bottom: "2cm", left: "2.2cm" }
            }
          },
          children: children
        }]
      });

      // Generate and save
      const blob = await Packer.toBlob(doc);
      const filename = `TK1-TS-${formData.name.replace(/\s+/g, "-")}-${new Date().toISOString().split('T')[0]}.docx`;
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
    maxWidth: "1200px",
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

  const readOnlyInputStyle = {
    ...inputStyle,
    backgroundColor: theme.neutral.gray100,
    cursor: "not-allowed",
    color: theme.neutral.gray600
  };

  const isSuccessMessage =
    typeof message === "string" &&
    (message.trim().startsWith("✅") || /successfully/i.test(message));

  return (
    <div style={containerStyle}>
      <h2 style={{ marginBottom: theme.spacing.lg, color: theme.neutral.gray900 }}>
        📋 Social &amp; health insurance participation declaration (Form TK1-TS)
      </h2>

      {/* Employee Selection */}
      <div style={formSectionStyle}>
        <label style={labelStyle}>Employee:</label>
        <select
          style={inputStyle}
          value={selectedEmployee?.id || ""}
          onChange={(e) => {
            const emp = employees.find(em => em.id === parseInt(e.target.value));
            setSelectedEmployee(emp || null);
          }}
        >
          <option value="">-- Select employee --</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>
              {emp.employeeCode} - {emp.name}
            </option>
          ))}
        </select>
      </div>

      {/* Form Type Selection */}
      <div style={formSectionStyle}>
        <label style={labelStyle}>Declaration type:</label>
        <div style={{ display: "flex", gap: theme.spacing.md }}>
          <button
            style={{
              ...buttonStyle,
              backgroundColor: formType === "new" ? theme.primary.main : theme.neutral.gray300,
              color: formType === "new" ? theme.neutral.white : theme.neutral.gray700
            }}
            onClick={() => setFormType("new")}
          >
            I. No Social Insurance number yet
          </button>
          <button
            style={{
              ...buttonStyle,
              backgroundColor: formType === "update" ? theme.primary.main : theme.neutral.gray300,
              color: formType === "update" ? theme.neutral.white : theme.neutral.gray700
            }}
            onClick={() => setFormType("update")}
          >
            II. Has Social Insurance number (information change)
          </button>
        </div>
      </div>

      {formType === "new" ? (
        <>
          {/* Phần I: Người chưa có mã số BHXH */}
          <div style={formSectionStyle}>
            <h3 style={{ marginBottom: theme.spacing.md, color: theme.primary.main }}>
              I. For participants without a Social Insurance number
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
              <div>
                <label style={labelStyle}>[01] Full name (UPPERCASE): *</label>
                <input
                  type="text"
                  style={selectedEmployee
                    ? { ...readOnlyInputStyle, ...(fieldErrors.name && { borderColor: "#dc2626" }) }
                    : { ...inputStyle, ...(fieldErrors.name && { borderColor: "#dc2626" }) }
                  }
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value.toUpperCase())}
                  placeholder="NGUYEN VAN A"
                  readOnly={!!selectedEmployee}
                />
              </div>
              <div>
                <label style={labelStyle}>[02] Date of birth: *</label>
                <input
                  type="date"
                  style={selectedEmployee
                    ? { ...readOnlyInputStyle, ...(fieldErrors.dateOfBirth && { borderColor: "#dc2626" }) }
                    : { ...inputStyle, ...(fieldErrors.dateOfBirth && { borderColor: "#dc2626" }) }
                  }
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                  readOnly={!!selectedEmployee}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
              <div>
                <label style={labelStyle}>[03] Gender: *</label>
                <select
                  style={selectedEmployee
                    ? { ...readOnlyInputStyle, ...(fieldErrors.gender && { borderColor: "#dc2626" }) }
                    : { ...inputStyle, ...(fieldErrors.gender && { borderColor: "#dc2626" }) }
                  }
                  value={formData.gender}
                  onChange={(e) => handleInputChange("gender", e.target.value)}
                  disabled={!!selectedEmployee}
                >
                  <option value="">-- Select --</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>[04] Nationality:</label>
                <select
                  style={inputStyle}
                  value={formData.nationality}
                  onChange={(e) => {
                    const country = countries.find(c => c.code === e.target.value);
                    handleInputChange("nationality", e.target.value);
                    handleInputChange("nationalityName", country?.name || "");
                  }}
                >
                  <option value="">-- Select country --</option>
                  {countries.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: theme.spacing.md }}>
              <label style={labelStyle}>[05] Ethnicity:</label>
              <input
                type="text"
                style={inputStyle}
                value={formData.ethnicity}
                onChange={(e) => handleInputChange("ethnicity", e.target.value)}
              />
            </div>

            <div style={{ marginBottom: theme.spacing.md }}>
              <label style={labelStyle}>[06] Birth certificate registration place:</label>
              <div style={{ marginBottom: theme.spacing.sm }}>
                <label style={{ ...labelStyle, fontSize: "11px" }}>Country:</label>
                <select
                  style={inputStyle}
                  value={formData.birthPlaceCountry}
                  onChange={(e) => {
                    const country = countries.find(c => c.code === e.target.value);
                    handleInputChange("birthPlaceCountry", e.target.value);
                    handleInputChange("birthPlaceCountryName", country?.name || "");
                    if (e.target.value !== "VN") {
                      handleInputChange("birthPlaceProvince", "");
                      handleInputChange("birthPlaceProvinceCode", "");
                    }
                  }}
                >
                  <option value="">-- Select country --</option>
                  {countries.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
              {formData.birthPlaceCountry === "VN" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: theme.spacing.md }}>
                  <div>
                    <label style={{ ...labelStyle, fontSize: "11px" }}>[06.1] Hamlet:</label>
                    <input
                      type="text"
                      style={inputStyle}
                      value={formData.birthPlaceWard}
                      onChange={(e) => handleInputChange("birthPlaceWard", e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: "11px" }}>[06.2] Commune:</label>
                    <input
                      type="text"
                      style={inputStyle}
                      value={formData.birthPlaceDistrict}
                      onChange={(e) => handleInputChange("birthPlaceDistrict", e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: "11px" }}>[06.3] Province/City:</label>
                    <select
                      style={inputStyle}
                      value={formData.birthPlaceProvinceCode}
                      onChange={(e) => {
                        const province = vietnamProvinces.find(p => p.code === e.target.value);
                        handleInputChange("birthPlaceProvinceCode", e.target.value);
                        handleInputChange("birthPlaceProvince", province?.name || "");
                      }}
                    >
                      <option value="">-- Select province/city --</option>
                      {vietnamProvinces.map(province => (
                        <option key={province.code} value={province.code}>
                          {province.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              {formData.birthPlaceCountry !== "VN" && formData.birthPlaceCountry && (
                <div>
                  <label style={{ ...labelStyle, fontSize: "11px" }}>Province/City:</label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={formData.birthPlaceProvince}
                    onChange={(e) => handleInputChange("birthPlaceProvince", e.target.value)}
                    placeholder="Enter province/city"
                  />
                </div>
              )}
            </div>

            <div style={{ marginBottom: theme.spacing.md }}>
              <label style={labelStyle}>[07] Address to receive results:</label>
              <div style={{ marginBottom: theme.spacing.sm }}>
                <label style={{ ...labelStyle, fontSize: "11px" }}>Country:</label>
                <select
                  style={inputStyle}
                  value={formData.addressCountry}
                  onChange={(e) => {
                    const country = countries.find(c => c.code === e.target.value);
                    handleInputChange("addressCountry", e.target.value);
                    handleInputChange("addressCountryName", country?.name || "");
                    if (e.target.value !== "VN") {
                      handleInputChange("addressProvince", "");
                      handleInputChange("addressProvinceCode", "");
                    }
                  }}
                >
                  <option value="">-- Select country --</option>
                  {countries.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
              {formData.addressCountry === "VN" && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md, marginBottom: theme.spacing.sm }}>
                    <div>
                      <label style={{ ...labelStyle, fontSize: "11px" }}>[07.1] House no./Street/Hamlet:</label>
                      <input
                        type="text"
                      style={{ ...inputStyle, ...(fieldErrors.addressStreet && { borderColor: "#dc2626" }) }}
                        value={formData.addressStreet}
                        onChange={(e) => handleInputChange("addressStreet", e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: "11px" }}>[07.2] Hamlet:</label>
                      <input
                        type="text"
                      style={{ ...inputStyle, ...(fieldErrors.addressWard && { borderColor: "#dc2626" }) }}
                        value={formData.addressWard}
                        onChange={(e) => handleInputChange("addressWard", e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md }}>
                  <div>
                    <label style={{ ...labelStyle, fontSize: "11px" }}>[07.3] Commune:</label>
                      <input
                        type="text"
                      style={{ ...inputStyle, ...(fieldErrors.addressDistrict && { borderColor: "#dc2626" }) }}
                        value={formData.addressDistrict}
                        onChange={(e) => handleInputChange("addressDistrict", e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: "11px" }}>[07.4] Province/City:</label>
                      <select
                      style={{ ...inputStyle, ...(fieldErrors.addressProvince && { borderColor: "#dc2626" }) }}
                        value={formData.addressProvinceCode}
                        onChange={(e) => {
                          const province = vietnamProvinces.find(p => p.code === e.target.value);
                          handleInputChange("addressProvinceCode", e.target.value);
                          handleInputChange("addressProvince", province?.name || "");
                      }}
                      >
                        <option value="">-- Select province/city --</option>
                        {vietnamProvinces.map(province => (
                          <option key={province.code} value={province.code}>
                            {province.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}
              {formData.addressCountry !== "VN" && formData.addressCountry && (
                <div>
                  <label style={{ ...labelStyle, fontSize: "11px" }}>Address:</label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={formData.addressStreet}
                    onChange={(e) => handleInputChange("addressStreet", e.target.value)}
                    placeholder="Enter full address"
                  />
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
              <div>
                <label style={labelStyle}>[08] ID card / passport (CCCD / national ID / passport):</label>
                <input
                  type="text"
                  style={selectedEmployee ? readOnlyInputStyle : inputStyle}
                  value={formData.idNumber}
                  onChange={(e) => handleInputChange("idNumber", e.target.value)}
                  readOnly={!!selectedEmployee}
                />
              </div>
              <div>
                <label style={labelStyle}>[09] Phone number:</label>
                <input
                  type="text"
                  style={selectedEmployee ? readOnlyInputStyle : inputStyle}
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                  readOnly={!!selectedEmployee}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
              <div>
                <label style={labelStyle}>[08.1] Date issued:</label>
                <input
                  type="date"
                  style={selectedEmployee ? readOnlyInputStyle : inputStyle}
                  value={formData.idIssueDate}
                  onChange={(e) => handleInputChange("idIssueDate", e.target.value)}
                  readOnly={!!selectedEmployee}
                />
              </div>
              <div>
                <label style={labelStyle}>[08.2] Place issued:</label>
                <input
                  type="text"
                  style={selectedEmployee ? readOnlyInputStyle : inputStyle}
                  value={formData.idIssuePlace}
                  onChange={(e) => handleInputChange("idIssuePlace", e.target.value)}
                  readOnly={!!selectedEmployee}
                />
              </div>
            </div>

            <div style={{ marginBottom: theme.spacing.md }}>
              <label style={labelStyle}>[10] Parent/guardian name (for children under 6):</label>
              <input
                type="text"
                style={inputStyle}
                value={formData.parentGuardianName}
                onChange={(e) => handleInputChange("parentGuardianName", e.target.value)}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
              <div>
                <label style={labelStyle}>[11] Contribution amount (voluntary SI):</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={formData.contributionAmount}
                  onChange={(e) => handleInputChange("contributionAmount", e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>[12] Contribution method:</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={formData.contributionMethod}
                  onChange={(e) => handleInputChange("contributionMethod", e.target.value)}
                  placeholder="3 months, 6 months, 12 months..."
                />
              </div>
            </div>

            <div style={{ marginBottom: theme.spacing.md }}>
              <label style={labelStyle}>[13] Initial health care provider:</label>
              <input
                type="text"
                style={inputStyle}
                value={formData.healthInsuranceProvider}
                onChange={(e) => handleInputChange("healthInsuranceProvider", e.target.value)}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Phần II: Người đã có mã số BHXH */}
          <div style={formSectionStyle}>
            <h3 style={{ marginBottom: theme.spacing.md, color: theme.primary.main }}>
              II. For participants with a Social Insurance number (information change)
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
              <div>
                <label style={labelStyle}>[01] Full name (UPPERCASE): *</label>
                <input
                  type="text"
                  style={selectedEmployee
                    ? { ...readOnlyInputStyle, ...(fieldErrors.name && { borderColor: "#dc2626" }) }
                    : { ...inputStyle, ...(fieldErrors.name && { borderColor: "#dc2626" }) }
                  }
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value.toUpperCase())}
                  readOnly={!!selectedEmployee}
                />
              </div>
              <div>
                <label style={labelStyle}>[02] Date of birth: *</label>
                <input
                  type="date"
                  style={selectedEmployee
                    ? { ...readOnlyInputStyle, ...(fieldErrors.dateOfBirth && { borderColor: "#dc2626" }) }
                    : { ...inputStyle, ...(fieldErrors.dateOfBirth && { borderColor: "#dc2626" }) }
                  }
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                  readOnly={!!selectedEmployee}
                />
              </div>
            </div>

            <div style={{ marginBottom: theme.spacing.md }}>
              <label style={labelStyle}>[03] Social Insurance number: *</label>
              <input
                type="text"
                style={selectedEmployee
                  ? { ...readOnlyInputStyle, ...(fieldErrors.socialInsuranceNumber && { borderColor: "#dc2626" }) }
                  : { ...inputStyle, ...(fieldErrors.socialInsuranceNumber && { borderColor: "#dc2626" }) }
                }
                value={formData.socialInsuranceNumber}
                onChange={(e) => handleInputChange("socialInsuranceNumber", e.target.value)}
                readOnly={!!selectedEmployee}
              />
            </div>

            <div style={{ marginBottom: theme.spacing.md }}>
              <label style={labelStyle}>[04] Requested changes: *</label>
              <textarea
                style={{
                  ...inputStyle,
                  minHeight: "100px",
                  ...(fieldErrors.changeContent && { borderColor: "#dc2626" })
                }}
                value={formData.changeContent}
                onChange={(e) => handleInputChange("changeContent", e.target.value)}
                placeholder="Describe the requested changes..."
              />
            </div>

            <div style={{ marginBottom: theme.spacing.md }}>
              <label style={labelStyle}>[05] Supporting documents (if any):</label>
              <textarea
                style={{ ...inputStyle, minHeight: "80px" }}
                value={formData.attachedDocuments}
                onChange={(e) => handleInputChange("attachedDocuments", e.target.value)}
                placeholder="List attached documents..."
              />
            </div>
          </div>
        </>
      )}

      {/* Ngày tháng địa điểm kê khai */}
      <div style={formSectionStyle}>
        <h3 style={{ marginBottom: theme.spacing.md, color: theme.primary.main }}>
          Declaration details
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md }}>
          <div>
            <label style={labelStyle}>Declaration place:</label>
            <input
              type="text"
              style={inputStyle}
              value={formData.declarationPlace}
              onChange={(e) => handleInputChange("declarationPlace", e.target.value)}
              placeholder="e.g. Ho Chi Minh City"
            />
          </div>
          <div>
            <label style={labelStyle}>Declaration date:</label>
            <input
              type="date"
              style={inputStyle}
              value={formData.declarationDate}
              onChange={(e) => handleInputChange("declarationDate", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Phụ lục: Thành viên hộ gia đình */}
      <div style={formSectionStyle}>
        <h3 style={{ marginBottom: theme.spacing.md, color: theme.primary.main }}>
          Appendix: Household members (if any)
        </h3>

        <div style={{ marginBottom: theme.spacing.md }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
            <div>
              <label style={labelStyle}>Household head full name:</label>
              <input
                type="text"
                style={selectedEmployee ? readOnlyInputStyle : inputStyle}
                value={formData.householdHeadName}
                onChange={(e) => handleInputChange("householdHeadName", e.target.value)}
                readOnly={!!selectedEmployee}
              />
            </div>
            <div>
              <label style={labelStyle}>Phone number (optional):</label>
              <input
                type="text"
                style={selectedEmployee ? readOnlyInputStyle : inputStyle}
                value={formData.householdHeadPhone}
                onChange={(e) => handleInputChange("householdHeadPhone", e.target.value)}
                readOnly={!!selectedEmployee}
              />
            </div>
          </div>

          <div style={{ marginBottom: theme.spacing.sm }}>
            <label style={labelStyle}>Country:</label>
            <select
              style={inputStyle}
              value={formData.householdAddressCountry}
              onChange={(e) => {
                const country = countries.find(c => c.code === e.target.value);
                handleInputChange("householdAddressCountry", e.target.value);
                handleInputChange("householdAddressCountryName", country?.name || "");
                if (e.target.value !== "VN") {
                  handleInputChange("householdAddressProvince", "");
                  handleInputChange("householdAddressProvinceCode", "");
                }
              }}
            >
              <option value="">-- Select country --</option>
              {countries.map(country => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
          {formData.householdAddressCountry === "VN" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
              <div>
                <label style={labelStyle}>Hamlet:</label>
                <input
                  type="text"
                  style={selectedEmployee ? readOnlyInputStyle : inputStyle}
                  value={formData.householdAddressWard}
                  onChange={(e) => handleInputChange("householdAddressWard", e.target.value)}
                  readOnly={!!selectedEmployee}
                />
              </div>
              <div>
                <label style={labelStyle}>Commune:</label>
                <input
                  type="text"
                  style={selectedEmployee ? readOnlyInputStyle : inputStyle}
                  value={formData.householdAddressDistrict}
                  onChange={(e) => handleInputChange("householdAddressDistrict", e.target.value)}
                  readOnly={!!selectedEmployee}
                />
              </div>
              <div>
                <label style={labelStyle}>Province/City:</label>
                <select
                  style={selectedEmployee ? readOnlyInputStyle : inputStyle}
                  value={formData.householdAddressProvinceCode}
                  onChange={(e) => {
                    const province = vietnamProvinces.find(p => p.code === e.target.value);
                    handleInputChange("householdAddressProvinceCode", e.target.value);
                    handleInputChange("householdAddressProvince", province?.name || "");
                  }}
                  disabled={!!selectedEmployee}
                >
                  <option value="">-- Select province/city --</option>
                  {vietnamProvinces.map(province => (
                    <option key={province.code} value={province.code}>
                      {province.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {formData.householdAddressCountry !== "VN" && formData.householdAddressCountry && (
            <div>
              <label style={labelStyle}>Address:</label>
              <input
                type="text"
                style={inputStyle}
                value={formData.householdAddressWard}
                onChange={(e) => handleInputChange("householdAddressWard", e.target.value)}
                placeholder="Enter full address"
              />
            </div>
          )}
        </div>

        {/* Add household member form */}
        <div style={{ ...formSectionStyle, backgroundColor: theme.neutral.white, marginBottom: theme.spacing.md }}>
          <h4 style={{ marginBottom: theme.spacing.md }}>Add household member:</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
            <div>
              <label style={labelStyle}>Full name: *</label>
              <input
                type="text"
                style={inputStyle}
                value={householdMember.name}
                onChange={(e) => setHouseholdMember({ ...householdMember, name: e.target.value })}
              />
            </div>
            <div>
              <label style={labelStyle}>Social Insurance No.:</label>
              <input
                type="text"
                style={inputStyle}
                value={householdMember.socialInsuranceNumber}
                onChange={(e) => setHouseholdMember({ ...householdMember, socialInsuranceNumber: e.target.value })}
              />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
            <div>
              <label style={labelStyle}>Date of birth:</label>
              <input
                type="date"
                style={inputStyle}
                value={householdMember.dateOfBirth}
                onChange={(e) => setHouseholdMember({ ...householdMember, dateOfBirth: e.target.value })}
              />
            </div>
            <div>
              <label style={labelStyle}>Gender:</label>
              <select
                style={inputStyle}
                value={householdMember.gender}
                onChange={(e) => setHouseholdMember({ ...householdMember, gender: e.target.value })}
              >
                <option value="">-- Select --</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
            <div>
              <label style={labelStyle}>Birth certificate place:</label>
              <input
                type="text"
                style={inputStyle}
                value={householdMember.birthPlace}
                onChange={(e) => setHouseholdMember({ ...householdMember, birthPlace: e.target.value })}
              />
            </div>
            <div>
              <label style={labelStyle}>Relationship to household head:</label>
              <input
                type="text"
                style={inputStyle}
                value={householdMember.relationship}
                onChange={(e) => setHouseholdMember({ ...householdMember, relationship: e.target.value })}
                placeholder="Spouse, child, ..."
              />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
            <div>
              <label style={labelStyle}>ID/Passport/Citizen ID:</label>
              <input
                type="text"
                style={inputStyle}
                value={householdMember.idNumber}
                onChange={(e) => setHouseholdMember({ ...householdMember, idNumber: e.target.value })}
              />
            </div>
            <div>
              <label style={labelStyle}>Notes:</label>
              <input
                type="text"
                style={inputStyle}
                value={householdMember.note}
                onChange={(e) => setHouseholdMember({ ...householdMember, note: e.target.value })}
              />
            </div>
          </div>
          <button
            style={buttonStyle}
            onClick={addHouseholdMember}
          >
            ➕ Add member
          </button>
        </div>

        {/* List of household members */}
        {formData.householdMembers.length > 0 && (
          <div style={{ marginTop: theme.spacing.md }}>
            <h4 style={{ marginBottom: theme.spacing.md }}>Added members:</h4>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: theme.typography.small.fontSize }}>
              <thead>
                <tr style={{ backgroundColor: theme.primary.main, color: theme.neutral.white }}>
                  <th style={{ padding: theme.spacing.sm, border: "1px solid #ddd", textAlign: "left" }}>No.</th>
                  <th style={{ padding: theme.spacing.sm, border: "1px solid #ddd", textAlign: "left" }}>Full name</th>
                  <th style={{ padding: theme.spacing.sm, border: "1px solid #ddd", textAlign: "left" }}>Social Insurance No.</th>
                  <th style={{ padding: theme.spacing.sm, border: "1px solid #ddd", textAlign: "left" }}>Date of birth</th>
                  <th style={{ padding: theme.spacing.sm, border: "1px solid #ddd", textAlign: "left" }}>Gender</th>
                  <th style={{ padding: theme.spacing.sm, border: "1px solid #ddd", textAlign: "left" }}>Relationship</th>
                  <th style={{ padding: theme.spacing.sm, border: "1px solid #ddd", textAlign: "left" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {formData.householdMembers.map((member, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: theme.spacing.sm, border: "1px solid #ddd" }}>{idx + 1}</td>
                    <td style={{ padding: theme.spacing.sm, border: "1px solid #ddd" }}>{member.name}</td>
                    <td style={{ padding: theme.spacing.sm, border: "1px solid #ddd" }}>{member.socialInsuranceNumber || "-"}</td>
                    <td style={{ padding: theme.spacing.sm, border: "1px solid #ddd" }}>{member.dateOfBirth || "-"}</td>
                    <td style={{ padding: theme.spacing.sm, border: "1px solid #ddd" }}>{member.gender || "-"}</td>
                    <td style={{ padding: theme.spacing.sm, border: "1px solid #ddd" }}>{member.relationship || "-"}</td>
                    <td style={{ padding: theme.spacing.sm, border: "1px solid #ddd" }}>
                      <button
                        onClick={() => removeHouseholdMember(idx)}
                        style={{
                          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                          backgroundColor: theme.error.main,
                          color: theme.neutral.white,
                          border: "none",
                          borderRadius: theme.radius.sm,
                          cursor: "pointer",
                          fontSize: theme.typography.small.fontSize
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: theme.spacing.md, marginTop: theme.spacing.xl }}>
        <button
          style={{
            ...buttonStyle,
            backgroundColor: loading ? theme.neutral.gray400 : theme.primary.dark,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1
          }}
          onClick={saveFormData}
          disabled={loading || loadingWord || !selectedEmployee}
        >
          {loading ? "⏳ Saving..." : "💾 Save"}
        </button>
        <button
          style={{
            ...buttonStyle,
            backgroundColor: loadingWord ? theme.neutral.gray400 : theme.primary.main,
            cursor: loadingWord ? "not-allowed" : "pointer",
            opacity: loadingWord ? 0.7 : 1
          }}
          onClick={exportToWord}
          disabled={loadingWord || loading}
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
          disabled={loading || loadingWord}
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

