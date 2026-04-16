const STORAGE_KEY = "clinicflow_doctor_activity_v1";

function getScopedKey() {
  const tenantId = localStorage.getItem("clinicflow_tenantId") || "no-tenant";
  let userId = "no-user";

  try {
    const raw = localStorage.getItem("clinicflow_user");
    const user = raw ? JSON.parse(raw) : null;
    if (user?.id) userId = user.id;
  } catch {
    // ignore
  }

  return `${tenantId}:${userId}`;
}

function readRoot() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeRoot(next) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore (quota / private mode)
  }
}

function updateScoped(updater) {
  const scopedKey = getScopedKey();
  const root = readRoot();
  const current = root[scopedKey] || { recentPatients: [], recentFiles: [], visitSessions: [] };
  const nextScoped = updater(current);
  root[scopedKey] = nextScoped;
  writeRoot(root);
  return nextScoped;
}

function dedupeById(items, idKey) {
  const seen = new Set();
  const out = [];

  for (const item of items) {
    const id = item?.[idKey];
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }

  return out;
}

export function recordPatientOpen(patient) {
  if (!patient?.id) return;

  updateScoped((current) => {
    const entry = {
      id: patient.id,
      name: patient.name || "Patient",
      phone: patient.phone || patient.phoneNumber || "",
      lastOpenedAt: Date.now(),
    };

    const merged = [entry, ...(current.recentPatients || [])];
    const normalized = dedupeById(merged, "id").slice(0, 12);

    return { ...current, recentPatients: normalized };
  });
}

export function recordFileOpen(file) {
  if (!file?.id) return;

  updateScoped((current) => {
    const entry = {
      id: file.id,
      title: file.title || "File",
      kind: file.kind || "file",
      patientId: file.patientId || null,
      createdAt: Date.now(),
    };

    const merged = [entry, ...(current.recentFiles || [])];
    const normalized = dedupeById(merged, "id").slice(0, 12);

    return { ...current, recentFiles: normalized };
  });
}

export function recordVisitSessionStart({ patientId, patientName, patientPhone }) {
  if (!patientId) return;

  updateScoped((current) => {
    const existing = (current.visitSessions || []).find(
      (session) => session.patientId === patientId && !session.completedAt
    );
    if (existing) {
      return current;
    }

    const entry = {
      id: `visit-${patientId}-${Date.now()}`,
      patientId,
      patientName: patientName || "Patient",
      patientPhone: patientPhone || null,
      startedAt: Date.now(),
      completedAt: null,
    };

    const next = [entry, ...(current.visitSessions || [])].slice(0, 24);
    return { ...current, visitSessions: next };
  });
}

export function recordVisitSessionComplete(patientId) {
  if (!patientId) return;

  updateScoped((current) => {
    const next = (current.visitSessions || []).map((session) => {
      if (session.patientId !== patientId) return session;
      if (session.completedAt) return session;
      return { ...session, completedAt: Date.now() };
    });

    return { ...current, visitSessions: next };
  });
}

export function getDoctorActivity() {
  const scopedKey = getScopedKey();
  const root = readRoot();
  return root[scopedKey] || { recentPatients: [], recentFiles: [], visitSessions: [] };
}

export function getActiveVisitSessions(maxAgeMinutes = 240) {
  const { visitSessions } = getDoctorActivity();
  const cutoff = Date.now() - maxAgeMinutes * 60 * 1000;

  return (visitSessions || [])
    .filter((session) => !session.completedAt && session.startedAt >= cutoff)
    .slice(0, 3);
}

export function hasActiveVisitForPatient({ patientId, patientPhone }) {
  const active = getActiveVisitSessions(240);
  if (patientId && active.some((s) => s.patientId === patientId)) return true;
  if (patientPhone && active.some((s) => (s.patientPhone || "") === patientPhone)) return true;
  return false;
}

export function getLastIncompleteVisit() {
  const { visitSessions } = getDoctorActivity();
  return (visitSessions || []).find((session) => !session.completedAt) || null;
}
