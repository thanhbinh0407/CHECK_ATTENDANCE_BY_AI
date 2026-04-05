import { useState, useEffect } from "react";
import { theme } from "../theme.js";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const D02LTReport = () => {
  const [formData, setFormData] = useState({
    tenDonVi: "",
    maDonVi: "",
    maSoThue: "",
    diaChi: "",
    soDienThoai: "",
    email: "",
    ngay: "",
    thang: "",
    nam: ""
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadD02LTData();
  }, []);

  const loadD02LTData = async () => {
    try {
      const response = await fetch('/api/d02-lt', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setFormData(data);
      }
    } catch (error) {
      console.error('Error loading D02-LT data:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/d02-lt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert('Data saved successfully.');
        setIsEditing(false);
      } else {
        alert('An error occurred while saving.');
      }
    } catch (error) {
      console.error('Error saving D02-LT data:', error);
      alert('An error occurred while saving.');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFont('times', 'normal');
    
    doc.setFontSize(16);
    doc.setFont('times', 'bold');
    doc.text('EMPLOYMENT STATUS & SOCIAL / HEALTH / UNEMPLOYMENT INSURANCE', 105, 20, { align: 'center' });
    doc.text('PARTICIPATION REPORT', 105, 30, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('times', 'normal');
    doc.text('(Form D02-LT)', 105, 40, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('times', 'bold');
    doc.text('REPORTING UNIT INFORMATION', 20, 60);
    
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    
    const tableData = [
      ['Unit name:', formData.tenDonVi || ''],
      ['Unit code:', formData.maDonVi || ''],
      ['Tax ID:', formData.maSoThue || ''],
      ['Address:', formData.diaChi || ''],
      ['Phone:', formData.soDienThoai || ''],
      ['Email:', formData.email || ''],
      ['Day:', formData.ngay || ''],
      ['Month:', formData.thang || ''],
      ['Year:', formData.nam || '']
    ];
    
    doc.autoTable({
      startY: 70,
      head: [],
      body: tableData,
      theme: 'plain',
      styles: {
        font: 'times',
        fontSize: 10,
        cellPadding: 3,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { cellWidth: 120 }
      },
      margin: { left: 20, right: 20 }
    });
    
    const finalY = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(12);
    doc.setFont('times', 'bold');
    doc.text('REPORTING PERSON', 20, finalY);
    
    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    doc.text('Full name: ...................................................... Title: ......................................................', 20, finalY + 15);
    doc.text('Phone: ................................................... Email: .........................................................', 20, finalY + 25);
    
    doc.text(`Date ${formData.ngay || ''} / month ${formData.thang || ''} / year ${formData.nam || ''}`, 20, finalY + 40);
    doc.text('Reporter', 20, finalY + 50);
    doc.text('(Signature, full name)', 20, finalY + 55);
    
    doc.save(`Report_D02-LT_${formData.nam || '2024'}.pdf`);
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
            📋 Employment & insurance participation report
          </h2>
          <p style={{
            fontSize: "16px",
            color: "#64748b",
            margin: 0
          }}>
            Form D02-LT — reporting unit details
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
                  loadD02LTData();
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

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "24px"
      }}>
        <div>
          <label style={labelStyle}>Unit name</label>
          <input
            type="text"
            value={formData.tenDonVi}
            onChange={(e) => handleInputChange('tenDonVi', e.target.value)}
            disabled={!isEditing}
            style={inputStyle}
            placeholder="Enter unit name…"
          />
        </div>

        <div>
          <label style={labelStyle}>Unit code</label>
          <input
            type="text"
            value={formData.maDonVi}
            onChange={(e) => handleInputChange('maDonVi', e.target.value)}
            disabled={!isEditing}
            style={inputStyle}
            placeholder="Enter unit code…"
          />
        </div>

        <div>
          <label style={labelStyle}>Tax ID</label>
          <input
            type="text"
            value={formData.maSoThue}
            onChange={(e) => handleInputChange('maSoThue', e.target.value)}
            disabled={!isEditing}
            style={inputStyle}
            placeholder="Enter tax ID…"
          />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Address</label>
          <input
            type="text"
            value={formData.diaChi}
            onChange={(e) => handleInputChange('diaChi', e.target.value)}
            disabled={!isEditing}
            style={inputStyle}
            placeholder="Enter address…"
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
            placeholder="Enter phone…"
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
            placeholder="Enter email…"
          />
        </div>

        <div>
          <label style={labelStyle}>Day</label>
          <input
            type="number"
            min="1"
            max="31"
            value={formData.ngay}
            onChange={(e) => handleInputChange('ngay', e.target.value)}
            disabled={!isEditing}
            style={inputStyle}
            placeholder="DD"
          />
        </div>

        <div>
          <label style={labelStyle}>Month</label>
          <input
            type="number"
            min="1"
            max="12"
            value={formData.thang}
            onChange={(e) => handleInputChange('thang', e.target.value)}
            disabled={!isEditing}
            style={inputStyle}
            placeholder="MM"
          />
        </div>

        <div>
          <label style={labelStyle}>Year</label>
          <input
            type="number"
            min="2000"
            max="2100"
            value={formData.nam}
            onChange={(e) => handleInputChange('nam', e.target.value)}
            disabled={!isEditing}
            style={inputStyle}
            placeholder="YYYY"
          />
        </div>
      </div>
    </div>
  );
};

export default D02LTReport;
