"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

const API_BASE_URL = "http://localhost:4000";

type Student = {
  id: number;
  name: string;
  familyName?: string;
  grade: string;
  feeAmount: number;
  paidAmount: number;
  lastPaymentDate: string;
  note: string;
  feeCategory: string;
};

const schoolClasses = [
  "Preschool", "Nursery 1", "Nursery 2", "Nursery 3",
  "Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5",
  "JSS1", "JSS2", "JSS3", "SS1", "SS2",
];

const feeCategories = ["Tuition", "Exam", "Transport", "Development Levy", "Other"];
const actionButtonClass = "rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 shadow-sm transition-all duration-200 hover:bg-emerald-100 hover:text-gray-900 active:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-emerald-200";

const commonNameTokens = new Set(["the", "and", "of", "de", "del", "da", "di", "la", "le", "bin", "binti", "ibrahim", "muhammad", "mohammed", "abdul", "abubakar", "ali", "ahmed"]);

function normalizeNameTokens(value: string) {
  const rawTokens = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !commonNameTokens.has(token));

  if (!rawTokens.length) return [];

  const meaningfulTokens = rawTokens.filter((token) => !["o", "h", "a", "m"].includes(token));
  const surnameLike = meaningfulTokens.length > 1 ? [meaningfulTokens[meaningfulTokens.length - 1], meaningfulTokens[meaningfulTokens.length - 2]] : meaningfulTokens;

  return Array.from(new Set([...meaningfulTokens, ...surnameLike]));
}

function getMeaningfulNameParts(value: string) {
  const tokens = String(value || "")
    .split(/\s+/)
    .map((token) => token.replace(/[^a-zA-Z0-9]/g, "").trim())
    .filter(Boolean);

  const filteredTokens = tokens.filter((token) => {
    if (token.length <= 1) return false;
    if (commonNameTokens.has(token.toLowerCase())) return false;
    return !["o", "h", "a", "m"].includes(token.toLowerCase());
  });

  return Array.from(new Set(filteredTokens));
}

function getNameWordMatches(selectedName: string, candidateName: string) {
  const selectedWords = getMeaningfulNameParts(selectedName);
  const candidateWords = getMeaningfulNameParts(candidateName);

  if (!selectedWords.length || !candidateWords.length) return [];

  return selectedWords.filter((selectedWord) =>
    candidateWords.some((candidateWord) => {
      const normalizedSelected = selectedWord.toLowerCase();
      const normalizedCandidate = candidateWord.toLowerCase();
      return normalizedSelected === normalizedCandidate || normalizedCandidate.startsWith(normalizedSelected) || normalizedSelected.startsWith(normalizedCandidate);
    }),
  );
}

function getNamePrefixMatches(selectedName: string, candidateName: string) {
  const matchingWords = getNameWordMatches(selectedName, candidateName);
  return matchingWords.length > 0;
}

function getNameMatchScore(selectedTokens: string[], candidateTokens: string[]) {
  let score = 0;

  selectedTokens.forEach((token) => {
    if (token.length < 2) return;
    const hasDirectMatch = candidateTokens.includes(token);
    if (hasDirectMatch) {
      score += 3;
      return;
    }

    const hasPrefixMatch = candidateTokens.some((candidateToken) => {
      return candidateToken.length >= 3 && (candidateToken.startsWith(token.slice(0, 3)) || token.startsWith(candidateToken.slice(0, 3)) || candidateToken.includes(token) || token.includes(candidateToken));
    });

    if (hasPrefixMatch) score += 1;
  });

  const firstToken = selectedTokens[0];
  const lastToken = selectedTokens[selectedTokens.length - 1];
  if (firstToken && candidateTokens.includes(firstToken)) score += 1;
  if (lastToken && candidateTokens.includes(lastToken)) score += 1;

  return score;
}

