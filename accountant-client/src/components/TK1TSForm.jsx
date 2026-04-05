import { useState, useEffect } from "react";
import { theme } from "../theme.js";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const TK1TSForm = () => {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    // Employee
    hoVaTen: "",
    ngaySinh: "",
    gioiTinh: "",
    soCCCD: "",
    ngayCapCCCD: "",
    noiCapCCCD: "",
    diaChiThuongTru: "",
    diaChiTamTru: "",
    soDienThoai: "",
    email: "",

    // Job
    chucVu: "",
    phongBan: "",
    ngayBatDauLamViec: "",
    loaiHopDong: "",
    thoiHanHopDong: "",
    luongCoBan: "",
    phuCap: "",

    // Insurance
    soSoBHXH: "",
    noiDangKyKCB: "",
    thamGiaBHXH: true,
    thamGiaBHYT: true,
    thamGiaBHTN: false,
    tyLeDongBHXH: "",
    tyLeDongBHYT: "",
    tyLeDongBHTN: "",

    // Emergency contact
    nguoiLienHeKhanCap: "",
    quanHeVoiNguoiLD: "",
    soDienThoaiNguoiLienHe: "",

    // Additional
    trinhDoHocVan: "",
    chuyenNganh: "",
    ngoaiNgu: "",
    tinHoc: "",
    kinhNghiem: ""
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      loadEmployeeData(selectedEmployee);
    }
  }, [selectedEmployee]);

  const loadEmployees = async () => {
    try {
      const response = await fetch('/api/admin/employees', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadEmployeeData = async (employeeId) => {
    try {
      // Load existing TK1-TS data for this employee
      const response = await fetch(`/api/insurance-forms/${employeeId}/TK1_TS`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setFormData(data.formData);
      } else {
        // Load basic employee info if no TK1-TS form exists
        const empResponse = await fetch(`/api/admin/employees/${employeeId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        if (empResponse.ok) {
          const empData = await empResponse.json();
          setFormData(prev => ({
            ...prev,
            hoVaTen: empData.employee.name || "",
            email: empData.employee.email || "",
            // Add other basic fields that can be populated from employee data
          }));
        }
      }
    } catch (error) {
      console.error('Error loading employee data:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!selectedEmployee) {
      alert('Please select an employee.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/insurance-forms/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          userId: selectedEmployee,
          formType: 'TK1_TS',
          formData: formData
        })
      });

      if (response.ok) {
        alert('Data saved successfully.');
        setIsEditing(false);
      } else {
        alert('An error occurred while saving.');
      }
    } catch (error) {
      console.error('Error saving TK1-TS:', error);
      alert('An error occurred while saving.');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToPDF = () => {
    if (!selectedEmployee) {
      alert('Please select an employee before exporting PDF.');
      return;
    }

    const doc = new jsPDF();
    
    doc.setFont('times', 'normal');
    
    doc.setFontSize(16);
    doc.setFont('times', 'bold');
    doc.text('DECLARATION OF', 105, 20, { align: 'center' });
    doc.text('SOCIAL & HEALTH INSURANCE PARTICIPATION', 105, 30, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('times', 'normal');
    doc.text('(Form TK1-TS)', 105, 40, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('times', 'bold');
    doc.text('I. EMPLOYEE INFORMATION', 20, 60);
    
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    
    const personalInfo = [
      ['1. Full name:', formData.hoVaTen || ''],
      ['2. Date of birth:', formData.ngaySinh ? new Date(formData.ngaySinh).toLocaleDateString('en-US') : ''],
      ['3. Gender:', formData.gioiTinh === 'Nam' ? 'Male' : formData.gioiTinh === 'Nữ' ? 'Female' : (formData.gioiTinh || '')],
      ['4. ID card no.:', formData.soCCCD || ''],
      ['5. Issue date:', formData.ngayCapCCCD ? new Date(formData.ngayCapCCCD).toLocaleDateString('en-US') : ''],
      ['6. Place of issue:', formData.noiCapCCCD || ''],
      ['7. Permanent address:', formData.diaChiThuongTru || ''],
      ['8. Temporary address:', formData.diaChiTamTru || ''],
      ['9. Phone:', formData.soDienThoai || ''],
      ['10. Email:', formData.email || '']
    ];
    
    doc.autoTable({
      startY: 70,
      head: [],
      body: personalInfo,
      theme: 'plain',
      styles: {
        font: 'times',
        fontSize: 9,
        cellPadding: 2,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 120 }
      },
      margin: { left: 20, right: 20 }
    });
    
    const workInfoY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont('times', 'bold');
    doc.text('II. JOB INFORMATION', 20, workInfoY);
    
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    
    const workInfo = [
      ['1. Position:', formData.chucVu || ''],
      ['2. Department:', formData.phongBan || ''],
      ['3. Start date:', formData.ngayBatDauLamViec ? new Date(formData.ngayBatDauLamViec).toLocaleDateString('en-US') : ''],
      ['4. Contract type:', formData.loaiHopDong || ''],
      ['5. Contract term:', formData.thoiHanHopDong || ''],
      ['6. Base salary:', formData.luongCoBan ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND' }).format(formData.luongCoBan) : '']
    ];
    
    doc.autoTable({
      startY: workInfoY + 10,
      head: [],
      body: workInfo,
      theme: 'plain',
      styles: {
        font: 'times',
        fontSize: 9,
        cellPadding: 2,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 120 }
      },
      margin: { left: 20, right: 20 }
    });
    
    const insuranceY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont('times', 'bold');
    doc.text('III. SOCIAL & HEALTH INSURANCE', 20, insuranceY);
    
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    
    const insuranceInfo = [
      ['1. Social insurance book no.:', formData.soSoBHXH || ''],
      ['2. Medical registration place:', formData.noiDangKyKCB || ''],
      ['3. Social insurance:', formData.thamGiaBHXH ? 'Yes' : 'No'],
      ['4. Health insurance:', formData.thamGiaBHYT ? 'Yes' : 'No'],
      ['5. Unemployment insurance:', formData.thamGiaBHTN ? 'Yes' : 'No']
    ];
    
    doc.autoTable({
      startY: insuranceY + 10,
      head: [],
      body: insuranceInfo,
      theme: 'plain',
      styles: {
        font: 'times',
        fontSize: 9,
        cellPadding: 2,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 120 }
      },
      margin: { left: 20, right: 20 }
    });
    
    const contactY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont('times', 'bold');
    doc.text('IV. EMERGENCY CONTACT', 20, contactY);
    
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    
    const contactInfo = [
      ['1. Name:', formData.nguoiLienHeKhanCap || ''],
      ['2. Relationship to employee:', formData.quanHeVoiNguoiLD || ''],
      ['3. Phone:', formData.soDienThoaiNguoiLienHe || '']
    ];
    
    doc.autoTable({
      startY: contactY + 10,
      head: [],
      body: contactInfo,
      theme: 'plain',
      styles: {
        font: 'times',
        fontSize: 9,
        cellPadding: 2,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 120 }
      },
      margin: { left: 20, right: 20 }
    });
    
    const additionalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont('times', 'bold');
    doc.text('V. ADDITIONAL INFORMATION', 20, additionalY);
    
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    
    const additionalInfo = [
      ['1. Education:', formData.trinhDoHocVan || ''],
      ['2. Major / field:', formData.chuyenNganh || ''],
      ['3. Foreign languages:', formData.ngoaiNgu || ''],
      ['4. IT skills:', formData.tinHoc || '']
    ];
    
    doc.autoTable({
      startY: additionalY + 10,
      head: [],
      body: additionalInfo,
      theme: 'plain',
      styles: {
        font: 'times',
        fontSize: 9,
        cellPadding: 2,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 120 }
      },
      margin: { left: 20, right: 20 }
    });
    
    const signatureY = doc.lastAutoTable.finalY + 30;
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    doc.text('I certify that the above information is true and correct.', 20, signatureY);
    doc.text('Date .......... / .......... / ..........', 20, signatureY + 15);
    doc.text('Declarant', 20, signatureY + 30);
    doc.text('(Signature, full name)', 20, signatureY + 35);
    
    const employeeName = formData.hoVaTen || 'Employee';
    doc.save(`TK1-TS_${employeeName.replace(/\s+/g, '_')}.pdf`);
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    border: "2px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "16px",
    fontFamily: "inherit",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    backgroundColor: isEditing ? "#fff" : "#f8fafc",
    color: isEditing ? "#1e293b" : "#64748b",
    cursor: isEditing ? "text" : "default"
  };

  const labelStyle = {
    display: "block",
    fontSize: "14px",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "8px",
    marginTop: "16px"
  };

  const sectionTitleStyle = {
    fontSize: "18px",
    fontWeight: "700",
    color: "#1e293b",
    margin: "32px 0 16px 0",
    paddingBottom: "8px",
    borderBottom: "2px solid #e2e8f0"
  };

  const buttonStyle = {
    padding: "12px 24px",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginRight: "12px"
  };

  const editButtonStyle = {
    ...buttonStyle,
    backgroundColor: theme.accent.main,
    color: "#fff"
  };

  const saveButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#10b981",
    color: "#fff"
  };

  const cancelButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#6b7280",
    color: "#fff"
  };

  return (
    <div style={{
      backgroundColor: "#fff",
      borderRadius: "12px",
      padding: "32px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      border: "1px solid #e2e8f0"
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "32px",
        borderBottom: "2px solid #f1f5f9",
        paddingBottom: "16px"
      }}>
        <div>
          <h2 style={{
            fontSize: "24px",
            fontWeight: "700",
            color: "#1e293b",
            margin: "0 0 4px 0"
          }}>
            🏥 Social & health insurance declaration (TK1-TS)
          </h2>
          <p style={{
            fontSize: "16px",
            color: "#64748b",
            margin: 0
          }}>
            Form TK1-TS — employee information
          </p>
        </div>
        <div>
          {!isEditing ? (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setIsEditing(true)}
                style={editButtonStyle}
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                ✏️ Edit
              </button>
              <button
                onClick={exportToPDF}
                style={{
                  ...buttonStyle,
                  backgroundColor: "#dc2626",
                  color: "#fff"
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                📄 Export PDF
              </button>
            </div>
          ) : (
            <div>
              <button
                onClick={handleSave}
                disabled={isLoading}
                style={saveButtonStyle}
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                {isLoading ? "⏳ Saving…" : "💾 Save"}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  if (selectedEmployee) loadEmployeeData(selectedEmployee);
                }}
                style={cancelButtonStyle}
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                ❌ Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Employee selector */}
      <div style={{ marginBottom: "32px" }}>
        <label style={labelStyle}>Employee</label>
        <select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          style={inputStyle}
        >
          <option value="">-- Select employee --</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>
              {emp.employeeCode} - {emp.name}
            </option>
          ))}
        </select>
      </div>

      {selectedEmployee && (
        <div>
          {/* Personal */}
          <h3 style={sectionTitleStyle}>👤 Personal information</h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "24px"
          }}>
            <div>
              <label style={labelStyle}>Full name</label>
              <input
                type="text"
                value={formData.hoVaTen}
                onChange={(e) => handleInputChange('hoVaTen', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Enter full name…"
              />
            </div>

            <div>
              <label style={labelStyle}>Date of birth</label>
              <input
                type="date"
                value={formData.ngaySinh}
                onChange={(e) => handleInputChange('ngaySinh', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Gender</label>
              <select
                value={formData.gioiTinh}
                onChange={(e) => handleInputChange('gioiTinh', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
              >
                <option value="">-- Select gender --</option>
                <option value="Nam">Male</option>
                <option value="Nữ">Female</option>
                <option value="Khác">Other</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>ID card number</label>
              <input
                type="text"
                value={formData.soCCCD}
                onChange={(e) => handleInputChange('soCCCD', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Enter national ID…"
              />
            </div>

            <div>
              <label style={labelStyle}>ID issue date</label>
              <input
                type="date"
                value={formData.ngayCapCCCD}
                onChange={(e) => handleInputChange('ngayCapCCCD', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Place of issue</label>
              <input
                type="text"
                value={formData.noiCapCCCD}
                onChange={(e) => handleInputChange('noiCapCCCD', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Place of issue…"
              />
            </div>
          </div>

          {/* Address */}
          <h3 style={sectionTitleStyle}>🏠 Address</h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "24px"
          }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Permanent address</label>
              <input
                type="text"
                value={formData.diaChiThuongTru}
                onChange={(e) => handleInputChange('diaChiThuongTru', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Permanent address…"
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Temporary address</label>
              <input
                type="text"
                value={formData.diaChiTamTru}
                onChange={(e) => handleInputChange('diaChiTamTru', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Temporary address…"
              />
            </div>

            <div>
              <label style={labelStyle}>Phone</label>
              <input
                type="tel"
                value={formData.soDienThoai}
                onChange={(e) => handleInputChange('soDienThoai', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Phone number…"
              />
            </div>

            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Email address…"
              />
            </div>
          </div>

          {/* Job */}
          <h3 style={sectionTitleStyle}>💼 Job information</h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "24px"
          }}>
            <div>
              <label style={labelStyle}>Position</label>
              <input
                type="text"
                value={formData.chucVu}
                onChange={(e) => handleInputChange('chucVu', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Job title…"
              />
            </div>

            <div>
              <label style={labelStyle}>Department</label>
              <input
                type="text"
                value={formData.phongBan}
                onChange={(e) => handleInputChange('phongBan', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Department…"
              />
            </div>

            <div>
              <label style={labelStyle}>Start date</label>
              <input
                type="date"
                value={formData.ngayBatDauLamViec}
                onChange={(e) => handleInputChange('ngayBatDauLamViec', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Contract type</label>
              <select
                value={formData.loaiHopDong}
                onChange={(e) => handleInputChange('loaiHopDong', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
              >
                <option value="">-- Select contract type --</option>
                <option value="Không xác định thời hạn">Indefinite term</option>
                <option value="Xác định thời hạn">Fixed term</option>
                <option value="Thời vụ">Seasonal</option>
                <option value="Thử việc">Probation</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Contract duration</label>
              <input
                type="text"
                value={formData.thoiHanHopDong}
                onChange={(e) => handleInputChange('thoiHanHopDong', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="e.g. 2 years, 6 months…"
              />
            </div>

            <div>
              <label style={labelStyle}>Base salary (VND)</label>
              <input
                type="number"
                value={formData.luongCoBan}
                onChange={(e) => handleInputChange('luongCoBan', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Base salary…"
              />
            </div>
          </div>

          {/* Insurance */}
          <h3 style={sectionTitleStyle}>🛡️ Social / health / unemployment insurance</h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "24px"
          }}>
            <div>
              <label style={labelStyle}>Social insurance book no.</label>
              <input
                type="text"
                value={formData.soSoBHXH}
                onChange={(e) => handleInputChange('soSoBHXH', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Book number…"
              />
            </div>

            <div>
              <label style={labelStyle}>Medical registration place</label>
              <input
                type="text"
                value={formData.noiDangKyKCB}
                onChange={(e) => handleInputChange('noiDangKyKCB', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Where registered for care…"
              />
            </div>

            <div>
              <label style={labelStyle}>Social insurance</label>
              <select
                value={formData.thamGiaBHXH}
                onChange={(e) => handleInputChange('thamGiaBHXH', e.target.value === 'true')}
                disabled={!isEditing}
                style={inputStyle}
              >
                <option value={true}>Yes</option>
                <option value={false}>No</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Health insurance</label>
              <select
                value={formData.thamGiaBHYT}
                onChange={(e) => handleInputChange('thamGiaBHYT', e.target.value === 'true')}
                disabled={!isEditing}
                style={inputStyle}
              >
                <option value={true}>Yes</option>
                <option value={false}>No</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Unemployment insurance</label>
              <select
                value={formData.thamGiaBHTN}
                onChange={(e) => handleInputChange('thamGiaBHTN', e.target.value === 'true')}
                disabled={!isEditing}
                style={inputStyle}
              >
                <option value={false}>No</option>
                <option value={true}>Yes</option>
              </select>
            </div>
          </div>

          {/* Emergency contact */}
          <h3 style={sectionTitleStyle}>🚨 Emergency contact</h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "24px"
          }}>
            <div>
              <label style={labelStyle}>Contact name</label>
              <input
                type="text"
                value={formData.nguoiLienHeKhanCap}
                onChange={(e) => handleInputChange('nguoiLienHeKhanCap', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Full name…"
              />
            </div>

            <div>
              <label style={labelStyle}>Relationship to employee</label>
              <input
                type="text"
                value={formData.quanHeVoiNguoiLD}
                onChange={(e) => handleInputChange('quanHeVoiNguoiLD', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="e.g. spouse, parent…"
              />
            </div>

            <div>
              <label style={labelStyle}>Contact phone</label>
              <input
                type="tel"
                value={formData.soDienThoaiNguoiLienHe}
                onChange={(e) => handleInputChange('soDienThoaiNguoiLienHe', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Phone…"
              />
            </div>
          </div>

          {/* Additional */}
          <h3 style={sectionTitleStyle}>📚 Additional information</h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "24px"
          }}>
            <div>
              <label style={labelStyle}>Education</label>
              <select
                value={formData.trinhDoHocVan}
                onChange={(e) => handleInputChange('trinhDoHocVan', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
              >
                <option value="">-- Select level --</option>
                <option value="Tiến sĩ">PhD</option>
                <option value="Thạc sĩ">Master</option>
                <option value="Đại học">University</option>
                <option value="Cao đẳng">College</option>
                <option value="Trung cấp">Intermediate</option>
                <option value="Trung học phổ thông">High school</option>
                <option value="Trung học cơ sở">Lower secondary</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Major / field</label>
              <input
                type="text"
                value={formData.chuyenNganh}
                onChange={(e) => handleInputChange('chuyenNganh', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Field of study…"
              />
            </div>

            <div>
              <label style={labelStyle}>Languages</label>
              <input
                type="text"
                value={formData.ngoaiNgu}
                onChange={(e) => handleInputChange('ngoaiNgu', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="e.g. English B2, Japanese N3…"
              />
            </div>

            <div>
              <label style={labelStyle}>IT skills</label>
              <input
                type="text"
                value={formData.tinHoc}
                onChange={(e) => handleInputChange('tinHoc', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="e.g. MOS Word, Excel…"
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Work experience</label>
              <textarea
                value={formData.kinhNghiem}
                onChange={(e) => handleInputChange('kinhNghiem', e.target.value)}
                disabled={!isEditing}
                style={{
                  ...inputStyle,
                  minHeight: "100px",
                  resize: "vertical"
                }}
                placeholder="Experience and professional skills…"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TK1TSForm;