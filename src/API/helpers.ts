export const parseDuration = (label?: string) => {
  if (!label) return { months: 0, days: 0, label: "" };
  const m = label.match(/(\d+)\s*(month|months|mo|mos)/i);
  if (m) {
    const months = Number(m[1] ?? 0);
    const days = months * 30; // approximate
    return { months, days, label };
  }
  // fallback: try number only
  const n = label.match(/(\d+)/);
  const months = n ? Number(n[1]) : 0;
  const days = months * 30;
  return { months, days, label };
};
