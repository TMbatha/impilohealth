let demoVisits = [];
const demoPatient = { name: "Sipho Mokoena", condition: "Hypertension", allergies: ["Penicillin"] };
const demoListeners = [];
function seedDemoData() {
  if (!demoVisits.length) demoVisits = [
    { date: "2026-07-12", clinic: "Mamelodi Clinic", systolic: 132, diastolic: 84, medicine: "Amlodipine", dose: "5 mg", note: "" },
    { date: "2026-09-03", clinic: "Mamelodi Clinic", systolic: 138, diastolic: 88, medicine: "Amlodipine", dose: "5 mg", note: "" },
    { date: "2026-10-28", clinic: "Tshwane District Hospital", systolic: 146, diastolic: 92, medicine: "Amlodipine", dose: "10 mg", note: "Dose adjusted" }
  ];
}
function getPatient() { return demoPatient; }
function getVisits() { return demoVisits; }
function onDataChange(callback) { demoListeners.push(callback); }
function addVisit(visit) {
  demoVisits.push(visit);
  demoListeners.forEach(callback => callback());
  return { ok: true };
}
