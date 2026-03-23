import { useState, useEffect } from "react";
import { theme } from "../theme.js";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const TK1TSForm = () => {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    // Thông tin người lao động
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

    // Thông tin công việc
    chucVu: "",
    phongBan: "",
    ngayBatDauLamViec: "",
    loaiHopDong: "",
    thoiHanHopDong: "",
    luongCoBan: "",
    phuCap: "",

    // Thông tin BHXH/BHYT
    soSoBHXH: "",
    noiDangKyKCB: "",
    thamGiaBHXH: true,
    thamGiaBHYT: true,
    thamGiaBHTN: false,
    tyLeDongBHXH: "",
    tyLeDongBHYT: "",
    tyLeDongBHTN: "",

    // Thông tin người liên hệ khẩn cấp
    nguoiLienHeKhanCap: "",
    quanHeVoiNguoiLD: "",
    soDienThoaiNguoiLienHe: "",

    // Thông tin bổ sung
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
      console.error('Lỗi khi tải danh sách nhân viên:', error);
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
      console.error('Lỗi khi tải dữ liệu nhân viên:', error);
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
      alert('Vui lòng chọn nhân viên!');
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
        alert('Dữ liệu đã được lưu thành công!');
        setIsEditing(false);
      } else {
        alert('Có lỗi xảy ra khi lưu dữ liệu!');
      }
    } catch (error) {
      console.error('Lỗi khi lưu dữ liệu TK1-TS:', error);
      alert('Có lỗi xảy ra khi lưu dữ liệu!');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToPDF = () => {
    if (!selectedEmployee) {
      alert('Vui lòng chọn nhân viên trước khi xuất PDF!');
      return;
    }

    const doc = new jsPDF();
    
    // Thiết lập font hỗ trợ tiếng Việt
    doc.setFont('times', 'normal');
    
    // Tiêu đề chính
    doc.setFontSize(16);
    doc.setFont('times', 'bold');
    doc.text('TỜ KHAI', 105, 20, { align: 'center' });
    doc.text('THAM GIA BẢO HIỂM XÃ HỘI, BẢO HIỂM Y TẾ', 105, 30, { align: 'center' });
    
    // Mẫu TK1-TS
    doc.setFontSize(12);
    doc.setFont('times', 'normal');
    doc.text('(Mẫu TK1-TS)', 105, 40, { align: 'center' });
    
    // Thông tin người lao động
    doc.setFontSize(14);
    doc.setFont('times', 'bold');
    doc.text('I. THÔNG TIN NGƯỜI LAO ĐỘNG', 20, 60);
    
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    
    // Tạo bảng thông tin cá nhân
    const personalInfo = [
      ['1. Họ và tên:', formData.hoVaTen || ''],
      ['2. Ngày sinh:', formData.ngaySinh ? new Date(formData.ngaySinh).toLocaleDateString('vi-VN') : ''],
      ['3. Giới tính:', formData.gioiTinh === 'Nam' ? 'Nam' : formData.gioiTinh === 'Nữ' ? 'Nữ' : ''],
      ['4. Số CCCD/CMND:', formData.soCCCD || ''],
      ['5. Ngày cấp:', formData.ngayCapCCCD ? new Date(formData.ngayCapCCCD).toLocaleDateString('vi-VN') : ''],
      ['6. Nơi cấp:', formData.noiCapCCCD || ''],
      ['7. Địa chỉ thường trú:', formData.diaChiThuongTru || ''],
      ['8. Địa chỉ tạm trú:', formData.diaChiTamTru || ''],
      ['9. Số điện thoại:', formData.soDienThoai || ''],
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
    
    // Thông tin công việc
    const workInfoY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont('times', 'bold');
    doc.text('II. THÔNG TIN CÔNG VIỆC', 20, workInfoY);
    
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    
    const workInfo = [
      ['1. Chức vụ:', formData.chucVu || ''],
      ['2. Phòng ban:', formData.phongBan || ''],
      ['3. Ngày bắt đầu làm việc:', formData.ngayBatDauLamViec ? new Date(formData.ngayBatDauLamViec).toLocaleDateString('vi-VN') : ''],
      ['4. Loại hợp đồng:', formData.loaiHopDong || ''],
      ['5. Thời hạn hợp đồng:', formData.thoiHanHopDong || ''],
      ['6. Lương cơ bản:', formData.luongCoBan ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(formData.luongCoBan) : '']
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
    
    // Thông tin BHXH/BHYT
    const insuranceY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont('times', 'bold');
    doc.text('III. THÔNG TIN BẢO HIỂM XÃ HỘI, BẢO HIỂM Y TẾ', 20, insuranceY);
    
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    
    const insuranceInfo = [
      ['1. Số sổ BHXH:', formData.soSoBHXH || ''],
      ['2. Nơi đăng ký KCB:', formData.noiDangKyKCB || ''],
      ['3. Tham gia BHXH:', formData.thamGiaBHXH ? 'Có' : 'Không'],
      ['4. Tham gia BHYT:', formData.thamGiaBHYT ? 'Có' : 'Không'],
      ['5. Tham gia BHTN:', formData.thamGiaBHTN ? 'Có' : 'Không']
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
    
    // Người liên hệ khẩn cấp
    const contactY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont('times', 'bold');
    doc.text('IV. NGƯỜI LIÊN HỆ KHẨN CẤP', 20, contactY);
    
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    
    const contactInfo = [
      ['1. Họ tên:', formData.nguoiLienHeKhanCap || ''],
      ['2. Quan hệ với người lao động:', formData.quanHeVoiNguoiLD || ''],
      ['3. Số điện thoại:', formData.soDienThoaiNguoiLienHe || '']
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
    
    // Thông tin bổ sung
    const additionalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont('times', 'bold');
    doc.text('V. THÔNG TIN BỔ SUNG', 20, additionalY);
    
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    
    const additionalInfo = [
      ['1. Trình độ học vấn:', formData.trinhDoHocVan || ''],
      ['2. Chuyên ngành:', formData.chuyenNganh || ''],
      ['3. Ngoại ngữ:', formData.ngoaiNgu || ''],
      ['4. Tin học:', formData.tinHoc || '']
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
    
    // Chữ ký
    const signatureY = doc.lastAutoTable.finalY + 30;
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    doc.text('Tôi cam kết những thông tin trên là đúng sự thật.', 20, signatureY);
    doc.text('Ngày ...... tháng ...... năm ......', 20, signatureY + 15);
    doc.text('Người khai', 20, signatureY + 30);
    doc.text('(Ký, ghi rõ họ tên)', 20, signatureY + 35);
    
    // Lưu file
    const employeeName = formData.hoVaTen || 'NhanVien';
    doc.save(`ToKhai_TK1-TS_${employeeName.replace(/\s+/g, '_')}.pdf`);
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
            🏥 Mẫu Tờ Khai Tham Gia BHXH/BHYT
          </h2>
          <p style={{
            fontSize: "16px",
            color: "#64748b",
            margin: 0
          }}>
            Mẫu TK1-TS - Thông Tin Người Lao Động
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
                ✏️ Chỉnh sửa
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
                📄 Xuất PDF
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
                {isLoading ? "⏳ Đang lưu..." : "💾 Lưu"}
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
                ❌ Hủy
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chọn nhân viên */}
      <div style={{ marginBottom: "32px" }}>
        <label style={labelStyle}>Chọn Nhân Viên</label>
        <select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          style={inputStyle}
        >
          <option value="">-- Chọn nhân viên --</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>
              {emp.employeeCode} - {emp.name}
            </option>
          ))}
        </select>
      </div>

      {selectedEmployee && (
        <div>
          {/* Thông tin cá nhân */}
          <h3 style={sectionTitleStyle}>👤 Thông Tin Cá Nhân</h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "24px"
          }}>
            <div>
              <label style={labelStyle}>Họ và Tên</label>
              <input
                type="text"
                value={formData.hoVaTen}
                onChange={(e) => handleInputChange('hoVaTen', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Nhập họ và tên đầy đủ..."
              />
            </div>

            <div>
              <label style={labelStyle}>Ngày Sinh</label>
              <input
                type="date"
                value={formData.ngaySinh}
                onChange={(e) => handleInputChange('ngaySinh', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Giới Tính</label>
              <select
                value={formData.gioiTinh}
                onChange={(e) => handleInputChange('gioiTinh', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
              >
                <option value="">-- Chọn giới tính --</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Số CCCD/CMND</label>
              <input
                type="text"
                value={formData.soCCCD}
                onChange={(e) => handleInputChange('soCCCD', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Nhập số CCCD/CMND..."
              />
            </div>

            <div>
              <label style={labelStyle}>Ngày Cấp CCCD</label>
              <input
                type="date"
                value={formData.ngayCapCCCD}
                onChange={(e) => handleInputChange('ngayCapCCCD', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Nơi Cấp CCCD</label>
              <input
                type="text"
                value={formData.noiCapCCCD}
                onChange={(e) => handleInputChange('noiCapCCCD', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Nhập nơi cấp CCCD..."
              />
            </div>
          </div>

          {/* Địa chỉ */}
          <h3 style={sectionTitleStyle}>🏠 Thông Tin Địa Chỉ</h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "24px"
          }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Địa Chỉ Thường Trú</label>
              <input
                type="text"
                value={formData.diaChiThuongTru}
                onChange={(e) => handleInputChange('diaChiThuongTru', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Nhập địa chỉ thường trú..."
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Địa Chỉ Tạm Trú</label>
              <input
                type="text"
                value={formData.diaChiTamTru}
                onChange={(e) => handleInputChange('diaChiTamTru', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Nhập địa chỉ tạm trú..."
              />
            </div>

            <div>
              <label style={labelStyle}>Số Điện Thoại</label>
              <input
                type="tel"
                value={formData.soDienThoai}
                onChange={(e) => handleInputChange('soDienThoai', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Nhập số điện thoại..."
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
                placeholder="Nhập địa chỉ email..."
              />
            </div>
          </div>

          {/* Thông tin công việc */}
          <h3 style={sectionTitleStyle}>💼 Thông Tin Công Việc</h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "24px"
          }}>
            <div>
              <label style={labelStyle}>Chức Vụ</label>
              <input
                type="text"
                value={formData.chucVu}
                onChange={(e) => handleInputChange('chucVu', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Nhập chức vụ..."
              />
            </div>

            <div>
              <label style={labelStyle}>Phòng Ban</label>
              <input
                type="text"
                value={formData.phongBan}
                onChange={(e) => handleInputChange('phongBan', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Nhập phòng ban..."
              />
            </div>

            <div>
              <label style={labelStyle}>Ngày Bắt Đầu Làm Việc</label>
              <input
                type="date"
                value={formData.ngayBatDauLamViec}
                onChange={(e) => handleInputChange('ngayBatDauLamViec', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Loại Hợp Đồng</label>
              <select
                value={formData.loaiHopDong}
                onChange={(e) => handleInputChange('loaiHopDong', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
              >
                <option value="">-- Chọn loại hợp đồng --</option>
                <option value="Không xác định thời hạn">Không xác định thời hạn</option>
                <option value="Xác định thời hạn">Xác định thời hạn</option>
                <option value="Thời vụ">Thời vụ</option>
                <option value="Thử việc">Thử việc</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Thời Hạn Hợp Đồng</label>
              <input
                type="text"
                value={formData.thoiHanHopDong}
                onChange={(e) => handleInputChange('thoiHanHopDong', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Ví dụ: 2 năm, 6 tháng..."
              />
            </div>

            <div>
              <label style={labelStyle}>Lương Cơ Bản (VNĐ)</label>
              <input
                type="number"
                value={formData.luongCoBan}
                onChange={(e) => handleInputChange('luongCoBan', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Nhập lương cơ bản..."
              />
            </div>
          </div>

          {/* Thông tin BHXH/BHYT */}
          <h3 style={sectionTitleStyle}>🛡️ Thông Tin BHXH/BHYT/BHTN</h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "24px"
          }}>
            <div>
              <label style={labelStyle}>Số Sổ BHXH</label>
              <input
                type="text"
                value={formData.soSoBHXH}
                onChange={(e) => handleInputChange('soSoBHXH', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Nhập số sổ BHXH..."
              />
            </div>

            <div>
              <label style={labelStyle}>Nơi Đăng Ký KCB</label>
              <input
                type="text"
                value={formData.noiDangKyKCB}
                onChange={(e) => handleInputChange('noiDangKyKCB', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Nhập nơi đăng ký khám chữa bệnh..."
              />
            </div>

            <div>
              <label style={labelStyle}>Tham Gia BHXH</label>
              <select
                value={formData.thamGiaBHXH}
                onChange={(e) => handleInputChange('thamGiaBHXH', e.target.value === 'true')}
                disabled={!isEditing}
                style={inputStyle}
              >
                <option value={true}>Có</option>
                <option value={false}>Không</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Tham Gia BHYT</label>
              <select
                value={formData.thamGiaBHYT}
                onChange={(e) => handleInputChange('thamGiaBHYT', e.target.value === 'true')}
                disabled={!isEditing}
                style={inputStyle}
              >
                <option value={true}>Có</option>
                <option value={false}>Không</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Tham Gia BHTN</label>
              <select
                value={formData.thamGiaBHTN}
                onChange={(e) => handleInputChange('thamGiaBHTN', e.target.value === 'true')}
                disabled={!isEditing}
                style={inputStyle}
              >
                <option value={false}>Không</option>
                <option value={true}>Có</option>
              </select>
            </div>
          </div>

          {/* Thông tin liên hệ khẩn cấp */}
          <h3 style={sectionTitleStyle}>🚨 Người Liên Hệ Khẩn Cấp</h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "24px"
          }}>
            <div>
              <label style={labelStyle}>Họ Tên Người Liên Hệ</label>
              <input
                type="text"
                value={formData.nguoiLienHeKhanCap}
                onChange={(e) => handleInputChange('nguoiLienHeKhanCap', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Nhập họ tên người liên hệ..."
              />
            </div>

            <div>
              <label style={labelStyle}>Quan Hệ Với Người Lao Động</label>
              <input
                type="text"
                value={formData.quanHeVoiNguoiLD}
                onChange={(e) => handleInputChange('quanHeVoiNguoiLD', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Ví dụ: Vợ, Chồng, Cha, Mẹ..."
              />
            </div>

            <div>
              <label style={labelStyle}>Số Điện Thoại Liên Hệ</label>
              <input
                type="tel"
                value={formData.soDienThoaiNguoiLienHe}
                onChange={(e) => handleInputChange('soDienThoaiNguoiLienHe', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Nhập số điện thoại liên hệ..."
              />
            </div>
          </div>

          {/* Thông tin bổ sung */}
          <h3 style={sectionTitleStyle}>📚 Thông Tin Bổ Sung</h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "24px"
          }}>
            <div>
              <label style={labelStyle}>Trình Độ Học Vấn</label>
              <select
                value={formData.trinhDoHocVan}
                onChange={(e) => handleInputChange('trinhDoHocVan', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
              >
                <option value="">-- Chọn trình độ --</option>
                <option value="Tiến sĩ">Tiến sĩ</option>
                <option value="Thạc sĩ">Thạc sĩ</option>
                <option value="Đại học">Đại học</option>
                <option value="Cao đẳng">Cao đẳng</option>
                <option value="Trung cấp">Trung cấp</option>
                <option value="Trung học phổ thông">Trung học phổ thông</option>
                <option value="Trung học cơ sở">Trung học cơ sở</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Chuyên Ngành</label>
              <input
                type="text"
                value={formData.chuyenNganh}
                onChange={(e) => handleInputChange('chuyenNganh', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Nhập chuyên ngành..."
              />
            </div>

            <div>
              <label style={labelStyle}>Ngoại Ngữ</label>
              <input
                type="text"
                value={formData.ngoaiNgu}
                onChange={(e) => handleInputChange('ngoaiNgu', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Ví dụ: Tiếng Anh B2, Tiếng Nhật N3..."
              />
            </div>

            <div>
              <label style={labelStyle}>Tin Học</label>
              <input
                type="text"
                value={formData.tinHoc}
                onChange={(e) => handleInputChange('tinHoc', e.target.value)}
                disabled={!isEditing}
                style={inputStyle}
                placeholder="Ví dụ: MOS Word, MOS Excel..."
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Kinh Nghiệm Làm Việc</label>
              <textarea
                value={formData.kinhNghiem}
                onChange={(e) => handleInputChange('kinhNghiem', e.target.value)}
                disabled={!isEditing}
                style={{
                  ...inputStyle,
                  minHeight: "100px",
                  resize: "vertical"
                }}
                placeholder="Mô tả kinh nghiệm làm việc, kỹ năng chuyên môn..."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TK1TSForm;