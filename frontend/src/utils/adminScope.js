const ADMIN_SCOPE_USER_ID_KEY = 'admin_scope_user_id';

export const getAdminScopeUserId = () => {
  try {
    const raw = window?.localStorage?.getItem(ADMIN_SCOPE_USER_ID_KEY);
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
};

export const setAdminScopeUserId = (userId) => {
  const safeId = Number(userId);
  if (!Number.isFinite(safeId) || safeId <= 0) {
    return;
  }

  try {
    window?.localStorage?.setItem(ADMIN_SCOPE_USER_ID_KEY, String(Math.trunc(safeId)));
  } catch {
    // ignore
  }
};

export const clearAdminScopeUserId = () => {
  try {
    window?.localStorage?.removeItem(ADMIN_SCOPE_USER_ID_KEY);
  } catch {
    // ignore
  }
};
