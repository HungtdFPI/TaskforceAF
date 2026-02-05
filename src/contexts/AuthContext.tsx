import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { type Session, type User } from '@supabase/supabase-js';
import { type UserRole, type CampusCode } from '../types';

export type { UserRole, CampusCode };

export interface Profile {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    campus: CampusCode;
    avatar_url?: string;
    phone?: string;
    unit?: string;
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    signOut: () => Promise<void>;
    loginAsGuest?: () => Promise<void>;
    loginAsDemo?: (email: string) => Promise<void>;
    registerDemoUser?: (email: string, fullName: string, campus: CampusCode, role?: UserRole) => Promise<void>;
    updateDemoUser?: (email: string, updates: Partial<Profile>) => Promise<void>;
    demoUsers?: Record<string, Partial<Profile>>;
    updateProfile?: (updates: Partial<Profile>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        // Safety timeout to prevent infinite loading
        const timer = setTimeout(() => {
            if (mounted && loading) {
                console.warn('Auth loading timed out, forcing load completion.');
                setLoading(false);
            }
        }, 3000);

        const initAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                if (mounted) {
                    setSession(session);
                    setUser(session?.user ?? null);
                    if (session?.user) {
                        await fetchProfile(session.user.id);
                    } else {
                        setLoading(false);
                    }
                }
            } catch (err) {
                console.error('Auth initialization error:', err);
                if (mounted) setLoading(false);
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!mounted) return;
            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                await fetchProfile(session.user.id);
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            clearTimeout(timer);
            subscription.unsubscribe();
        };
    }, []);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
            } else {
                setProfile(data as Profile);
            }
        } catch (err) {
            console.error('Unexpected error fetching profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
    };

    const loginAsGuest = async () => {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 800));

        const mockUser: User = {
            id: 'guest-user-id',
            aud: 'authenticated',
            role: 'authenticated',
            email: 'guest@demo.com',
            phone: '',
            app_metadata: { provider: 'email' },
            user_metadata: { full_name: 'Khách Tham Quan', role: 'guest' as any, campus: 'HN' },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        } as User;

        const mockProfile: Profile = {
            id: 'guest-user-id',
            email: 'guest@demo.com',
            full_name: 'Khách Tham Quan',
            role: 'guest',
            campus: 'HN',
        };

        const mockSession: Session = {
            access_token: 'mock-token',
            refresh_token: 'mock-refresh-token',
            expires_in: 3600,
            token_type: 'bearer',
            user: mockUser,
        };

        setSession(mockSession);
        setUser(mockUser);
        setProfile(mockProfile);
        setLoading(false);
    };

    // In-memory store for demo users to simulate registration persistence during a session
    const [demoUsers, setDemoUsers] = useState<Record<string, Partial<Profile>>>({});

    const registerDemoUser = async (email: string, fullName: string, campus: CampusCode, role: UserRole = 'gv') => {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate returning

        setDemoUsers(prev => ({
            ...prev,
            [email]: { full_name: fullName, campus, role }
        }));

        setLoading(false);
    };

    const updateDemoUser = async (email: string, updates: Partial<Profile>) => {
        setDemoUsers(prev => ({
            ...prev,
            [email]: { ...(prev[email] || {}), ...updates }
        }));
    };

    const loginAsDemo = async (email: string) => {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 800));

        // 1. Check in-memory demo users first (Registered in this session)
        if (demoUsers[email]) {
            const demoProfile = demoUsers[email];
            const mockUser: User = {
                id: `demo-${email}`,
                aud: 'authenticated',
                role: 'authenticated',
                email: email,
                app_metadata: { provider: 'email' },
                user_metadata: {
                    full_name: demoProfile.full_name,
                    role: demoProfile.role,
                    campus: demoProfile.campus
                },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            } as User;

            const mockProfile: Profile = {
                id: `demo-${email}`,
                email: email,
                full_name: demoProfile.full_name || email,
                role: demoProfile.role || 'gv',
                campus: demoProfile.campus || 'HN',
            };

            setSession({
                access_token: 'mock-token',
                refresh_token: 'mock-refresh-token',
                expires_in: 3600,
                token_type: 'bearer',
                user: mockUser,
            });
            setUser(mockUser);
            setProfile(mockProfile);
            setLoading(false);
            return;
        }

        // 2. Dynamic parsing logic for demo accounts: [role]_[campus]@fpt.edu.vn
        // Example: gv_hn@fpt.edu.vn -> role: gv, campus: HN
        // exceptions: admin@fpt.edu.vn -> role: truong_nganh, campus: HN (default)

        let role: UserRole | undefined;
        let campus: CampusCode = 'HN';
        let fullName = 'Người dùng Demo';

        const prefix = email.split('@')[0]; // gv_hn

        if (prefix === 'admin') {
            role = 'truong_nganh';
            fullName = 'Trưởng Ngành (Admin)';
            campus = 'HN'; // Default
        } else {
            const parts = prefix.split('_');
            if (parts.length >= 2) {
                const rolePart = parts[0]; // gv, cnbm, dvsv or gv1, gv2
                const campusPart = parts[1].toUpperCase(); // HN, DN, HCM, CT

                // Extract core role from potential number (gv1 -> gv)
                const roleMatch = rolePart.match(/^([a-z]+)\d*$/);
                const coreRole = roleMatch ? roleMatch[1] : rolePart;

                if (['gv', 'cnbm', 'dvsv', 'tbdt'].includes(coreRole)) {
                    role = coreRole as UserRole;
                }

                if (['HN', 'DN', 'HCM', 'CT'].includes(campusPart)) {
                    campus = campusPart as CampusCode;
                }
            }
        }

        // Fallback for "guest" or unrecognized patterns in demo mode
        if (!role && email.includes('guest')) role = 'guest';

        // Map for nice names
        const roleNames: Record<string, string> = {
            gv: 'Giảng Viên',
            cnbm: 'Chủ Nhiệm Bộ Môn',
            truong_nganh: 'Trưởng Ngành',
            dvsv: 'Cán bộ DVSV',
            guest: 'Khách',
            ho: 'Head Office',
            tbdt: 'Trưởng Ban Đào Tạo'
        };

        if (role) {
            fullName = `${roleNames[role] || role} (${campus})`;
        }

        if (!role) {
            // Try legacy map for backwards compatibility or hardcoded tests
            const roleMap: Record<string, UserRole> = {
                'gv_hn@demo.com': 'gv',
                'cnbm_hn@demo.com': 'cnbm',
                'admin@demo.com': 'truong_nganh',
                'dvsv_hn@demo.com': 'dvsv'
            };
            role = roleMap[email];
            if (role) fullName = `Demo Legacy (${role})`;
        }

        if (!role) {
            setLoading(false);
            // Instead of throwing, let's allow a generic "Lecturer" fallback for testing any @fpt.edu.vn email
            if (email.endsWith('@fpt.edu.vn')) {
                role = 'gv';
                fullName = `Giảng Viên (${email})`;
                // Default campus to HN if not found
            } else {
                throw new Error('Email chưa được phân quyền trong hệ thống demo');
            }
        }

        const mockUser: User = {
            id: `demo-${email}`, // This string ID is now supported by the DB change to TEXT
            aud: 'authenticated',
            role: 'authenticated',
            email: email,
            app_metadata: { provider: 'email' },
            user_metadata: { full_name: fullName, role: role, campus: campus },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        } as User;

        const mockProfile: Profile = {
            id: `demo-${email}`,
            email: email,
            full_name: fullName,
            role: role,
            campus: campus,
        };

        const mockSession: Session = {
            access_token: 'mock-token',
            refresh_token: 'mock-refresh-token',
            expires_in: 3600,
            token_type: 'bearer',
            user: mockUser,
        };

        setSession(mockSession);
        setUser(mockUser);
        setProfile(mockProfile);
        setLoading(false);
    };

    const updateProfile = async (updates: Partial<Profile>) => {
        setLoading(true);
        try {
            if (user?.id.startsWith('demo-')) {
                // Handle Demo User Update (In-Memory)
                await new Promise(resolve => setTimeout(resolve, 500)); // Simulate partial delay

                const email = user.email!;
                setDemoUsers(prev => ({
                    ...prev,
                    [email]: { ...prev[email], ...updates }
                }));

                // Update current session profile
                setProfile(prev => prev ? { ...prev, ...updates } : null);

                // Also update user metadata for display consistency if needed
                if (user) {
                    setUser({
                        ...user,
                        user_metadata: { ...user.user_metadata, ...updates }
                    });
                }

                return { error: null };
            } else {
                // Handle Real User Update (Supabase)
                if (!user) throw new Error('No user logged in');

                const { error } = await supabase
                    .from('profiles')
                    .update({
                        ...updates,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', user.id);

                if (error) {
                    // Fallback for network issues in "Real" mode if acting as demo
                    if (error.message === 'Failed to fetch') {
                        setProfile(prev => prev ? { ...prev, ...updates } : null);
                        return { error: null };
                    }
                    return { error };
                }

                // Refresh profile to get latest data
                await fetchProfile(user.id);
                return { error: null };
            }
        } catch (err: any) {
            return { error: err };
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ session, user, profile, loading, signOut, loginAsGuest, loginAsDemo, registerDemoUser, updateDemoUser, demoUsers, updateProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
