/* =========================================================
   Healthcare Access Project — script.js
   Vanilla JavaScript: navigation, forms, validation & demo simulations.
   All data is simulated and stored only in this browser (localStorage).
   ========================================================= */

/* ---------------- 1. DEMO DATA ---------------- */
const departments = [
  { id: "gen", name: "General Medicine", counter: "C-01", wait: 18, load: 82 },
  { id: "ped", name: "Paediatrics", counter: "C-02", wait: 12, load: 64 },
  { id: "ort", name: "Orthopaedics", counter: "C-03", wait: 25, load: 91 },
  { id: "gyn", name: "Obstetrics & Gynaecology", counter: "C-04", wait: 15, load: 70 },
  { id: "ent", name: "ENT", counter: "C-05", wait: 9, load: 45 },
  { id: "car", name: "Cardiology", counter: "C-06", wait: 22, load: 86 },
  { id: "der", name: "Dermatology", counter: "C-07", wait: 7, load: 38 },
  { id: "oph", name: "Ophthalmology", counter: "C-08", wait: 11, load: 52 },
];

const doctors = {
  gen: [{ name: "Dr. Anjali Mehta", qual: "MD Medicine", available: true }, { name: "Dr. Rakesh Iyer", qual: "MBBS, MD", available: true }],
  ped: [{ name: "Dr. Sunita Rao", qual: "MD Paediatrics", available: true }, { name: "Dr. Imran Shaikh", qual: "DCH", available: false }],
  ort: [{ name: "Dr. Vikram Singh", qual: "MS Ortho", available: true }],
  gyn: [{ name: "Dr. Priya Nair", qual: "MS OBG", available: true }, { name: "Dr. Kavita Joshi", qual: "DGO", available: true }],
  ent: [{ name: "Dr. Arun Kumar", qual: "MS ENT", available: true }],
  car: [{ name: "Dr. Sanjay Gupta", qual: "DM Cardiology", available: true }],
  der: [{ name: "Dr. Neha Verma", qual: "MD Dermatology", available: true }],
  oph: [{ name: "Dr. Farah Khan", qual: "MS Ophthalmology", available: false }, { name: "Dr. Mohan Das", qual: "DO", available: true }],
};

const slots = ["09:00", "09:20", "09:40", "10:00", "10:20", "10:40", "11:00", "11:20", "11:40", "12:00", "14:00", "14:20", "14:40", "15:00", "15:20", "15:40"];
const fullSlots = ["09:20", "10:00", "11:20", "14:40"];

const seedAppointments = [
  { token: "OPD-GEN-1042", name: "Ramesh Patil", age: "54", gender: "Male", phone: "9876543210", dept: "gen", doctor: "Dr. Anjali Mehta", date: "2026-10-13", slot: "09:40", status: "Confirmed" },
  { token: "OPD-PED-2017", name: "Aarav Sharma", age: "6", gender: "Male", phone: "9812345678", dept: "ped", doctor: "Dr. Sunita Rao", date: "2026-10-13", slot: "10:20", status: "Confirmed" },
  { token: "OPD-ORT-3008", name: "Lakshmi Devi", age: "67", gender: "Female", phone: "9900112233", dept: "ort", doctor: "Dr. Vikram Singh", date: "2026-10-12", slot: "11:00", status: "Completed" },
  { token: "OPD-GYN-4011", name: "Meena Kumari", age: "29", gender: "Female", phone: "9988776655", dept: "gyn", doctor: "Dr. Priya Nair", date: "2026-10-14", slot: "14:20", status: "Cancelled" },
];

/* ---------------- 2. HELPERS ---------------- */
const $ = (id) => document.getElementById(id);
const deptName = (id) => (departments.find((d) => d.id === id) || {}).name || id;
const loadColor = (v) => (v > 85 ? "var(--error)" : v > 65 ? "var(--warning)" : "var(--success)");
const barHTML = (v, color) => `<div class="bar"><span style="width:${Math.min(100, v)}%;background:${color || loadColor(v)}"></span></div>`;
const todayISO = () => new Date().toISOString().slice(0, 10);

