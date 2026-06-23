"use client";

import { useEffect, useState } from "react";

const API_BASE_URL = "http://localhost:4000";

type ReportStudent = {
  id: number;
  name: string;
  grade: string;
  feeAmount: number;
  paidAmount: number;
  balance: number;
  feeCategory: string;
};

export default function ReportPage() {
  const [students, setStudents] = useState<ReportStudent[]>([]);
  const [summary, setSummary] = useState({ totalFee: 0, totalPaid: 0, balance: 0 });

  useEffect(() => {
    const loadReport = async () => {
      const response = await fetch(`${API_BASE_URL}/api/reports`);
      const data = await response.json();
      const mappedStudents = data.students.map((student: any) => ({
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

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_#fffdf7_0%,_#f4fef6_100%)] p-6 text-slate-800">
      <div className="mx-auto max-w-6xl rounded-[30px] border border-red-200 bg-white p-6 shadow-xl shadow-red-100/70">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-green-600">Finance Report</p>
            <h1 className="text-3xl font-semibold text-slate-900">School payment summary</h1>
          </div>
          <a href="/" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
            Back to dashboard
          </a>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-red-100 bg-[#fffdf8] p-4">
            <p className="text-sm text-slate-500">Total Fees</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">₦{summary.totalFee.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-slate-600">Collected</p>
            <p className="mt-2 text-xl font-semibold text-green-700">₦{summary.totalPaid.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-slate-600">Outstanding</p>
            <p className="mt-2 text-xl font-semibold text-red-700">₦{summary.balance.toLocaleString()}</p>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-red-100">
          <table className="min-w-full divide-y divide-red-100 text-sm">
            <thead className="bg-[#fffdf8]">
              <tr>
                <th className="px-4 py-3 text-left text-slate-700">Student</th>
                <th className="px-4 py-3 text-left text-slate-700">Class</th>
                <th className="px-4 py-3 text-left text-slate-700">Category</th>
                <th className="px-4 py-3 text-left text-slate-700">Fee</th>
                <th className="px-4 py-3 text-left text-slate-700">Paid</th>
                <th className="px-4 py-3 text-left text-slate-700">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-100 bg-white">
              {students.map((student) => (
                <tr key={student.id}>
                  <td className="px-4 py-3 text-slate-700">{student.name}</td>
                  <td className="px-4 py-3 text-slate-700">{student.grade}</td>
                  <td className="px-4 py-3 text-slate-700">{student.feeCategory}</td>
                  <td className="px-4 py-3 text-slate-700">₦{student.feeAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-700">₦{student.paidAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-700">₦{student.balance.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
