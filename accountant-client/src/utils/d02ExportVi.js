/**
 * Vietnamese text/number normalization for D02-LT PDF & Word export
 * (source data may be English job titles, departments, en-US numbers).
 */

/** Multi-word phrases first (longer / more specific before shorter). */
const PHRASES = [
  [/head\s+office/gi, "Trụ sở chính"],
  [/head\s+of\s+department/gi, "Trưởng phòng"],
  [/vice\s+president/gi, "Phó Tổng giám đốc"],
  [/chief\s+financial\s+officer/gi, "Giám đốc tài chính"],
  [/chief\s+executive\s+officer/gi, "Tổng giám đốc"],
  [/human\s+resources?/gi, "Nhân sự"],
  [/information\s+technology/gi, "Công nghệ thông tin"],
  [/software\s+engineer(ing)?/gi, "Kỹ sư phần mềm"],
  [/business\s+analyst/gi, "Chuyên viên phân tích nghiệp vụ"],
  [/project\s+manager/gi, "Quản lý dự án"],
  [/product\s+manager/gi, "Quản lý sản phẩm"],
  [/sales\s+executive/gi, "Nhân viên kinh doanh"],
  [/marketing\s+executive/gi, "Nhân viên marketing"],
  [/office\s+assistant/gi, "Nhân viên văn phòng"],
  [/administrative\s+assistant/gi, "Trợ lý hành chính"],
  [/chief\s+accountant/gi, "Kế toán trưởng"],
  [/senior\s+accountant/gi, "Kế toán viên cao cấp"],
  [/junior\s+accountant/gi, "Kế toán viên"],
  [/staff\s+accounting/gi, "Nhân viên kế toán"],
  [/accounting\s+staff/gi, "Nhân viên kế toán"],
  [/general\s+accountant/gi, "Kế toán tổng hợp"],
  [/financial\s+accountant/gi, "Kế toán tài chính"],
  [/internal\s+audit(or)?/gi, "Kiểm toán nội bộ"],
  [/accounting\s+department/gi, "Phòng Kế toán"],
  [/finance\s+department/gi, "Phòng Tài chính"],
  [/hr\s+department/gi, "Phòng Nhân sự"],
  [/it\s+department/gi, "Phòng Công nghệ thông tin"],
  [/sales\s+department/gi, "Phòng Kinh doanh"],
];

const WORDS = [
  [/\baccounting\b/gi, "Kế toán"],
  [/\bfinance\b/gi, "Tài chính"],
  [/\bmarketing\b/gi, "Marketing"],
  [/\bsales\b/gi, "Kinh doanh"],
  [/\bprocurement\b/gi, "Mua hàng"],
  [/\bwarehouse\b/gi, "Kho"],
  [/\blogistics\b/gi, "Hậu cần"],
  [/\boperations?\b/gi, "Vận hành"],
  [/\badministration\b/gi, "Hành chính"],
  [/\badministrative\b/gi, "Hành chính"],
  [/\blegal\b/gi, "Pháp chế"],
  [/\bsecretary\b/gi, "Thư ký"],
  [/\breceptionist\b/gi, "Lễ tân"],
  [/\bsecurity\b/gi, "Bảo vệ"],
  [/\bdriver\b/gi, "Lái xe"],
  [/\bintern\b/gi, "Thực tập sinh"],
  [/\btrainee\b/gi, "Thực tập sinh"],
  [/\bassistant\b/gi, "Trợ lý"],
  [/\bspecialist\b/gi, "Chuyên viên"],
  [/\bcoordinator\b/gi, "Điều phối viên"],
  [/\bconsultant\b/gi, "Tư vấn viên"],
  [/\bdeveloper\b/gi, "Lập trình viên"],
  [/\bprogrammer\b/gi, "Lập trình viên"],
  [/\bdesigner\b/gi, "Thiết kế"],
  [/\btechnician\b/gi, "Kỹ thuật viên"],
  [/\bengineer(ing)?\b/gi, "Kỹ sư"],
  [/\bmanager\b/gi, "Quản lý"],
  [/\bdirector\b/gi, "Giám đốc"],
  [/\bdeputy\b/gi, "Phó"],
  [/\bhead\b/gi, "Trưởng"],
  [/\bchief\b/gi, "Trưởng"],
  [/\bexecutive\b/gi, "Điều hành"],
  [/\bofficer\b/gi, "Cán bộ"],
  [/\bstaff\b/gi, "Nhân viên"],
  [/\bemployee\b/gi, "Nhân viên"],
  [/\bdepartment\b/gi, "Phòng"],
  [/\bdivision\b/gi, "Khối"],
  [/\bteam\b/gi, "Nhóm"],
  [/\bbusiness\b/gi, "Kinh doanh"],
  [/\bcustomer\s+service\b/gi, "Chăm sóc khách hàng"],
  [/\bsupport\b/gi, "Hỗ trợ"],
  [/\bquality\b/gi, "Chất lượng"],
  [/\bproduction\b/gi, "Sản xuất"],
  [/\bmaint(enance|enance)?\b/gi, "Bảo trì"],
  [/\bresearch\b/gi, "Nghiên cứu"],
  [/\bplanning\b/gi, "Kế hoạch"],
  [/\bcompliance\b/gi, "Tuân thủ"],
  [/\baudit(or|ing)?\b/gi, "Kiểm toán"],
  [/\btreasury\b/gi, "Kho bạc"],
  [/\bpayroll\b/gi, "Lương"],
  [/\brecruitment\b/gi, "Tuyển dụng"],
  [/\btraining\b/gi, "Đào tạo"],
  [/\bcorporate\b/gi, "Tập đoàn"],
  [/\bgeneral\b/gi, "Tổng"],
  [/\bbranch\b/gi, "Chi nhánh"],
  [/\boffice\b/gi, "Văn phòng"],
  [/\bfactory\b/gi, "Nhà máy"],
  [/\bworkshop\b/gi, "Xưởng"],
];

