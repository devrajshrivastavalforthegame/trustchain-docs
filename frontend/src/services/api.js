import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
let accessToken = null;
let refreshPromise = null;
const refreshSubscribers = [];

function getCookie(name) {
  const parts = document.cookie ? document.cookie.split('; ') : [];
  for (const part of parts) {
    const [key, ...value] = part.split('=');
    if (decodeURIComponent(key) === name) return decodeURIComponent(value.join('='));
  }
  return null;
}
function setAccessToken(token) { accessToken = token || null; }
function getAccessToken() { return accessToken; }
function clearAccessToken() { accessToken = null; }
function subscribe(cb) { refreshSubscribers.push(cb); }
function notify(token) { while (refreshSubscribers.length) refreshSubscribers.shift()(token); }

const api = axios.create({ baseURL: API_BASE_URL, withCredentials: true, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use(config => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

async function requestRefreshToken() {
  const csrf = getCookie('trustchain_csrf');
  const res = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {}, { withCredentials: true, headers: csrf ? { 'x-csrf-token': csrf } : {} });
  if (!res.data?.accessToken) throw new Error('Refresh token response missing access token');
  setAccessToken(res.data.accessToken);
  return res.data;
}

api.interceptors.response.use(
  response => response,
  async error => {
    const req = error.config;
    const status = error.response?.status;
    const code = error.response?.data?.code;
    const url = req?.url || '';
    if (status !== 401 || req?._retry || url.includes('/auth/refresh-token') || url.includes('/auth/login') || url.includes('/auth/register') || code === 'ACCOUNT_PENDING' || code === 'ACCOUNT_REJECTED') {
      return Promise.reject(error);
    }
    req._retry = true;
    if (!refreshPromise) {
      refreshPromise = requestRefreshToken()
        .then(data => { notify(data.accessToken); return data; })
        .catch(e => { clearAccessToken(); notify(null); throw e; })
        .finally(() => { refreshPromise = null; });
    }
    return new Promise((resolve, reject) => {
      subscribe(token => {
        if (!token) return reject(error);
        req.headers.Authorization = `Bearer ${token}`;
        resolve(api(req));
      });
    });
  }
);

async function loginRequest(email, password) {
  const res = await api.post('/auth/login', { email, password });
  if (res.data?.accessToken) setAccessToken(res.data.accessToken);
  return res.data;
}
async function registerRequest(payload) {
  const res = await api.post('/auth/register', payload);
  if (res.data?.accessToken) setAccessToken(res.data.accessToken);
  return res.data;
}
async function refreshSessionRequest() { return requestRefreshToken(); }
async function logoutRequest() { try { await api.post('/auth/logout'); } finally { clearAccessToken(); } }

export { api, setAccessToken, getAccessToken, clearAccessToken, loginRequest, registerRequest, refreshSessionRequest, logoutRequest };
export default api;
