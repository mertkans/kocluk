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
        <div className="relative min-h-screen bg-[#070913] flex items-center justify-center px-4 overflow-hidden font-sans select-none">
            {/* Dynamic Mesh Gradient Glowing Orbs */}
            <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-indigo-600/20 blur-[100px] animate-float-1 pointer-events-none" />
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-violet-600/25 blur-[120px] animate-float-2 pointer-events-none" />
            <div className="absolute top-1/2 left-1/3 w-72 h-72 rounded-full bg-cyan-600/15 blur-[90px] animate-float-3 pointer-events-none" />
            
            {/* Ambient Overlay Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

            <div className="w-full max-w-md z-10 relative">
                {/* Logo and Branding Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-slate-900/50 border border-slate-800/80 mb-4 shadow-inner shadow-slate-950/50 backdrop-blur-md hover:scale-105 transition-all duration-300">
                        <span className="text-4xl">🎓</span>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center justify-center gap-1.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                        <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent font-black tracking-tighter">
                            ozel.dersi.tr
                        </span>
                    </h1>
                    <p className="text-slate-400 text-sm font-medium mt-2 max-w-xs mx-auto leading-relaxed">
                        Sizi en iyi anlayan öğretmenle aranızdaki en kısa yol
                    </p>
                </div>

                {/* Form Container (Glass Card) */}
                <div className="bg-slate-900/40 backdrop-blur-2xl rounded-3xl border border-slate-800/60 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.4)] relative overflow-hidden">
                    {/* Glowing card border subtle light effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none rounded-3xl" />
                    
                    <h2 className="text-2xl font-bold text-white mb-6">Giriş Yap</h2>

                    {error && (
                        <div className="mb-5 p-4 rounded-xl bg-red-950/30 border border-red-800/40 text-red-300 text-sm backdrop-blur-md animate-slide-in flex items-start gap-3">
                            {/* Alert SVG Icon */}
                            <svg className="w-5 h-5 shrink-0 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Email Input */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">E-posta Adresi</label>
                            <div className="relative rounded-xl border border-slate-800 bg-slate-950/40 transition-all duration-300 focus-within:border-cyan-500/80 focus-within:ring-2 focus-within:ring-cyan-500/10">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                                    {/* Mail SVG Icon */}
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="ornek@email.com"
                                    className="w-full pl-12 pr-4 py-3.5 bg-transparent text-white placeholder-slate-600 border-none outline-none text-sm rounded-xl focus:ring-0 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Şifre</label>
                            </div>
                            <div className="relative rounded-xl border border-slate-800 bg-slate-950/40 transition-all duration-300 focus-within:border-cyan-500/80 focus-within:ring-2 focus-within:ring-cyan-500/10">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                                    {/* Lock SVG Icon */}
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className="w-full pl-12 pr-4 py-3.5 bg-transparent text-white placeholder-slate-600 border-none outline-none text-sm rounded-xl focus:ring-0 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/10 active:scale-[0.98] hover:shadow-cyan-500/15 transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.01] cursor-pointer disabled:opacity-40 disabled:pointer-events-none text-sm"
                        >
                            {loading ? (
                                <>
                                    {/* Spinner SVG */}
                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>Giriş yapılıyor...</span>
                                </>
                            ) : (
                                <span>Giriş Yap</span>
                            )}
                        </button>
                    </form>

                    {/* Switch to Register Page */}
                    <div className="mt-6 pt-5 border-t border-slate-800/40 text-center">
                        <p className="text-sm text-slate-400">
                            Öğretmen misiniz?{' '}
                            <Link href="/register" className="text-cyan-400 font-semibold hover:text-cyan-300 hover:underline transition-colors ml-1">
                                Kayıt Olun
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

