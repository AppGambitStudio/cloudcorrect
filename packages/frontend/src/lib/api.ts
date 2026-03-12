import axios from 'axios';
import { getIdToken, signOut } from './cognito';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8801';

const api = axios.create({
    baseURL: `${apiUrl}/api`,
});

// Request interceptor — attach Cognito ID token
api.interceptors.request.use(
    async (config) => {
        const idToken = await getIdToken();
        if (idToken) {
            config.headers['Authorization'] = `Bearer ${idToken}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor — handle 401
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        if (error.response?.status === 401) {
            signOut();
            if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
