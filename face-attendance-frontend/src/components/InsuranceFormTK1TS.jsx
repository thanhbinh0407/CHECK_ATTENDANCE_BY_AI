import React, { useState, useEffect, useRef } from "react";
import { theme } from "../styles/theme.js";
import jsPDF from "jspdf";
import "jspdf-autotable";
import html2canvas from "html2canvas";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } from "docx";
import { saveAs } from "file-saver";
import { countries, vietnamProvinces, getDistrictsByProvince, getWardsByDistrict } from "../data/countries.js";

export default function InsuranceFormTK1TS() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingWord, setLoadingWord] = useState(false);
  const [formType, setFormType] = useState("new"); // "new" or "update"
  const [message, setMessage] = useState("");
  const pdfRef = useRef(null);
  const [formData, setFormData] = useState({
    // Phần I: Người chưa có mã số BHXH
    name: "",
    dateOfBirth: "",
    gender: "",
    nationality: "VN",
    nationalityName: "Việt Nam",
    ethnicity: "",
    birthPlaceCountry: "VN",
    birthPlaceCountryName: "Việt Nam",
    birthPlaceWard: "",
    birthPlaceDistrict: "",
    birthPlaceProvince: "",
    birthPlaceProvinceCode: "",
    addressCountry: "VN",
    addressCountryName: "Việt Nam",
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
    householdAddressCountryName: "Việt Nam",
    householdAddressWard: "",
    householdAddressDistrict: "",
    householdAddressProvince: "",
    householdAddressProvinceCode: "",
    householdMembers: []
  });
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

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      loadEmployeeData();
      loadSavedFormData();
    }
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
          setMessage("Đã tải dữ liệu form đã lưu");
        }
      }
    } catch (err) {
      console.error("Error loading saved form:", err);
      // Không hiển thị lỗi nếu chưa có dữ liệu
    }
  };

  // Save form data
  const saveFormData = async () => {
    if (!selectedEmployee) {
      setMessage("Vui lòng chọn nhân viên trước");
      return;
    }

    try {
      setLoading(true);
      setMessage("Đang lưu...");
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
        setMessage("✅ Đã lưu form thành công!");
      } else {
        setMessage("❌ Lỗi khi lưu form: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Error saving form:", err);
      setMessage("❌ Lỗi khi lưu form: " + err.message);
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
      setMessage("Lỗi khi tải danh sách nhân viên");
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
        
        // Parse date
        const dob = emp.dateOfBirth ? new Date(emp.dateOfBirth) : null;
        const dobStr = dob ? `${String(dob.getDate()).padStart(2, '0')}/${String(dob.getMonth() + 1).padStart(2, '0')}/${dob.getFullYear()}` : "";
        
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

        const permanentAddr = parseAddress(emp.permanentAddress || emp.address);
        const tempAddr = parseAddress(emp.temporaryAddress || emp.address);

        // Parse province from address
        const provinceCode = vietnamProvinces.find(p => 
          tempAddr.province && tempAddr.province.includes(p.name)
        )?.code || "";

        setFormData(prev => ({
          ...prev,
          name: (emp.name || "").toUpperCase(),
          dateOfBirth: emp.dateOfBirth ? new Date(emp.dateOfBirth).toISOString().split('T')[0] : "",
          gender: emp.gender === "male" ? "Nam" : emp.gender === "female" ? "Nữ" : "",
          nationality: "VN",
          nationalityName: "Việt Nam",
          ethnicity: "",
          birthPlaceCountry: "VN",
          birthPlaceCountryName: "Việt Nam",
          birthPlaceWard: "",
          birthPlaceDistrict: "",
          birthPlaceProvince: "",
          birthPlaceProvinceCode: "",
          addressCountry: "VN",
          addressCountryName: "Việt Nam",
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
          householdHeadName: "",
          householdHeadPhone: "",
          householdAddressCountry: "VN",
          householdAddressCountryName: "Việt Nam",
          householdAddressWard: "",
          householdAddressDistrict: "",
          householdAddressProvince: "",
          householdAddressProvinceCode: "",
          householdMembers: []
        }));
      }
    } catch (err) {
      console.error("Error loading employee data:", err);
      setMessage("Lỗi khi tải thông tin nhân viên");
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
      setMessage("Vui lòng nhập tên thành viên");
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
      setMessage("Đang tạo PDF...");
      
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
          <div style="font-size: 14pt; font-weight: bold; margin-bottom: 5px;">BẢO HIỂM XÃ HỘI VIỆT NAM</div>
          <div style="font-size: 11pt; margin-bottom: 3px;">CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div style="font-size: 10pt;">Độc lập - Tự do - Hạnh phúc</div>
        </div>
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 12pt; font-weight: bold; margin-bottom: 5px;">TỜ KHAI</div>
          <div style="font-size: 10pt; margin-bottom: 3px;">THAM GIA, ĐIỀU CHỈNH THÔNG TIN BẢO HIỂM XÃ HỘI, BẢO HIỂM Y TẾ</div>
          <div style="font-size: 9pt;">(Áp dụng đối với người tham gia chưa được cấp mã số BHXH và thay đổi thông tin)</div>
        </div>
      `;
      
      if (formType === "new") {
        htmlContent += `
          <div style="margin-bottom: 15px;">
            <div style="font-weight: bold; margin-bottom: 10px;">I. Đối với người chưa được cấp mã số BHXH</div>
            <div style="margin-bottom: 8px;"><strong>[01].</strong> Họ và tên (viết chữ in hoa): <strong>${formData.name || "_________________"}</strong></div>
            <div style="margin-bottom: 8px;"><strong>[02].</strong> Ngày, tháng, năm sinh: ${formData.dateOfBirth || "___/___/_____"} <strong>[03].</strong> Giới tính: ${formData.gender || "_____"}</div>
            <div style="margin-bottom: 8px;"><strong>[04].</strong> Quốc tịch: ${formData.nationality || "_____"} <strong>[05].</strong> Dân tộc: ${formData.ethnicity || "_____"}</div>
            <div style="margin-bottom: 8px;"><strong>[06].</strong> Nơi đăng ký giấy khai sinh:</div>
            <div style="margin-left: 20px; margin-bottom: 5px;"><strong>[06.1].</strong> Xã (phường, thị trấn): ${formData.birthPlaceWard || "_____"}</div>
            <div style="margin-left: 20px; margin-bottom: 5px;"><strong>[06.2].</strong> Huyện (quận, thị xã, Tp thuộc tỉnh): ${formData.birthPlaceDistrict || "_____"}</div>
            <div style="margin-left: 20px; margin-bottom: 8px;"><strong>[06.3].</strong> Tỉnh (Tp): ${formData.birthPlaceProvince || "_____"}</div>
            <div style="margin-bottom: 8px;"><strong>[07].</strong> Địa chỉ nhận kết quả:</div>
            <div style="margin-left: 20px; margin-bottom: 5px;"><strong>[07.1].</strong> Số nhà, đường phố, thôn xóm: ${formData.addressStreet || "_____"}</div>
            <div style="margin-left: 20px; margin-bottom: 5px;"><strong>[07.2].</strong> Xã (phường, thị trấn): ${formData.addressWard || "_____"}</div>
            <div style="margin-left: 20px; margin-bottom: 5px;"><strong>[07.3].</strong> Huyện (quận, thị xã, Tp thuộc tỉnh): ${formData.addressDistrict || "_____"}</div>
            <div style="margin-left: 20px; margin-bottom: 8px;"><strong>[07.4].</strong> Tỉnh (Tp): ${formData.addressProvince || "_____"}</div>
            <div style="margin-bottom: 8px;"><strong>[08].</strong> Số CMND/ Hộ chiếu/ Thẻ căn cước: ${formData.idNumber || "_____"} <strong>[09].</strong> Số điện thoại liên hệ: ${formData.phoneNumber || "_____"}</div>
            <div style="margin-bottom: 8px;"><strong>[10].</strong> Họ tên cha/ mẹ/ người giám hộ (đối với trẻ em dưới 6 tuổi): ${formData.parentGuardianName || "_____"}</div>
            <div style="margin-bottom: 8px;"><strong>[11].</strong> Mức tiền đóng: ${formData.contributionAmount || "_____"} <strong>[12].</strong> Phương thức đóng: ${formData.contributionMethod || "_____"}</div>
            <div style="margin-bottom: 8px;"><strong>[13].</strong> Nơi đăng ký khám bệnh, chữa bệnh ban đầu: ${formData.healthInsuranceProvider || "_____"}</div>
            ${formData.householdMembers.length > 0 ? '<div style="margin-bottom: 8px;"><strong>[14].</strong> Phụ lục thành viên hộ gia đình (xem trang sau)</div>' : ''}
          </div>
        `;
      } else {
        htmlContent += `
          <div style="margin-bottom: 15px;">
            <div style="font-weight: bold; margin-bottom: 10px;">II. Đối với người đã được cấp mã số BHXH thay đổi thông tin</div>
            <div style="margin-bottom: 8px;"><strong>[01].</strong> Họ và tên (viết chữ in hoa): <strong>${formData.name || "_________________"}</strong></div>
            <div style="margin-bottom: 8px;"><strong>[02].</strong> Ngày, tháng, năm sinh: ${formData.dateOfBirth || "___/___/_____"} <strong>[03].</strong> Mã số BHXH: ${formData.socialInsuranceNumber || "_____"}</div>
            <div style="margin-bottom: 8px;"><strong>[04].</strong> Nội dung thay đổi, yêu cầu:</div>
            <div style="margin-left: 20px; margin-bottom: 8px; white-space: pre-wrap;">${formData.changeContent || "_____"}</div>
            <div style="margin-bottom: 8px;"><strong>[05].</strong> Hồ sơ kèm theo (nếu có):</div>
            <div style="margin-left: 20px; margin-bottom: 8px; white-space: pre-wrap;">${formData.attachedDocuments || "_____"}</div>
          </div>
        `;
      }
      
      htmlContent += `
        <div style="margin-top: 30px; margin-bottom: 20px;">
          <div style="margin-bottom: 15px;">Tôi cam đoan những nội dung kê khai là đúng và chịu trách nhiệm trước pháp luật về những nội dung đã kê khai</div>
          <div style="text-align: right; margin-top: 20px;">
            <div>.........., ngày ....... tháng ....... năm ...........</div>
            <div style="margin-top: 15px;">Người kê khai</div>
            <div style="margin-top: 5px;">(Ký, ghi rõ họ tên)</div>
          </div>
        </div>
      `;
      
      // Phụ lục thành viên hộ gia đình
      if (formData.householdMembers.length > 0) {
        htmlContent += `
          <div style="page-break-before: always; margin-top: 30px;">
            <div style="text-align: center; font-size: 12pt; font-weight: bold; margin-bottom: 20px;">PHỤ LỤC THÀNH VIÊN HỘ GIA ĐÌNH</div>
            <div style="margin-bottom: 15px;">
              <div><strong>Họ và tên chủ hộ:</strong> ${formData.householdHeadName || "_____"} <strong>Số điện thoại (nếu có):</strong> ${formData.householdHeadPhone || "_____"}</div>
              <div style="margin-top: 10px;"><strong>Địa chỉ:</strong></div>
              <div style="margin-left: 20px;">
                <div><strong>Thôn (bản, tổ dân phố):</strong> ${formData.householdAddressWard || "_____"} <strong>Xã (phường, thị trấn):</strong> ${formData.householdAddressWard || "_____"}</div>
                <div><strong>Huyện (quận, thị xã, Tp thuộc tỉnh):</strong> ${formData.householdAddressDistrict || "_____"} <strong>Tỉnh (Tp):</strong> ${formData.householdAddressProvince || "_____"}</div>
              </div>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 9pt;">
              <thead>
                <tr style="background-color: #667eea; color: white;">
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Stt</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Họ và tên</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Mã số BHXH</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Ngày, tháng, năm sinh</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Giới tính</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Nơi cấp giấy khai sinh</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Mối quan hệ với chủ hộ</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Số CMND/ Thẻ căn cước/ Hộ chiếu</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Ghi chú</th>
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
              <div style="margin-bottom: 15px;">Tôi cam đoan những nội dung kê khai là đúng và chịu trách nhiệm trước pháp luật về những nội dung đã kê khai</div>
              <div style="text-align: right; margin-top: 20px;">
                <div>.........., ngày ....... tháng ....... năm ...........</div>
                <div style="margin-top: 15px;">Người kê khai</div>
                <div style="margin-top: 5px;">(Ký, ghi rõ họ tên)</div>
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
      setMessage("Đã xuất PDF thành công!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      setMessage("Lỗi khi xuất PDF: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToWord = async () => {
    try {
      setLoadingWord(true);
      setMessage("Đang tạo file Word...");

      const children = [];

      // Header
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "BẢO HIỂM XÃ HỘI VIỆT NAM",
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
              text: "CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM",
              size: 22
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Độc lập - Tự do - Hạnh phúc",
              size: 20
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "TỜ KHAI",
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
              text: "THAM GIA, ĐIỀU CHỈNH THÔNG TIN BẢO HIỂM XÃ HỘI, BẢO HIỂM Y TẾ",
              size: 20
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "(Áp dụng đối với người tham gia chưa được cấp mã số BHXH và thay đổi thông tin)",
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
                text: "I. Đối với người chưa được cấp mã số BHXH",
                bold: true,
                size: 22
              })
            ],
            spacing: { after: 300 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[01]. ", bold: true }),
              new TextRun({ text: "Họ và tên (viết chữ in hoa): " }),
              new TextRun({ text: formData.name || "_________________", bold: true })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[02]. ", bold: true }),
              new TextRun({ text: "Ngày, tháng, năm sinh: " }),
              new TextRun({ text: formData.dateOfBirth || "___/___/_____" }),
              new TextRun({ text: "  [03]. ", bold: true }),
              new TextRun({ text: "Giới tính: " }),
              new TextRun({ text: formData.gender || "_____" })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[04]. ", bold: true }),
              new TextRun({ text: "Quốc tịch: " }),
              new TextRun({ text: formData.nationality || "_____" }),
              new TextRun({ text: "  [05]. ", bold: true }),
              new TextRun({ text: "Dân tộc: " }),
              new TextRun({ text: formData.ethnicity || "_____" })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[06]. ", bold: true }),
              new TextRun({ text: "Nơi đăng ký giấy khai sinh:" })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[06.1]. ", bold: true }),
              new TextRun({ text: "Xã (phường, thị trấn): " }),
              new TextRun({ text: formData.birthPlaceWard || "_____" })
            ],
            indent: { left: 400 },
            spacing: { after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[06.2]. ", bold: true }),
              new TextRun({ text: "Huyện (quận, thị xã, Tp thuộc tỉnh): " }),
              new TextRun({ text: formData.birthPlaceDistrict || "_____" })
            ],
            indent: { left: 400 },
            spacing: { after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[06.3]. ", bold: true }),
              new TextRun({ text: "Tỉnh (Tp): " }),
              new TextRun({ text: formData.birthPlaceProvince || "_____" })
            ],
            indent: { left: 400 },
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[07]. ", bold: true }),
              new TextRun({ text: "Địa chỉ nhận kết quả:" })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[07.1]. ", bold: true }),
              new TextRun({ text: "Số nhà, đường phố, thôn xóm: " }),
              new TextRun({ text: formData.addressStreet || "_____" })
            ],
            indent: { left: 400 },
            spacing: { after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[07.2]. ", bold: true }),
              new TextRun({ text: "Xã (phường, thị trấn): " }),
              new TextRun({ text: formData.addressWard || "_____" })
            ],
            indent: { left: 400 },
            spacing: { after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[07.3]. ", bold: true }),
              new TextRun({ text: "Huyện (quận, thị xã, Tp thuộc tỉnh): " }),
              new TextRun({ text: formData.addressDistrict || "_____" })
            ],
            indent: { left: 400 },
            spacing: { after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[07.4]. ", bold: true }),
              new TextRun({ text: "Tỉnh (Tp): " }),
              new TextRun({ text: formData.addressProvince || "_____" })
            ],
            indent: { left: 400 },
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[08]. ", bold: true }),
              new TextRun({ text: "Số CMND/ Hộ chiếu/ Thẻ căn cước: " }),
              new TextRun({ text: formData.idNumber || "_____" }),
              new TextRun({ text: "  [09]. ", bold: true }),
              new TextRun({ text: "Số điện thoại liên hệ: " }),
              new TextRun({ text: formData.phoneNumber || "_____" })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[10]. ", bold: true }),
              new TextRun({ text: "Họ tên cha/ mẹ/ người giám hộ (đối với trẻ em dưới 6 tuổi): " }),
              new TextRun({ text: formData.parentGuardianName || "_____" })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[11]. ", bold: true }),
              new TextRun({ text: "Mức tiền đóng: " }),
              new TextRun({ text: formData.contributionAmount || "_____" }),
              new TextRun({ text: "  [12]. ", bold: true }),
              new TextRun({ text: "Phương thức đóng: " }),
              new TextRun({ text: formData.contributionMethod || "_____" })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[13]. ", bold: true }),
              new TextRun({ text: "Nơi đăng ký khám bệnh, chữa bệnh ban đầu: " }),
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
                new TextRun({ text: "Phụ lục thành viên hộ gia đình (xem trang sau)" })
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
                text: "II. Đối với người đã được cấp mã số BHXH thay đổi thông tin",
                bold: true,
                size: 22
              })
            ],
            spacing: { after: 300 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[01]. ", bold: true }),
              new TextRun({ text: "Họ và tên (viết chữ in hoa): " }),
              new TextRun({ text: formData.name || "_________________", bold: true })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[02]. ", bold: true }),
              new TextRun({ text: "Ngày, tháng, năm sinh: " }),
              new TextRun({ text: formData.dateOfBirth || "___/___/_____" }),
              new TextRun({ text: "  [03]. ", bold: true }),
              new TextRun({ text: "Mã số BHXH: " }),
              new TextRun({ text: formData.socialInsuranceNumber || "_____" })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "[04]. ", bold: true }),
              new TextRun({ text: "Nội dung thay đổi, yêu cầu:" })
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
              new TextRun({ text: "Hồ sơ kèm theo (nếu có):" })
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
              text: "Tôi cam đoan những nội dung kê khai là đúng và chịu trách nhiệm trước pháp luật về những nội dung đã kê khai"
            })
          ],
          spacing: { before: 600, after: 400 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: ".........., ngày ....... tháng ....... năm ..........." })
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 300 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Người kê khai", bold: true })
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 150 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "(Ký, ghi rõ họ tên)" })
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
                text: "PHỤ LỤC THÀNH VIÊN HỘ GIA ĐÌNH",
                bold: true,
                size: 24
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 800, after: 400 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Họ và tên chủ hộ: ", bold: true }),
              new TextRun({ text: formData.householdHeadName || "_____" }),
              new TextRun({ text: "  Số điện thoại (nếu có): ", bold: true }),
              new TextRun({ text: formData.householdHeadPhone || "_____" })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Địa chỉ:", bold: true })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Thôn (bản, tổ dân phố): ", bold: true }),
              new TextRun({ text: formData.householdAddressWard || "_____" }),
              new TextRun({ text: "  Xã (phường, thị trấn): ", bold: true }),
              new TextRun({ text: formData.householdAddressWard || "_____" })
            ],
            indent: { left: 400 },
            spacing: { after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Huyện (quận, thị xã, Tp thuộc tỉnh): ", bold: true }),
              new TextRun({ text: formData.householdAddressDistrict || "_____" }),
              new TextRun({ text: "  Tỉnh (Tp): ", bold: true }),
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
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Stt", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Họ và tên", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Mã số BHXH", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Ngày, tháng, năm sinh", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Giới tính", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nơi cấp giấy khai sinh", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Mối quan hệ với chủ hộ", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Số CMND/ Thẻ căn cước/ Hộ chiếu", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Ghi chú", bold: true })] })] })
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
                text: "Tôi cam đoan những nội dung kê khai là đúng và chịu trách nhiệm trước pháp luật về những nội dung đã kê khai"
              })
            ],
            spacing: { before: 600, after: 400 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: ".........., ngày ....... tháng ....... năm ..........." })
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { after: 300 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Người kê khai", bold: true })
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "(Ký, ghi rõ họ tên)" })
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
      setMessage("Đã xuất file Word thành công!");
    } catch (error) {
      console.error("Error generating Word document:", error);
      setMessage("Lỗi khi xuất file Word: " + error.message);
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

  return (
    <div style={containerStyle}>
      <h2 style={{ marginBottom: theme.spacing.lg, color: theme.neutral.gray900 }}>
        📋 Tờ Khai Tham Gia, Điều Chỉnh Thông Tin BHXH, BHYT (Mẫu TK1-TS)
      </h2>

      {/* Employee Selection */}
      <div style={formSectionStyle}>
        <label style={labelStyle}>Chọn nhân viên:</label>
        <select
          style={inputStyle}
          value={selectedEmployee?.id || ""}
          onChange={(e) => {
            const emp = employees.find(em => em.id === parseInt(e.target.value));
            setSelectedEmployee(emp || null);
          }}
        >
          <option value="">-- Chọn nhân viên --</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>
              {emp.employeeCode} - {emp.name}
            </option>
          ))}
        </select>
      </div>

      {/* Form Type Selection */}
      <div style={formSectionStyle}>
        <label style={labelStyle}>Loại tờ khai:</label>
        <div style={{ display: "flex", gap: theme.spacing.md }}>
          <button
            style={{
              ...buttonStyle,
              backgroundColor: formType === "new" ? theme.primary.main : theme.neutral.gray300,
              color: formType === "new" ? theme.neutral.white : theme.neutral.gray700
            }}
            onClick={() => setFormType("new")}
          >
            I. Người chưa có mã số BHXH
          </button>
          <button
            style={{
              ...buttonStyle,
              backgroundColor: formType === "update" ? theme.primary.main : theme.neutral.gray300,
              color: formType === "update" ? theme.neutral.white : theme.neutral.gray700
            }}
            onClick={() => setFormType("update")}
          >
            II. Người đã có mã số BHXH (thay đổi thông tin)
          </button>
        </div>
      </div>

      {formType === "new" ? (
        <>
          {/* Phần I: Người chưa có mã số BHXH */}
          <div style={formSectionStyle}>
            <h3 style={{ marginBottom: theme.spacing.md, color: theme.primary.main }}>
              I. Đối với người chưa được cấp mã số BHXH
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
              <div>
                <label style={labelStyle}>[01] Họ và tên (viết chữ in hoa): *</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value.toUpperCase())}
                  placeholder="NGUYỄN VĂN A"
                />
              </div>
              <div>
                <label style={labelStyle}>[02] Ngày, tháng, năm sinh: *</label>
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
                <label style={labelStyle}>[03] Giới tính: *</label>
                <select
                  style={inputStyle}
                  value={formData.gender}
                  onChange={(e) => handleInputChange("gender", e.target.value)}
                >
                  <option value="">-- Chọn --</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>[04] Quốc tịch:</label>
                <select
                  style={inputStyle}
                  value={formData.nationality}
                  onChange={(e) => {
                    const country = countries.find(c => c.code === e.target.value);
                    handleInputChange("nationality", e.target.value);
                    handleInputChange("nationalityName", country?.name || "");
                  }}
                >
                  <option value="">-- Chọn quốc gia --</option>
                  {countries.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: theme.spacing.md }}>
              <label style={labelStyle}>[05] Dân tộc:</label>
              <input
                type="text"
                style={inputStyle}
                value={formData.ethnicity}
                onChange={(e) => handleInputChange("ethnicity", e.target.value)}
              />
            </div>

            <div style={{ marginBottom: theme.spacing.md }}>
              <label style={labelStyle}>[06] Nơi đăng ký giấy khai sinh:</label>
              <div style={{ marginBottom: theme.spacing.sm }}>
                <label style={{ ...labelStyle, fontSize: "11px" }}>Quốc gia:</label>
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
                  <option value="">-- Chọn quốc gia --</option>
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
                    <label style={{ ...labelStyle, fontSize: "11px" }}>[06.1] Xã (phường, thị trấn):</label>
                    <input
                      type="text"
                      style={inputStyle}
                      value={formData.birthPlaceWard}
                      onChange={(e) => handleInputChange("birthPlaceWard", e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: "11px" }}>[06.2] Huyện (quận, thị xã, Tp thuộc tỉnh):</label>
                    <input
                      type="text"
                      style={inputStyle}
                      value={formData.birthPlaceDistrict}
                      onChange={(e) => handleInputChange("birthPlaceDistrict", e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: "11px" }}>[06.3] Tỉnh (Tp):</label>
                    <select
                      style={inputStyle}
                      value={formData.birthPlaceProvinceCode}
                      onChange={(e) => {
                        const province = vietnamProvinces.find(p => p.code === e.target.value);
                        handleInputChange("birthPlaceProvinceCode", e.target.value);
                        handleInputChange("birthPlaceProvince", province?.name || "");
                      }}
                    >
                      <option value="">-- Chọn tỉnh/thành phố --</option>
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
                  <label style={{ ...labelStyle, fontSize: "11px" }}>Tỉnh/Thành phố:</label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={formData.birthPlaceProvince}
                    onChange={(e) => handleInputChange("birthPlaceProvince", e.target.value)}
                    placeholder="Nhập tỉnh/thành phố"
                  />
                </div>
              )}
            </div>

            <div style={{ marginBottom: theme.spacing.md }}>
              <label style={labelStyle}>[07] Địa chỉ nhận kết quả:</label>
              <div style={{ marginBottom: theme.spacing.sm }}>
                <label style={{ ...labelStyle, fontSize: "11px" }}>Quốc gia:</label>
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
                  <option value="">-- Chọn quốc gia --</option>
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
                      <label style={{ ...labelStyle, fontSize: "11px" }}>[07.1] Số nhà, đường phố, thôn xóm:</label>
                      <input
                        type="text"
                        style={inputStyle}
                        value={formData.addressStreet}
                        onChange={(e) => handleInputChange("addressStreet", e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: "11px" }}>[07.2] Xã (phường, thị trấn):</label>
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
                      <label style={{ ...labelStyle, fontSize: "11px" }}>[07.3] Huyện (quận, thị xã, Tp thuộc tỉnh):</label>
                      <input
                        type="text"
                        style={inputStyle}
                        value={formData.addressDistrict}
                        onChange={(e) => handleInputChange("addressDistrict", e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: "11px" }}>[07.4] Tỉnh (Tp):</label>
                      <select
                        style={inputStyle}
                        value={formData.addressProvinceCode}
                        onChange={(e) => {
                          const province = vietnamProvinces.find(p => p.code === e.target.value);
                          handleInputChange("addressProvinceCode", e.target.value);
                          handleInputChange("addressProvince", province?.name || "");
                        }}
                      >
                        <option value="">-- Chọn tỉnh/thành phố --</option>
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
                  <label style={{ ...labelStyle, fontSize: "11px" }}>Địa chỉ:</label>
                  <input
                    type="text"
                    style={inputStyle}
                    value={formData.addressStreet}
                    onChange={(e) => handleInputChange("addressStreet", e.target.value)}
                    placeholder="Nhập địa chỉ đầy đủ"
                  />
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
              <div>
                <label style={labelStyle}>[08] Số CMND/ Hộ chiếu/ Thẻ căn cước:</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={formData.idNumber}
                  onChange={(e) => handleInputChange("idNumber", e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>[09] Số điện thoại liên hệ:</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginBottom: theme.spacing.md }}>
              <label style={labelStyle}>[10] Họ tên cha/ mẹ/ người giám hộ (đối với trẻ em dưới 6 tuổi):</label>
              <input
                type="text"
                style={inputStyle}
                value={formData.parentGuardianName}
                onChange={(e) => handleInputChange("parentGuardianName", e.target.value)}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
              <div>
                <label style={labelStyle}>[11] Mức tiền đóng (BHXH tự nguyện):</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={formData.contributionAmount}
                  onChange={(e) => handleInputChange("contributionAmount", e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>[12] Phương thức đóng:</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={formData.contributionMethod}
                  onChange={(e) => handleInputChange("contributionMethod", e.target.value)}
                  placeholder="03 tháng, 06 tháng, 12 tháng..."
                />
              </div>
            </div>

            <div style={{ marginBottom: theme.spacing.md }}>
              <label style={labelStyle}>[13] Nơi đăng ký khám bệnh, chữa bệnh ban đầu:</label>
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
              II. Đối với người đã được cấp mã số BHXH thay đổi thông tin
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
              <div>
                <label style={labelStyle}>[01] Họ và tên (viết chữ in hoa): *</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label style={labelStyle}>[02] Ngày, tháng, năm sinh: *</label>
                <input
                  type="date"
                  style={inputStyle}
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginBottom: theme.spacing.md }}>
              <label style={labelStyle}>[03] Mã số BHXH: *</label>
              <input
                type="text"
                style={inputStyle}
                value={formData.socialInsuranceNumber}
                onChange={(e) => handleInputChange("socialInsuranceNumber", e.target.value)}
              />
            </div>

            <div style={{ marginBottom: theme.spacing.md }}>
              <label style={labelStyle}>[04] Nội dung thay đổi, yêu cầu: *</label>
              <textarea
                style={{ ...inputStyle, minHeight: "100px" }}
                value={formData.changeContent}
                onChange={(e) => handleInputChange("changeContent", e.target.value)}
                placeholder="Ghi rõ nội dung cần thay đổi..."
              />
            </div>

            <div style={{ marginBottom: theme.spacing.md }}>
              <label style={labelStyle}>[05] Hồ sơ kèm theo (nếu có):</label>
              <textarea
                style={{ ...inputStyle, minHeight: "80px" }}
                value={formData.attachedDocuments}
                onChange={(e) => handleInputChange("attachedDocuments", e.target.value)}
                placeholder="Danh sách các giấy tờ kèm theo..."
              />
            </div>
          </div>
        </>
      )}

      {/* Phụ lục: Thành viên hộ gia đình */}
      <div style={formSectionStyle}>
        <h3 style={{ marginBottom: theme.spacing.md, color: theme.primary.main }}>
          Phụ lục: Thành viên hộ gia đình (nếu có)
        </h3>

        <div style={{ marginBottom: theme.spacing.md }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
            <div>
              <label style={labelStyle}>Họ và tên chủ hộ:</label>
              <input
                type="text"
                style={inputStyle}
                value={formData.householdHeadName}
                onChange={(e) => handleInputChange("householdHeadName", e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Số điện thoại (nếu có):</label>
              <input
                type="text"
                style={inputStyle}
                value={formData.householdHeadPhone}
                onChange={(e) => handleInputChange("householdHeadPhone", e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginBottom: theme.spacing.sm }}>
            <label style={labelStyle}>Quốc gia:</label>
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
              <option value="">-- Chọn quốc gia --</option>
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
                <label style={labelStyle}>Xã (phường, thị trấn):</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={formData.householdAddressWard}
                  onChange={(e) => handleInputChange("householdAddressWard", e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Huyện (quận, thị xã, Tp thuộc tỉnh):</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={formData.householdAddressDistrict}
                  onChange={(e) => handleInputChange("householdAddressDistrict", e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Tỉnh (Tp):</label>
                <select
                  style={inputStyle}
                  value={formData.householdAddressProvinceCode}
                  onChange={(e) => {
                    const province = vietnamProvinces.find(p => p.code === e.target.value);
                    handleInputChange("householdAddressProvinceCode", e.target.value);
                    handleInputChange("householdAddressProvince", province?.name || "");
                  }}
                >
                  <option value="">-- Chọn tỉnh/thành phố --</option>
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
              <label style={labelStyle}>Địa chỉ:</label>
              <input
                type="text"
                style={inputStyle}
                value={formData.householdAddressWard}
                onChange={(e) => handleInputChange("householdAddressWard", e.target.value)}
                placeholder="Nhập địa chỉ đầy đủ"
              />
            </div>
          )}
        </div>

        {/* Add household member form */}
        <div style={{ ...formSectionStyle, backgroundColor: theme.neutral.white, marginBottom: theme.spacing.md }}>
          <h4 style={{ marginBottom: theme.spacing.md }}>Thêm thành viên hộ gia đình:</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
            <div>
              <label style={labelStyle}>Họ và tên: *</label>
              <input
                type="text"
                style={inputStyle}
                value={householdMember.name}
                onChange={(e) => setHouseholdMember({ ...householdMember, name: e.target.value })}
              />
            </div>
            <div>
              <label style={labelStyle}>Mã số BHXH:</label>
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
              <label style={labelStyle}>Ngày, tháng, năm sinh:</label>
              <input
                type="date"
                style={inputStyle}
                value={householdMember.dateOfBirth}
                onChange={(e) => setHouseholdMember({ ...householdMember, dateOfBirth: e.target.value })}
              />
            </div>
            <div>
              <label style={labelStyle}>Giới tính:</label>
              <select
                style={inputStyle}
                value={householdMember.gender}
                onChange={(e) => setHouseholdMember({ ...householdMember, gender: e.target.value })}
              >
                <option value="">-- Chọn --</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
            <div>
              <label style={labelStyle}>Nơi cấp giấy khai sinh:</label>
              <input
                type="text"
                style={inputStyle}
                value={householdMember.birthPlace}
                onChange={(e) => setHouseholdMember({ ...householdMember, birthPlace: e.target.value })}
              />
            </div>
            <div>
              <label style={labelStyle}>Mối quan hệ với chủ hộ:</label>
              <input
                type="text"
                style={inputStyle}
                value={householdMember.relationship}
                onChange={(e) => setHouseholdMember({ ...householdMember, relationship: e.target.value })}
                placeholder="Vợ, chồng, con, cháu..."
              />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
            <div>
              <label style={labelStyle}>Số CMND/ Thẻ căn cước/ Hộ chiếu:</label>
              <input
                type="text"
                style={inputStyle}
                value={householdMember.idNumber}
                onChange={(e) => setHouseholdMember({ ...householdMember, idNumber: e.target.value })}
              />
            </div>
            <div>
              <label style={labelStyle}>Ghi chú:</label>
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
            ➕ Thêm thành viên
          </button>
        </div>

        {/* List of household members */}
        {formData.householdMembers.length > 0 && (
          <div style={{ marginTop: theme.spacing.md }}>
            <h4 style={{ marginBottom: theme.spacing.md }}>Danh sách thành viên đã thêm:</h4>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: theme.typography.small.fontSize }}>
              <thead>
                <tr style={{ backgroundColor: theme.primary.main, color: theme.neutral.white }}>
                  <th style={{ padding: theme.spacing.sm, border: "1px solid #ddd", textAlign: "left" }}>Stt</th>
                  <th style={{ padding: theme.spacing.sm, border: "1px solid #ddd", textAlign: "left" }}>Họ và tên</th>
                  <th style={{ padding: theme.spacing.sm, border: "1px solid #ddd", textAlign: "left" }}>Mã số BHXH</th>
                  <th style={{ padding: theme.spacing.sm, border: "1px solid #ddd", textAlign: "left" }}>Ngày sinh</th>
                  <th style={{ padding: theme.spacing.sm, border: "1px solid #ddd", textAlign: "left" }}>Giới tính</th>
                  <th style={{ padding: theme.spacing.sm, border: "1px solid #ddd", textAlign: "left" }}>Mối quan hệ</th>
                  <th style={{ padding: theme.spacing.sm, border: "1px solid #ddd", textAlign: "left" }}>Thao tác</th>
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
                        Xóa
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
          {loading ? "⏳ Đang lưu..." : "💾 Lưu Form"}
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
          {loadingWord ? "⏳ Đang tạo Word..." : "📝 Xuất Word"}
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
          {loading ? "⏳ Đang tạo PDF..." : "📄 Xuất PDF"}
        </button>
      </div>

      {message && (
        <div style={{
          marginTop: theme.spacing.md,
          padding: theme.spacing.md,
          backgroundColor: message.includes("thành công") ? theme.success.light : theme.error.light,
          color: message.includes("thành công") ? theme.success.dark : theme.error.dark,
          borderRadius: theme.radius.md
        }}>
          {message}
        </div>
      )}
    </div>
  );
}

