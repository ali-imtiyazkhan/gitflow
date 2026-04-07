// ─── API ──────────────────────────────────────────────────────────────────────
export const API_VERSION = 'v1';
export const API_BASE_PATH = `/api/${API_VERSION}`;
// ─── GitHub OAuth ─────────────────────────────────────────────────────────────
export const GITHUB_OAUTH_SCOPES = ['repo', 'read:user', 'user:email'];
// ─── Branch Naming ────────────────────────────────────────────────────────────
export const BRANCH_TYPE_PREFIXES = {
    feature: 'feature/',
    hotfix: 'hotfix/',
    release: 'release/',
    chore: 'chore/',
    main: '',
    develop: '',
};
export const PROTECTED_BRANCH_PATTERNS = ['main', 'master', 'develop', 'release/*'];
// ─── Graph Canvas ─────────────────────────────────────────────────────────────
export const GRAPH_DEFAULTS = {
    NODE_WIDTH: 180,
    NODE_HEIGHT: 72,
    NODE_RADIUS: 36,
    H_GAP: 120,
    V_GAP: 80,
    CANVAS_PADDING: 40,
};
// ─── WebSocket ────────────────────────────────────────────────────────────────
export const WS_RECONNECT_INTERVAL_MS = 3000;
export const WS_MAX_RECONNECT_ATTEMPTS = 5;
// ─── Misc ─────────────────────────────────────────────────────────────────────
export const STALE_BRANCH_DAYS = 30;
export const MAX_CONFLICT_FILE_SIZE_KB = 500;
