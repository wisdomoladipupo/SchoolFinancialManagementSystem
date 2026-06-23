"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_#fffdf7_0%,_#f4fef6_100%)] p-6 text-slate-800">
      <div className="mx-auto max-w-6xl rounded-[30px] border border-red-200 bg-white p-6 shadow-xl shadow-red-100/70">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-green-600">Family Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Students grouped by family</h1>
          </div>
          <Link href="/" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
            Back to dashboard
          </Link>
        </div>

        <div className="mt-8 space-y-4">
          {families.length === 0 ? (
            <div className="rounded-2xl border border-red-100 bg-[#fffdf8] p-6 text-slate-600">
              No family groups have been created yet.
            </div>
          ) : (
            families.map((family) => (
              <section key={family.familyName} className="rounded-[24px] border border-red-100 bg-[#fffdf8] p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-900">{family.familyName}</h2>
                    <p className="mt-1 text-sm text-slate-600">{family.students.length} student(s) linked to this family</p>
                  </div>
                  <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    <p className="font-semibold">Family balance</p>
                    <p className="mt-1">{formatCurrency(family.balance)}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-red-100 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-500">Total fee</p>
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

                <div className="mt-6 space-y-3">
                  {family.students.map((student) => (
                    <Link
                      key={student.id}
                      href={`/students/${student.id}`}
                      className="flex flex-col gap-2 rounded-2xl border border-red-100 bg-white p-4 transition hover:border-green-300 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-lg font-semibold text-slate-900">{student.name}</p>
                        <p className="text-sm text-slate-600">{student.grade}</p>
                      </div>
                      <div className="text-sm text-slate-600">
                        <p>Fee: {formatCurrency(student.feeAmount)}</p>
                        <p>Paid: {formatCurrency(student.paidAmount)}</p>
                        <p>Balance: {formatCurrency(student.balance)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