function loadAppointments() {
  try { return JSON.parse(localStorage.getItem("hap-appointments")) || seedAppointments.slice(); }
  catch (e) { return seedAppointments.slice(); }
}
function saveAppointments(list) {
  try { localStorage.setItem("hap-appointments", JSON.stringify(list)); } catch (e) { /* storage disabled */ }
}
let appointments = loadAppointments();

/* ---------------- 3. NAVIGATION (single-page views) ---------------- */
function showView(name) {
  if (!$("view-" + name)) name = "home";
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + name));
  document.querySelectorAll("[data-view]").forEach((a) => a.classList.toggle("active", a.dataset.view === name && !a.classList.contains("btn")));
  $("sidebar").classList.remove("open");
  if (name === "appointments") renderAppointments();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", () => showView(location.hash.slice(1)));
$("menuToggle").addEventListener("click", () => $("sidebar").classList.toggle("open"));

/* ---------------- 4. HOME DASHBOARD ---------------- */
function renderHome() {
  $("homeDeptList").innerHTML = departments.map((d) =>
    `<div class="bar-row"><span>${d.name}</span>${barHTML(d.load)}<small>${d.wait} min</small></div>`).join("");
}

/* ---------------- 5. REGISTRATION WIZARD ---------------- */
let step = 1;
const booking = { otpVerified: false, dept: null, doctor: null, slot: null };

function setStep(n) {
  step = n;
  document.querySelectorAll(".step").forEach((s) => (s.hidden = Number(s.dataset.step) !== n));
  document.querySelectorAll("#stepper li").forEach((li, i) => {
    li.classList.toggle("active", i + 1 === n);
    li.classList.toggle("done", i + 1 < n);
  });
  $("prevBtn").style.visibility = n === 1 ? "hidden" : "visible";
  $("nextBtn").textContent = n === 5 ? "Confirm booking" : "Next \u2192";
  $("formError").textContent = "";
  if (n === 4) renderSlots();
  if (n === 5) renderReview();
}

/** Mark a field invalid and return false, so validators read cleanly. */
function fail(el, msg) {
  if (el) el.classList.add("invalid");
  $("formError").textContent = msg;
  return false;
}

function validateStep() {
  document.querySelectorAll(".invalid").forEach((e) => e.classList.remove("invalid"));
  if (step === 1) {
    if ($("pName").value.trim().length < 3) return fail($("pName"), "Please enter the patient's full name.");
    if (!/^[6-9]\d{9}$/.test($("pPhone").value)) return fail($("pPhone"), "Enter a valid 10-digit Indian mobile number.");
    const age = Number($("pAge").value);
    if (!$("pAge").value || age < 0 || age > 120) return fail($("pAge"), "Enter a valid age (0–120).");
    if (!$("pGender").value) return fail($("pGender"), "Please select gender.");
  }
  if (step === 2) {
    if ($("pIdNum").value.trim().length < 4) return fail($("pIdNum"), "Enter your ID number.");
    if (!booking.otpVerified) return fail(null, "Please verify the OTP before continuing.");
  }
  if (step === 3 && (!booking.dept || !booking.doctor)) return fail(null, "Select a department and an available doctor.");
  if (step === 4) {
    if (!$("pDate").value || $("pDate").value < todayISO()) return fail($("pDate"), "Choose today or a future date.");
    if (!booking.slot) return fail(null, "Please select a time slot.");
  }
  if (step === 5 && !$("consent").checked) return fail(null, "Please tick the confirmation box.");
  return true;
}

