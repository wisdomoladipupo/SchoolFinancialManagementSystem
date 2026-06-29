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
  familyName?: string;
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
  const [familyMembers, setFamilyMembers] = useState<StudentProfile[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStudentProfile = async () => {
      try {
        const [studentResponse, studentsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/students/${studentId}`),
          fetch(`${API_BASE_URL}/api/students`, { cache: "no-store" }),
        ]);

        const studentData = await studentResponse.json();
        const studentsData = await studentsResponse.json();

        if (studentData.student) {
          const selectedStudent = studentData.student as StudentProfile;
          setStudent(selectedStudent);
          setPayments(studentData.payments || []);

          const familyName = selectedStudent.familyName?.trim();
          if (familyName && familyName.toLowerCase() !== "unassigned") {
            const relatedMembers = (studentsData.students || [])
              .filter((entry: StudentProfile) => entry.familyName?.trim().toLowerCase() === familyName.toLowerCase())
              .map((entry: StudentProfile) => ({ ...entry, balance: entry.feeAmount - entry.paidAmount }));
            setFamilyMembers(relatedMembers);
          } else {
            setFamilyMembers([]);
          }
        }
      } catch {
        setStudent(null);
        setFamilyMembers([]);
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

  const familySummary = useMemo(() => {
    const totalFee = familyMembers.reduce((sum, member) => sum + member.feeAmount, 0);
    const totalPaid = familyMembers.reduce((sum, member) => sum + member.paidAmount, 0);
    const pending = totalFee - totalPaid;
    return { totalFee, totalPaid, pending };
  }, [familyMembers]);

  return (
    <main className="min-h-screen bg-[#fafaf8] p-6 text-gray-900">
      <div className="mx-auto max-w-6xl rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">Student Profile</p>
            <h1 className="mt-2 text-3xl font-semibold text-gray-900">
              {loading ? "Loading profile..." : student?.name || "Student not found"}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Academic term: Third Term</span>
              <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] text-gray-500">3 terms per year • 1st, 2nd, 3rd</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/students" className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100">
              Back to students
            </Link>
            <Link href="/" className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100">
              Dashboard
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="mt-8 rounded-2xl border border-gray-100 bg-gray-50 p-6 text-gray-600">Loading student details...</div>
        ) : !student ? (
          <div className="mt-8 rounded-2xl border border-gray-100 bg-gray-50 p-6 text-gray-600">No student profile was found for this record.</div>
        ) : (
          <>
            <section className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">School details</p>
                    <h2 className="mt-2 text-2xl font-semibold text-gray-900">{student.name}</h2>
                  </div>
                  <span className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">{status}</span>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-sm font-semibold text-gray-500">Class</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">{student.grade}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-sm font-semibold text-gray-500">Fee Category</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">{student.feeCategory}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-sm font-semibold text-gray-500">Total Fee</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">{formatCurrency(student.feeAmount)}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-sm font-semibold text-gray-500">Paid</p>
                    <p className="mt-1 text-lg font-semibold text-emerald-700">{formatCurrency(student.paidAmount)}</p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
                  <p className="text-sm font-semibold text-gray-500">Outstanding Balance</p>
                  <p className="mt-2 text-2xl font-semibold text-red-700">{formatCurrency(student.balance)}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">Family context</p>
                <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-4">
                  <p className="text-sm font-semibold text-gray-500">Family name</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{student.familyName || "Unassigned"}</p>
                </div>
                {student.familyName && student.familyName.trim().toLowerCase() !== "unassigned" ? (
                  <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-sm font-semibold text-gray-500">Family balance</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">{formatCurrency(familySummary.pending)}</p>
                    <p className="mt-2 text-sm text-gray-500">{familyMembers.length} family member(s) • {formatCurrency(familySummary.totalPaid)} paid of {formatCurrency(familySummary.totalFee)}</p>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500">This student is not yet linked to a family.</div>
                )}
                <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
                  <p className="text-sm font-semibold text-gray-500">Latest note</p>
                  <p className="mt-2 text-base text-gray-700">{student.note}</p>
                </div>
                <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                  <p className="text-sm font-semibold text-gray-600">Last payment</p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">{formatDate(student.lastPaymentDate)}</p>
                </div>
              </div>
            </section>

            <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">Family fee breakdown</p>
                  <h2 className="mt-2 text-2xl font-semibold text-gray-900">Student and family member balances</h2>
                </div>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm font-semibold text-gray-700">
                  {familyMembers.length + 1} linked record(s)
                </span>
              </div>

              <div className="mt-6 space-y-3">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{student.name}</p>
                      <p className="text-sm text-gray-500">Selected student • {student.grade}</p>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Fee: {formatCurrency(student.feeAmount)}</p>
                      <p>Paid: {formatCurrency(student.paidAmount)}</p>
                      <p>Pending: {formatCurrency(student.balance)}</p>
                    </div>
                  </div>
                </div>

                {familyMembers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">No other family members are linked yet.</div>
                ) : (
                  familyMembers
                    .filter((member) => member.id !== student.id)
                    .map((member) => (
                      <Link key={member.id} href={`/students/${member.id}`} className="block rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm">
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
                    ))
                )}
              </div>
            </section>

            <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">Payment history</p>
                  <h2 className="mt-2 text-2xl font-semibold text-gray-900">All payments received</h2>
                </div>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm font-semibold text-gray-700">
                  {payments.length} payments
                </span>
              </div>

              {payments.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">No payment records have been added yet.</div>
              ) : (
                <div className="mt-6 space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-lg font-semibold text-gray-900">{formatCurrency(payment.amount)}</p>
                          <p className="text-sm text-gray-600">{payment.note}</p>
                        </div>
                        <p className="text-sm font-semibold text-gray-500">{formatDate(payment.date)}</p>
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
