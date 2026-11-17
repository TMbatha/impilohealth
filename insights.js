function average(numbers) {
  const values = numbers.map(Number).filter(Number.isFinite);
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function isHigh(visit) {
  return Number(visit.systolic) >= 140 || Number(visit.diastolic) >= 90;
}

function daysBetween(a, b) {
  const toUtcDays = date => {
    const [year, month, day] = date.split("-").map(Number);
    return Date.UTC(year, month - 1, day) / 86400000;
  };
  return toUtcDays(b) - toUtcDays(a);
}

function getInsights(patient, visits, today) {
  const insights = [];
  if (!visits.length) {
    return [{ level: "info", text: "No visits recorded yet." }];
  }

  const latest = visits[visits.length - 1];
  if (isHigh(latest)) {
    insights.push({
      level: "alert",
      text: `Latest reading is high: ${latest.systolic}/${latest.diastolic} (${latest.date}, ${latest.clinic}).`
    });
  }

  if (visits.length >= 2) {
    const earlierAverage = average(visits.slice(0, -1).map(visit => visit.systolic));
    if (Number(latest.systolic) >= earlierAverage + 10) {
      insights.push({
        level: "alert",
        text: `Rising: up from an average of ${earlierAverage} to ${latest.systolic}.`
      });
    }

    let changeIndex = -1;
    for (let index = visits.length - 1; index > 0; index--) {
      if (visits[index].medicine !== visits[index - 1].medicine ||
          visits[index].dose !== visits[index - 1].dose) {
        changeIndex = index;
        break;
      }
    }

    if (changeIndex > 0) {
      const beforeAverage = average(visits.slice(0, changeIndex).map(visit => visit.systolic));
      const afterAverage = average(visits.slice(changeIndex).map(visit => visit.systolic));
      if (afterAverage >= beforeAverage + 10) {
        const changedVisit = visits[changeIndex];
        insights.push({
          level: "alert",
          text: `Readings rose after the dose changed to ${changedVisit.dose} at ${changedVisit.clinic} (${changedVisit.date}): average ${beforeAverage} → ${afterAverage}.`
        });
      }
    }
  }

  const daysSinceVisit = daysBetween(latest.date, today);
  if (daysSinceVisit > 60) {
    insights.push({ level: "alert", text: `No visit for ${daysSinceVisit} days.` });
  }

  const clinicCount = new Set(visits.map(visit => visit.clinic).filter(Boolean)).size;
  if (clinicCount >= 2) {
    insights.push({
      level: "info",
      text: `Seen at ${clinicCount} clinics. Impilo connects them.`
    });
  }

  return insights;
}

function buildSmsSummary(patient, visits, insights) {
  const latest = visits[visits.length - 1];
  const allergies = Array.isArray(patient.allergies)
    ? patient.allergies.join(", ")
    : patient.allergies || "None listed";
  const alert = insights.find(insight => insight.level === "alert");
  const parts = [
    "Impilo",
    patient.name,
    patient.condition,
    `Allergy: ${allergies}`,
    latest && `${latest.medicine} ${latest.dose}`.trim(),
    latest && `Last BP ${latest.systolic}/${latest.diastolic} (${latest.date}, ${latest.clinic})`,
    alert && alert.text
  ].filter(Boolean);
  const summary = parts.join(" | ").replace(/\s+/g, " ").trim();
  if (summary.length < 300) return summary;
  return `${summary.slice(0, 296).trimEnd()}...`;
}