// OTP (demo code is always 123456)
$("sendOtp").addEventListener("click", () => {
  if ($("pIdNum").value.trim().length < 4) return fail($("pIdNum"), "Enter your ID number first.");
  $("formError").textContent = "";
  $("otpBox").hidden = false;
  $("otpStatus").textContent = "";
});
$("verifyOtp").addEventListener("click", () => {
  const ok = $("otpInput").value === "123456";
  booking.otpVerified = ok;
  $("otpStatus").innerHTML = ok ? '<span class="success">&#10004; Identity verified.</span>' : '<span class="error">Incorrect OTP. Try 123456.</span>';
});

// Departments & doctors
function renderDepartments() {
  $("deptGrid").innerHTML = departments.map((d) =>
    `<button type="button" class="card dept ${booking.dept === d.id ? "selected" : ""}" data-id="${d.id}">
       <strong>${d.name}</strong><br><small class="muted">~${d.wait} min wait</small></button>`).join("");
  $("doctorList").innerHTML = booking.dept ? doctors[booking.dept].map((doc) =>
    `<div class="card doc ${doc.available ? "" : "off"} ${booking.doctor === doc.name ? "selected" : ""}" data-name="${doc.name}" data-ok="${doc.available}">
       <span><strong>${doc.name}</strong><br><small class="muted">${doc.qual}</small></span>
       <span class="badge ${doc.available ? "b-success" : "b-muted"}">${doc.available ? "Available" : "On leave"}</span></div>`).join("") : "";
}
$("deptGrid").addEventListener("click", (e) => {
  const b = e.target.closest(".dept"); if (!b) return;
  booking.dept = b.dataset.id; booking.doctor = null; renderDepartments();
});
$("doctorList").addEventListener("click", (e) => {
  const d = e.target.closest(".doc"); if (!d || d.dataset.ok !== "true") return;
  booking.doctor = d.dataset.name; renderDepartments();
});

// Slots
function renderSlots() {
  $("slotGrid").innerHTML = slots.map((s) =>
    `<button type="button" class="slot ${booking.slot === s ? "selected" : ""}" data-s="${s}" ${fullSlots.includes(s) ? "disabled" : ""}>${s}</button>`).join("");
}
$("slotGrid").addEventListener("click", (e) => {
  const b = e.target.closest(".slot"); if (!b || b.disabled) return;
  booking.slot = b.dataset.s; renderSlots();
});

function renderReview() {
  const rows = [["Name", $("pName").value], ["Mobile", $("pPhone").value], ["Age / Gender", $("pAge").value + " / " + $("pGender").value],
    ["ID", $("pIdType").value + " (verified)"], ["Department", deptName(booking.dept)], ["Doctor", booking.doctor],
    ["Date", $("pDate").value], ["Slot", booking.slot]];
  $("reviewBox").innerHTML = rows.map(([k, v]) => `<div><span>${k}</span>${v}</div>`).join("");
}

$("prevBtn").addEventListener("click", () => setStep(step - 1));
$("nextBtn").addEventListener("click", () => {
  if (!validateStep()) return;
  if (step < 5) return setStep(step + 1);
  createToken();
});

/* Create the appointment + token */
let lastToken = null;
function createToken() {
  const num = 1000 + Math.floor(Math.random() * 9000);
  const appt = {
    token: `OPD-${booking.dept.toUpperCase()}-${num}`, name: $("pName").value.trim(), age: $("pAge").value, gender: $("pGender").value,
    phone: $("pPhone").value, dept: booking.dept, doctor: booking.doctor, date: $("pDate").value, slot: booking.slot, status: "Confirmed",
  };
  appointments.unshift(appt); saveAppointments(appointments); lastToken = appt;
  const d = departments.find((x) => x.id === appt.dept);
  $("tokenInfo").innerHTML = `<p class="token-number">${appt.token}</p>
    <p><strong>${appt.name}</strong> · ${appt.age} yrs · ${appt.gender}</p>
    <p>${d.name} — Counter ${d.counter}<br>${appt.doctor}</p>
    <p><strong>${appt.date} at ${appt.slot}</strong></p>`;
  drawQR($("qrCanvas"), appt.token);
  $("regForm").hidden = true; $("stepper").hidden = true; $("tokenCard").hidden = false;
}

