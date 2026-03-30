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

        // Mevcut oturumu kontrol et
        const getSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    setUser(session.user);
                    await fetchProfile(session.user.id);
                }
            } catch (err) {
                console.error('Error getting session:', err);
            } finally {
                setLoading(false);
            }
        };

        getSession();

        // Auth değişikliklerini dinle
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                try {
                    if (session?.user) {
                        setUser(session.user);
                        await fetchProfile(session.user.id);
                    } else {
                        setUser(null);
                        setProfile(null);
                    }
                } catch (err) {
                    console.error('Error on auth change:', err);
                } finally {
                    setLoading(false);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId) => {
        const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        setProfile(data);
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
                        <div className="text-red-600 mb-4 text-center">
                            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Yapılandırma Hatası</h2>
                        <p className="text-gray-500 text-center text-sm mb-6">
                            Supabase bağlantısı kurulamadı. Lütfen Vercel panelinden <b>Environment Variables</b> (URL ve Anon Key) ayarlarınızı kontrol edin.
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
