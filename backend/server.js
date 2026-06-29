const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 4000;
const DATA_FILE = path.join(__dirname, "data.json");

const starterFeeSettings = {
  Preschool: { Tuition: 120000, Exam: 15000, Transport: 20000, "Development Levy": 10000, Other: 5000 },
  "Nursery 1": { Tuition: 140000, Exam: 18000, Transport: 22000, "Development Levy": 10000, Other: 5000 },
  "Nursery 2": { Tuition: 140000, Exam: 18000, Transport: 22000, "Development Levy": 10000, Other: 5000 },
  "Nursery 3": { Tuition: 150000, Exam: 20000, Transport: 25000, "Development Levy": 12000, Other: 5000 },
  "Basic 1": { Tuition: 180000, Exam: 22000, Transport: 28000, "Development Levy": 12000, Other: 5000 },
  "Basic 2": { Tuition: 190000, Exam: 23000, Transport: 30000, "Development Levy": 12000, Other: 5000 },
  "Basic 3": { Tuition: 200000, Exam: 24000, Transport: 32000, "Development Levy": 14000, Other: 5000 },
  "Basic 4": { Tuition: 220000, Exam: 26000, Transport: 35000, "Development Levy": 15000, Other: 5000 },
  "Basic 5": { Tuition: 230000, Exam: 27000, Transport: 36000, "Development Levy": 15000, Other: 5000 },
  JSS1: { Tuition: 250000, Exam: 30000, Transport: 40000, "Development Levy": 18000, Other: 6000 },
  JSS2: { Tuition: 260000, Exam: 32000, Transport: 42000, "Development Levy": 18000, Other: 6000 },
  JSS3: { Tuition: 280000, Exam: 34000, Transport: 45000, "Development Levy": 20000, Other: 6000 },
  SS1: { Tuition: 320000, Exam: 36000, Transport: 48000, "Development Levy": 22000, Other: 7000 },
  SS2: { Tuition: 330000, Exam: 37000, Transport: 50000, "Development Levy": 22000, Other: 7000 },
};

const starterStudents = [
  {
    id: 1,
    name: "Amina Yusuf",
    familyName: "Yusuf Family",
    grade: "Basic 4",
    feeAmount: 250000,
    paidAmount: 180000,
    lastPaymentDate: "2026-06-01",
    note: "Transport balance pending",
    feeCategory: "Tuition",
  },
  {
    id: 2,
    name: "Daniel Okafor",
    familyName: "Okafor Family",
    grade: "SS1",
    feeAmount: 400000,
    paidAmount: 400000,
    lastPaymentDate: "2026-05-28",
    note: "Full payment received",
    feeCategory: "Development Levy",
  },
  {
    id: 3,
    name: "Sade Martins",
    familyName: "Martins Family",
    grade: "JSS2",
    feeAmount: 320000,
    paidAmount: 120000,
    lastPaymentDate: "2026-06-10",
    note: "Awaiting final installment",
    feeCategory: "Exam",
  },
];

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = { students: [], payments: [], feeSettings: starterFeeSettings };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
  }
}

