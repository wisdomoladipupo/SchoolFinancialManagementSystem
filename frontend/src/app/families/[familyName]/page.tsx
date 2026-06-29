"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

const API_BASE_URL = "http://localhost:4000";

type StudentProfile = {
  id: number;
  name: string;
  grade: string;
  familyName?: string;
  feeAmount: number;
  paidAmount: number;
  balance: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function FamilyDetailPage() {
  const params = useParams();
  const familyName = decodeURIComponent(String(params?.familyName || ""));
  const [members, setMembers] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFamily = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/families`, { cache: "no-store" });
        const data = await response.json();
        const family = (data.families || []).find((entry: { familyName: string }) => entry.familyName === familyName);
        setMembers((family?.students || []).map((student: StudentProfile) => ({ ...student, balance: student.feeAmount - student.paidAmount })));
      } catch {
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };

    if (familyName) {
      loadFamily();
    }
  }, [familyName]);

  const summary = useMemo(() => {
    const totalFee = members.reduce((sum, member) => sum + member.feeAmount, 0);
    const totalPaid = members.reduce((sum, member) => sum + member.paidAmount, 0);
    const pending = totalFee - totalPaid;
    return { totalFee, totalPaid, pending };
  }, [members]);

  return (
    <main className="min-h-screen bg-[#fafaf8] p-6 text-gray-900">
      <div className="mx-auto max-w-6xl rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">Family breakdown</p>
            <h1 className="mt-2 text-3xl font-semibold text-gray-900">{familyName || "Family account"}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Academic term: Third Term</span>
              <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] text-gray-500">3 terms per year • 1st, 2nd, 3rd</span>
            </div>
          </div>
          <Link href="/families" className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100">
            Back to families
          </Link>
        </div>

        {loading ? (
          <div className="mt-8 rounded-2xl border border-gray-100 bg-gray-50 p-6 text-gray-600">Loading family details...</div>
        ) : members.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-gray-100 bg-gray-50 p-6 text-gray-600">No members were found for this family.</div>
        ) : (
          <>
            <section className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-500">Total fee</p>
                <p className="mt-2 text-xl font-semibold text-gray-900">{formatCurrency(summary.totalFee)}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-500">Paid</p>
                <p className="mt-2 text-xl font-semibold text-emerald-700">{formatCurrency(summary.totalPaid)}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-500">Pending</p>
                <p className="mt-2 text-xl font-semibold text-red-700">{formatCurrency(summary.pending)}</p>
              </div>
            </section>

            <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">Family members</p>
                  <h2 className="mt-2 text-2xl font-semibold text-gray-900">Fees and outstanding balances</h2>
                </div>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm font-semibold text-gray-700">
                  {members.length} member(s)
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {members.map((member) => (
                  <Link key={member.id} href={`/students/${member.id}`} className="block rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:border-emerald-300 hover:shadow-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-lg font-semibold text-gray-900">{member.name}</p>
                        <p className="text-sm text-gray-500">{member.grade}</p>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>Fee: {formatCurrency(member.feeAmount)}</p>
                        <p>Paid: {formatCurrency(member.paidAmount)}</p>
                        <p>Pending: {formatCurrency(member.balance)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
