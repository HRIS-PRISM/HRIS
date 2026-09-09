/** Build per-weekday official schedule map from API rows (latest id wins per day). */
export function buildOfficialTimeDayMap(rows, periodStart, periodEnd) {
  const filtered =
    periodStart && periodEnd
      ? (rows || []).filter((r) => {
          const schedStart = r.startDate
            ? String(r.startDate).split('T')[0]
            : null;
          const schedEnd = r.endDate ? String(r.endDate).split('T')[0] : null;
          if (!schedStart || !schedEnd) return false;
          return schedStart <= periodEnd && schedEnd >= periodStart;
        })
      : rows || [];

  const map = filtered.reduce((acc, r) => {
    if (!acc[r.day] || (r.id && acc[r.day]._id && r.id > acc[r.day]._id)) {
      acc[r.day] = {
        _id: r.id,
        officialTimeIN: r.officialTimeIN,
        officialTimeOUT: r.officialTimeOUT,
        officialBreaktimeIN: r.officialBreaktimeIN,
        officialBreaktimeOUT: r.officialBreaktimeOUT,
      };
    }
    return acc;
  }, {});

  return Object.fromEntries(
    Object.entries(map).map(([day, val]) => {
      const { _id, ...rest } = val;
      return [day, rest];
    }),
  );
}
