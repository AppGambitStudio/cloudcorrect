"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';

interface User {
    id: string;
    email: string;
    tenantId: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signup: (email: string, password: string, tenantName: string) => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const savedUser = localStorage.getItem('user');
            const savedToken = localStorage.getItem('token');

            if (savedUser && savedToken) {
                try {
                    const response = await api.get('/auth/me');
                    setUser(response.data);
                } catch (error) {
                    console.error('Session validation failed', error);
                    logout();
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const signup = async (email: string, password: string, tenantName: string) => {
        try {
            const response = await api.post('/auth/signup', { email, password, tenantName });
            const { user: newUser, token } = response.data;
            setUser(newUser);
            localStorage.setItem('user', JSON.stringify(newUser));
            localStorage.setItem('token', token);
        } catch (error) {
            console.error('Signup failed', error);
            throw error;
        }
    };

    const login = async (email: string, password: string) => {
        try {
            const response = await api.post('/auth/login', { email, password });
            const { user: newUser, token } = response.data;
            setUser(newUser);
            localStorage.setItem('user', JSON.stringify(newUser));
            localStorage.setItem('token', token);
        } catch (error) {
            console.error('Login failed', error);
            throw error;
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    };

    return (
        <AuthContext.Provider value={{ user, loading, signup, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
