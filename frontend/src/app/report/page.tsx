"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE_URL = "http://localhost:4000";

type ReportStudent = {
  id: number;
  name: string;
  grade: string;
  feeAmount: number;
  paidAmount: number;
  balance: number;
  feeCategory: string;
  familyName?: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);
}

export default function ReportPage() {
  const [students, setStudents] = useState<ReportStudent[]>([]);
  const [summary, setSummary] = useState({ totalFee: 0, totalPaid: 0, balance: 0 });

  useEffect(() => {
    const loadReport = async () => {
      const response = await fetch(`${API_BASE_URL}/api/reports`);
      const data = await response.json();
      const mappedStudents = (data.students || []).map((student: any) => ({
        ...student,
        balance: student.feeAmount - student.paidAmount,
      }));
      setStudents(mappedStudents);
      setSummary({
        totalFee: data.totalFee || 0,
        totalPaid: data.totalPaid || 0,
        balance: data.balance || 0,
      });
    };

    loadReport();
  }, []);

  const statusBreakdown = useMemo(() => {
    const groups = students.reduce<Record<string, { count: number; total: number }>>((acc, student) => {
      const status = student.balance <= 0 ? "Fully Paid" : student.paidAmount > 0 ? "Partial" : "Outstanding";
      if (!acc[status]) acc[status] = { count: 0, total: 0 };
      acc[status].count += 1;
      acc[status].total += student.balance;
      return acc;
    }, {});

    return Object.entries(groups).map(([label, value]) => ({ label, ...value }));
  }, [students]);

  const classBreakdown = useMemo(() => {
    const groups = students.reduce<Record<string, { count: number; fee: number; paid: number; balance: number }>>((acc, student) => {
      if (!acc[student.grade]) acc[student.grade] = { count: 0, fee: 0, paid: 0, balance: 0 };
      acc[student.grade].count += 1;
      acc[student.grade].fee += student.feeAmount;
      acc[student.grade].paid += student.paidAmount;
      acc[student.grade].balance += student.balance;
      return acc;
    }, {});

    return Object.entries(groups).map(([grade, value]) => ({ grade, ...value }));
  }, [students]);

  const familyBreakdown = useMemo(() => {
    const groups = students.reduce<Record<string, { count: number; fee: number; paid: number; balance: number }>>((acc, student) => {
      const family = student.familyName || "Unassigned";
      if (!acc[family]) acc[family] = { count: 0, fee: 0, paid: 0, balance: 0 };
      acc[family].count += 1;
      acc[family].fee += student.feeAmount;
      acc[family].paid += student.paidAmount;
      acc[family].balance += student.balance;
      return acc;
    }, {});

    return Object.entries(groups).map(([family, value]) => ({ family, ...value })).sort((a, b) => b.balance - a.balance);
  }, [students]);

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_#fffdf7_0%,_#f4fef6_100%)] p-6 text-slate-800">
      <div className="mx-auto max-w-7xl rounded-[30px] border border-red-200 bg-white p-6 shadow-xl shadow-red-100/70">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-green-600">Finance Report</p>
            <h1 className="text-3xl font-semibold text-slate-900">School payment summary</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Academic term: Third Term</span>
              <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] text-gray-500">3 terms per year • 1st, 2nd, 3rd</span>
            </div>
          </div>
          <a href="/" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
            Back to dashboard
          </a>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-red-100 bg-[#fffdf8] p-4">
            <p className="text-sm text-slate-500">Total Fees</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(summary.totalFee)}</p>
          </div>
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-slate-600">Collected</p>
            <p className="mt-2 text-xl font-semibold text-green-700">{formatCurrency(summary.totalPaid)}</p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-slate-600">Outstanding</p>
            <p className="mt-2 text-xl font-semibold text-red-700">{formatCurrency(summary.balance)}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-red-100 bg-[#fffdf8] p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Student payment breakdown</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {students.map((student) => (
                <div key={student.id} className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{student.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{student.grade}</p>
                    </div>
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-medium text-slate-600">{student.feeCategory}</span>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-slate-600">
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400">Fee</p>
                      <p className="mt-1 font-semibold text-slate-900">{formatCurrency(student.feeAmount)}</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400">Paid</p>
                      <p className="mt-1 font-semibold text-green-700">{formatCurrency(student.paidAmount)}</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400">Balance</p>
                      <p className="mt-1 font-semibold text-red-700">{formatCurrency(student.balance)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">By payment status</p>
              <div className="mt-3 space-y-2">
                {statusBreakdown.map((item) => (
                  <div key={item.label} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700">{item.label}</span>
                      <span className="font-semibold text-slate-900">{item.count} student{item.count === 1 ? "" : "s"}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Balance {formatCurrency(item.total)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">By class</p>
              <div className="mt-3 space-y-2">
                {classBreakdown.map((item) => (
                  <div key={item.grade} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700">{item.grade}</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(item.balance)}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{item.count} students • Paid {formatCurrency(item.paid)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">By family</p>
              <div className="mt-3 space-y-2">
                {familyBreakdown.map((item) => (
                  <div key={item.family} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700">{item.family}</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(item.balance)}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{item.count} students • {formatCurrency(item.fee)} expected</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