function getFamilyNameMatchScore(selectedName: string, candidateFamilyName: string) {
  const selectedTokens = getMeaningfulNameParts(selectedName);
  const familyTokens = getMeaningfulNameParts(candidateFamilyName);

  if (!selectedTokens.length || !familyTokens.length) return 0;

  const selectedLower = selectedTokens.map((token) => token.toLowerCase());
  const familyLower = familyTokens.map((token) => token.toLowerCase());

  let score = 0;

  selectedLower.forEach((token) => {
    const hasExactToken = familyLower.includes(token);
    if (hasExactToken) {
      score += 4;
      return;
    }

    const hasPrefixMatch = familyLower.some((familyToken) => {
      return familyToken.length >= 3 && (familyToken.startsWith(token.slice(0, 3)) || token.startsWith(familyToken.slice(0, 3)) || familyToken.includes(token) || token.includes(familyToken));
    });

    if (hasPrefixMatch) score += 2;
  });

  const selectedSurname = selectedTokens[selectedTokens.length - 1]?.toLowerCase();
  const familySurname = familyTokens[familyTokens.length - 1]?.toLowerCase();
  if (selectedSurname && familySurname && selectedSurname === familySurname) score += 4;
  if (selectedTokens[0] && familyLower.includes(selectedTokens[0].toLowerCase())) score += 1;
  if (selectedTokens.length > 1 && familyLower.includes(selectedTokens[selectedTokens.length - 2].toLowerCase())) score += 1;

  return score;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getPaymentStatus(paid: number, total: number) {
  const pct = total > 0 ? paid / total : 0;
  if (pct >= 1) return { label: "Paid", color: "text-emerald-600 bg-emerald-50", bar: "bg-emerald-500" };
  if (pct >= 0.5) return { label: "Partial", color: "text-amber-600 bg-amber-50", bar: "bg-amber-400" };
  return { label: "Owing", color: "text-red-600 bg-red-50", bar: "bg-red-400" };
}

/* ── Sidebar icon components ─────────────────────────────── */
const IconHome = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
);
const IconUsers = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const IconReceipt = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v.5"/><path d="M12 6v.5"/></svg>
);
const IconFamily = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
);
const IconReport = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
);
const IconMenu = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
);
const IconSearch = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);
const IconUpload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
);

