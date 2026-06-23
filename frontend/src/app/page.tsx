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
  "Preschool",
  "Nursery 1",
  "Nursery 2",
  "Nursery 3",
  "Basic 1",
  "Basic 2",
  "Basic 3",
  "Basic 4",
  "Basic 5",
  "JSS1",
  "JSS2",
  "JSS3",
  "SS1",
  "SS2",
];

const feeCategories = ["Tuition", "Exam", "Transport", "Development Levy", "Other"];

const starterStudents: Student[] = [
  {
    id: 1,
    name: "Amina Yusuf",
    grade: "Basic 4",
    feeAmount: 250000,
    paidAmount: 180000,
    lastPaymentDate: "2026-06-01",
    note: "Transport balance pending",
    feeCategory: "Tuition",
  },
  {
    id: 2,
    name: "Daniel Okafor",
    grade: "SS1",
    feeAmount: 400000,
    paidAmount: 400000,
    lastPaymentDate: "2026-05-28",
    note: "Full payment received",
    feeCategory: "Development Levy",
  },
  {
    id: 3,
    name: "Sade Martins",
    grade: "JSS2",
    feeAmount: 320000,
    paidAmount: 120000,
    lastPaymentDate: "2026-06-10",
    note: "Awaiting final installment",
    feeCategory: "Exam",
  },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  if (!value) return "No payment yet";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Home() {
  const [students, setStudents] = useState<Student[]>(starterStudents);
  const [report, setReport] = useState({ totalFee: 0, totalPaid: 0, balance: 0 });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [studentForm, setStudentForm] = useState({
    name: "",
    familyName: "",
    grade: "",
    feeAmount: "",
    feeCategory: "Tuition",
  });
  const [paymentForm, setPaymentForm] = useState({
    studentId: "",
    amount: "",
    note: "",
  });
  const [importStatus, setImportStatus] = useState(
    "Upload an Excel or CSV sheet with student names and classes to import them.",
  );
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

      if (studentsData.students?.length) {
        setStudents(studentsData.students);
      }

      setReport({
        totalFee: reportData.totalFee || 0,
        totalPaid: reportData.totalPaid || 0,
        balance: reportData.balance || 0,
      });
    } catch {
      // Keep the view responsive even if the backend is offline.
    }
  };

  useEffect(() => {
    refreshDashboard();
  }, []);

  const summary = useMemo(() => {
    const totalFee = report.totalFee || students.reduce((sum, student) => sum + student.feeAmount, 0);
    const totalPaid = report.totalPaid || students.reduce((sum, student) => sum + student.paidAmount, 0);
    const balance = report.balance || totalFee - totalPaid;
    const fullyPaidCount = students.filter(
      (student) => student.paidAmount >= student.feeAmount,
    ).length;

    return {
      totalFee,
      totalPaid,
      balance,
      fullyPaidCount,
    };
  }, [students, report]);

  const handleStudentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const feeAmount = Number(studentForm.feeAmount);
    if (!studentForm.name || !studentForm.grade || !feeAmount) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: studentForm.name,
          familyName: studentForm.familyName,
          grade: studentForm.grade,
          feeAmount,
          feeCategory: studentForm.feeCategory,
        }),
      });

      const data = await response.json();
      if (data.student) {
        await refreshDashboard();
      }
    } catch {
      // Keep the UI responsive even if the backend is offline.
    }

    setStudentForm({ name: "", familyName: "", grade: "", feeAmount: "", feeCategory: "Tuition" });
  };

  const handlePaymentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const selectedStudentId = Number(paymentForm.studentId);
    const amount = Number(paymentForm.amount);

    if (!selectedStudentId || !amount) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          amount,
          note: paymentForm.note,
        }),
      });

      const data = await response.json();
      if (data.student) {
        await refreshDashboard();
      }
    } catch {
      // Keep the UI responsive even if the backend is offline.
    }

    setPaymentForm({ studentId: "", amount: "", note: "" });
  };

  const handleExcelImport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFile) {
      setImportStatus("Choose an Excel or CSV file first.");
      return;
    }

    setImporting(true);
    setImportStatus("Reading the spreadsheet...");

    try {
      const workbook = XLSX.read(await selectedFile.arrayBuffer(), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as Array<Array<string | number | boolean | null>>;
      const firstRow = rows[0] || [];
      const hasHeader = firstRow.some((value) => {
        const normalized = String(value ?? "").trim().toLowerCase();
        return normalized.includes("name") || normalized.includes("class") || normalized.includes("grade");
      });

      const dataRows = hasHeader ? rows.slice(1) : rows;
      const headerRow = hasHeader ? firstRow : ["Name", "Class"];
      const nameIndex = headerRow.findIndex((value) => {
        const normalized = String(value ?? "").trim().toLowerCase();
        return ["name", "student name", "studentname", "full name", "fullname", "student"].includes(normalized);
      });
      const classIndex = headerRow.findIndex((value) => {
        const normalized = String(value ?? "").trim().toLowerCase();
        return ["class", "grade", "class name", "student class", "level", "year"].includes(normalized);
      });

      const formattedStudents = dataRows
        .map((row) => {
          const name = String(row[nameIndex >= 0 ? nameIndex : 0] ?? "").trim();
          const grade = String(row[classIndex >= 0 ? classIndex : 1] ?? "").trim();

          if (!name || !grade) return null;

          return {
            name,
            grade,
            familyName: "Unassigned",
            feeCategory: "Tuition",
            feeAmount: "",
            note: "Imported from Excel",
          };
        })
        .filter(Boolean) as Array<{
          name: string;
          grade: string;
          familyName: string;
          feeCategory: string;
          feeAmount: string;
          note: string;
        }>;

      if (!formattedStudents.length) {
        throw new Error("No student names and classes were found in that file.");
      }

      const response = await fetch(`${API_BASE_URL}/api/students/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: formattedStudents }),
      });
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "Import failed");
      }

      await refreshDashboard();
      setImportStatus(`Imported ${responseData.students?.length || formattedStudents.length} students successfully.`);
      setSelectedFile(null);
      event.currentTarget.reset();
    } catch (error) {
      setImportStatus(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.16),_transparent_28%),linear-gradient(135deg,_#fffdf7_0%,_#f4fef6_100%)] text-slate-800">
      <div className="mx-auto flex min-h-screen max-w-7xl gap-4 p-4 lg:p-6">
        <aside
          className={`flex flex-col rounded-[28px] border border-red-200 bg-white/90 p-4 shadow-xl shadow-red-100/70 transition-all duration-300 ${sidebarCollapsed ? "w-20" : "w-72"}`}
        >
          <button
            type="button"
            onClick={() => setSidebarCollapsed((value) => !value)}
            className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-xl text-red-600 transition hover:bg-red-100"
            aria-label="Toggle sidebar"
          >
            ☰
          </button>

          <div className="space-y-2">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-base font-semibold text-green-700"
            >
              <span className="text-xl">⌂</span>
              {!sidebarCollapsed && <span>Dashboard</span>}
            </Link>
            <Link
              href="/report"
              className="flex items-center gap-3 rounded-2xl border border-red-200 bg-white px-4 py-3 text-base font-semibold text-red-600 transition hover:border-green-300 hover:bg-green-50"
            >
              <span className="text-xl">📊</span>
              {!sidebarCollapsed && <span>Finance Report</span>}
            </Link>
            <Link
              href="/families"
              className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-base font-semibold text-green-700 transition hover:border-red-300 hover:bg-red-50"
            >
              <span className="text-xl">👨‍👩‍👧‍👦</span>
              {!sidebarCollapsed && <span>Family Dashboard</span>}
            </Link>
            <Link
              href="/fees"
              className="flex items-center gap-3 rounded-2xl border border-red-200 bg-white px-4 py-3 text-base font-semibold text-red-600 transition hover:border-green-300 hover:bg-green-50"
            >
              <span className="text-xl">💰</span>
              {!sidebarCollapsed && <span>Fee Settings</span>}
            </Link>
          </div>

          <div className="mt-auto rounded-2xl border border-green-100 bg-green-50/80 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">School office</p>
            <p className="mt-1">Manage fees, balances, and payments in one place.</p>
          </div>
        </aside>

        <main className="flex-1 space-y-6">
          <header className="rounded-[30px] border border-red-200 bg-white/90 p-6 shadow-xl shadow-red-100/70 sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-green-600">
                  School Finance Suite
                </p>
                <h1 className="mt-3 text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
                  Manage school fees for Preschool to SS2 with clarity.
                </h1>
                <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                  Record students, assign classes, track payments, and review outstanding balances with ease.
                </p>
              </div>

              <div className="flex flex-col gap-3 rounded-3xl border border-green-100 bg-green-50/80 p-4 sm:min-w-[260px]">
                <div className="rounded-2xl border border-green-200 bg-white px-4 py-3 text-base text-green-700">
                  <p className="font-semibold">Today&apos;s focus</p>
                  <p className="mt-1">{students.length} active student accounts</p>
                </div>
                <Link
                  href="/report"
                  className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-base font-semibold text-red-700 transition hover:bg-red-100"
                >
                  View finance report
                </Link>
              </div>
            </div>
          </header>

          <section className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-[24px] border border-red-200 bg-white p-5 shadow-md shadow-red-100/70">
              <p className="text-base font-semibold text-slate-500">Total Fees</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{formatCurrency(summary.totalFee)}</p>
            </div>
            <div className="rounded-[24px] border border-green-200 bg-green-50 p-5 shadow-md shadow-green-100/70">
              <p className="text-base font-semibold text-slate-600">Collected</p>
              <p className="mt-3 text-3xl font-semibold text-green-700">
                {formatCurrency(summary.totalPaid)}
              </p>
            </div>
            <div className="rounded-[24px] border border-red-200 bg-red-50 p-5 shadow-md shadow-red-100/70">
              <p className="text-base font-semibold text-slate-600">Outstanding</p>
              <p className="mt-3 text-3xl font-semibold text-red-700">
                {formatCurrency(summary.balance)}
              </p>
            </div>
          </section>

          <section className="rounded-[30px] border border-red-200 bg-white p-6 shadow-xl shadow-red-100/70 sm:p-8">
            <div className="border-b border-red-100 pb-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-green-600">
                    Student & payment management
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
                    Manage records with clear sections
                  </h2>
                </div>
                <div className="rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                  {summary.fullyPaidCount} fully paid
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                <div className="rounded-[24px] border border-red-100 bg-[#fffdf8] p-6">
                  <h3 className="text-xl font-semibold text-slate-900">Add a new student</h3>
                  <p className="mt-2 text-base text-slate-600">
                    Create a fresh record with class, fee category, and fee amount.
                  </p>

                  <form onSubmit={handleStudentSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
                    <input
                      className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-base outline-none"
                      placeholder="Student name"
                      value={studentForm.name}
                      onChange={(event) =>
                        setStudentForm((current) => ({ ...current, name: event.target.value }))
                      }
                    />
                    <input
                      className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-base outline-none"
                      placeholder="Family name"
                      value={studentForm.familyName}
                      onChange={(event) =>
                        setStudentForm((current) => ({ ...current, familyName: event.target.value }))
                      }
                    />
                    <select
                      className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-base outline-none"
                      value={studentForm.grade}
                      onChange={(event) =>
                        setStudentForm((current) => ({ ...current, grade: event.target.value }))
                      }
                    >
                      <option value="">Select class</option>
                      {schoolClasses.map((schoolClass) => (
                        <option key={schoolClass} value={schoolClass}>
                          {schoolClass}
                        </option>
                      ))}
                    </select>
                    <select
                      className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-base outline-none"
                      value={studentForm.feeCategory}
                      onChange={(event) =>
                        setStudentForm((current) => ({ ...current, feeCategory: event.target.value }))
                      }
                    >
                      {feeCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <input
                      className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-base outline-none"
                      placeholder="Total fee amount"
                      type="number"
                      value={studentForm.feeAmount}
                      onChange={(event) =>
                        setStudentForm((current) => ({ ...current, feeAmount: event.target.value }))
                      }
                    />
                    <button
                      type="submit"
                      className="rounded-2xl bg-green-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-green-500 md:col-span-2"
                    >
                      Save student record
                    </button>
                  </form>

                  <div className="mt-6 rounded-2xl border border-dashed border-green-300 bg-white p-4">
                    <h4 className="text-lg font-semibold text-slate-900">Import from Excel</h4>
                    <p className="mt-2 text-sm text-slate-600">
                      Upload a sheet with student names and classes. The app will create the records for you.
                    </p>

                    <form onSubmit={handleExcelImport} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                        className="flex-1 rounded-2xl border border-red-200 bg-[#fffdf8] px-3 py-2 text-sm"
                      />
                      <button
                        type="submit"
                        className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
                      >
                        {importing ? "Importing..." : "Import students"}
                      </button>
                    </form>

                    <p className="mt-3 text-sm text-slate-600">{importStatus}</p>
                  </div>
                </div>

                <div className="rounded-[24px] border border-red-100 bg-[#fffdf8] p-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">Student accounts</h3>
                      <p className="mt-2 text-base text-slate-600">
                        Payment status across all classes
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    {students.map((student) => {
                      const balance = student.feeAmount - student.paidAmount;
                      const status =
                        balance <= 0 ? "Fully paid" : student.paidAmount > 0 ? "Partial" : "Outstanding";
                      const statusColor =
                        status === "Fully paid"
                          ? "text-green-700"
                          : status === "Partial"
                            ? "text-red-600"
                            : "text-red-700";

                      return (
                        <Link
                          key={student.id}
                          href={`/students/${student.id}`}
                          className="block rounded-2xl border border-red-100 bg-white p-4 transition hover:border-green-300 hover:shadow-md"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-lg font-semibold text-slate-900">{student.name}</p>
                              <p className="mt-1 text-base text-slate-600">
                                {student.grade} • {student.feeCategory} • {student.note}
                              </p>
                            </div>
                            <span className={`text-base font-semibold ${statusColor}`}>{status}</span>
                          </div>
                          <div className="mt-4 grid gap-3 text-base text-slate-700 md:grid-cols-3">
                            <div className="rounded-2xl border border-red-100 bg-green-50/70 p-3">
                              <p className="text-sm font-semibold text-slate-500">Fee</p>
                              <p className="mt-1">{formatCurrency(student.feeAmount)}</p>
                            </div>
                            <div className="rounded-2xl border border-red-100 bg-red-50/70 p-3">
                              <p className="text-sm font-semibold text-slate-500">Paid</p>
                              <p className="mt-1">{formatCurrency(student.paidAmount)}</p>
                            </div>
                            <div className="rounded-2xl border border-red-100 bg-white p-3">
                              <p className="text-sm font-semibold text-slate-500">Balance</p>
                              <p className="mt-1">{formatCurrency(balance)}</p>
                            </div>
                          </div>
                          <p className="mt-4 text-sm font-medium text-slate-500">
                            Last payment: {formatDate(student.lastPaymentDate)}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-red-100 bg-[#fffdf8] p-6">
                <h3 className="text-xl font-semibold text-slate-900">Record a payment</h3>
                <p className="mt-2 text-base text-slate-600">
                  Log tuition or other school payments for any student account.
                </p>

                <form onSubmit={handlePaymentSubmit} className="mt-6 space-y-4">
                  <select
                    className="w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-base outline-none"
                    value={paymentForm.studentId}
                    onChange={(event) =>
                      setPaymentForm((current) => ({ ...current, studentId: event.target.value }))
                    }
                  >
                    <option value="">Select student</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className="w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-base outline-none"
                    placeholder="Amount received"
                    type="number"
                    value={paymentForm.amount}
                    onChange={(event) =>
                      setPaymentForm((current) => ({ ...current, amount: event.target.value }))
                    }
                  />
                  <textarea
                    className="min-h-28 w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-base outline-none"
                    placeholder="Payment note"
                    value={paymentForm.note}
                    onChange={(event) =>
                      setPaymentForm((current) => ({ ...current, note: event.target.value }))
                    }
                  />
                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-red-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-red-500"
                  >
                    Save payment
                  </button>
                </form>

                <div className="mt-6 rounded-2xl border border-green-100 bg-green-50/80 p-4">
                  <p className="text-lg font-semibold text-slate-900">Suggested next steps</p>
                  <ul className="mt-3 space-y-2 text-base text-slate-600">
                    <li>• Connect this dashboard to a real database.</li>
                    <li>• Add authentication for staff and admin roles.</li>
                    <li>• Generate receipts and payment reports.</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