/** Single uppercase tokens (departments). */
const TOKENS = new Map([
  ["HR", "Nhân sự"],
  ["IT", "Công nghệ thông tin"],
  ["QA", "Chất lượng"],
  ["QC", "Kiểm soát chất lượng"],
  ["R&D", "Nghiên cứu & phát triển"],
  ["CEO", "Tổng giám đốc"],
  ["CFO", "Giám đốc tài chính"],
  ["COO", "Giám đốc vận hành"],
  ["CTO", "Giám đốc công nghệ"],
]);

export function translateD02Position(text) {
  if (text == null || text === "" || text === "-") return text === "-" ? "-" : "";
  let t = String(text).trim();
  for (const [re, vi] of PHRASES) t = t.replace(re, vi);
  for (const [re, vi] of WORDS) t = t.replace(re, vi);
  for (const [en, vi] of TOKENS) {
    const re = new RegExp(`\\b${en.replace(/&/g, "\\&")}\\b`, "g");
    t = t.replace(re, vi);
  }
  return t.replace(/\s{2,}/g, " ").replace(/\s+,/g, ",").trim();
}

/** Formatted amount from en-US (commas) or plain number → vi-VN grouping. */
export function formatD02AmountVi(value) {
  if (value == null || value === "") return "";
  const raw = String(value).trim();
  const normalized = raw.replace(/,/g, "").replace(/\s/g, "");
  const n = Number(normalized);
  if (Number.isNaN(n)) return raw;
  return n.toLocaleString("vi-VN");
}

/** After prefix translation, reformat numeric parts in allowance text. */
export function translateD02OtherAllowances(text) {
  if (!text) return "";
  let s = String(text)
    .replace(/Lunch:/gi, "Ăn trưa:")
    .replace(/Transport:/gi, "Xăng xe:")
    .replace(/Phone:/gi, "Điện thoại:");
  // en-US amounts only (comma = thousands), so we do not swallow ", NextLabel:"
  return s.replace(/:\s*((?:\d{1,3},)*\d{1,3}|\d+)/g, (_, num) => {
    const n = Number(String(num).replace(/,/g, ""));
    if (Number.isNaN(n)) return `: ${num}`;
    return `: ${n.toLocaleString("vi-VN")}`;
  });
}

export function translateD02Note(text) {
  if (!text) return "";
  return String(text)
    .replace(/Contract:\s*indefinite/gi, "HĐ: Không xác định thời hạn")
    .replace(/Contract:\s*1_year/gi, "HĐ: Xác định thời hạn 1 năm")
    .replace(/Contract:\s*3_year/gi, "HĐ: Xác định thời hạn 3 năm")
    .replace(/Contract:\s*probation/gi, "HĐ: Thử việc")
    .replace(/Contract:\s*other/gi, "HĐ: Khác")
    .replace(/Contract:/gi, "HĐ:")
    .replace(/Clinic:/gi, "Nơi KCB:")
    .replace(/Data processing error/gi, "Lỗi xử lý dữ liệu");
}
