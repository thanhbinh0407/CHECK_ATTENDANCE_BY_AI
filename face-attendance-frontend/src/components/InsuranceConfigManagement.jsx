import React, { useState, useEffect } from "react";
import { theme } from "../styles/theme.js";

export default function InsuranceConfigManagement() {
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
  const token = localStorage.getItem("authToken");

  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    effectiveDate: new Date().toISOString().split('T')[0],
    expiryDate: "",
    employeeSocialInsuranceRate: 10.5,
    employerSocialInsuranceRate: 21.5,
    employeeHealthInsuranceRate: 1.5,
    employerHealthInsuranceRate: 3.0,
    employeeUnemploymentInsuranceRate: 1.0,
    employerUnemploymentInsuranceRate: 1.0,
    maxInsuranceSalary: "",
    minInsuranceSalary: "",
    isActive: true,
    description: ""
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      setMessage("");
      const res = await fetch(`${apiBase}/api/insurance-configs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load insurance configs");
      setConfigs(data.configs || []);
    } catch (err) {
      console.error(err);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage("");
      const url = editingConfig
        ? `${apiBase}/api/insurance-configs/${editingConfig.id}`
        : `${apiBase}/api/insurance-configs`;
      const method = editingConfig ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          maxInsuranceSalary: formData.maxInsuranceSalary ? parseFloat(formData.maxInsuranceSalary) : null,
          minInsuranceSalary: formData.minInsuranceSalary ? parseFloat(formData.minInsuranceSalary) : null
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Operation failed");
      
      setMessage(`✅ Insurance config ${editingConfig ? "updated" : "created"} successfully!`);
      setShowForm(false);
      setEditingConfig(null);
      setFormData({
        name: "",
        effectiveDate: new Date().toISOString().split('T')[0],
        expiryDate: "",
        employeeSocialInsuranceRate: 10.5,
        employerSocialInsuranceRate: 21.5,
        employeeHealthInsuranceRate: 1.5,
        employerHealthInsuranceRate: 3.0,
        employeeUnemploymentInsuranceRate: 1.0,
        employerUnemploymentInsuranceRate: 1.0,
        maxInsuranceSalary: "",
        minInsuranceSalary: "",
        isActive: true,
        description: ""
      });
      fetchConfigs();
      setTimeout(() => setMessage(""), 5000);
    } catch (err) {
      console.error(err);
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (config) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      effectiveDate: config.effectiveDate,
      expiryDate: config.expiryDate || "",
      employeeSocialInsuranceRate: config.employeeSocialInsuranceRate,
      employerSocialInsuranceRate: config.employerSocialInsuranceRate,
      employeeHealthInsuranceRate: config.employeeHealthInsuranceRate,
      employerHealthInsuranceRate: config.employerHealthInsuranceRate,
      employeeUnemploymentInsuranceRate: config.employeeUnemploymentInsuranceRate,
      employerUnemploymentInsuranceRate: config.employerUnemploymentInsuranceRate,
      maxInsuranceSalary: config.maxInsuranceSalary?.toString() || "",
      minInsuranceSalary: config.minInsuranceSalary?.toString() || "",
      isActive: config.isActive !== undefined ? config.isActive : true,
      description: config.description || ""
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this insurance config?")) return;
    
    try {
      setLoading(true);
      setMessage("");
      const res = await fetch(`${apiBase}/api/insurance-configs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Delete failed");
      
      setMessage("✅ Insurance config deleted successfully!");
      fetchConfigs();
      setTimeout(() => setMessage(""), 5000);
    } catch (err) {
      console.error(err);
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND"
    }).format(amount || 0);
  };

  const cardStyle = {
    backgroundColor: theme.neutral.white,
    borderRadius: theme.radius.lg,
    border: `1px solid ${theme.neutral.gray200}`,
    boxShadow: theme.shadows.sm,
    padding: theme.spacing.xl,
  };

  return (
    <div style={{ display: "grid", gap: theme.spacing.xl }}>
      <div style={{ ...cardStyle, background: theme.gradients.primary, color: theme.neutral.white, border: "none" }}>
        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>🛡️ Insurance & Cost Configuration</div>
        <div style={{ opacity: 0.95 }}>Manage insurance rates (BHXH, BHYT, BHTN) and other cost configurations for salary calculations.</div>
      </div>

      {message && (
        <div style={{
          padding: theme.spacing.md,
          borderRadius: theme.radius.md,
          backgroundColor: message.includes("✅") ? theme.success.light : theme.error.light,
          border: `1px solid ${message.includes("✅") ? theme.success.main : theme.error.main}`,
          fontWeight: 700,
          color: message.includes("✅") ? theme.success.dark : theme.error.dark
        }}>
          {message}
        </div>
      )}

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: theme.spacing.lg }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: theme.primary.main, margin: 0 }}>
            Insurance Configurations
          </h3>
          <button
            onClick={() => {
              setEditingConfig(null);
              setFormData({
                name: "",
                effectiveDate: new Date().toISOString().split('T')[0],
                expiryDate: "",
                employeeSocialInsuranceRate: 10.5,
                employerSocialInsuranceRate: 21.5,
                employeeHealthInsuranceRate: 1.5,
                employerHealthInsuranceRate: 3.0,
                employeeUnemploymentInsuranceRate: 1.0,
                employerUnemploymentInsuranceRate: 1.0,
                maxInsuranceSalary: "",
                minInsuranceSalary: "",
                isActive: true,
                description: ""
              });
              setShowForm(true);
            }}
            style={{
              padding: "10px 20px",
              backgroundColor: theme.primary.main,
              color: theme.neutral.white,
              border: "none",
              borderRadius: theme.radius.md,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "14px"
            }}
          >
            + Add Configuration
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: theme.spacing.xl }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Loading...</div>
          </div>
        ) : configs.length === 0 ? (
          <div style={{ textAlign: "center", padding: theme.spacing.xl, color: theme.neutral.gray500 }}>
            <p>No insurance configurations found. Create your first configuration.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: theme.spacing.md }}>
            {configs.map((config) => (
              <div
                key={config.id}
                style={{
                  border: `2px solid ${config.isActive ? theme.success.main : theme.neutral.gray300}`,
                  borderRadius: theme.radius.md,
                  padding: theme.spacing.lg,
                  backgroundColor: config.isActive ? theme.success.light : theme.neutral.white,
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = theme.shadows.md;
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: theme.spacing.md }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm, marginBottom: theme.spacing.xs }}>
                      <h4 style={{ fontSize: 18, fontWeight: 700, color: theme.neutral.gray900, margin: 0 }}>
                        {config.name}
                      </h4>
                      {config.isActive && (
                        <span style={{
                          padding: "4px 12px",
                          borderRadius: theme.radius.sm,
                          fontSize: "11px",
                          fontWeight: 600,
                          backgroundColor: theme.success.main,
                          color: theme.neutral.white,
                          textTransform: "uppercase"
                        }}>
                          Active
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "12px", color: theme.neutral.gray600, marginBottom: theme.spacing.xs }}>
                      Effective: {new Date(config.effectiveDate).toLocaleDateString("vi-VN")}
                      {config.expiryDate && ` - ${new Date(config.expiryDate).toLocaleDateString("vi-VN")}`}
                    </div>
                    {config.description && (
                      <div style={{ fontSize: "13px", color: theme.neutral.gray700, marginTop: theme.spacing.xs }}>
                        {config.description}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: theme.spacing.xs }}>
                    <button
                      onClick={() => handleEdit(config)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: theme.primary.main,
                        color: theme.neutral.white,
                        border: "none",
                        borderRadius: theme.radius.sm,
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: 600
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(config.id)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: theme.error.main,
                        color: theme.neutral.white,
                        border: "none",
                        borderRadius: theme.radius.sm,
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: 600
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Rates Display */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: theme.spacing.md,
                  padding: theme.spacing.md,
                  backgroundColor: theme.neutral.gray50,
                  borderRadius: theme.radius.md,
                  marginTop: theme.spacing.md
                }}>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: theme.neutral.gray700, marginBottom: theme.spacing.xs, textTransform: "uppercase" }}>
                      Employee Rates (%)
                    </div>
                    <div style={{ fontSize: "13px", color: theme.neutral.gray700, lineHeight: "1.8" }}>
                      <div>BHXH: <strong>{config.employeeSocialInsuranceRate}%</strong></div>
                      <div>BHYT: <strong>{config.employeeHealthInsuranceRate}%</strong></div>
                      <div>BHTN: <strong>{config.employeeUnemploymentInsuranceRate}%</strong></div>
                      <div style={{ marginTop: "4px", fontSize: "11px", color: theme.neutral.gray600 }}>
                        Total: <strong>{(parseFloat(config.employeeSocialInsuranceRate) + parseFloat(config.employeeHealthInsuranceRate) + parseFloat(config.employeeUnemploymentInsuranceRate)).toFixed(2)}%</strong>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: theme.neutral.gray700, marginBottom: theme.spacing.xs, textTransform: "uppercase" }}>
                      Employer Rates (%)
                    </div>
                    <div style={{ fontSize: "13px", color: theme.neutral.gray700, lineHeight: "1.8" }}>
                      <div>BHXH: <strong>{config.employerSocialInsuranceRate}%</strong></div>
                      <div>BHYT: <strong>{config.employerHealthInsuranceRate}%</strong></div>
                      <div>BHTN: <strong>{config.employerUnemploymentInsuranceRate}%</strong></div>
                      <div style={{ marginTop: "4px", fontSize: "11px", color: theme.neutral.gray600 }}>
                        Total: <strong>{(parseFloat(config.employerSocialInsuranceRate) + parseFloat(config.employerHealthInsuranceRate) + parseFloat(config.employerUnemploymentInsuranceRate)).toFixed(2)}%</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Salary Limits */}
                {(config.maxInsuranceSalary || config.minInsuranceSalary) && (
                  <div style={{
                    marginTop: theme.spacing.md,
                    padding: theme.spacing.md,
                    backgroundColor: theme.neutral.gray50,
                    borderRadius: theme.radius.md
                  }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: theme.neutral.gray700, marginBottom: theme.spacing.xs, textTransform: "uppercase" }}>
                      Salary Limits
                    </div>
                    <div style={{ fontSize: "13px", color: theme.neutral.gray700 }}>
                      {config.minInsuranceSalary && (
                        <div>Min: <strong>{formatCurrency(config.minInsuranceSalary)}</strong></div>
                      )}
                      {config.maxInsuranceSalary && (
                        <div>Max: <strong>{formatCurrency(config.maxInsuranceSalary)}</strong></div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px"
          }}
          onClick={() => setShowForm(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: theme.radius.lg,
              padding: theme.spacing.xl,
              maxWidth: "800px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: theme.shadows.lg
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: theme.spacing.lg, color: theme.primary.main }}>
              {editingConfig ? "Edit Insurance Configuration" : "Create Insurance Configuration"}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
                <div>
                  <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g., BHXH 2024"
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: `2px solid ${theme.neutral.gray300}`,
                      borderRadius: theme.radius.md,
                      fontSize: "14px"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>
                    Effective Date *
                  </label>
                  <input
                    type="date"
                    value={formData.effectiveDate}
                    onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                    required
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: `2px solid ${theme.neutral.gray300}`,
                      borderRadius: theme.radius.md,
                      fontSize: "14px"
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: theme.spacing.md }}>
                <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: `2px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.md,
                    fontSize: "14px"
                  }}
                />
              </div>

              <div style={{ marginBottom: theme.spacing.lg }}>
                <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: theme.spacing.md, color: theme.primary.main }}>
                  Employee Insurance Rates (%)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: theme.spacing.md }}>
                  <div>
                    <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "13px" }}>
                      BHXH (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.employeeSocialInsuranceRate}
                      onChange={(e) => setFormData({ ...formData, employeeSocialInsuranceRate: parseFloat(e.target.value) || 0 })}
                      required
                      style={{
                        width: "100%",
                        padding: "12px",
                        border: `2px solid ${theme.neutral.gray300}`,
                        borderRadius: theme.radius.md,
                        fontSize: "14px"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "13px" }}>
                      BHYT (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.employeeHealthInsuranceRate}
                      onChange={(e) => setFormData({ ...formData, employeeHealthInsuranceRate: parseFloat(e.target.value) || 0 })}
                      required
                      style={{
                        width: "100%",
                        padding: "12px",
                        border: `2px solid ${theme.neutral.gray300}`,
                        borderRadius: theme.radius.md,
                        fontSize: "14px"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "13px" }}>
                      BHTN (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.employeeUnemploymentInsuranceRate}
                      onChange={(e) => setFormData({ ...formData, employeeUnemploymentInsuranceRate: parseFloat(e.target.value) || 0 })}
                      required
                      style={{
                        width: "100%",
                        padding: "12px",
                        border: `2px solid ${theme.neutral.gray300}`,
                        borderRadius: theme.radius.md,
                        fontSize: "14px"
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: theme.spacing.lg }}>
                <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: theme.spacing.md, color: theme.primary.main }}>
                  Employer Insurance Rates (%)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: theme.spacing.md }}>
                  <div>
                    <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "13px" }}>
                      BHXH (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.employerSocialInsuranceRate}
                      onChange={(e) => setFormData({ ...formData, employerSocialInsuranceRate: parseFloat(e.target.value) || 0 })}
                      required
                      style={{
                        width: "100%",
                        padding: "12px",
                        border: `2px solid ${theme.neutral.gray300}`,
                        borderRadius: theme.radius.md,
                        fontSize: "14px"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "13px" }}>
                      BHYT (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.employerHealthInsuranceRate}
                      onChange={(e) => setFormData({ ...formData, employerHealthInsuranceRate: parseFloat(e.target.value) || 0 })}
                      required
                      style={{
                        width: "100%",
                        padding: "12px",
                        border: `2px solid ${theme.neutral.gray300}`,
                        borderRadius: theme.radius.md,
                        fontSize: "14px"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "13px" }}>
                      BHTN (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.employerUnemploymentInsuranceRate}
                      onChange={(e) => setFormData({ ...formData, employerUnemploymentInsuranceRate: parseFloat(e.target.value) || 0 })}
                      required
                      style={{
                        width: "100%",
                        padding: "12px",
                        border: `2px solid ${theme.neutral.gray300}`,
                        borderRadius: theme.radius.md,
                        fontSize: "14px"
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
                <div>
                  <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>
                    Min Insurance Salary (VND)
                  </label>
                  <input
                    type="number"
                    value={formData.minInsuranceSalary}
                    onChange={(e) => setFormData({ ...formData, minInsuranceSalary: e.target.value })}
                    min="0"
                    step="1000"
                    placeholder="Optional"
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: `2px solid ${theme.neutral.gray300}`,
                      borderRadius: theme.radius.md,
                      fontSize: "14px"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>
                    Max Insurance Salary (VND)
                  </label>
                  <input
                    type="number"
                    value={formData.maxInsuranceSalary}
                    onChange={(e) => setFormData({ ...formData, maxInsuranceSalary: e.target.value })}
                    min="0"
                    step="1000"
                    placeholder="Optional"
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: `2px solid ${theme.neutral.gray300}`,
                      borderRadius: theme.radius.md,
                      fontSize: "14px"
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: theme.spacing.md }}>
                <label style={{ display: "block", marginBottom: theme.spacing.xs, fontWeight: 600, fontSize: "14px" }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description of this insurance configuration..."
                  rows="3"
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: `2px solid ${theme.neutral.gray300}`,
                    borderRadius: theme.radius.md,
                    fontSize: "14px",
                    resize: "vertical"
                  }}
                />
              </div>

              <div style={{ marginBottom: theme.spacing.lg }}>
                <label style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  <span style={{ fontWeight: 600, fontSize: "14px" }}>Set as Active Configuration</span>
                </label>
                <div style={{ fontSize: "12px", color: theme.neutral.gray600, marginTop: theme.spacing.xs, marginLeft: "26px" }}>
                  (This will deactivate all other configurations)
                </div>
              </div>

              <div style={{ display: "flex", gap: theme.spacing.md }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingConfig(null);
                  }}
                  style={{
                    flex: 1,
                    padding: "14px",
                    backgroundColor: theme.neutral.gray400,
                    color: theme.neutral.white,
                    border: "none",
                    borderRadius: theme.radius.md,
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "14px"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: "14px",
                    backgroundColor: theme.primary.main,
                    color: theme.neutral.white,
                    border: "none",
                    borderRadius: theme.radius.md,
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "14px",
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {loading ? "Saving..." : editingConfig ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

