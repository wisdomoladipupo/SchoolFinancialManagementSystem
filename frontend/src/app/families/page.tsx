"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const API_BASE_URL = "http://localhost:4000";

type FamilySummary = {
  familyName: string;
  students: Array<{
    id: number;
    name: string;
    grade: string;
    feeAmount: number;
    paidAmount: number;
    balance: number;
  }>;
  totalFee: number;
  totalPaid: number;
  balance: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function FamiliesPage() {
  const [families, setFamilies] = useState<FamilySummary[]>([]);

  useEffect(() => {
    const loadFamilies = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/families`);
        const data = await response.json();
        setFamilies(data.families || []);
      } catch {
        setFamilies([]);
      }
    };

    loadFamilies();
  }, []);

  const overallSummary = useMemo(() => {
    const totalFee = families.reduce((sum, family) => sum + family.totalFee, 0);
    const totalPaid = families.reduce((sum, family) => sum + family.totalPaid, 0);
    const balance = totalFee - totalPaid;
    return { totalFee, totalPaid, balance, familyCount: families.length, studentCount: families.reduce((sum, family) => sum + family.students.length, 0) };
  }, [families]);

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#fffdf7_0%,#f4fef6_100%)] p-6 text-slate-800">
      <div className="mx-auto max-w-7xl rounded-[30px] border border-red-200 bg-white p-6 shadow-xl shadow-red-100/70">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-green-600">Family Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Family breakdowns and member balances</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Academic term: Third Term</span>
              <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] text-gray-500">3 terms per year • 1st, 2nd, 3rd</span>
            </div>
          </div>
          <Link href="/" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
            Back to dashboard
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-slate-500">Families</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{overallSummary.familyCount}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-slate-500">Students linked</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{overallSummary.studentCount}</p>
          </div>
          <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
            <p className="text-sm text-green-700">Family fees</p>
            <p className="mt-2 text-xl font-semibold text-green-700">{formatCurrency(overallSummary.totalFee)}</p>
          </div>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
            <p className="text-sm text-red-700">Outstanding</p>
            <p className="mt-2 text-xl font-semibold text-red-700">{formatCurrency(overallSummary.balance)}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {families.length === 0 ? (
            <div className="rounded-2xl border border-red-100 bg-[#fffdf8] p-6 text-slate-600 lg:col-span-2 xl:col-span-3">
              No family groups have been created yet.
            </div>
          ) : (
            families.map((family) => (
              <Link
                key={family.familyName}
                href={`/families/${encodeURIComponent(family.familyName)}`}
                className="group rounded-3xl border border-red-100 bg-[#fffdf8] p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Family</p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-900">{family.familyName}</h2>
                  </div>
                  <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                    {family.students.length} student{family.students.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl border border-red-100 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-500">Expected</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{formatCurrency(family.totalFee)}</p>
                  </div>
                  <div className="rounded-2xl border border-red-100 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-500">Paid</p>
                    <p className="mt-1 text-lg font-semibold text-green-700">{formatCurrency(family.totalPaid)}</p>
                  </div>
                  <div className="rounded-2xl border border-red-100 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-500">Outstanding</p>
                    <p className="mt-1 text-lg font-semibold text-red-700">{formatCurrency(family.balance)}</p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm font-semibold text-emerald-700">
                  Open full family details →
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