/* Simple demo "QR" pattern generated from the token text (visual only, offline, no library). */
function drawQR(canvas, text) {
  const ctx = canvas.getContext("2d"), n = 25, s = canvas.width / n;
  let h = 0; for (const c of text) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const rand = () => ((h = (h * 1103515245 + 12345) >>> 0) >> 16) & 1;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = "#15345B";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (rand()) ctx.fillRect(x * s, y * s, s, s);
  [[0, 0], [n - 7, 0], [0, n - 7]].forEach(([x, y]) => { // finder squares
    ctx.fillStyle = "#15345B"; ctx.fillRect(x * s, y * s, 7 * s, 7 * s);
    ctx.fillStyle = "#fff"; ctx.fillRect((x + 1) * s, (y + 1) * s, 5 * s, 5 * s);
    ctx.fillStyle = "#15345B"; ctx.fillRect((x + 2) * s, (y + 2) * s, 3 * s, 3 * s);
  });
}

$("printToken").addEventListener("click", () => window.print());
$("downloadToken").addEventListener("click", () => {
  if (!lastToken) return;
  // Draw a token image and download it as PNG
  const c = document.createElement("canvas"); c.width = 600; c.height = 320;
  const x = c.getContext("2d");
  x.fillStyle = "#fff"; x.fillRect(0, 0, 600, 320);
  x.strokeStyle = "#1677F2"; x.lineWidth = 4; x.strokeRect(2, 2, 596, 316);
  x.fillStyle = "#15345B"; x.font = "bold 20px sans-serif"; x.fillText("Healthcare Access Project — OPD Token", 24, 44);
  x.fillStyle = "#1677F2"; x.font = "bold 34px sans-serif"; x.fillText(lastToken.token, 24, 100);
  x.fillStyle = "#15345B"; x.font = "16px sans-serif";
  [lastToken.name + " · " + lastToken.age + " yrs", deptName(lastToken.dept), lastToken.doctor, lastToken.date + " at " + lastToken.slot]
    .forEach((t, i) => x.fillText(t, 24, 145 + i * 28));
  x.drawImage($("qrCanvas"), 420, 110, 150, 150);
  const a = document.createElement("a"); a.download = lastToken.token + ".png"; a.href = c.toDataURL("image/png"); a.click();
});
$("newBooking").addEventListener("click", () => {
  $("regForm").reset(); Object.assign(booking, { otpVerified: false, dept: null, doctor: null, slot: null });
  $("otpBox").hidden = true; $("otpStatus").textContent = "";
  $("regForm").hidden = false; $("stepper").hidden = false; $("tokenCard").hidden = true;
  renderDepartments(); setStep(1);
});

/* ---------------- 6. APPOINTMENTS ---------------- */
let editing = null;
function renderAppointments() {
  const q = $("apSearch").value.toLowerCase(), f = $("apFilter").value;
  const tone = { Confirmed: "b-primary", Completed: "b-success", Cancelled: "b-error" };
  const list = appointments.filter((a) => (f === "All" || a.status === f) && (a.name.toLowerCase().includes(q) || a.token.toLowerCase().includes(q)));
  $("apBody").innerHTML = list.length ? list.map((a) => `<tr>
    <td><strong>${a.token}</strong></td><td>${a.name}</td><td>${deptName(a.dept)}</td><td>${a.doctor}</td><td>${a.date} · ${a.slot}</td>
    <td><span class="badge ${tone[a.status]}">${a.status}</span></td>
    <td>${a.status === "Confirmed" ? `<button class="btn-outline btn-sm" data-act="res" data-t="${a.token}">Reschedule</button>
      <button class="btn-outline btn-sm error" data-act="cancel" data-t="${a.token}">Cancel</button>` : "—"}</td></tr>`).join("")
    : '<tr><td colspan="7" class="muted">No appointments found.</td></tr>';
}
$("apSearch").addEventListener("input", renderAppointments);
$("apFilter").addEventListener("change", renderAppointments);
$("apBody").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  const a = appointments.find((x) => x.token === b.dataset.t);
  if (b.dataset.act === "cancel" && confirm("Cancel appointment " + a.token + "?")) {
    a.status = "Cancelled"; saveAppointments(appointments); renderAppointments();
  }
  if (b.dataset.act === "res") {
    editing = a; $("resDate").value = a.date; $("resDate").min = todayISO();
    $("resSlot").innerHTML = slots.filter((s) => !fullSlots.includes(s)).map((s) => `<option ${s === a.slot ? "selected" : ""}>${s}</option>`).join("");
    $("resModal").hidden = false;
  }
});
$("resCancel").addEventListener("click", () => ($("resModal").hidden = true));
$("resSave").addEventListener("click", () => {
  if (!$("resDate").value) return alert("Pick a date.");
  editing.date = $("resDate").value; editing.slot = $("resSlot").value;
  saveAppointments(appointments); $("resModal").hidden = true; renderAppointments();
});

