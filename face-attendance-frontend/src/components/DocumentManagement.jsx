import React, { useEffect, useMemo, useState } from "react";
import { theme } from "../styles/theme.js";

const DOCUMENT_TYPES = [
  { value: "id_card", label: "CCCD/Passport (Scan)" },
  { value: "contract", label: "Labor Contract (Signed)" },
  { value: "certificate", label: "Qualifications / Certificates" },
  { value: "appointment_decision", label: "Appointment Decision" },
  { value: "salary_decision", label: "Salary Increase Decision" },
  { value: "other", label: "Other" },
];

export default function DocumentManagement() {
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
  const token = localStorage.getItem("authToken");

  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [uploadForm, setUploadForm] = useState({
    documentType: "id_card",
    title: "",
    expiryDate: "",
    description: "",
    notes: "",
    file: null,
  });

  const selectedEmployee = useMemo(() => {
    return employees.find((e) => String(e.id) === String(selectedEmployeeId)) || null;
  }, [employees, selectedEmployeeId]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${apiBase}/api/admin/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load employees");
      setEmployees(data.employees || []);
    } catch (err) {
      console.error(err);
      setMessage(err.message);
    }
  };

  const fetchDocuments = async (userId) => {
    if (!userId) return;
    try {
      setLoading(true);
      setMessage("");
      const res = await fetch(`${apiBase}/api/documents/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load documents");
      setDocuments(data.documents || []);
    } catch (err) {
      console.error(err);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) fetchDocuments(selectedEmployeeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployeeId]);

  const handleUpload = async () => {
    if (!selectedEmployeeId) {
      setMessage("Please select an employee first.");
      return;
    }
    if (!uploadForm.title.trim()) {
      setMessage("Title is required.");
      return;
    }
    if (!uploadForm.file) {
      setMessage("Please choose a file (JPG/PNG/PDF).");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      const form = new FormData();
      form.append("documentType", uploadForm.documentType);
      form.append("title", uploadForm.title);
      if (uploadForm.expiryDate) form.append("expiryDate", uploadForm.expiryDate);
      if (uploadForm.description) form.append("description", uploadForm.description);
      if (uploadForm.notes) form.append("notes", uploadForm.notes);
      form.append("document", uploadForm.file);

      const res = await fetch(`${apiBase}/api/documents/${selectedEmployeeId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Upload failed");

      setUploadForm((s) => ({ ...s, title: "", expiryDate: "", description: "", notes: "", file: null }));
      await fetchDocuments(selectedEmployeeId);
      setMessage("✅ Uploaded successfully.");
    } catch (err) {
      console.error(err);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm("Delete this document?")) return;
    try {
      setLoading(true);
      setMessage("");
      const res = await fetch(`${apiBase}/api/documents/${docId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Delete failed");
      await fetchDocuments(selectedEmployeeId);
      setMessage("🗑️ Deleted.");
    } catch (err) {
      console.error(err);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    backgroundColor: theme.neutral.white,
    borderRadius: theme.radius.lg,
    border: `1px solid ${theme.neutral.gray200}`,
    boxShadow: theme.shadows.sm,
    padding: theme.spacing.xl,
  };

  const labelStyle = { display: "block", fontSize: "13px", fontWeight: 700, color: theme.neutral.gray700, marginBottom: 6 };
  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: theme.radius.md,
    border: `1px solid ${theme.neutral.gray300}`,
    outline: "none",
    fontSize: "14px",
  };

  return (
    <div style={{ display: "grid", gap: theme.spacing.xl }}>
      <div style={{
        ...cardStyle,
        background: theme.gradients.primary,
        color: theme.neutral.white,
        border: "none",
      }}>
        <div style={{ fontSize: "28px", fontWeight: 800, marginBottom: 6 }}>📎 Document Management</div>
        <div style={{ opacity: 0.95 }}>Store CCCD scans, signed contracts, certificates, and decisions in one place.</div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.lg, alignItems: "end" }}>
          <div>
            <label style={labelStyle}>Employee</label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              style={inputStyle}
            >
              <option value="">Select employee...</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.employeeCode || e.email})
                </option>
              ))}
            </select>
          </div>
          <div style={{ color: theme.neutral.gray600, fontSize: "13px" }}>
            {selectedEmployee ? (
              <>
                <div><b>Department:</b> {selectedEmployee.department || "-"}</div>
                <div><b>Job Title:</b> {selectedEmployee.jobTitle || "-"}</div>
              </>
            ) : (
              "Pick an employee to view/upload documents."
            )}
          </div>
        </div>

        <div style={{ height: 1, backgroundColor: theme.neutral.gray200, margin: `${theme.spacing.xl} 0` }} />

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: theme.spacing.xl }}>
          <div>
            <div style={{ fontWeight: 800, marginBottom: theme.spacing.md, color: theme.neutral.gray900 }}>Upload new document</div>
            <div style={{ display: "grid", gap: theme.spacing.md }}>
              <div>
                <label style={labelStyle}>Document type</label>
                <select
                  value={uploadForm.documentType}
                  onChange={(e) => setUploadForm((s) => ({ ...s, documentType: e.target.value }))}
                  style={inputStyle}
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Title *</label>
                <input
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm((s) => ({ ...s, title: e.target.value }))}
                  style={inputStyle}
                  placeholder="e.g. CCCD front + back, Contract 2026..."
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md }}>
                <div>
                  <label style={labelStyle}>Expiry date (optional)</label>
                  <input
                    type="date"
                    value={uploadForm.expiryDate}
                    onChange={(e) => setUploadForm((s) => ({ ...s, expiryDate: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>File (JPG/PNG/PDF) *</label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => setUploadForm((s) => ({ ...s, file: e.target.files?.[0] || null }))}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm((s) => ({ ...s, description: e.target.value }))}
                  style={{ ...inputStyle, minHeight: 84, resize: "vertical" }}
                  placeholder="Notes about this document..."
                />
              </div>

              <button
                onClick={handleUpload}
                disabled={loading}
                style={{
                  padding: "12px 16px",
                  borderRadius: theme.radius.md,
                  border: "none",
                  background: theme.secondary.gradient,
                  color: theme.neutral.white,
                  fontWeight: 800,
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: theme.shadows.sm,
                }}
              >
                {loading ? "Uploading..." : "⬆️ Upload"}
              </button>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 800, marginBottom: theme.spacing.md, color: theme.neutral.gray900 }}>Documents</div>
            {loading ? (
              <div style={{ color: theme.neutral.gray500 }}>Loading...</div>
            ) : documents.length === 0 ? (
              <div style={{ color: theme.neutral.gray500, fontStyle: "italic" }}>No documents.</div>
            ) : (
              <div style={{ display: "grid", gap: theme.spacing.md }}>
                {documents.map((doc) => (
                  <div key={doc.id} style={{
                    border: `1px solid ${theme.neutral.gray200}`,
                    borderRadius: theme.radius.md,
                    padding: theme.spacing.md,
                    backgroundColor: theme.neutral.gray50,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: theme.spacing.md }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, color: theme.neutral.gray900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {doc.title}
                        </div>
                        <div style={{ fontSize: "12px", color: theme.neutral.gray600, marginTop: 2 }}>
                          {DOCUMENT_TYPES.find((t) => t.value === doc.documentType)?.label || doc.documentType} •{" "}
                          {doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString("vi-VN") : "-"}
                          {doc.expiryDate ? ` • Exp: ${new Date(doc.expiryDate).toLocaleDateString("vi-VN")}` : ""}
                        </div>
                        {doc.description ? (
                          <div style={{ fontSize: "13px", color: theme.neutral.gray700, marginTop: 8 }}>
                            {doc.description}
                          </div>
                        ) : null}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "start", flexShrink: 0 }}>
                        <a
                          href={`${apiBase}${doc.documentPath}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: "8px 10px",
                            borderRadius: theme.radius.md,
                            border: `1px solid ${theme.neutral.gray300}`,
                            backgroundColor: theme.neutral.white,
                            textDecoration: "none",
                            color: theme.primary.main,
                            fontWeight: 700,
                            fontSize: "12px",
                          }}
                        >
                          View
                        </a>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          style={{
                            padding: "8px 10px",
                            borderRadius: theme.radius.md,
                            border: "none",
                            backgroundColor: theme.error.main,
                            color: theme.neutral.white,
                            fontWeight: 800,
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {message ? (
          <div style={{
            marginTop: theme.spacing.lg,
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            border: `1px solid ${theme.neutral.gray200}`,
            backgroundColor: theme.neutral.gray50,
            color: theme.neutral.gray800,
            fontWeight: 600,
            fontSize: "13px",
          }}>
            {message}
          </div>
        ) : null}
      </div>
    </div>
  );
}




