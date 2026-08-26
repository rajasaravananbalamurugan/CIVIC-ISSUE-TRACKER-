import axios from 'axios';

let envBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
if (envBase.endsWith('/')) envBase = envBase.slice(0, -1);
const API_BASE = envBase.endsWith('/api') ? envBase : `${envBase}/api`;

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: data => api.post('/auth/login', data),
  register: data => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  updateProfile: data => api.put('/auth/profile', data),
  changePassword: data => api.put('/auth/change-password', data),
};

export const complaintsApi = {
  list: params => api.get('/complaints', { params }),
  get: id => api.get(`/complaints/${id}`),
  create: data => api.post('/complaints', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateStatus: (id, data) => api.put(`/complaints/${id}/status`, data),
  updateAfterPhoto: (id, data) => api.put(`/complaints/${id}/after-photo`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  reopen: (id, data) => api.post(`/complaints/${id}/reopen`, data),
  addComment: (id, data) => api.post(`/complaints/${id}/comments`, data),
  stats: () => api.get('/complaints/stats/summary'),
  mapData: params => api.get('/complaints/all/map', { params }),
  upvote: id => api.post(`/complaints/${id}/upvote`),
  submitRating: (id, data) => api.post(`/complaints/${id}/rating`, data),
  authorityCalendar: () => api.get('/complaints/authority/calendar'),
  nearbyFeed: ward => api.get('/complaints/feed/nearby', { params: { ward } }),
};

export const adminApi = {
  users: () => api.get('/admin/users'),
  createUser: data => api.post('/admin/users', data),
  deleteUser: id => api.delete(`/admin/users/${id}`),
  authorities: () => api.get('/admin/authorities'),
  analytics: () => api.get('/admin/analytics'),
  crisis: () => api.get('/admin/crisis'),
  escalate: id => api.post(`/admin/escalate/${id}`),
  performance: officerId => api.get('/admin/performance', { params: { officer_id: officerId } }),
  triggerDigest: () => api.post('/admin/trigger-digest'),
  triggerReminders: () => api.post('/admin/trigger-reminders'),
};

export const publicApi = {
  transparency: () => api.get('/public/transparency'),
  track: complaintId => api.get(`/public/track/${complaintId}`),
};

export const announcementsApi = {
  getAll: expired => api.get('/announcements', { params: { expired } }),
  create: data => api.post('/announcements', data),
  delete: id => api.delete(`/announcements/${id}`),
};

export const chatApi = {
  sendMessages: messages => api.post('/chat', { messages }),
};

export const citizenApi = {
  badges: () => api.get('/citizens/badges'),
};

export const notificationsApi = {
  getAll: () => api.get('/notifications'),
  getCount: () => api.get('/notifications/count'),
  markAllRead: () => api.put('/notifications/read-all'),
  markRead: id => api.put(`/notifications/${id}/read`),
};

export const aiApi = {
  predict: complaintId => api.post(`/ai/predict/${complaintId}`),
  accept: complaintId => api.post(`/ai/accept/${complaintId}`),
  analyzeImage: data => api.post('/ai/analyze-image', data),
  cleanText: data => api.post('/ai/clean-text', data),
};

export default api;