/* ---------------- 7. QUEUE MANAGEMENT ---------------- */
const queues = departments.map((d, i) => ({ id: d.id, current: 1000 + i * 1000 + 30 + i * 3, waiting: Math.round(d.load / 4) }));
function renderQueues() {
  $("queueGrid").innerHTML = departments.map((d) => {
    const q = queues.find((x) => x.id === d.id), load = Math.min(100, q.waiting * 4);
    const [label, cls] = load > 85 ? ["Busy", "b-error"] : load > 65 ? ["Moderate", "b-warning"] : ["Smooth", "b-success"];
    return `<div class="card pad"><div class="row between" style="margin-top:0"><div><strong>${d.name}</strong><br><small class="muted">Counter ${d.counter}</small></div><span class="badge ${cls}">${label}</span></div>
      <p class="muted small" style="margin-bottom:0">Now serving</p><p class="serving">${d.id.toUpperCase()}-${q.current}</p>
      <div class="row between small muted" style="margin:0 0 4px"><span>${q.waiting} waiting</span><span>~${q.waiting * 3} min</span></div>${barHTML(load)}
      <button class="btn-outline" style="width:100%;margin-top:12px" data-call="${d.id}">Call next</button></div>`;
  }).join("");
}
$("queueGrid").addEventListener("click", (e) => {
  const id = e.target.dataset.call; if (!id) return;
  const q = queues.find((x) => x.id === id), d = departments.find((x) => x.id === id);
  if (q.waiting > 0) { q.current++; q.waiting--; }
  $("announce").hidden = false;
  $("announce").textContent = `\uD83D\uDD0A Token ${id.toUpperCase()}-${q.current}, please proceed to counter ${d.counter} — ${d.name}`;
  renderQueues();
});
setInterval(() => {
  if (!$("autoSim").checked) return;
  const q = queues[Math.floor(Math.random() * queues.length)];
  q.current++; q.waiting = Math.max(0, q.waiting - 1 + (Math.random() > 0.5 ? 1 : 0));
  renderQueues();
}, 3000);
$("trackForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const t = $("trackInput").value.trim().toLowerCase();
  const a = appointments.find((x) => x.token.toLowerCase() === t);
  if (!a) { $("trackResult").innerHTML = '<p class="error">Token not found. Check the token number on your slip.</p>'; return; }
  const pos = (parseInt(a.token.slice(-2), 10) % 12) + 1, ok = a.status === "Confirmed";
  $("trackResult").innerHTML = `<div class="review" style="margin-top:12px"><div><span>Patient</span>${a.name}</div><div><span>Department</span>${deptName(a.dept)}</div>
    <div><span>Position</span>${ok ? "#" + pos : "—"}</div><div><span>Est. wait</span>${ok ? pos * 4 + " min" : a.status}</div></div>`;
});

