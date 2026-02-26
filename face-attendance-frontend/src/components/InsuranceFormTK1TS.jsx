import React, { useState, useEffect } from "react";
import { theme } from "../styles/theme.js";
import jsPDF from "jspdf";
import "jspdf-autotable";
import html2canvas from "html2canvas";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } from "docx";
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
  householdMembers: []
};

export default function InsuranceFormTK1TS() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingWord, setLoadingWord] = useState(false);
  const [formType, setFormType] = useState("new"); // "new" or "update"
  const [message, setMessage] = useState("");
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
          setFormData(prev => ({
            ...prev,
            ...data.data.formData
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

    if (formType === "new") {
      if (!formData.name.trim()) {
        missing.push("[01] Full name");
      }
      if (!formData.dateOfBirth.trim()) {
        missing.push("[02] Date of birth");
      } else {
        // Expect DD/MM/YYYY for the "new" declaration type
        const datePattern = /^\d{2}\/\d{2}\/\d{4}$/;
        if (!datePattern.test(formData.dateOfBirth.trim())) {
          setMessage("Please enter date of birth in DD/MM/YYYY format.");
          return false;
        }
      }
      if (!formData.gender) {
        missing.push("[03] Gender");
      }
      if (!formData.addressStreet.trim() ||
          !formData.addressWard.trim() ||
          !formData.addressDistrict.trim() ||
          !formData.addressProvince.trim()) {
        missing.push("[07] Address to receive results");
      }
    } else {
      // update mode (has SI number)
      if (!formData.name.trim()) {
        missing.push("[01] Full name");
      }
      if (!formData.dateOfBirth) {
        missing.push("[02] Date of birth");
      }
      if (!formData.socialInsuranceNumber.trim()) {
        missing.push("[03] Social Insurance number");
      }
      if (!formData.changeContent.trim()) {
        missing.push("[04] Requested changes");
      }
    }

    if (missing.length > 0) {
      setMessage("Please fill all required fields: " + missing.join(", "));
      return false;
    }

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

        // Parse address
        const parseAddress = (address) => {
          if (!address) return { street: "", ward: "", district: "", province: "" };
          // Simple parsing - can be improved
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

        // Khi đổi nhân viên, luôn reset form về mặc định rồi mới fill dữ liệu nhân viên.
        // Những field không có dữ liệu sẽ tự động để trống.
        setFormData(() => ({
          ...initialFormData,
          name: (emp.name || "").toUpperCase(),
          // Hiển thị theo đúng thứ tự ngày/tháng/năm
          // - Mode "new": dùng định dạng DD/MM/YYYY cho input text
          // - Mode "update": dùng YYYY-MM-DD cho input type="date"
          dateOfBirth: emp.dateOfBirth
            ? (formType === "new"
              ? formatDateDDMMYYYY(emp.dateOfBirth)
              : new Date(emp.dateOfBirth).toISOString().split("T")[0])
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
          householdAddressWard: "",
          householdAddressDistrict: "",
          householdAddressProvince: "",
          householdAddressProvinceCode: "",
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

  const exportToPDF = async () => {
    try {
      setLoading(true);
      setMessage("Generating PDF...");
      
      // Tạo hidden div để render
      const printDiv = document.createElement('div');
      printDiv.style.position = 'absolute';
      printDiv.style.left = '-9999px';
      printDiv.style.width = '210mm'; // A4 width
      printDiv.style.padding = '20mm';
      printDiv.style.fontFamily = 'Arial, sans-serif';
      printDiv.style.fontSize = '11pt';
      printDiv.style.backgroundColor = 'white';
      printDiv.style.color = 'black';
      
      // Build HTML content
      let htmlContent = `
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 14pt; font-weight: bold; margin-bottom: 5px;">VIETNAM SOCIAL SECURITY</div>
          <div style="font-size: 11pt; margin-bottom: 3px;">SOCIALIST REPUBLIC OF VIETNAM</div>
          <div style="font-size: 10pt;">Independence - Freedom - Happiness</div>
        </div>
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 12pt; font-weight: bold; margin-bottom: 5px;">DECLARATION</div>
          <div style="font-size: 10pt; margin-bottom: 3px;">SOCIAL INSURANCE &amp; HEALTH INSURANCE PARTICIPATION / INFORMATION UPDATE</div>
          <div style="font-size: 9pt;">(For participants who have not been issued a social insurance number and for information changes)</div>
        </div>
      `;
      
      if (formType === "new") {
        htmlContent += `
          <div style="margin-bottom: 15px;">
            <div style="font-weight: bold; margin-bottom: 10px;">I. For participants without a Social Insurance number</div>
            <div style="margin-bottom: 8px;"><strong>[01].</strong> Full name (UPPERCASE): <strong>${formData.name || "_________________"}</strong></div>
            <div style="margin-bottom: 8px;"><strong>[02].</strong> Date of birth: ${formData.dateOfBirth || "___/___/_____"} <strong>[03].</strong> Gender: ${formData.gender || "_____"}</div>
            <div style="margin-bottom: 8px;"><strong>[04].</strong> Nationality: ${formData.nationality || "_____"} <strong>[05].</strong> Ethnicity: ${formData.ethnicity || "_____"}</div>
            <div style="margin-bottom: 8px;"><strong>[06].</strong> Birth certificate registration place:</div>
            <div style="margin-left: 20px; margin-bottom: 5px;"><strong>[06.1].</strong> Ward/Commune/Township: ${formData.birthPlaceWard || "_____"}</div>
            <div style="margin-left: 20px; margin-bottom: 5px;"><strong>[06.2].</strong> District: ${formData.birthPlaceDistrict || "_____"}</div>
            <div style="margin-left: 20px; margin-bottom: 8px;"><strong>[06.3].</strong> Province/City: ${formData.birthPlaceProvince || "_____"}</div>
            <div style="margin-bottom: 8px;"><strong>[07].</strong> Address to receive results:</div>
            <div style="margin-left: 20px; margin-bottom: 5px;"><strong>[07.1].</strong> House no./Street/Hamlet: ${formData.addressStreet || "_____"}</div>
            <div style="margin-left: 20px; margin-bottom: 5px;"><strong>[07.2].</strong> Ward/Commune/Township: ${formData.addressWard || "_____"}</div>
            <div style="margin-left: 20px; margin-bottom: 5px;"><strong>[07.3].</strong> District: ${formData.addressDistrict || "_____"}</div>
            <div style="margin-left: 20px; margin-bottom: 8px;"><strong>[07.4].</strong> Province/City: ${formData.addressProvince || "_____"}</div>
            <div style="margin-bottom: 8px;"><strong>[08].</strong> ID/Passport/Citizen ID: ${formData.idNumber || "_____"} <strong>[09].</strong> Phone number: ${formData.phoneNumber || "_____"}</div>
            <div style="margin-bottom: 8px;"><strong>[10].</strong> Parent/guardian name (for children under 6): ${formData.parentGuardianName || "_____"}</div>
            <div style="margin-bottom: 8px;"><strong>[11].</strong> Contribution amount: ${formData.contributionAmount || "_____"} <strong>[12].</strong> Contribution method: ${formData.contributionMethod || "_____"}</div>
            <div style="margin-bottom: 8px;"><strong>[13].</strong> Initial health care provider: ${formData.healthInsuranceProvider || "_____"}</div>
            ${formData.householdMembers.length > 0 ? '<div style="margin-bottom: 8px;"><strong>[14].</strong> Appendix: household members (see next page)</div>' : ''}
          </div>
        `;
      } else {
        htmlContent += `
          <div style="margin-bottom: 15px;">
            <div style="font-weight: bold; margin-bottom: 10px;">II. For participants with a Social Insurance number (information change)</div>
            <div style="margin-bottom: 8px;"><strong>[01].</strong> Full name (UPPERCASE): <strong>${formData.name || "_________________"}</strong></div>
            <div style="margin-bottom: 8px;"><strong>[02].</strong> Date of birth: ${formData.dateOfBirth || "___/___/_____"} <strong>[03].</strong> Social Insurance number: ${formData.socialInsuranceNumber || "_____"}</div>
            <div style="margin-bottom: 8px;"><strong>[04].</strong> Requested changes:</div>
            <div style="margin-left: 20px; margin-bottom: 8px; white-space: pre-wrap;">${formData.changeContent || "_____"}</div>
            <div style="margin-bottom: 8px;"><strong>[05].</strong> Attached documents (if any):</div>
            <div style="margin-left: 20px; margin-bottom: 8px; white-space: pre-wrap;">${formData.attachedDocuments || "_____"}</div>
          </div>
        `;
      }
      
      htmlContent += `
        <div style="margin-top: 30px; margin-bottom: 20px;">
          <div style="margin-bottom: 15px;">I hereby declare that the above information is true and I take full legal responsibility for this declaration.</div>
          <div style="text-align: right; margin-top: 20px;">
            <div>.........., ....... / ....... / ...........</div>
            <div style="margin-top: 15px;">Declarant</div>
            <div style="margin-top: 5px;">(Signature &amp; full name)</div>
          </div>
        </div>
      `;
      
      // Phụ lục thành viên hộ gia đình
      if (formData.householdMembers.length > 0) {
        htmlContent += `
          <div style="page-break-before: always; margin-top: 30px;">
            <div style="text-align: center; font-size: 12pt; font-weight: bold; margin-bottom: 20px;">APPENDIX: HOUSEHOLD MEMBERS</div>
            <div style="margin-bottom: 15px;">
              <div><strong>Household head full name:</strong> ${formData.householdHeadName || "_____"} <strong>Phone (optional):</strong> ${formData.householdHeadPhone || "_____"}</div>
              <div style="margin-top: 10px;"><strong>Address:</strong></div>
              <div style="margin-left: 20px;">
                <div><strong>Hamlet/Residential group:</strong> ${formData.householdAddressWard || "_____"} <strong>Ward/Commune/Township:</strong> ${formData.householdAddressWard || "_____"}</div>
                <div><strong>District:</strong> ${formData.householdAddressDistrict || "_____"} <strong>Province/City:</strong> ${formData.householdAddressProvince || "_____"}</div>
              </div>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 9pt;">
              <thead>
                <tr style="background-color: #667eea; color: white;">
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">No.</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Full name</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Social Insurance No.</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Date of birth</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Gender</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Birth certificate place</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Relationship to head</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">ID/Passport/Citizen ID</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Notes</th>
                </tr>
              </thead>
              <tbody>
                ${formData.householdMembers.map((member, idx) => `
                  <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${idx + 1}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${member.name || ""}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${member.socialInsuranceNumber || ""}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${member.dateOfBirth || ""}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${member.gender || ""}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${member.birthPlace || ""}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${member.relationship || ""}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${member.idNumber || ""}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${member.note || ""}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div style="margin-top: 30px;">
              <div style="margin-bottom: 15px;">I hereby declare that the above information is true and I take full legal responsibility for this declaration.</div>
              <div style="text-align: right; margin-top: 20px;">
                <div>.........., ....... / ....... / ...........</div>
                <div style="margin-top: 15px;">Declarant</div>
                <div style="margin-top: 5px;">(Signature &amp; full name)</div>
              </div>
            </div>
          </div>
        `;
      }
      
      printDiv.innerHTML = htmlContent;
      document.body.appendChild(printDiv);
      
      // Render to canvas
      const canvas = await html2canvas(printDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      // Remove temporary div
      document.body.removeChild(printDiv);
      
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

      // Header
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "VIETNAM SOCIAL SECURITY",
              bold: true,
              size: 28
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "SOCIALIST REPUBLIC OF VIETNAM",
              size: 22
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Independence - Freedom - Happiness",
              size: 20
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "DECLARATION",
              bold: true,
              size: 24
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "SOCIAL INSURANCE & HEALTH INSURANCE PARTICIPATION / INFORMATION UPDATE",
              size: 20
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "(For participants who have not been issued a social insurance number and for information changes)",
              size: 18,
              italics: true
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        })
      );

      if (formType === "new") {
        // Phần I: Người chưa có mã số BHXH
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "I. For participants without a Social Insurance number",
                bold: true,
                size: 22
              })
            ],
            spacing: { after: 300 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[01]. ", bold: true }),
              new TextRun({ text: "Full name (UPPERCASE): " }),
              new TextRun({ text: formData.name || "_________________", bold: true })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[02]. ", bold: true }),
              new TextRun({ text: "Date of birth: " }),
              new TextRun({ text: formData.dateOfBirth || "___/___/_____" }),
              new TextRun({ text: "  [03]. ", bold: true }),
              new TextRun({ text: "Gender: " }),
              new TextRun({ text: formData.gender || "_____" })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[04]. ", bold: true }),
              new TextRun({ text: "Nationality: " }),
              new TextRun({ text: formData.nationality || "_____" }),
              new TextRun({ text: "  [05]. ", bold: true }),
              new TextRun({ text: "Ethnicity: " }),
              new TextRun({ text: formData.ethnicity || "_____" })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[06]. ", bold: true }),
              new TextRun({ text: "Birth certificate registration place:" })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[06.1]. ", bold: true }),
              new TextRun({ text: "Ward/Commune/Township: " }),
              new TextRun({ text: formData.birthPlaceWard || "_____" })
            ],
            indent: { left: 400 },
            spacing: { after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[06.2]. ", bold: true }),
              new TextRun({ text: "District: " }),
              new TextRun({ text: formData.birthPlaceDistrict || "_____" })
            ],
            indent: { left: 400 },
            spacing: { after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[06.3]. ", bold: true }),
              new TextRun({ text: "Province/City: " }),
              new TextRun({ text: formData.birthPlaceProvince || "_____" })
            ],
            indent: { left: 400 },
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[07]. ", bold: true }),
              new TextRun({ text: "Address to receive results:" })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[07.1]. ", bold: true }),
              new TextRun({ text: "House no./Street/Hamlet: " }),
              new TextRun({ text: formData.addressStreet || "_____" })
            ],
            indent: { left: 400 },
            spacing: { after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[07.2]. ", bold: true }),
              new TextRun({ text: "Ward/Commune/Township: " }),
              new TextRun({ text: formData.addressWard || "_____" })
            ],
            indent: { left: 400 },
            spacing: { after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[07.3]. ", bold: true }),
              new TextRun({ text: "District: " }),
              new TextRun({ text: formData.addressDistrict || "_____" })
            ],
            indent: { left: 400 },
            spacing: { after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[07.4]. ", bold: true }),
              new TextRun({ text: "Province/City: " }),
              new TextRun({ text: formData.addressProvince || "_____" })
            ],
            indent: { left: 400 },
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[08]. ", bold: true }),
              new TextRun({ text: "ID/Passport/Citizen ID: " }),
              new TextRun({ text: formData.idNumber || "_____" }),
              new TextRun({ text: "  [09]. ", bold: true }),
              new TextRun({ text: "Phone number: " }),
              new TextRun({ text: formData.phoneNumber || "_____" })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[10]. ", bold: true }),
              new TextRun({ text: "Parent/guardian name (for children under 6): " }),
              new TextRun({ text: formData.parentGuardianName || "_____" })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[11]. ", bold: true }),
              new TextRun({ text: "Contribution amount: " }),
              new TextRun({ text: formData.contributionAmount || "_____" }),
              new TextRun({ text: "  [12]. ", bold: true }),
              new TextRun({ text: "Contribution method: " }),
              new TextRun({ text: formData.contributionMethod || "_____" })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[13]. ", bold: true }),
              new TextRun({ text: "Initial health care provider: " }),
              new TextRun({ text: formData.healthInsuranceProvider || "_____" })
            ],
            spacing: { after: 200 }
          })
        );

        if (formData.householdMembers.length > 0) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: "[14]. ", bold: true }),
                new TextRun({ text: "Appendix: household members (see next page)" })
              ],
              spacing: { after: 200 }
            })
          );
        }
      } else {
        // Phần II: Người đã có mã số BHXH
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "II. For participants with a Social Insurance number (information change)",
                bold: true,
                size: 22
              })
            ],
            spacing: { after: 300 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[01]. ", bold: true }),
              new TextRun({ text: "Full name (UPPERCASE): " }),
              new TextRun({ text: formData.name || "_________________", bold: true })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[02]. ", bold: true }),
              new TextRun({ text: "Date of birth: " }),
              new TextRun({ text: formData.dateOfBirth || "___/___/_____" }),
              new TextRun({ text: "  [03]. ", bold: true }),
              new TextRun({ text: "Social Insurance number: " }),
              new TextRun({ text: formData.socialInsuranceNumber || "_____" })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[04]. ", bold: true }),
              new TextRun({ text: "Requested changes:" })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: formData.changeContent || "_____" })
            ],
            indent: { left: 400 },
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[05]. ", bold: true }),
              new TextRun({ text: "Attached documents (if any):" })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: formData.attachedDocuments || "_____" })
            ],
            indent: { left: 400 },
            spacing: { after: 200 }
          })
        );
      }

      // Signature section
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "I hereby declare that the above information is true and I take full legal responsibility for this declaration."
            })
          ],
          spacing: { before: 600, after: 400 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: ".........., ....... / ....... / ..........." })
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 300 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Declarant", bold: true })
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 150 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "(Signature & full name)" })
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 400 }
        })
      );

      // Phụ lục thành viên hộ gia đình
      if (formData.householdMembers.length > 0) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "APPENDIX: HOUSEHOLD MEMBERS",
                bold: true,
                size: 24
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 800, after: 400 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Household head full name: ", bold: true }),
              new TextRun({ text: formData.householdHeadName || "_____" }),
              new TextRun({ text: "  Phone (optional): ", bold: true }),
              new TextRun({ text: formData.householdHeadPhone || "_____" })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Address:", bold: true })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Hamlet/Residential group: ", bold: true }),
              new TextRun({ text: formData.householdAddressWard || "_____" }),
              new TextRun({ text: "  Ward/Commune/Township: ", bold: true }),
              new TextRun({ text: formData.householdAddressWard || "_____" })
            ],
            indent: { left: 400 },
            spacing: { after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "District: ", bold: true }),
              new TextRun({ text: formData.householdAddressDistrict || "_____" }),
              new TextRun({ text: "  Province/City: ", bold: true }),
              new TextRun({ text: formData.householdAddressProvince || "_____" })
            ],
            indent: { left: 400 },
            spacing: { after: 400 }
          })
        );

        // Table for household members
        const tableRows = [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "No.", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Full name", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Social Insurance No.", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Date of birth", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Gender", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Birth certificate place", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Relationship to head", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "ID/Passport/Citizen ID", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Notes", bold: true })] })] })
            ]
          })
        ];

        formData.householdMembers.forEach((member, idx) => {
          tableRows.push(
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(idx + 1) })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: member.name || "" })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: member.socialInsuranceNumber || "" })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: member.dateOfBirth || "" })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: member.gender || "" })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: member.birthPlace || "" })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: member.relationship || "" })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: member.idNumber || "" })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: member.note || "" })] })] })
              ]
            })
          );
        });

        children.push(
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "I hereby declare that the above information is true and I take full legal responsibility for this declaration."
              })
            ],
            spacing: { before: 600, after: 400 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: ".........., ....... / ....... / ..........." })
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { after: 300 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Declarant", bold: true })
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "(Signature & full name)" })
            ],
            alignment: AlignmentType.RIGHT
          })
        );
      }

      // Create document
      const doc = new Document({
        sections: [{
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

  const isSuccessMessage = typeof message === "string" && message.trim().startsWith("✅");

  return (
    <div style={containerStyle}>
      <h2 style={{ marginBottom: theme.spacing.lg, color: theme.neutral.gray900 }}>
        📋 Social/Health Insurance Participation & Information Update (Form TK1-TS)
      </h2>

      {/* Employee Selection */}
      <div style={formSectionStyle}>
        <label style={labelStyle}>Select employee:</label>
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
                  style={inputStyle}
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value.toUpperCase())}
                  placeholder="NGUYEN VAN A"
                />
              </div>
              <div>
                <label style={labelStyle}>[02] Date of birth: *</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                  placeholder="DD/MM/YYYY"
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
              <div>
                <label style={labelStyle}>[03] Gender: *</label>
                <select
                  style={inputStyle}
                  value={formData.gender}
                  onChange={(e) => handleInputChange("gender", e.target.value)}
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
                    <label style={{ ...labelStyle, fontSize: "11px" }}>[06.1] Ward/Commune/Township:</label>
                    <input
                      type="text"
                      style={inputStyle}
                      value={formData.birthPlaceWard}
                      onChange={(e) => handleInputChange("birthPlaceWard", e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: "11px" }}>[06.2] District:</label>
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
                        style={inputStyle}
                        value={formData.addressStreet}
                        onChange={(e) => handleInputChange("addressStreet", e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: "11px" }}>[07.2] Ward/Commune/Township:</label>
                      <input
                        type="text"
                        style={inputStyle}
                        value={formData.addressWard}
                        onChange={(e) => handleInputChange("addressWard", e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md }}>
                    <div>
                      <label style={{ ...labelStyle, fontSize: "11px" }}>[07.3] District:</label>
                      <input
                        type="text"
                        style={inputStyle}
                        value={formData.addressDistrict}
                        onChange={(e) => handleInputChange("addressDistrict", e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: "11px" }}>[07.4] Province/City:</label>
                      <select
                        style={inputStyle}
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
                <label style={labelStyle}>[08] ID/Passport/Citizen ID:</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={formData.idNumber}
                  onChange={(e) => handleInputChange("idNumber", e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>[09] Phone number:</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
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
                  style={inputStyle}
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label style={labelStyle}>[02] Date of birth: *</label>
                <input
                  type="date"
                  style={inputStyle}
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginBottom: theme.spacing.md }}>
              <label style={labelStyle}>[03] Social Insurance number: *</label>
              <input
                type="text"
                style={inputStyle}
                value={formData.socialInsuranceNumber}
                onChange={(e) => handleInputChange("socialInsuranceNumber", e.target.value)}
              />
            </div>

            <div style={{ marginBottom: theme.spacing.md }}>
              <label style={labelStyle}>[04] Requested changes: *</label>
              <textarea
                style={{ ...inputStyle, minHeight: "100px" }}
                value={formData.changeContent}
                onChange={(e) => handleInputChange("changeContent", e.target.value)}
                placeholder="Describe the requested changes..."
              />
            </div>

            <div style={{ marginBottom: theme.spacing.md }}>
              <label style={labelStyle}>[05] Attached documents (if any):</label>
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
                style={inputStyle}
                value={formData.householdHeadName}
                onChange={(e) => handleInputChange("householdHeadName", e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Phone number (optional):</label>
              <input
                type="text"
                style={inputStyle}
                value={formData.householdHeadPhone}
                onChange={(e) => handleInputChange("householdHeadPhone", e.target.value)}
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
                <label style={labelStyle}>Ward/Commune/Township:</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={formData.householdAddressWard}
                  onChange={(e) => handleInputChange("householdAddressWard", e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>District:</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={formData.householdAddressDistrict}
                  onChange={(e) => handleInputChange("householdAddressDistrict", e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Province/City:</label>
                <select
                  style={inputStyle}
                  value={formData.householdAddressProvinceCode}
                  onChange={(e) => {
                    const province = vietnamProvinces.find(p => p.code === e.target.value);
                    handleInputChange("householdAddressProvinceCode", e.target.value);
                    handleInputChange("householdAddressProvince", province?.name || "");
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
            backgroundColor: loading ? theme.neutral.gray400 : theme.success.main,
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

