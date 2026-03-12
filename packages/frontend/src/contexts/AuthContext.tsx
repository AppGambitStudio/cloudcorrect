import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';
import {
    signIn as cognitoSignIn,
    signUp as cognitoSignUp,
    confirmSignUp as cognitoConfirmSignUp,
    signOut as cognitoSignOut,
    getCurrentUser,
    getSession,
} from '@/lib/cognito';

interface User {
    id: string;
    email: string;
    role: string;
    tenantId: string;
}

interface Tenant {
    id: string;
    name: string;
}

interface AuthContextType {
    user: User | null;
    tenant: Tenant | null;
    loading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string) => Promise<void>;
    confirmSignup: (email: string, code: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [loading, setLoading] = useState(true);

    const isAuthenticated = !!user;

    useEffect(() => {
        const initAuth = async () => {
            const cognitoUser = getCurrentUser();
            if (cognitoUser) {
                try {
                    const session = await getSession();
                    if (session) {
                        const response = await api.get('/auth/me');
                        setUser(response.data.user);
                        setTenant(response.data.tenant);
                    }
                } catch (error) {
                    console.error('Session validation failed', error);
                    cognitoSignOut();
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const login = async (email: string, password: string) => {
        await cognitoSignIn(email, password);
        const response = await api.get('/auth/me');
        setUser(response.data.user);
        setTenant(response.data.tenant);
    };

    const signup = async (email: string, password: string) => {
        await cognitoSignUp(email, password);
    };

    const confirmSignup = async (email: string, code: string) => {
        await cognitoConfirmSignUp(email, code);
    };

    const logout = () => {
        cognitoSignOut();
        setUser(null);
        setTenant(null);
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, tenant, loading, isAuthenticated, login, signup, confirmSignup, logout }}>
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
