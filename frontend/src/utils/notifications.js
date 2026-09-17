export const normalizeEmployeeNumber = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^\d+$/.test(raw)) return raw.replace(/^0+/, "") || "0";
  return raw;
};

export const employeeNumbersMatch = (a, b) => {
  const left = normalizeEmployeeNumber(a);
  const right = normalizeEmployeeNumber(b);
  return Boolean(left && right && left === right);
};

export const resolveEmployeeNumber = () => {
  const stored = String(localStorage.getItem("employeeNumber") || "").trim();
  const token = localStorage.getItem("token");
  if (token && token !== "null" && token !== "undefined") {
    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      const fromToken = String(decoded?.employeeNumber || decoded?.employee_number || "").trim();
      if (fromToken) return fromToken;
    } catch {
      /* ignore invalid token */
    }
  }
  return stored;
};

export const extractNotificationList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.notifications)) return payload.notifications;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
};

export const sortNotificationsLatestFirst = (list) =>
  [...(Array.isArray(list) ? list : [])].sort((a, b) => {
    const idDiff = Number(b?.id || 0) - Number(a?.id || 0);
    if (idDiff) return idDiff;
    return new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime();
  });

export const scopeNotificationsToEmployee = (list, empNum) => {
  const rows = Array.isArray(list) ? list : [];
  if (!rows.length) return [];
  const matched = rows.filter((n) =>
    employeeNumbersMatch(n.employeeNumber || n.employee_number, empNum),
  );
  // If the API already scoped the rows but field names/formats differ, keep them.
  return matched.length > 0 ? matched : rows;
};

export const inferNotificationType = (notification) => {
  const explicit = String(notification?.notification_type || "").trim().toLowerCase();
  if (explicit) return explicit;
  const desc = String(notification?.description || "").toLowerCase();
  const link = String(notification?.action_link || "").toLowerCase();
  if (notification?.announcement_id || desc.includes("announcement") || link.includes("announcement")) {
    return "announcement";
  }
  if (desc.includes("holiday") || link.includes("holiday")) return "holiday";
  if (desc.includes("suspension") || link.includes("suspension")) return "suspension";
  if (desc.includes("payslip") || link.includes("payslip")) return "payslip";
  if (desc.includes("ticket") || desc.includes("contact") || link.includes("settings")) return "contact";
  if (desc.includes("leave")) return "leave";
  return "general";
};

export const parseNotificationTargetId = (notification, kind) => {
  const link = String(notification?.action_link || "");
  const patterns = {
    announcement: [/\/announcement(?:s)?\/(\d+)/i, /[?&]announcement(?:Id|_id)?=(\d+)/i],
    holiday: [/\/holiday(?:s)?\/(\d+)/i, /[?&]holiday(?:Id|_id)?=(\d+)/i],
    suspension: [/\/suspension(?:s)?\/(\d+)/i, /[?&]suspension(?:Id|_id)?=(\d+)/i],
    contact: [/\/settings\/contact\/(\d+)/i],
  };
  if (kind === "announcement" && notification?.announcement_id) {
    const n = Number(notification.announcement_id);
    if (!Number.isNaN(n)) return n;
  }
  for (const pattern of patterns[kind] || []) {
    const match = link.match(pattern);
    if (match) return Number(match[1]);
  }
  return null;
};

export const normalizeNotification = (notification) => {
  if (!notification || typeof notification !== "object") return notification;
  return {
    ...notification,
    notification_type: inferNotificationType(notification),
    read_status: Number(notification.read_status) === 1 ? 1 : 0,
  };
};

export const findById = (list, id) => {
  if (!id && id !== 0) return null;
  return (list || []).find((item) => Number(item?.id) === Number(id)) || null;
};

export const latestByDate = (list, fields = ["created_at", "date_start", "date", "updated_at"]) => {
  const rows = Array.isArray(list) ? [...list] : [];
  if (!rows.length) return null;
  rows.sort((a, b) => {
    const aTime = Math.max(...fields.map((f) => new Date(a?.[f] || 0).getTime() || 0), Number(a?.id) || 0);
    const bTime = Math.max(...fields.map((f) => new Date(b?.[f] || 0).getTime() || 0), Number(b?.id) || 0);
    return bTime - aTime;
  });
  return rows[0] || null;
};
