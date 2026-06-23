"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

const API_BASE_URL = "http://localhost:4000";

type Student = {
  id: number;
  name: string;
  familyName?: string;
  grade: string;
  feeAmount: number;
  paidAmount: number;
  lastPaymentDate: string;
  note: string;
  feeCategory: string;
};

const schoolClasses = [
  "Preschool", "Nursery 1", "Nursery 2", "Nursery 3",
  "Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5",
  "JSS1", "JSS2", "JSS3", "SS1", "SS2",
];

const feeCategories = ["Tuition", "Exam", "Transport", "Development Levy", "Other"];

const starterStudents: Student[] = [
  { id: 1, name: "Amina Yusuf", familyName: "Yusuf Family", grade: "Basic 4", feeAmount: 250000, paidAmount: 180000, lastPaymentDate: "2026-06-01", note: "Transport balance pending", feeCategory: "Tuition" },
  { id: 2, name: "Daniel Okafor", familyName: "Okafor Family", grade: "SS1", feeAmount: 400000, paidAmount: 400000, lastPaymentDate: "2026-05-28", note: "Full payment received", feeCategory: "Development Levy" },
  { id: 3, name: "Sade Martins", familyName: "Martins Family", grade: "JSS2", feeAmount: 320000, paidAmount: 120000, lastPaymentDate: "2026-06-10", note: "Awaiting final installment", feeCategory: "Exam" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getPaymentStatus(paid: number, total: number) {
  const pct = total > 0 ? paid / total : 0;
  if (pct >= 1) return { label: "Paid", color: "text-emerald-600 bg-emerald-50", bar: "bg-emerald-500" };
  if (pct >= 0.5) return { label: "Partial", color: "text-amber-600 bg-amber-50", bar: "bg-amber-400" };
  return { label: "Owing", color: "text-red-600 bg-red-50", bar: "bg-red-400" };
}

/* ── Sidebar icon components ─────────────────────────────── */
const IconHome = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
);
const IconUsers = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const IconReceipt = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v.5"/><path d="M12 6v.5"/></svg>
);
const IconFamily = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
);
const IconReport = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
);
const IconMenu = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
);
const IconSearch = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);
const IconUpload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
);