function loadData() {
  ensureDataFile();
  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

  if (Array.isArray(data.students)) {
    data.students = data.students.map((student) => ({
      ...student,
      familyName: student.familyName || "Unassigned",
      feeAmount: 0,
      paidAmount: 0,
      lastPaymentDate: student.lastPaymentDate || "",
      note: student.note || "No fee data yet",
    }));
  }

  return data;
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function createStudentRecord(body, data, index = 0) {
  const explicitFee = Number(body.feeAmount);

  return {
    id: Date.now() + index,
    name: body.name,
    familyName: body.familyName || "Unassigned",
    grade: body.grade,
    feeAmount: Number.isFinite(explicitFee) ? explicitFee : 0,
    paidAmount: Number(body.paidAmount) || 0,
    lastPaymentDate: body.lastPaymentDate || "",
    note: body.note || "No fee data yet",
    feeCategory: body.feeCategory || "Tuition",
  };
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/api/students") {
    const data = loadData();
    sendJson(res, 200, { students: data.students });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/fee-settings") {
    const data = loadData();
    sendJson(res, 200, { feeSettings: data.feeSettings || starterFeeSettings });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/fee-settings") {
    try {
      const body = await parseBody(req);
      const data = loadData();
      data.feeSettings = body.feeSettings || data.feeSettings || starterFeeSettings;
      saveData(data);
      sendJson(res, 200, { feeSettings: data.feeSettings });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/reports") {
    const data = loadData();
    const totalFee = data.students.reduce((sum, student) => sum + student.feeAmount, 0);
    const totalPaid = data.students.reduce((sum, student) => sum + student.paidAmount, 0);
    const balance = totalFee - totalPaid;

    sendJson(res, 200, {
      totalFee,
      totalPaid,
      balance,
      students: data.students,
      payments: data.payments,
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/families") {
    const data = loadData();
    const families = Object.values(
      data.students.reduce((groups, student) => {
        const familyName = student.familyName || "Unassigned";
        const family = groups[familyName] || {
          familyName,
          students: [],
          totalFee: 0,
          totalPaid: 0,
          balance: 0,
        };

        family.students.push(student);
        family.totalFee += student.feeAmount;
        family.totalPaid += student.paidAmount;
        family.balance += student.feeAmount - student.paidAmount;
        groups[familyName] = family;
        return groups;
      }, {}),
    );

    sendJson(res, 200, { families });
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/students/")) {
    const data = loadData();
    const studentId = Number(url.pathname.split("/").pop());
    const student = data.students.find((entry) => entry.id === studentId);

    if (!student) {
      sendJson(res, 404, { error: "Student not found" });
      return;
    }

    const payments = data.payments.filter((entry) => entry.studentId === student.id);
    sendJson(res, 200, {
      student: {
        ...student,
        balance: student.feeAmount - student.paidAmount,
      },
      payments,
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/students") {
    try {
      const body = await parseBody(req);
      const data = loadData();
      const newStudent = createStudentRecord(body, data);

      data.students.unshift(newStudent);
      saveData(data);
      sendJson(res, 201, { student: newStudent });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/students/bulk") {
    try {
      const body = await parseBody(req);
      const data = loadData();
      const students = Array.isArray(body.students) ? body.students : [];

      const importedStudents = students
        .filter((entry) => entry?.name && entry?.grade)
        .map((entry, index) => createStudentRecord({ ...entry, note: entry.note || "Imported from Excel" }, data, index));

      data.students.unshift(...importedStudents);
      saveData(data);
      sendJson(res, 201, { students: importedStudents });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/students/assign-family") {
    try {
      const body = await parseBody(req);
      const data = loadData();
      const student = data.students.find((entry) => entry.id === Number(body.studentId));

      if (!student) {
        sendJson(res, 404, { error: "Student not found" });
        return;
      }

      const familyName = String(body.familyName || "").trim();
      if (!familyName) {
        sendJson(res, 400, { error: "Family name is required" });
        return;
      }

      student.familyName = familyName;
      saveData(data);
      sendJson(res, 200, { student });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/payments") {
    try {
      const body = await parseBody(req);
      const data = loadData();
      const student = data.students.find((entry) => entry.id === Number(body.studentId));

      if (!student) {
        sendJson(res, 404, { error: "Student not found" });
        return;
      }

      const payment = {
        id: Date.now(),
        studentId: student.id,
        amount: Number(body.amount),
        note: body.note || "Payment recorded",
        date: new Date().toISOString().slice(0, 10),
      };

      student.paidAmount += payment.amount;
      student.lastPaymentDate = payment.date;
      student.note = payment.note;
      data.payments.unshift(payment);
      saveData(data);

      sendJson(res, 201, { student, payment });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  sendJson(res, 404, { error: "Route not found" });
});

server.listen(PORT, () => {
  console.log(`School finance backend listening on http://localhost:${PORT}`);
});
