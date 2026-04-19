import { useState } from "react";

/**
 * UC-23.6: Annual tax summary → Excel (`GET /api/export/annual-tax`).
 */
export default function RegulatoryExports({ apiBase, token }) {
  const base = (apiBase || "http://localhost:5000").replace(/\/$/, "");
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const downloadAnnualTax = async () => {
    setErr("");
    setLoading(true);
    try {
      const url = `${base}/api/export/annual-tax?year=${encodeURIComponent(String(year))}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const ct = res.headers.get("content-type") || "";
      if (!res.ok) {
        let message = `Request failed (${res.status})`;
        if (ct.includes("application/json")) {
          try {
            const j = await res.json();
            message = j.message || message;
          } catch {
            /* ignore */
          }
        }
        throw new Error(message);
      }
      if (ct.includes("application/json")) {
        const j = await res.json();
        throw new Error(j.message || "Export failed");
      }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `BaoCao_QuyetToanThue_${year}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (e) {
      setErr(e.message || "Download failed");
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1e1b4b", marginBottom: 8 }}>Regulatory exports</h2>
      <p style={{ fontSize: 14, color: "#64748b", marginBottom: 20, lineHeight: 1.55 }}>
        Annual personal income tax summary for accounting and filing prep.
      </p>
      <div className="card" style={{ borderRadius: 14, padding: "22px 24px" }}>
        <p className="card-title">Annual tax summary (Excel)</p>
        <p style={{ fontSize: 14, color: "#64748b", marginBottom: 18, lineHeight: 1.5 }}>
          Downloads the server-generated workbook for the selected calendar year (UC-23.6). Requires accountant session.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700, color: "#475569" }}>
            Year
            <input
              type="number"
              min={2020}
              max={2040}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 15, width: 120 }}
            />
          </label>
          <button type="button" className="btn btn-primary" onClick={downloadAnnualTax} disabled={loading}>
            {loading ? "Preparing…" : "Download Excel"}
          </button>
        </div>
        {err && (
          <p className="error-msg" style={{ marginTop: 16 }}>
            {err}
          </p>
        )}
      </div>
    </div>
  );
}
