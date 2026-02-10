import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — add JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('shajara_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('shajara_token');
      localStorage.removeItem('shajara_user');
      // Only redirect if not already on auth pages
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// Trees API
export const treesAPI = {
  create: (data) => api.post('/trees', data),
  list: () => api.get('/trees'),
  getBySlug: (slug) => api.get(`/trees/${slug}`),
  update: (id, data) => api.put(`/trees/${id}`, data),
  delete: (id) => api.delete(`/trees/${id}`),
  exportJSON: (treeId) => api.get(`/trees/${treeId}/export?format=json`, { responseType: 'blob' }),
  exportCSV: (treeId) => api.get(`/trees/${treeId}/export?format=csv`, { responseType: 'blob' }),
  importData: (treeId, data) => api.post(`/trees/${treeId}/import`, data),
  relationship: (treeId, fromId, toId) => api.get(`/trees/${treeId}/relationship?from=${fromId}&to=${toId}`),
};

// Persons API
export const personsAPI = {
  create: (treeId, data) => api.post(`/trees/${treeId}/persons`, data),
  list: (treeId) => api.get(`/trees/${treeId}/persons`),
  get: (treeId, id) => api.get(`/trees/${treeId}/persons/${id}`),
  update: (treeId, id, data) => api.put(`/trees/${treeId}/persons/${id}`, data),
  delete: (treeId, id) => api.delete(`/trees/${treeId}/persons/${id}`),
  ancestors: (treeId, id) => api.get(`/trees/${treeId}/persons/${id}/ancestors`),
  descendants: (treeId, id, mode = 'male') => api.get(`/trees/${treeId}/persons/${id}/descendants?mode=${mode}`),
  nasab: (treeId, id) => api.get(`/trees/${treeId}/persons/${id}/nasab`),
  search: (query, limit = 20) => api.get(`/persons/search?q=${encodeURIComponent(query)}&limit=${limit}`),
};

// Spouses API
export const spousesAPI = {
  create: (treeId, data) => api.post(`/trees/${treeId}/spouses`, data),
  update: (treeId, id, data) => api.put(`/trees/${treeId}/spouses/${id}`, data),
  delete: (treeId, id) => api.delete(`/trees/${treeId}/spouses/${id}`),
};

// Members API
export const membersAPI = {
  create: (treeId, data) => api.post(`/trees/${treeId}/members`, data),
  list: (treeId) => api.get(`/trees/${treeId}/members`),
  update: (treeId, id, data) => api.put(`/trees/${treeId}/members/${id}`, data),
  delete: (treeId, id) => api.delete(`/trees/${treeId}/members/${id}`),
};

export default api;