export default function Home() {
  const [students, setStudents] = useState<Student[]>(starterStudents);
  const [report, setReport] = useState({ totalFee: 0, totalPaid: 0, balance: 0 });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "register" | "payment" | "import">("overview");

  const [studentForm, setStudentForm] = useState({ name: "", familyName: "", grade: "", feeAmount: "", feeCategory: "Tuition" });
  const [paymentForm, setPaymentForm] = useState({ studentId: "", amount: "", note: "" });
  const [importStatus, setImportStatus] = useState("Upload an Excel or CSV sheet with student names and classes.");
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const refreshDashboard = async () => {
    try {
      const [studentsResponse, reportResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/students`),
        fetch(`${API_BASE_URL}/api/reports`),
      ]);
      const studentsData = await studentsResponse.json();
      const reportData = await reportResponse.json();
      if (studentsData.students?.length) setStudents(studentsData.students);
      setReport({ totalFee: reportData.totalFee || 0, totalPaid: reportData.totalPaid || 0, balance: reportData.balance || 0 });
    } catch { /* offline fallback */ }
  };

  useEffect(() => { refreshDashboard(); }, []);

  const summary = useMemo(() => {
    const totalFee = report.totalFee || students.reduce((s, st) => s + st.feeAmount, 0);
    const totalPaid = report.totalPaid || students.reduce((s, st) => s + st.paidAmount, 0);
    const balance = report.balance || totalFee - totalPaid;
    const fullyPaidCount = students.filter((s) => s.paidAmount >= s.feeAmount).length;
    const collectionRate = totalFee > 0 ? Math.round((totalPaid / totalFee) * 100) : 0;
    return { totalFee, totalPaid, balance, fullyPaidCount, collectionRate };
  }, [students, report]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter((s) => s.name.toLowerCase().includes(q) || s.grade.toLowerCase().includes(q) || (s.familyName || "").toLowerCase().includes(q));
  }, [students, searchQuery]);

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const feeAmount = Number(studentForm.feeAmount);
    if (!studentForm.name || !studentForm.grade || !feeAmount) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/students`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: studentForm.name, familyName: studentForm.familyName, grade: studentForm.grade, feeAmount, feeCategory: studentForm.feeCategory }),
      });
      const data = await res.json();
      if (data.student) await refreshDashboard();
    } catch { /* offline */ }
    setStudentForm({ name: "", familyName: "", grade: "", feeAmount: "", feeCategory: "Tuition" });
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const studentId = Number(paymentForm.studentId);
    const amount = Number(paymentForm.amount);
    if (!studentId || !amount) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/payments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, amount, note: paymentForm.note }),
      });
      const data = await res.json();
      if (data.student) await refreshDashboard();
    } catch { /* offline */ }
    setPaymentForm({ studentId: "", amount: "", note: "" });
  };

  const handleExcelImport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFile) { setImportStatus("Choose a file first."); return; }
    setImporting(true); setImportStatus("Reading spreadsheet...");
    try {
      const wb = XLSX.read(await selectedFile.arrayBuffer(), { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as Array<Array<string | number | boolean | null>>;
      const first = rows[0] || [];
      const hasHeader = first.some((v) => { const n = String(v ?? "").trim().toLowerCase(); return n.includes("name") || n.includes("class") || n.includes("grade"); });
      const dataRows = hasHeader ? rows.slice(1) : rows;
      const header = hasHeader ? first : ["Name", "Class"];
      const ni = header.findIndex((v) => ["name","student name","studentname","full name","fullname","student"].includes(String(v??"").trim().toLowerCase()));
      const ci = header.findIndex((v) => ["class","grade","class name","student class","level","year"].includes(String(v??"").trim().toLowerCase()));
      const formatted = dataRows.map((r) => {
        const name = String(r[ni >= 0 ? ni : 0] ?? "").trim();
        const grade = String(r[ci >= 0 ? ci : 1] ?? "").trim();
        if (!name || !grade) return null;
        return { name, grade, familyName: "Unassigned", feeCategory: "Tuition", feeAmount: "", note: "Imported from Excel" };
      }).filter(Boolean);
      if (!formatted.length) throw new Error("No students found in file.");
      const res = await fetch(`${API_BASE_URL}/api/students/bulk`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ students: formatted }) });
      const rd = await res.json();
      if (!res.ok) throw new Error(rd.error || "Import failed");
      await refreshDashboard();
      setImportStatus(`Imported ${rd.students?.length || formatted.length} students.`);
      setSelectedFile(null); e.currentTarget.reset();
    } catch (err) { setImportStatus(err instanceof Error ? err.message : "Import failed."); }
    finally { setImporting(false); }
  };

  const navItems = [
    { label: "Dashboard", href: "/", icon: <IconHome />, active: true },
    { label: "Students", href: "/students", icon: <IconUsers />, active: false },
    { label: "Fees", href: "/fees", icon: <IconReceipt />, active: false },
    { label: "Families", href: "/families", icon: <IconFamily />, active: false },
    { label: "Report", href: "/report", icon: <IconReport />, active: false },
  ];

  return (
    <div className="min-h-screen bg-[#fafaf8] text-gray-900">
      <div className="flex min-h-screen">
        {/* ── Sidebar ────────────────────────────── */}
        <aside className={`sticky top-0 h-screen flex flex-col border-r border-gray-200 bg-white transition-all duration-300 ${sidebarCollapsed ? "w-[72px]" : "w-[240px]"}`}>
          <div className="flex items-center gap-3 px-5 py-6 border-b border-gray-100">
            <button onClick={() => setSidebarCollapsed((v) => !v)} className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors" aria-label="Toggle sidebar">
              <IconMenu />
            </button>
            {!sidebarCollapsed && <span className="text-base font-semibold tracking-tight text-gray-900">Finance</span>}
          </div>
          <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
            {navItems.map((item) => (
              <Link key={item.label} href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors ${item.active ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"}`}>
                <span className="flex-shrink-0">{item.icon}</span>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>
          <div className="px-3 py-4 border-t border-gray-100">
            {!sidebarCollapsed && <p className="text-[11px] text-gray-400 text-center">School Finance v1.0</p>}
          </div>
        </aside>

        {/* ── Main ───────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          {/* Header */}
          <header className="sticky top-0 z-10 bg-[#fafaf8]/80 backdrop-blur-sm border-b border-gray-200 px-8 py-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-400 mt-0.5">School financial overview</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><IconSearch /></span>
                  <input type="text" placeholder="Search students..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-56 pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all" />
                </div>
              </div>
            </div>
          </header>

          <div className="px-8 py-6 space-y-8">
            {/* ── Stat Cards ────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Expected", value: formatCurrency(summary.totalFee), sub: `${students.length} students enrolled` },
                { label: "Total Collected", value: formatCurrency(summary.totalPaid), sub: `${summary.collectionRate}% collection rate` },
                { label: "Outstanding", value: formatCurrency(summary.balance), sub: `${students.length - summary.fullyPaidCount} students owing` },
                { label: "Fully Paid", value: String(summary.fullyPaidCount), sub: `of ${students.length} students` },
              ].map((card) => (
                <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{card.label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{card.value}</p>
                  <p className="mt-1 text-xs text-gray-400">{card.sub}</p>
                </div>
              ))}
            </div>

            {/* ── Tabs ──────────────────────────── */}
            <div className="flex items-center gap-1 border-b border-gray-200">
              {(["overview", "register", "payment", "import"] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${activeTab === tab ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
                  {tab === "register" ? "Add Student" : tab === "payment" ? "Record Payment" : tab === "import" ? "Import" : "Students"}
                </button>
              ))}
            </div>

            {/* ── Tab: Overview (Student Table) ── */}
            {activeTab === "overview" && (
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        {["Student", "Class", "Family", "Fee Amount", "Paid", "Balance", "Status", "Last Payment"].map((h) => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((s, i) => {
                        const status = getPaymentStatus(s.paidAmount, s.feeAmount);
                        const pct = s.feeAmount > 0 ? Math.min((s.paidAmount / s.feeAmount) * 100, 100) : 0;
                        return (
                          <tr key={s.id} className={`border-b border-gray-50 transition-colors hover:bg-gray-50/50 ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                            <td className="px-5 py-3.5 font-medium text-gray-900">{s.name}</td>
                            <td className="px-5 py-3.5 text-gray-500">{s.grade}</td>
                            <td className="px-5 py-3.5 text-gray-500">{s.familyName || "—"}</td>
                            <td className="px-5 py-3.5 font-medium text-gray-900">{formatCurrency(s.feeAmount)}</td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-700">{formatCurrency(s.paidAmount)}</span>
                                <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                  <div className={`h-full rounded-full ${status.bar} transition-all`} style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 font-medium text-gray-900">{formatCurrency(s.feeAmount - s.paidAmount)}</td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>{status.label}</span>
                            </td>
                            <td className="px-5 py-3.5 text-gray-400">{formatDate(s.lastPaymentDate)}</td>
                          </tr>
                        );
                      })}
                      {filteredStudents.length === 0 && (
                        <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-400">No students found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Tab: Register Student ────────── */}
            {activeTab === "register" && (
              <div className="max-w-lg">
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Add New Student</h2>
                  <p className="text-sm text-gray-400 mb-6">Enter student details and fee information</p>
                  <form onSubmit={handleStudentSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Student Name</label>
                      <input type="text" required value={studentForm.name} onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300" placeholder="Full name" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Family Name</label>
                      <input type="text" value={studentForm.familyName} onChange={(e) => setStudentForm({ ...studentForm, familyName: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300" placeholder="Family name" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Class</label>
                        <select required value={studentForm.grade} onChange={(e) => setStudentForm({ ...studentForm, grade: e.target.value })}
                          className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300">
                          <option value="">Select class</option>
                          {schoolClasses.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Fee Category</label>
                        <select value={studentForm.feeCategory} onChange={(e) => setStudentForm({ ...studentForm, feeCategory: e.target.value })}
                          className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300">
                          {feeCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Fee Amount (₦)</label>
                      <input type="number" required value={studentForm.feeAmount} onChange={(e) => setStudentForm({ ...studentForm, feeAmount: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300" placeholder="0" />
                    </div>
                    <button type="submit" className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:ring-offset-2">
                      Add Student
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ── Tab: Record Payment ──────────── */}
            {activeTab === "payment" && (
              <div className="max-w-lg">
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Record Payment</h2>
                  <p className="text-sm text-gray-400 mb-6">Log a fee payment for a student</p>
                  <form onSubmit={handlePaymentSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Student</label>
                      <select required value={paymentForm.studentId} onChange={(e) => setPaymentForm({ ...paymentForm, studentId: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300">
                        <option value="">Select student</option>
                        {students.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.grade}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Amount (₦)</label>
                      <input type="number" required value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Note</label>
                      <input type="text" value={paymentForm.note} onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300" placeholder="Optional note" />
                    </div>
                    <button type="submit" className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:ring-offset-2">
                      Record Payment
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ── Tab: Import ─────────────────── */}
            {activeTab === "import" && (
              <div className="max-w-lg">
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Import Students</h2>
                  <p className="text-sm text-gray-400 mb-6">Upload an Excel or CSV file</p>
                  <form onSubmit={handleExcelImport} className="space-y-4">
                    <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-colors">
                      <IconUpload />
                      <span className="text-sm text-gray-500">{selectedFile ? selectedFile.name : "Click to choose file"}</span>
                      <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                    </label>
                    <button type="submit" disabled={importing}
                      className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:ring-offset-2">
                      {importing ? "Importing..." : "Import Students"}
                    </button>
                    <p className="text-xs text-gray-400 text-center">{importStatus}</p>
                  </form>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
