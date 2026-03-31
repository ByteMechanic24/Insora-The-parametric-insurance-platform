import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const api = axios.create({
    baseURL: apiBaseUrl,
    timeout: 60000
});

api.interceptors.request.use((config) => {
    try {
        const sessionToken = localStorage.getItem('gigshield_session');
        if (sessionToken) {
            config.headers.Authorization = `Bearer ${sessionToken}`;
        }
    } catch (e) {
        // Ignore storage parsing issues and continue without a session.
    }
    return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            if (error.response.status === 402) {
                console.warn('[GigShield] Blocked Execution: Active policy missing for current bounds.');
            }
            if (error.response.status === 401) {
                localStorage.removeItem('gigshield_worker');
                localStorage.removeItem('gigshield_session');
                window.location.href = '/'; 
            }
        }
        return Promise.reject(error);
    }
);

const handle = async (requestPromise) => {
    try {
        const res = await requestPromise;
        return res.data;
    } catch (err) {
        const wrapped = new Error(
            err.response?.data?.error || err.response?.data?.message || err.message || "Unknown Gigshield Integration Exception"
        );
        wrapped.code = err.response?.data?.code;
        wrapped.status = err.response?.status;
        throw wrapped;
    }
};

export const persistWorkerAuth = (payload) => {
    if (payload?.session?.accessToken) {
        localStorage.setItem('gigshield_session', payload.session.accessToken);
    }
    if (payload?.worker) {
        localStorage.setItem('gigshield_worker', JSON.stringify(payload.worker));
    }
};

export const clearWorkerAuth = () => {
    localStorage.removeItem('gigshield_session');
    localStorage.removeItem('gigshield_worker');
};

export const signUpWorker = (data) => handle(api.post('/workers/sign-up', data));
export const registerWorker = (data) => handle(api.post('/workers/register', data));
export const loginWorker = (data) => handle(api.post('/workers/sign-in', data));
export const restoreWorkerSession = () => handle(api.get('/workers/session'));
export const signOutWorker = () => handle(api.post('/workers/sign-out'));
export const warmServices = () =>
    api.get('/webhooks/warmup', {
        timeout: 15000,
        headers: {
            'Cache-Control': 'no-store',
        },
    }).catch(() => null);
export const submitClaim = (data) => handle(api.post('/claims', data));
export const getClaims = (params = {}) => handle(api.get('/claims', { params }));
export const getMockOrders = () => handle(api.get('/claims/mock-orders'));
export const generateDemoOrder = (platform, anchor) =>
    handle(api.post('/claims/mock-orders/demo-generate', { platform, anchor }));
export const getCurrentPolicy = () => handle(api.get('/policies/current'));
export const updateTier = (tier) => handle(api.put('/workers/me/tier', { tier }));

export default api;