/* ---------------- 8. DIAGNOSTICS & PHARMACY ---------------- */
let labNo = 300, phNo = 120, phServing = 118;
$("labBook").addEventListener("click", () => {
  labNo++;
  $("labResult").innerHTML = `<span class="success">&#10004; Lab token <strong>LAB-${labNo}</strong> for ${$("labTest").value} at ${$("labSlot").value}.</span>`;
});
$("phBook").addEventListener("click", () => {
  const t = $("phToken").value.trim();
  if (!t) { $("phResult").innerHTML = '<span class="error">Enter your prescription or OPD token.</span>'; return; }
  phNo++;
  $("phResult").innerHTML = `<span class="success">&#10004; Pharmacy token <strong>PH-${phNo}</strong>. Approx. ${(phNo - phServing) * 2} min.</span>`;
});
setInterval(() => { if (phServing < phNo) $("phServing").textContent = "PH-" + ++phServing; }, 8000);

/* ---------------- 9. ANALYTICS ---------------- */
function renderChart(el, data) {
  const max = Math.max(...data.map((d) => d[1]));
  el.innerHTML = data.map(([l, v]) => `<div class="col" title="${v}"><small>${v}</small><div style="height:${(v / max) * 80}%"></div>${l}</div>`).join("");
}
function renderAnalytics() {
  $("occList").innerHTML = departments.map((d) => `<div class="bar-row"><span>${d.name}</span>${barHTML(d.load)}<small>${d.load}%</small></div>`).join("");
  renderChart($("peakChart"), [["8", 90], ["9", 210], ["10", 260], ["11", 230], ["12", 170], ["13", 90], ["14", 150], ["15", 120], ["16", 70]]);
  const beds = [["General ward", 28, 180], ["Maternity", 9, 60], ["Paediatric", 7, 40], ["ICU", 3, 40]];
  $("bedList").innerHTML = beds.map(([n, free, tot]) => `<div class="bar-row"><span>${n}</span>${barHTML(((tot - free) / tot) * 100)}<small>${free}/${tot} free</small></div>`).join("");
  $("docList").innerHTML = Object.entries(doctors).flatMap(([id, list]) => list.map((d) =>
    `<li><span>${d.name} <small class="muted">· ${deptName(id)}</small></span><span class="badge ${d.available ? "b-success" : "b-muted"}">${d.available ? "On duty" : "On leave"}</span></li>`)).join("");
}

/* ---------------- 10. IMPACT ---------------- */
function renderImpact() {
  const stages = [["Registration", 60, 3], ["Doctor consultation queue", 90, 25], ["Lab tests", 60, 20], ["Reports", 40, 10], ["Pharmacy", 45, 14]];
  $("impactBars").innerHTML = stages.map(([s, old, now]) => `<div class="compare"><strong>${s}</strong>
    <div class="row between small muted" style="margin:2px 0 0"><span>Traditional</span><span>${old} min</span></div>${barHTML((old / 90) * 100, "var(--error)")}
    <div class="row between small muted" style="margin:2px 0 0"><span>Digital</span><span>${now} min</span></div>${barHTML((now / 90) * 100, "var(--success)")}</div>`).join("");
  renderChart($("trialChart"), [["W1", 920], ["W2", 980], ["W3", 1060], ["W4", 1130], ["W5", 1210], ["W6", 1270]]);
}

/* ---------------- 11. CONTACT FORM ---------------- */
$("contactForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const ok = $("cName").value.trim() && /^\S+@\S+\.\S+$/.test($("cEmail").value) && $("cMsg").value.trim().length >= 5;
  $("contactResult").innerHTML = ok ? '<span class="success">&#10004; Thank you! Your message has been received.</span>'
    : '<span class="error">Please fill in your name, a valid email and a message.</span>';
  if (ok) e.target.reset();
});

/* ---------------- 12. START-UP ---------------- */
$("pDate").min = todayISO();
renderHome(); renderDepartments(); renderQueues(); renderAnalytics(); renderImpact(); setStep(1);
showView(location.hash.slice(1) || "home");
