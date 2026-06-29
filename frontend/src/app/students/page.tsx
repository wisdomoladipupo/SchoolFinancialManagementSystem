"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const API_BASE_URL = "http://localhost:4000";

type Student = {
  id: number;
  name: string;
  grade: string;
  familyName?: string;
  feeAmount: number;
  paidAmount: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/students`, { cache: "no-store" });
        const data = await response.json();
        setStudents(data.students || []);
      } catch {
        setError("Unable to load students. Please make sure the backend is running.");
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, []);

  const summary = useMemo(() => {
    const totalFee = students.reduce((sum, student) => sum + student.feeAmount, 0);
    const totalPaid = students.reduce((sum, student) => sum + student.paidAmount, 0);
    const balance = totalFee - totalPaid;
    const fullyPaid = students.filter((student) => student.paidAmount >= student.feeAmount).length;
    return { totalFee, totalPaid, balance, fullyPaid, owing: students.length - fullyPaid };
  }, [students]);

  const byClass = useMemo(() => {
    const groups = students.reduce<Record<string, number>>((acc, student) => {
      acc[student.grade] = (acc[student.grade] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(groups).sort((a, b) => b[1] - a[1]);
  }, [students]);

  const byFamily = useMemo(() => {
    const groups = students.reduce<Record<string, number>>((acc, student) => {
      const family = student.familyName || "Unassigned";
      acc[family] = (acc[family] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(groups).sort((a, b) => b[1] - a[1]);
  }, [students]);

  return (
    <main className="min-h-screen bg-[#fafaf8] text-gray-900 px-6 py-6">
      <div className="mx-auto max-w-7xl rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-green-600">Students</p>
            <h1 className="mt-2 text-3xl font-semibold text-gray-900">Student breakdown and payment overview</h1>
            <p className="mt-1 text-sm text-gray-500">Browse student information, payment status, and class or family distribution.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Academic term: Third Term</span>
              <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] text-gray-500">3 terms per year • 1st, 2nd, 3rd</span>
            </div>
          </div>
          <Link href="/" className="inline-flex items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors">
            Back to dashboard
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Total expected</p>
            <p className="mt-2 text-xl font-semibold text-gray-900">{formatCurrency(summary.totalFee)}</p>
          </div>
          <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
            <p className="text-sm text-green-700">Total paid</p>
            <p className="mt-2 text-xl font-semibold text-green-700">{formatCurrency(summary.totalPaid)}</p>
          </div>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
            <p className="text-sm text-red-700">Outstanding</p>
            <p className="mt-2 text-xl font-semibold text-red-700">{formatCurrency(summary.balance)}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Students status</p>
            <p className="mt-2 text-lg font-semibold text-gray-900">{summary.fullyPaid} paid • {summary.owing} owing</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">Student cards</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {students.map((student) => {
                const balance = student.feeAmount - student.paidAmount;
                const paidPercent = student.feeAmount > 0 ? Math.round((student.paidAmount / student.feeAmount) * 100) : 0;

                return (
                  <Link
                    key={student.id}
                    href={`/students/${student.id}`}
                    className="group rounded-3xl border border-gray-200 bg-[#fcfcfb] p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Student</p>
                        <h2 className="mt-2 text-xl font-semibold text-gray-900">{student.name}</h2>
                      </div>
                      <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                        {student.grade}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3">
                      <div className="rounded-2xl border border-gray-200 bg-white p-3">
                        <p className="text-sm text-gray-500">Family</p>
                        <p className="mt-1 font-semibold text-gray-800">{student.familyName || "Unassigned"}</p>
                      </div>
                      <div className="rounded-2xl border border-gray-200 bg-white p-3">
                        <p className="text-sm text-gray-500">Fee status</p>
                        <p className="mt-1 font-semibold text-gray-800">{formatCurrency(student.feeAmount)}</p>
                        <p className="mt-1 text-sm text-gray-500">Paid {formatCurrency(student.paidAmount)} • Balance {formatCurrency(balance)}</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm font-semibold text-emerald-700">
                      View full payment breakdown →
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(paidPercent, 100)}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">{paidPercent}% of fee paid</p>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">By class</p>
              <div className="mt-3 space-y-2">
                {byClass.map(([grade, count]) => (
                  <div key={grade} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">{grade}</span>
                      <span className="font-semibold text-gray-900">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">By family</p>
              <div className="mt-3 space-y-2">
                {byFamily.map(([family, count]) => (
                  <div key={family} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">{family}</span>
                      <span className="font-semibold text-gray-900">{count}</span>
                    </div>
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
