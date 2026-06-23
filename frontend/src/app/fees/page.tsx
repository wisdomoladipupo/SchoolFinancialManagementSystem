"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

export default function FeesPage() {
  const [feeSettings, setFeeSettings] = useState<FeeSettings>({});
  const [selectedClass, setSelectedClass] = useState(schoolClasses[0]);
  const [draft, setDraft] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadFees = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/fee-settings`);
        const data = await response.json();
        setFeeSettings(data.feeSettings || {});
      } catch {
        setFeeSettings({});
      }
    };

    loadFees();
  }, []);

  useEffect(() => {
    setDraft(feeSettings[selectedClass] || {});
  }, [selectedClass, feeSettings]);

  const handleSave = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/fee-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feeSettings: { ...feeSettings, [selectedClass]: draft } }),
      });
      setFeeSettings((current) => ({ ...current, [selectedClass]: draft }));
    } catch {
      // Keep the UI responsive even if the backend is offline.
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
      <div className="mx-auto max-w-5xl rounded-[30px] border border-red-200 bg-white p-6 shadow-xl shadow-red-100/70">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-green-600">Class Fee Settings</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Set tuition and other fees by class</h1>
          </div>
          <Link href="/" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
            Back to dashboard
          </Link>
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
          </div>

          <div className="rounded-[24px] border border-red-100 bg-[#fffdf8] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Fee amounts for {selectedClass}</p>
            <div className="mt-5 space-y-4">
              {feeCategories.map((category) => (
                <div key={category} className="rounded-2xl border border-red-100 bg-white p-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">{category}</label>
                  <input
                    type="number"
                    className="w-full rounded-2xl border border-red-200 bg-[#fffdf8] px-4 py-3 text-base outline-none"
                    value={draft[category] ?? ""}
                    onChange={(event) => handleChange(category, event.target.value)}
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="mt-6 rounded-2xl bg-green-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-green-500"
            >
              Save fee settings
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
