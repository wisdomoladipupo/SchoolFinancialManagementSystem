"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

const API_BASE_URL = "http://localhost:4000";

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

type FeeSettings = Record<string, Record<string, number>>;
type StudentFeeRow = {
  id: number;
  name: string;
  grade: string;
  feeAmount: number;
  paidAmount: number;
  familyName?: string;
};

function normalizeHeader(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");
}

function findHeader(headers: string[], candidates: string[]) {
  return headers.find((header) => candidates.includes(normalizeHeader(header))) || null;
}

function mapCategory(header: string) {
  const normalized = normalizeHeader(header);
  if (normalized.includes("tuition")) return "Tuition";
  if (normalized.includes("exam")) return "Exam";
  if (normalized.includes("transport")) return "Transport";
  if (normalized.includes("development")) return "Development Levy";
  if (normalized.includes("other")) return "Other";
  return null;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);
}

export default function FeesPage() {
  const [feeSettings, setFeeSettings] = useState<FeeSettings>({});
  const [students, setStudents] = useState<StudentFeeRow[]>([]);
  const [selectedClass, setSelectedClass] = useState(schoolClasses[0]);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("Upload a CSV or Excel sheet with class fee data.");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const importFormRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    const loadFees = async () => {
      try {
        const [feeResponse, studentResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/fee-settings`),
          fetch(`${API_BASE_URL}/api/students`),
        ]);
        const feeData = await feeResponse.json();
        const studentData = await studentResponse.json();
        setFeeSettings(feeData.feeSettings || {});
        setStudents(Array.isArray(studentData.students) ? studentData.students : []);
      } catch {
        setFeeSettings({});
        setStudents([]);
      }
    };

    loadFees();
  }, []);

  useEffect(() => {
    setDraft(feeSettings[selectedClass] || {});
  }, [selectedClass, feeSettings]);

  const classBreakdown = useMemo(() => {
    return schoolClasses.map((schoolClass) => {
      const classSettings = feeSettings[schoolClass] || {};
      const total = feeCategories.reduce((sum, category) => sum + (classSettings[category] || 0), 0);
      return { schoolClass, total, categories: feeCategories.map((category) => ({ category, amount: classSettings[category] || 0 })) };
    });
  }, [feeSettings]);

  const selectedClassSummary = useMemo(() => {
    const classSettings = feeSettings[selectedClass] || {};
    const total = feeCategories.reduce((sum, category) => sum + (classSettings[category] || 0), 0);
    return { total, categories: feeCategories.map((category) => ({ category, amount: classSettings[category] || 0 })) };
  }, [feeSettings, selectedClass]);

  const studentBreakdown = useMemo(() => {
    const byClass = students.reduce<Record<string, number>>((acc, student) => {
      acc[student.grade] = (acc[student.grade] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(byClass).sort((a, b) => b[1] - a[1]);
  }, [students]);

  const handleSave = async (nextSettings?: FeeSettings) => {
    const settingsToSave = nextSettings || { ...feeSettings, [selectedClass]: draft };
    try {
      await fetch(`${API_BASE_URL}/api/fee-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feeSettings: settingsToSave }),
      });
      setFeeSettings(settingsToSave);
      setDraft(settingsToSave[selectedClass] || {});
    } catch {
      // Keep the UI responsive even if the backend is offline.
    }
  };

  const handleFeeImport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      setImportStatus("Choose a file first.");
      return;
    }

    setImporting(true);
    setImportStatus("Reading spreadsheet...");

    try {
      const workbook = XLSX.read(await selectedFile.arrayBuffer(), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Array<Record<string, unknown>>;

      if (!rows.length) {
        throw new Error("No rows were found in the uploaded sheet.");
      }

      const headers = Object.keys(rows[0] || {}).map((header) => String(header));
      const classHeader = findHeader(headers, ["class", "grade", "class name", "level", "school class", "group"]);
      const categoryHeader = findHeader(headers, ["fee category", "category", "type", "fee type"]);
      const amountHeader = findHeader(headers, ["amount", "fee", "fees", "price", "value"]);

      const nextSettings: FeeSettings = { ...feeSettings };

      if (classHeader && categoryHeader && amountHeader) {
        rows.forEach((row) => {
          const classValue = String(row[classHeader] ?? "").trim();
          const categoryValue = String(row[categoryHeader] ?? "").trim();
          const amountValue = Number(row[amountHeader]);
          if (!classValue || !categoryValue || Number.isNaN(amountValue)) return;

          const normalizedClass = schoolClasses.find((schoolClass) => schoolClass.toLowerCase() === classValue.toLowerCase()) || classValue;
          const normalizedCategory = feeCategories.find((category) => category.toLowerCase() === categoryValue.toLowerCase()) || categoryValue;
          const classEntry = nextSettings[normalizedClass] || {};
          classEntry[normalizedCategory] = amountValue;
          nextSettings[normalizedClass] = classEntry;
        });
      } else if (classHeader) {
        headers.forEach((header) => {
          const category = mapCategory(header);
          if (!category || header === classHeader) return;

          rows.forEach((row) => {
            const classValue = String(row[classHeader] ?? "").trim();
            const amountValue = Number(row[header]);
            if (!classValue || Number.isNaN(amountValue)) return;

            const normalizedClass = schoolClasses.find((schoolClass) => schoolClass.toLowerCase() === classValue.toLowerCase()) || classValue;
            const classEntry = nextSettings[normalizedClass] || {};
            classEntry[category] = amountValue;
            nextSettings[normalizedClass] = classEntry;
          });
        });
      } else {
        throw new Error("The uploaded sheet must include a class column.");
      }

      await handleSave(nextSettings);
      setImportStatus(`Imported fee settings for ${Object.keys(nextSettings).length} class group${Object.keys(nextSettings).length === 1 ? "" : "s"}.`);
      setSelectedFile(null);
      importFormRef.current?.reset();
    } catch (error) {
      setImportStatus(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  const handleChange = (category: string, value: string) => {
    setDraft((current) => ({
      ...current,
      [category]: Number(value) || 0,
    }));
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_#fffdf7_0%,_#f4fef6_100%)] p-6 text-slate-800">
      <div className="mx-auto max-w-6xl rounded-[30px] border border-red-200 bg-white p-6 shadow-xl shadow-red-100/70">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-green-600">Class Fee Settings</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Fee breakdowns by class and category</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Academic term: Third Term</span>
              <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] text-gray-500">3 terms per year • 1st, 2nd, 3rd</span>
            </div>
          </div>
          <Link href="/" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
            Back to dashboard
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-red-100 bg-[#fffdf8] p-4">
            <p className="text-sm text-slate-500">Selected class total</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(selectedClassSummary.total)}</p>
          </div>
          <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
            <p className="text-sm text-slate-600">Classes configured</p>
            <p className="mt-2 text-xl font-semibold text-green-700">{classBreakdown.length}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-slate-600">Students loaded</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{students.length}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[24px] border border-red-100 bg-[#fffdf8] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Select class</p>
            <select
              className="mt-4 w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-base outline-none"
              value={selectedClass}
              onChange={(event) => setSelectedClass(event.target.value)}
            >
              {schoolClasses.map((schoolClass) => (
                <option key={schoolClass} value={schoolClass}>
                  {schoolClass}
                </option>
              ))}
            </select>

            <div className="mt-6 rounded-2xl border border-green-100 bg-green-50/80 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">How it works</p>
              <p className="mt-2">When you add a student, the system will use the fee amount for the selected class and fee category automatically.</p>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Class totals</p>
              <div className="mt-3 space-y-2">
                {classBreakdown.map((item) => (
                  <div key={item.schoolClass} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2 text-sm">
                    <span className="text-slate-700">{item.schoolClass}</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-red-100 bg-[#fffdf8] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Fee amounts for {selectedClass}</p>
            <div className="mt-5 space-y-4">
              {selectedClassSummary.categories.map((item) => (
                <div key={item.category} className="rounded-2xl border border-red-100 bg-white p-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">{item.category}</label>
                  <input
                    type="number"
                    className="w-full rounded-2xl border border-red-200 bg-[#fffdf8] px-4 py-3 text-base outline-none"
                    value={draft[item.category] ?? ""}
                    onChange={(event) => handleChange(item.category, event.target.value)}
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Import fee sheet</p>
              <form ref={importFormRef} onSubmit={handleFeeImport} className="mt-3 space-y-3">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-green-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                />
                <button
                  type="submit"
                  disabled={importing}
                  className="w-full rounded-2xl bg-green-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {importing ? "Importing..." : "Import fee sheet"}
                </button>
              </form>
              <p className="mt-3 text-sm text-slate-500">{importStatus}</p>
            </div>

            <button
              type="button"
              onClick={() => handleSave()}
              className="mt-6 rounded-2xl bg-green-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-green-500"
            >
              Save fee settings
            </button>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Student distribution by class</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {studentBreakdown.map(([grade, count]) => (
              <div key={grade} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
                <span className="text-slate-700">{grade}</span>
                <span className="ml-2 font-semibold text-slate-900">{count} student{count === 1 ? "" : "s"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
