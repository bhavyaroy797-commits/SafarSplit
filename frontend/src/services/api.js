import axios from 'axios';
import { LS } from '../utils/constants';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(LS.TOKEN);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => {
    const body = res.data;
    if (body && typeof body === 'object' && 'success' in body) {
      if (body.success) {
        res.data = body.data;
        res.meta = body.meta;
      } else {
        const err = new Error(body.error?.message || 'Request failed');
        err.details = body.error?.details;
        err.status = res.status;
        throw err;
      }
    }
    return res;
  },
  (err) => {
    const status = err.response?.status;
    const body = err.response?.data;
    const message =
      body?.error?.message || body?.message || err.message || 'Network error';
    if (status === 401) {
      localStorage.removeItem(LS.TOKEN);
      localStorage.removeItem(LS.USER);
      window.dispatchEvent(new CustomEvent('safarsplit:unauthorized'));
    }
    const out = new Error(message);
    out.status = status;
    out.details = body?.error?.details;
    return Promise.reject(out);
  }
);

/* ---------- Auth ---------- */
export const authApi = {
  register: (body) => api.post('/auth/register', body).then((r) => r.data),
  login: (body) => api.post('/auth/login', body).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  updateMe: (body) => api.patch('/auth/me', body).then((r) => r.data),
};

/* ---------- Trips ---------- */
export const tripsApi = {
  list: () => api.get('/trips').then((r) => r.data),
  create: (body) => api.post('/trips', body).then((r) => r.data),
  get: (tripId) => api.get(`/trips/${tripId}`).then((r) => r.data),
  update: (tripId, body) => api.patch(`/trips/${tripId}`, body).then((r) => r.data),
  remove: (tripId) => api.delete(`/trips/${tripId}`).then((r) => r.data),
  join: (joinCode) => api.post('/trips/join', { joinCode }).then((r) => r.data),
};

/* ---------- Itinerary ---------- */
export const itineraryApi = {
  list: (tripId) => api.get(`/trips/${tripId}/itinerary`).then((r) => r.data),
  create: (tripId, body) => api.post(`/trips/${tripId}/itinerary`, body).then((r) => r.data),
  update: (itemId, body) => api.patch(`/items/${itemId}`, body).then((r) => r.data),
  remove: (itemId) => api.delete(`/items/${itemId}`).then((r) => r.data),
  reorder: (tripId, orderedItemIds, dayNumber) =>
    api.post(`/trips/${tripId}/itinerary/reorder`, { orderedItemIds, dayNumber }).then((r) => r.data),
};

/* ---------- Votes ---------- */
export const votesApi = {
  list: (tripId) => api.get(`/trips/${tripId}/votes`).then((r) => r.data),
  cast: (tripId, body) => api.post(`/trips/${tripId}/votes`, body).then((r) => r.data),
  remove: (tripId, itemId) => api.delete(`/trips/${tripId}/votes/${itemId}`).then((r) => r.data),
};

/* ---------- Expenses ---------- */
export const expensesApi = {
  list: (tripId) => api.get(`/trips/${tripId}/expenses`).then((r) => r.data),
  create: (tripId, body) => api.post(`/trips/${tripId}/expenses`, body).then((r) => r.data),
  remove: (tripId, expenseId) => api.delete(`/trips/${tripId}/expenses/${expenseId}`).then((r) => r.data),
  balances: (tripId) => api.get(`/trips/${tripId}/expenses/balances`).then((r) => r.data),
  settleUp: (tripId) => api.get(`/trips/${tripId}/expenses/settle-up`).then((r) => r.data),
};

/* ---------- Wallet ---------- */
export const walletApi = {
  get: () => api.get('/wallet').then((r) => r.data),
  transactions: (limit = 50) => api.get('/wallet/transactions', { params: { limit } }).then((r) => r.data),
  topUp: (body) => api.post('/wallet/top-up', body).then((r) => r.data),
  transfer: (body) => api.post('/wallet/transfer', body).then((r) => r.data),
};

