'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!supabase) {
            console.error('Supabase client is not initialized. Check your environment variables.');
            setLoading(false);
            return;
        }

        // onAuthStateChange INITIAL_SESSION event'i ile oturumu otomatik algıla
        // getSession() kullanmıyoruz çünkü navigator.locks sorununa neden oluyordu
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                try {
                    if (session?.user) {
                        setUser(session.user);
                        // Profile fetch'i setTimeout ile yaparak Supabase auth flow'unu engellememesini sağla
                        setTimeout(async () => {
                            await fetchProfile(session.user.id);
                            setLoading(false);
                        }, 0);
                    } else {
                        setUser(null);
                        setProfile(null);
                        setLoading(false);
                    }
                } catch (err) {
                    console.error('Auth state change error:', err);
                    setLoading(false);
                }
            }
        );

        // Güvenlik ağı: 10 saniye içinde hiçbir auth event gelmezse loading'i kapat
        const safetyTimer = setTimeout(() => {
            setLoading((prev) => {
                if (prev) {
                    console.warn('Auth safety timeout triggered — no auth event received within 10s');
                }
                return false;
            });
        }, 10000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(safetyTimer);
        };
    }, []);

    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();
            if (error) {
                console.error('Profile fetch error:', error);
            }
            setProfile(data);
        } catch (err) {
            console.error('Profile fetch exception:', err);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, signOut }}>
            {!supabase && !loading ? (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-red-100">
                        <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Yapılandırma Hatası</h2>
                        <p className="text-gray-500 text-center text-sm mb-6">
                            Supabase bağlantısı kurulamadı. Lütfen Vercel panelinden <b>Environment Variables</b> ayarlarınızı kontrol edin.
                        </p>
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-xs text-amber-700 space-y-2">
                            <p><b>Gereken Değişkenler:</b></p>
                            <ul className="list-disc list-inside opacity-80">
                                <li>NEXT_PUBLIC_SUPABASE_URL</li>
                                <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
                            </ul>
                        </div>
                    </div>
                </div>
            ) : children}
        </AuthContext.Provider>
    );
}
