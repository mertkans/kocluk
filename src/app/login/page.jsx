'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (!supabase) {
                throw new Error('Supabase bağlantısı yapılandırılmamış. .env.local dosyasını kontrol edin.');
            }

            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            // Kullanıcının rolünü çek
            const userId = authData.user.id;
            console.log('Auth başarılı, user id:', userId);

            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('role')
                .eq('id', userId)
                .single();

            console.log('Users sorgusu:', { userData, userError });

            if (userError) {
                throw new Error(
                    `Profil bulunamadı. Auth UUID: ${userId} — Lütfen Supabase "users" tablosundaki "id" sütununda bu UUID'nin olduğundan emin olun. (Hata: ${userError.code})`
                );
            }

            // Rol bazlı yönlendirme
            const routes = {
                admin: '/admin',
                teacher: '/teacher',
                student: '/student',
            };
            window.location.href = routes[userData.role] || '/';
        } catch (err) {
            console.error('Login hatası:', err);
            setError(
                err.message === 'Invalid login credentials'
                    ? 'Email veya şifre hatalı.'
                    : err.message
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-gray-50 to-blue-50">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">📚 ÖdevTakip</h1>
                    <p className="text-gray-400 text-sm mt-1">Optik Form Tabanlı Ödev Sistemi</p>
                </div>

                {/* Form */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
                    <h2 className="text-lg font-bold text-gray-800 mb-5">Giriş Yap</h2>

                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="ornek@email.com"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">Şifre</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-gray-900 text-white font-semibold rounded-xl shadow-sm hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                        </button>
                    </form>

                    <div className="mt-5 pt-4 border-t border-gray-50 text-center">
                        <p className="text-sm text-gray-400">
                            Öğretmen misiniz?{' '}
                            <Link href="/register" className="text-blue-600 font-medium hover:underline">
                                Kayıt Olun
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