/* ---------- Attachments ---------- */
export const attachmentsApi = {
  list: (tripId) => api.get(`/trips/${tripId}/attachments`).then((r) => r.data),
  upload: (tripId, file, meta = {}) => {
    const fd = new FormData();
    fd.append('file', file);
    if (meta.kind) fd.append('kind', meta.kind);
    if (meta.title) fd.append('title', meta.title);
    return api.post(`/trips/${tripId}/attachments`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
  remove: (attachmentId) => api.delete(`/attachments/${attachmentId}`).then((r) => r.data),
  downloadUrl: (attachmentId) => `${baseURL}/attachments/${attachmentId}/download`,
};

/* ---------- AI ---------- */
export const aiApi = {
  generateItinerary: (tripId, body) => api.post(`/trips/${tripId}/ai/generate-itinerary`, body).then((r) => r.data),
  replan: (tripId, body) => api.post(`/trips/${tripId}/ai/replan`, body).then((r) => r.data),
  parseExpense: (tripId, text) => api.post(`/trips/${tripId}/ai/parse-expense`, { text }).then((r) => r.data),
  explainStop: (tripId, itemId) => api.post(`/trips/${tripId}/ai/explain-stop`, { itemId }).then((r) => r.data),
};

/* ---------- Packing ---------- */
export const packingApi = {
  list: (tripId, params = {}) => api.get(`/trips/${tripId}/packing`, { params }).then((r) => r.data),
  create: (tripId, body) => api.post(`/trips/${tripId}/packing`, body).then((r) => r.data),
  update: (itemId, body) => api.patch(`/packing-items/${itemId}`, body).then((r) => r.data),
  remove: (itemId) => api.delete(`/packing-items/${itemId}`).then((r) => r.data),
  claim: (itemId, body = {}) => api.post(`/packing-items/${itemId}/claim`, body).then((r) => r.data),
  unclaim: (itemId) => api.post(`/packing-items/${itemId}/unclaim`).then((r) => r.data),
  pack: (itemId, isPacked = true) => api.post(`/packing-items/${itemId}/pack`, { isPacked }).then((r) => r.data),
  bulkClaim: (tripId, itemIds) => api.post(`/trips/${tripId}/packing/bulk-claim`, { itemIds }).then((r) => r.data),
  suggest: (tripId, notes) => api.post(`/trips/${tripId}/packing/suggest`, { notes }).then((r) => r.data),
};

/* ---------- Budget ---------- */
export const budgetApi = {
  get: (tripId) => api.get(`/trips/${tripId}/budget`).then((r) => r.data),
  suggestions: (tripId, maxSwaps = 5) => api.get(`/trips/${tripId}/budget/suggestions`, { params: { maxSwaps } }).then((r) => r.data),
  applySwap: (tripId, body) => api.post(`/trips/${tripId}/budget/apply`, body).then((r) => r.data),
};

/* ---------- Wrapped ---------- */
export const wrappedApi = {
  get: (tripId, force = false) => api.get(`/trips/${tripId}/wrapped`, { params: force ? { force: 'true' } : {} }).then((r) => r.data),
  share: (tripId) => api.post(`/trips/${tripId}/wrapped/share`).then((r) => r.data),
  public: (token) => api.get(`/public/wrapped/${token}`).then((r) => r.data),
};

/* ---------- Community ---------- */
export const communityApi = {
  list: (params = {}) => api.get('/community/trips', { params }).then((r) => r.data),
  get: (tripId) => api.get(`/community/trips/${tripId}`).then((r) => r.data),
  fork: (tripId, body) => api.post(`/community/trips/${tripId}/fork`, body).then((r) => r.data),
  publish: (tripId, body) => api.post(`/trips/${tripId}/publish`, body).then((r) => r.data),
  unpublish: (tripId) => api.post(`/trips/${tripId}/unpublish`).then((r) => r.data),
};

/* ---------- Next payer ---------- */
export const nextPayerApi = {
  suggest: (tripId, amountPaise, excludeUserIds = []) =>
    api.get(`/trips/${tripId}/next-payer`, {
      params: {
        amount: amountPaise,
        ...(excludeUserIds.length ? { exclude: excludeUserIds.join(',') } : {}),
      },
    }).then((r) => r.data),
};

/* ---------- Sync ---------- */
export const syncApi = {
  push: (tripId, ops) => api.post('/sync', { tripId, ops }).then((r) => r.data),
};

/* ---------- Receipts (Scan bill) ---------- */
export const receiptsApi = {
  scan: (tripId, file, onProgress) => {
    const fd = new FormData();
    fd.append('image', file);
    return api.post(`/trips/${tripId}/receipts`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (!onProgress || !e.total) return;
        onProgress(Math.round((e.loaded * 100) / e.total));
      },
    }).then((r) => r.data);
  },
  confirm: (tripId, receiptId, body) =>
    api.post(
      receiptId
        ? `/trips/${tripId}/receipts/${receiptId}/confirm`
        : `/trips/${tripId}/receipts/confirm`,
      body
    ).then((r) => r.data),
  get: (tripId, receiptId) => api.get(`/trips/${tripId}/receipts/${receiptId}`).then((r) => r.data),
};

/* ---------- Settlement ---------- */
export const settlementApi = {
  get: (tripId, withAI = true) =>
    api.get(`/trips/${tripId}/settlement`, {
      params: withAI === false ? { withAI: 'false' } : {},
    }).then((r) => r.data),
  markPaid: (tripId, body) => api.post(`/trips/${tripId}/settlement/pay`, body).then((r) => r.data),
};

/* ---------- Assistant ---------- */
export const assistantApi = {
  send: (tripId, body) => api.post(`/trips/${tripId}/assistant/message`, body).then((r) => r.data),
  confirm: (tripId, body) => api.post(`/trips/${tripId}/assistant/confirm`, body).then((r) => r.data),
  confirmAll: (tripId, body) => api.post(`/trips/${tripId}/assistant/confirm-all`, body).then((r) => r.data),
  undo: (tripId, body) => api.post(`/trips/${tripId}/assistant/undo`, body).then((r) => r.data),
};

export default api;