export default function Home() {
  const [students, setStudents] = useState<Student[]>([]);
  const [report, setReport] = useState({ totalFee: 0, totalPaid: 0, balance: 0 });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "register" | "payment" | "import" | "assign-family">("overview");

  const [studentForm, setStudentForm] = useState({ name: "", familyName: "", grade: "", feeAmount: "", feeCategory: "Tuition" });
  const [paymentForm, setPaymentForm] = useState({ studentId: "", amount: "", note: "" });
  const [familyAssignmentForm, setFamilyAssignmentForm] = useState({ studentId: "", familyName: "" });
  const [importStatus, setImportStatus] = useState("Upload an Excel or CSV sheet with student names and classes.");
  const [familyAssignmentStatus, setFamilyAssignmentStatus] = useState("Assign a student to a family group.");
  const [familyEditorState, setFamilyEditorState] = useState<{ familyName: string; studentId: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const importFormRef = useRef<HTMLFormElement | null>(null);

  const refreshDashboard = async () => {
    try {
      const [studentsResponse, reportResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/students`, { cache: "no-store" }),
        fetch(`${API_BASE_URL}/api/reports`, { cache: "no-store" }),
      ]);
      const studentsData = await studentsResponse.json();
      const reportData = await reportResponse.json();
      setStudents(Array.isArray(studentsData.students) ? studentsData.students : []);
      setReport({ totalFee: reportData.totalFee || 0, totalPaid: reportData.totalPaid || 0, balance: reportData.balance || 0 });
    } catch { /* offline fallback */ }
  };

  const updateStudentInState = (updatedStudent: Student) => {
    setStudents((currentStudents) =>
      currentStudents.map((student) => (student.id === updatedStudent.id ? { ...student, ...updatedStudent } : student)),
    );
  };

  useEffect(() => { refreshDashboard(); }, []);

  const summary = useMemo(() => {
    const explicitStudents = students.filter((student) => student.feeAmount > 0 || student.paidAmount > 0);
    const totalFee = explicitStudents.reduce((s, st) => s + st.feeAmount, 0);
    const totalPaid = explicitStudents.reduce((s, st) => s + st.paidAmount, 0);
    const balance = totalFee - totalPaid;
    const fullyPaidCount = explicitStudents.filter((s) => s.paidAmount >= s.feeAmount).length;
    const collectionRate = totalFee > 0 ? Math.round((totalPaid / totalFee) * 100) : 0;
    return { totalFee, totalPaid, balance, fullyPaidCount, collectionRate };
  }, [students]);

  const hasFinancialData = useMemo(() => {
    return students.some((student) => student.feeAmount > 0 || student.paidAmount > 0);
  }, [students]);

  const totalFamilies = useMemo(() => {
    const familyNames = students
      .map((student) => student.familyName?.trim())
      .filter((familyName): familyName is string => {
        const normalizedName = familyName?.trim() ?? "";
        return normalizedName.length > 0 && normalizedName.toLowerCase() !== "unassigned";
      });
    return new Set(familyNames).size;
  }, [students]);

  const assignedFamilies = useMemo(() => {
    const grouped = students.reduce<Record<string, { name: string; students: Student[] }>>((acc, student) => {
      const familyName = student.familyName?.trim();
      if (!familyName || familyName.toLowerCase() === "unassigned") return acc;
      const key = familyName.toLowerCase();
      if (!acc[key]) acc[key] = { name: familyName, students: [] };
      acc[key].students.push(student);
      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter((s) => s.name.toLowerCase().includes(q) || s.grade.toLowerCase().includes(q) || (s.familyName || "").toLowerCase().includes(q));
  }, [students, searchQuery]);

  const assignableStudents = useMemo(() => {
    return students.filter((student) => {
      const familyName = student.familyName?.trim();
      return !familyName || familyName.toLowerCase() === "unassigned";
    });
  }, [students]);

  const selectedAssignmentStudent = useMemo(() => {
    const studentId = Number(familyAssignmentForm.studentId);
    return students.find((student) => student.id === studentId) || null;
  }, [students, familyAssignmentForm.studentId]);

  const familySuggestions = useMemo(() => {
    if (!selectedAssignmentStudent) return [];

    const blockedNames = new Set<string>([
      selectedAssignmentStudent.familyName?.trim() || "",
    ].filter(Boolean).map((value) => value.toLowerCase()));

    const existingFamilyNames = Array.from(new Set(
      students
        .map((student) => student.familyName?.trim())
        .filter((value): value is string => Boolean(value && value.toLowerCase() !== "unassigned")),
    ));

    const scoredSuggestions = existingFamilyNames
      .map((familyName) => ({ familyName, score: getFamilyNameMatchScore(selectedAssignmentStudent.name, familyName) }))
      .filter((entry) => entry.score >= 3)
      .sort((a, b) => b.score - a.score || a.familyName.localeCompare(b.familyName));

    const fallbackSuggestions = getMeaningfulNameParts(selectedAssignmentStudent.name)
      .map((token) => token.replace(/^./, (char) => char.toUpperCase()))
      .filter((token) => token.length >= 2)
      .map((token) => ({ familyName: token, score: 2 }));

    const mergedSuggestions = [...scoredSuggestions, ...fallbackSuggestions]
      .filter((entry) => {
        const normalizedName = entry.familyName.toLowerCase();
        return normalizedName.length >= 2 && !Array.from(blockedNames).some((blockedName) => normalizedName === blockedName || normalizedName.includes(blockedName) || blockedName.includes(normalizedName));
      })
      .reduce<Array<{ familyName: string; score: number }>>((acc, entry) => {
        const exists = acc.find((item) => item.familyName.toLowerCase() === entry.familyName.toLowerCase());
        if (!exists) acc.push(entry);
        return acc;
      }, []);

    return mergedSuggestions
      .sort((a, b) => b.score - a.score || a.familyName.localeCompare(b.familyName))
      .slice(0, 8)
      .map((entry) => entry.familyName);
  }, [selectedAssignmentStudent, students]);

  const similarNameStudents = useMemo(() => {
    if (!selectedAssignmentStudent) return [];

    return assignableStudents
      .filter((student) => student.id !== selectedAssignmentStudent.id)
      .map((student) => {
        const selectedParts = getMeaningfulNameParts(selectedAssignmentStudent.name);
        const candidateParts = getMeaningfulNameParts(student.name);
        const sharedParts = selectedParts.filter((part) => candidateParts.includes(part));
        const prefixScore = getNameMatchScore(selectedParts, candidateParts);
        const surnameMatch = selectedParts[selectedParts.length - 1]?.toLowerCase() === candidateParts[candidateParts.length - 1]?.toLowerCase();
        const isLikelyMatch = prefixScore >= 3 || sharedParts.length >= 2 || surnameMatch;
        const confidence = prefixScore >= 6 || surnameMatch ? "High" : prefixScore >= 3 ? "Medium" : "Possible";

        return {
          student,
          matchCount: sharedParts.length,
          sharedTokens: sharedParts,
          isLikelyMatch,
          prefixScore,
          confidence,
        };
      })
      .filter((entry) => entry.isLikelyMatch)
      .sort((a, b) => b.prefixScore - a.prefixScore || b.matchCount - a.matchCount || a.student.name.localeCompare(b.student.name))
      .slice(0, 8);
  }, [assignableStudents, selectedAssignmentStudent]);

  const confirmFamilyReassignment = (student: Student | null, nextFamilyName: string) => {
    if (!student) return true;
    const currentFamily = student.familyName?.trim();
    const requestedFamily = nextFamilyName.trim();
    const isUnassigned = !currentFamily || currentFamily.toLowerCase() === "unassigned";
    if (!requestedFamily || isUnassigned || currentFamily?.toLowerCase() === requestedFamily.toLowerCase()) {
      return true;
    }
    return window.confirm(`This student is already assigned to "${currentFamily}". Reassign them to "${requestedFamily}"?`);
  };

  const handleFamilyStudentChange = (value: string) => {
    setFamilyAssignmentForm({ studentId: value, familyName: "" });
    setFamilyAssignmentStatus(value ? "Choose a family name for the selected student." : "Assign a student to a family group.");
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const feeAmount = Number(studentForm.feeAmount);
    if (!studentForm.name || !studentForm.grade || !feeAmount) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/students`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: studentForm.name, familyName: studentForm.familyName, grade: studentForm.grade, feeAmount, feeCategory: studentForm.feeCategory }),
      });
      const data = await res.json();
      if (data.student) await refreshDashboard();
    } catch { /* offline */ }
    setStudentForm({ name: "", familyName: "", grade: "", feeAmount: "", feeCategory: "Tuition" });
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const studentId = Number(paymentForm.studentId);
    const amount = Number(paymentForm.amount);
    if (!studentId || !amount) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/payments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, amount, note: paymentForm.note }),
      });
      const data = await res.json();
      if (data.student) await refreshDashboard();
    } catch { /* offline */ }
    setPaymentForm({ studentId: "", amount: "", note: "" });
  };

  const handleFamilyAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const studentId = Number(familyAssignmentForm.studentId);
    const familyName = familyAssignmentForm.familyName.trim();
    if (!studentId || !familyName) return;
    const selectedStudent = students.find((student) => student.id === studentId) || null;
    if (!confirmFamilyReassignment(selectedStudent, familyName)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/students/assign-family`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, familyName }),
      });
      const data = await res.json();
      if (data.student) {
        updateStudentInState(data.student);
        await refreshDashboard();
        const assignedFamilyName = data.student.familyName || familyName;
        setFamilyAssignmentStatus(`${data.student.name} assigned to ${assignedFamilyName}.`);
        setFamilyAssignmentForm((current) => ({ ...current, familyName: assignedFamilyName }));
      }
    } catch { /* offline */ }
  };

  const handleQuickFamilyAssignment = async (studentId: number, familyName: string) => {
    const targetFamily = familyName.trim();
    if (!targetFamily) return;
    const selectedStudent = students.find((student) => student.id === studentId) || null;
    if (!confirmFamilyReassignment(selectedStudent, targetFamily)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/students/assign-family`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, familyName: targetFamily }),
      });
      const data = await res.json();
      if (data.student) {
        updateStudentInState(data.student);
        await refreshDashboard();
        const assignedFamilyName = data.student.familyName || targetFamily;
        setFamilyAssignmentStatus(`${data.student.name} added to ${assignedFamilyName}.`);
        setFamilyAssignmentForm((current) => ({ ...current, familyName: assignedFamilyName }));
      }
    } catch { /* offline */ }
  };

  const handleFamilyEditorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyEditorState) return;

    const studentId = Number(familyEditorState.studentId);
    if (!studentId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/students/assign-family`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, familyName: familyEditorState.familyName }),
      });
      const data = await res.json();
      if (data.student) {
        updateStudentInState(data.student);
        await refreshDashboard();
        setFamilyAssignmentStatus(`${data.student.name} added to ${familyEditorState.familyName}.`);
        setFamilyEditorState(null);
      }
    } catch { /* offline */ }
  };

  const handleRemoveStudentFromFamily = async (studentId: number) => {
    const student = students.find((entry) => entry.id === studentId);
    if (!student) return;
    const confirmed = window.confirm(`Remove ${student.name} from ${student.familyName || "this family"}?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/students/assign-family`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, familyName: "Unassigned" }),
      });
      const data = await res.json();
      if (data.student) {
        updateStudentInState(data.student);
        await refreshDashboard();
        setFamilyAssignmentStatus(`${data.student.name} removed from the family.`);
      }
    } catch { /* offline */ }
  };

  const handleExcelImport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFile) { setImportStatus("Choose a file first."); return; }
    setImporting(true); setImportStatus("Reading spreadsheet...");
    try {
      const wb = XLSX.read(await selectedFile.arrayBuffer(), { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as Array<Array<string | number | boolean | null>>;
      const first = rows[0] || [];
      const hasHeader = first.some((v) => { const n = String(v ?? "").trim().toLowerCase(); return n.includes("name") || n.includes("class") || n.includes("grade"); });
      const dataRows = hasHeader ? rows.slice(1) : rows;
      const header = hasHeader ? first : ["Name", "Class"];
      const ni = header.findIndex((v) => ["name","student name","studentname","full name","fullname","student"].includes(String(v??"").trim().toLowerCase()));
      const ci = header.findIndex((v) => ["class","grade","class name","student class","level","year"].includes(String(v??"").trim().toLowerCase()));
      const formatted = dataRows.map((r) => {
        const name = String(r[ni >= 0 ? ni : 0] ?? "").trim();
        const grade = String(r[ci >= 0 ? ci : 1] ?? "").trim();
        if (!name || !grade) return null;
        return { name, grade, familyName: "Unassigned", feeCategory: "Tuition", feeAmount: "", note: "Imported from Excel" };
      }).filter(Boolean);
      if (!formatted.length) throw new Error("No students found in file.");
      const res = await fetch(`${API_BASE_URL}/api/students/bulk`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ students: formatted }) });
      const rd = await res.json();
      if (!res.ok) throw new Error(rd.error || "Import failed");
      await refreshDashboard();
      setImportStatus(`Imported ${rd.students?.length || formatted.length} students.`);
      setSelectedFile(null);
      importFormRef.current?.reset();
    } catch (err) { setImportStatus(err instanceof Error ? err.message : "Import failed."); }
    finally { setImporting(false); }
  };

  const navItems = [
    { label: "Dashboard", href: "/", icon: <IconHome />, active: true },
    { label: "Students", href: "/students", icon: <IconUsers />, active: false },
    { label: "Fees", href: "/fees", icon: <IconReceipt />, active: false },
    { label: "Families", href: "/families", icon: <IconFamily />, active: false },
    { label: "Report", href: "/report", icon: <IconReport />, active: false },
  ];

  const quickActions = [
    {
      title: "Add Student",
      description: "Create a student profile and fee setup.",
      tab: "register" as const,
      buttonType: "action" as const,
    },
    {
      title: "Record Payment",
      description: "Log fee payments for any student.",
      tab: "payment" as const,
      buttonType: "action" as const,
    },
    {
      title: "Import Students",
      description: "Upload a CSV or Excel list in one go.",
      tab: "import" as const,
      buttonType: "action" as const,
    },
    {
      title: "Assign to Family",
      description: "Group a student under a family heading.",
      tab: "assign-family" as const,
      buttonType: "action" as const,
    },
    {
      title: "View Student List",
      description: "Open the full student register on its own page.",
      href: "/students",
      buttonType: "link" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafaf8] text-gray-900">
      <div className="flex min-h-screen">
        {/* ── Sidebar ────────────────────────────── */}
        <aside className={`sticky top-0 h-screen flex flex-col border-r border-gray-200 bg-white transition-all duration-300 ${sidebarCollapsed ? "w-[72px]" : "w-[240px]"}`}>
          <div className="flex items-center gap-3 px-5 py-6 border-b border-gray-100">
            <button onClick={() => setSidebarCollapsed((v) => !v)} className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:bg-emerald-100 hover:text-gray-900 active:bg-amber-100 transition-colors" aria-label="Toggle sidebar">
              <IconMenu />
            </button>
            {!sidebarCollapsed && <span className="text-base font-semibold tracking-tight text-gray-900">Finance</span>}
          </div>
          <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
            {navItems.map((item) => (
              <Link key={item.label} href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors ${item.active ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"}`}>
                <span className="flex-shrink-0">{item.icon}</span>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>
          <div className="px-3 py-4 border-t border-gray-100">
            {!sidebarCollapsed && <p className="text-[11px] text-gray-400 text-center">School Finance v1.0</p>}
          </div>
        </aside>

        {/* ── Main ───────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          {/* Header */}
          <header className="sticky top-0 z-10 bg-[#fafaf8]/80 backdrop-blur-sm border-b border-gray-200 px-8 py-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-400 mt-0.5">School financial overview</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Academic term: Third Term</span>
                  <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] text-gray-500">3 terms per year • 1st, 2nd, 3rd</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><IconSearch /></span>
                  <input type="text" placeholder="Search students..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-56 pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all" />
                </div>
              </div>
            </div>
          </header>

          <div className="px-8 py-6 space-y-8">
            {/* ── Stat Cards ────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Expected", value: hasFinancialData ? formatCurrency(summary.totalFee) : "—", sub: hasFinancialData ? `${students.length} students enrolled` : "No fee data yet", href: "/fees" },
                { label: "Total Collected", value: hasFinancialData ? formatCurrency(summary.totalPaid) : "—", sub: hasFinancialData ? `${summary.collectionRate}% collection rate` : "No payments recorded", href: "/report" },
                { label: "Outstanding", value: hasFinancialData ? formatCurrency(summary.balance) : "—", sub: hasFinancialData ? `${students.length - summary.fullyPaidCount} students owing` : "No outstanding balance", href: "/students" },
                { label: "Fully Paid", value: hasFinancialData ? String(summary.fullyPaidCount) : "—", sub: hasFinancialData ? `of ${students.length} students` : "No payment history yet", href: "/students" },
                { label: "Families", value: String(totalFamilies), sub: totalFamilies === 1 ? "family group created" : "family groups created", href: "/families" },
              ].map((card) => (
                <Link key={card.label} href={card.href} className="rounded-xl border border-gray-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-sm hover:bg-emerald-50 active:bg-amber-50">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{card.label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{card.value}</p>
                  <p className="mt-1 text-xs text-gray-400">{card.sub}</p>
                </Link>
              ))}
            </div>

            {/* ── Quick action cards ───────────────────── */}
            {activeTab === "overview" && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {quickActions.map((action) =>
                    action.buttonType === "link" ? (
                      <Link key={action.title} href={action.href!}
                        className="rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:bg-emerald-100 active:bg-amber-100">
                        <p className="text-lg font-semibold text-gray-900">{action.title}</p>
                        <p className="mt-2 text-sm text-gray-500">{action.description}</p>
                      </Link>
                    ) : (
                      <button key={action.title} onClick={() => setActiveTab(action.tab!)}
                        className="rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:bg-emerald-100 active:bg-amber-100">
                        <p className="text-lg font-semibold text-gray-900">{action.title}</p>
                        <p className="mt-2 text-sm text-gray-500">{action.description}</p>
                      </button>
                    )
                  )}
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900">Student register</h2>
                  <p className="mt-2 text-sm text-gray-500">The full student list now lives on its own page so the dashboard stays focused on quick actions.</p>
                </div>
              </div>
            )}

            {/* ── Tab: Register Student ────────── */}
            {activeTab === "register" && (
              <div className="max-w-lg">
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Add New Student</h2>
                  <p className="text-sm text-gray-400 mb-6">Enter student details and fee information</p>
                  <form onSubmit={handleStudentSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Student Name</label>
                      <input type="text" required value={studentForm.name} onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300" placeholder="Full name" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Family Name</label>
                      <input type="text" value={studentForm.familyName} onChange={(e) => setStudentForm({ ...studentForm, familyName: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300" placeholder="Family name" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Class</label>
                        <select required value={studentForm.grade} onChange={(e) => setStudentForm({ ...studentForm, grade: e.target.value })}
                          className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300">
                          <option value="">Select class</option>
                          {schoolClasses.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Fee Category</label>
                        <select value={studentForm.feeCategory} onChange={(e) => setStudentForm({ ...studentForm, feeCategory: e.target.value })}
                          className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300">
                          {feeCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Fee Amount (₦)</label>
                      <input type="number" required value={studentForm.feeAmount} onChange={(e) => setStudentForm({ ...studentForm, feeAmount: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300" placeholder="0" />
                    </div>
                    <button type="submit" className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-100 hover:text-gray-900 active:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:ring-offset-2">
                      Add Student
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ── Tab: Record Payment ──────────── */}
            {activeTab === "payment" && (
              <div className="max-w-lg">
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Record Payment</h2>
                  <p className="text-sm text-gray-400 mb-6">Log a fee payment for a student</p>
                  <form onSubmit={handlePaymentSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Student</label>
                      <select required value={paymentForm.studentId} onChange={(e) => setPaymentForm({ ...paymentForm, studentId: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300">
                        <option value="">Select student</option>
                        {students.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.grade}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Amount (₦)</label>
                      <input type="number" required value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Note</label>
                      <input type="text" value={paymentForm.note} onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300" placeholder="Optional note" />
                    </div>
                    <button type="submit" className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-100 hover:text-gray-900 active:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:ring-offset-2">
                      Record Payment
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ── Tab: Assign to Family ─────── */}
            {activeTab === "assign-family" && (
              <div className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">Assign Student to Family</h2>
                    <p className="text-sm text-gray-400 mb-6">Link a student to a family group for easier tracking.</p>
                    <form onSubmit={handleFamilyAssignmentSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Student</label>
                        <select required value={familyAssignmentForm.studentId} onChange={(e) => handleFamilyStudentChange(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300">
                          <option value="">Select student</option>
                          {assignableStudents.map((student) => <option key={student.id} value={student.id}>{student.name} — {student.grade}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Family Name</label>
                        <select
                          value={familyAssignmentForm.familyName}
                          onChange={(e) => setFamilyAssignmentForm({ ...familyAssignmentForm, familyName: e.target.value })}
                          className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
                        >
                          <option value="">Choose a family name</option>
                          {familySuggestions.map((suggestion) => (
                            <option key={suggestion} value={suggestion}>{suggestion}</option>
                          ))}
                          {familyAssignmentForm.familyName && !familySuggestions.includes(familyAssignmentForm.familyName) && (
                            <option value={familyAssignmentForm.familyName}>{familyAssignmentForm.familyName}</option>
                          )}
                        </select>
                        <input
                          type="text"
                          value={familyAssignmentForm.familyName}
                          onChange={(e) => setFamilyAssignmentForm({ ...familyAssignmentForm, familyName: e.target.value })}
                          className="mt-2 w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
                          placeholder="Or type a custom family name"
                        />
                      </div>
                      {familySuggestions.length > 0 && (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Suggested family matches</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {familySuggestions.map((suggestion) => (
                              <button
                                key={suggestion}
                                type="button"
                                onClick={() => setFamilyAssignmentForm((current) => ({ ...current, familyName: suggestion }))}
                                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:border-gray-300 hover:bg-emerald-100 hover:text-gray-900 active:bg-amber-100"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <button type="submit" className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-100 hover:text-gray-900 active:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:ring-offset-2">
                        Assign to Family
                      </button>
                      <p className="text-xs text-gray-400 text-center">{familyAssignmentStatus}</p>
                    </form>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <h3 className="text-lg font-semibold text-gray-900">Likely same-family students</h3>
                    <p className="mt-1 text-sm text-gray-400">Students with similar name parts to the selected student.</p>
                    {selectedAssignmentStudent ? (
                      similarNameStudents.length > 0 ? (
                        <div className="mt-4 space-y-3">
                          {similarNameStudents.map(({ student, sharedTokens, confidence }) => (
                            <div key={student.id} className="rounded-lg border border-gray-200 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{student.name}</p>
                                  <p className="text-xs text-gray-500">{student.grade}</p>
                                  <p className="mt-1 text-[11px] text-gray-400">Shared name parts: {sharedTokens.join(", ")}</p>
                                  <p className="mt-1 text-[11px] font-medium text-emerald-700">Confidence: {confidence}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleQuickFamilyAssignment(student.id, familyAssignmentForm.familyName || familySuggestions[0] || selectedAssignmentStudent.familyName || "Unassigned")}
                                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-gray-300 hover:bg-emerald-100 hover:text-gray-900 active:bg-amber-100"
                                >
                                  Add to same family
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-4 text-sm text-gray-500">No closely matching students were found yet.</p>
                      )
                    ) : (
                      <p className="mt-4 text-sm text-gray-500">Choose a student to see likely family matches.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Families with assigned students</h3>
                      <p className="mt-1 text-sm text-gray-400">Existing family groups already linked to students.</p>
                    </div>
                  </div>
                  {familyEditorState && (
                    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Manage family: {familyEditorState.familyName}</p>
                          <p className="text-xs text-gray-500">Choose a student to add to this family, or remove a member below.</p>
                        </div>
                        <button type="button" onClick={() => setFamilyEditorState(null)} className="text-sm font-medium text-gray-500 hover:text-gray-900">Close</button>
                      </div>
                      <form onSubmit={handleFamilyEditorSubmit} className="mt-4 space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1.5">Add student to this family</label>
                          <select
                            value={familyEditorState.studentId}
                            onChange={(e) => setFamilyEditorState((current) => current ? { ...current, studentId: e.target.value } : current)}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                          >
                            <option value="">Select student</option>
                            {assignableStudents.map((student) => (
                              <option key={student.id} value={student.id}>{student.name} — {student.grade}</option>
                            ))}
                          </select>
                        </div>
                        <button type="submit" className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-100 hover:text-gray-900">
                          Add selected student
                        </button>
                      </form>
                      <div className="mt-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Current family members</p>
                        <ul className="mt-2 space-y-2 text-sm text-gray-600">
                          {assignedFamilies.find((family) => family.name === familyEditorState.familyName)?.students.map((student) => (
                            <li key={student.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                              <span>{student.name}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveStudentFromFamily(student.id)}
                                className="text-xs font-medium text-red-600 hover:text-red-700"
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  {assignedFamilies.length > 0 ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {assignedFamilies.map((family) => (
                        <div key={family.name} className="relative rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <Link href={`/families/${encodeURIComponent(family.name)}`} aria-label={`Open family ${family.name}`} className="absolute inset-0 z-10 rounded-lg" />
                          <div className="relative z-20 flex items-start justify-between gap-2">
                            <div className="pr-20">
                              <p className="text-sm font-semibold text-gray-900">{family.name}</p>
                              <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                                {family.students.length} {family.students.length === 1 ? "student" : "students"}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setFamilyEditorState({ familyName: family.name, studentId: "" })}
                              className="relative z-30 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-gray-300 hover:bg-emerald-100 hover:text-gray-900"
                            >
                              Edit
                            </button>
                          </div>
                          <ul className="mt-3 space-y-1.5 text-sm text-gray-600">
                            {family.students.map((student) => (
                              <li key={student.id} className="flex items-center justify-between gap-2">
                                <span>{student.name}</span>
                                <span className="text-xs text-gray-400">{student.grade}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-gray-500">No families have been assigned yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* ── Tab: Import ─────────────────── */}
            {activeTab === "import" && (
              <div className="max-w-lg">
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Import Students</h2>
                  <p className="text-sm text-gray-400 mb-6">Upload an Excel or CSV file</p>
                  <form ref={importFormRef} onSubmit={handleExcelImport} className="space-y-4">
                    <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-colors">
                      <IconUpload />
                      <span className="text-sm text-gray-500">{selectedFile ? selectedFile.name : "Click to choose file"}</span>
                      <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                    </label>
                    <button type="submit" disabled={importing}
                      className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-100 hover:text-gray-900 active:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:ring-offset-2">
                      {importing ? "Importing..." : "Import Students"}
                    </button>
                    <p className="text-xs text-gray-400 text-center">{importStatus}</p>
                  </form>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
