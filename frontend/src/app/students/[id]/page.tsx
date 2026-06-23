"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

const API_BASE_URL = "http://localhost:4000";

type Payment = {
  id: number;
  studentId: number;
  amount: number;
  note: string;
  date: string;
};

type StudentProfile = {
  id: number;
  name: string;
  grade: string;
  feeAmount: number;
  paidAmount: number;
  lastPaymentDate: string;
  note: string;
  feeCategory: string;
  balance: number;
};

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

export default function StudentProfilePage() {
  const params = useParams();
  const studentId = Number(params?.id);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStudentProfile = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/students/${studentId}`);
        const data = await response.json();

        if (data.student) {
          setStudent(data.student);
          setPayments(data.payments || []);
        }
      } catch {
        setStudent(null);
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      loadStudentProfile();
    }
  }, [studentId]);

  const status = useMemo(() => {
    if (!student) return "";
    const balance = student.feeAmount - student.paidAmount;
    if (balance <= 0) return "Fully paid";
    if (student.paidAmount > 0) return "Partial";
    return "Outstanding";
  }, [student]);

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_#fffdf7_0%,_#f4fef6_100%)] p-6 text-slate-800">
      <div className="mx-auto max-w-6xl rounded-[30px] border border-red-200 bg-white p-6 shadow-xl shadow-red-100/70">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-green-600">Student Profile</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">
              {loading ? "Loading profile..." : student?.name || "Student not found"}
            </h1>
          </div>
          <Link
            href="/"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700"
          >
            Back to dashboard
          </Link>
        </div>

        {loading ? (
          <div className="mt-8 rounded-2xl border border-red-100 bg-[#fffdf8] p-6 text-slate-600">
            Loading student details...
          </div>
        ) : !student ? (
          <div className="mt-8 rounded-2xl border border-red-100 bg-[#fffdf8] p-6 text-slate-600">
            No student profile was found for this record.
          </div>
        ) : (
          <>
            <section className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[24px] border border-red-100 bg-[#fffdf8] p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">School details</p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-900">{student.name}</h2>
                  </div>
                  <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">
                    {status}
                  </span>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-red-100 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-500">Class</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{student.grade}</p>
                  </div>
                  <div className="rounded-2xl border border-red-100 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-500">Fee Category</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{student.feeCategory}</p>
                  </div>
                  <div className="rounded-2xl border border-red-100 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-500">Total Fee</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{formatCurrency(student.feeAmount)}</p>
                  </div>
                  <div className="rounded-2xl border border-red-100 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-500">Paid</p>
                    <p className="mt-1 text-lg font-semibold text-green-700">{formatCurrency(student.paidAmount)}</p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-red-100 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-500">Outstanding Balance</p>
                  <p className="mt-2 text-2xl font-semibold text-red-700">{formatCurrency(student.balance)}</p>
                </div>
              </div>

              <div className="rounded-[24px] border border-red-100 bg-[#fffdf8] p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Notes</p>
                <p className="mt-3 text-lg text-slate-700">{student.note}</p>
                <div className="mt-6 rounded-2xl border border-green-100 bg-green-50/80 p-4">
                  <p className="text-sm font-semibold text-slate-600">Last payment</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{formatDate(student.lastPaymentDate)}</p>
                </div>
              </div>
            </section>

            <section className="mt-8 rounded-[24px] border border-red-100 bg-white p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Payment history</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">All payments received</h2>
                </div>
                <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm font-semibold text-red-700">
                  {payments.length} payments
                </span>
              </div>

              {payments.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-red-100 bg-[#fffdf8] p-4 text-slate-600">
                  No payment records have been added yet.
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="rounded-2xl border border-red-100 bg-[#fffdf8] p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-lg font-semibold text-slate-900">{formatCurrency(payment.amount)}</p>
                          <p className="text-sm text-slate-600">{payment.note}</p>
                        </div>
                        <p className="text-sm font-semibold text-slate-500">{formatDate(payment.date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
