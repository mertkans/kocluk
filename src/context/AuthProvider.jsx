'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authTimeout, setAuthTimeout] = useState(false);

    useEffect(() => {
        if (!supabase) {
            console.error('Supabase client is not initialized. Check your environment variables.');
            setLoading(false);
            return;
        }

        // Mevcut oturumu kontrol et
        const getSession = async () => {
            try {
                // Güvenlik ağı: 8 saniyelik timeout
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('SUPABASE_TIMEOUT')), 8000)
                );

                const fetchLogic = async () => {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.user) {
                        setUser(session.user);
                        await fetchProfile(session.user.id);
                    }
                };

                await Promise.race([fetchLogic(), timeoutPromise]);

            } catch (err) {
                console.error('Error getting session:', err);
                if (err.message === 'SUPABASE_TIMEOUT') {
                    setAuthTimeout(true);
                }
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
            ) : authTimeout ? (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-red-100 text-center">
                        <div className="text-red-500 mb-4">
                            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Bağlantı Zaman Aşımı</h2>
                        <p className="text-gray-500 text-sm mb-6">
                            Veritabanına (Supabase) bağlanırken süre aşıldı. Ağ bağlantınızda bir sorun olabilir veya tarayıcınız <b>Ad Blocker / Gizlilik Eklentisi</b> nedeniyle Supabase isteklerini engelliyor olabilir.
                        </p>
                        <button 
                            onClick={() => window.location.reload()} 
                            className="px-6 py-2.5 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-colors"
                        >
                            Sayfayı Yenile
                        </button>
                        <p className="text-xs text-gray-400 mt-4 text-left">
                            <strong>İpucu:</strong> Gizli sekmede (Incognito) eklentiler kapalı olduğu için genelde sorunsuz çalışır.
                        </p>
                    </div>
                </div>
            ) : children}
        </AuthContext.Provider>
    );
}
