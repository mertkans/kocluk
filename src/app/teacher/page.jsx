'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function TeacherDashboard() {
    const { profile } = useAuth();
    const [stats, setStats] = useState({ studentCount: 0, assignmentCount: 0, submissionCount: 0 });
    const [recentAssignments, setRecentAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!profile) return;
        fetchData();
    }, [profile]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Ödevleri çek (son 5 tanesi)
            const { data: assignmentsData, error: aError } = await supabase
                .from('assignments')
                .select('*, assignment_students(student_id), submissions(id)')
                .eq('teacher_id', profile.id)
                .order('created_at', { ascending: false })
                .limit(5);

            if (aError) throw aError;

            const allAssignments = assignmentsData || [];
            setRecentAssignments(allAssignments);

            // Toplam ödev sayısı
            const { count: assignmentCount, error: countError } = await supabase
                .from('assignments')
                .select('*', { count: 'exact', head: true })
                .eq('teacher_id', profile.id);
            
            if (countError) throw countError;

            // Öğrenci sayısını çek
            const { count: studentCount, error: sCountError } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'student')
                .eq('created_by', profile.id);
            
            if (sCountError) throw sCountError;

            // Toplam teslim sayısı
            const totalSubmissions = allAssignments.reduce((acc, a) => acc + (a.submissions?.length || 0), 0);

            setStats({
                studentCount: studentCount || 0,
                assignmentCount: assignmentCount || 0,
                submissionCount: totalSubmissions,
            });
        } catch (err) {
            console.error('Veri çekme hatası:', err);
            setError(err.message || 'Veritabanına bağlanılamadı');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <div className="animate-pulse text-gray-400">Veriler Yükleniyor... (Lütfen Bekleyin)</div>
                {/* 10 saniye sonrası için fallback */}
                <button onClick={() => window.location.reload()} className="text-xs text-blue-500 underline mt-2">Takıldıysa sayfayı yenileyin</button>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-100 p-6 rounded-xl text-center">
                <h3 className="text-red-800 font-bold mb-2">Hata Oluştu</h3>
                <p className="text-red-600 text-sm mb-4">{error}</p>
                <button onClick={fetchData} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Tekrar Dene</button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-900">📊 Dashboard</h1>
                <Link
                    href="/teacher/assignments/new"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 text-white font-semibold rounded-xl shadow-sm hover:bg-gray-800 active:scale-[0.98] transition-all text-sm"
                >
                    ➕ Yeni Ödev Oluştur
                </Link>
            </div>

            {/* İstatistik Kartları */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Öğrencilerim</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.studentCount}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Ödevlerim</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.assignmentCount}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5 col-span-2 sm:col-span-1">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Toplam Gönderim</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.submissionCount}</p>
                </div>
            </div>

            {/* Son Ödevler */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-gray-800">📋 Son Ödevler</h2>
                    {stats.assignmentCount > 0 && (
                        <Link
                            href="/teacher/assignments"
                            className="text-sm text-blue-600 font-medium hover:underline"
                        >
                            Tümünü gör →
                        </Link>
                    )}
                </div>
                {recentAssignments.length === 0 ? (
                    <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center">
                        <p className="text-gray-400 text-sm">Henüz ödev oluşturmadınız.</p>
                        <Link
                            href="/teacher/assignments/new"
                            className="inline-block mt-3 text-blue-600 font-medium text-sm hover:underline"
                        >
                            İlk ödevinizi oluşturun →
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {recentAssignments.map((a) => {
                            const assignedCount = a.assignment_students?.length || 0;
                            const submittedCount = a.submissions?.length || 0;
                            return (
                                <Link
                                    key={a.id}
                                    href={`/teacher/assignments/${a.id}`}
                                    className="flex items-center justify-between bg-white rounded-xl px-4 py-3.5 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group"
                                >
                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-800 text-sm group-hover:text-blue-700 transition-colors">
                                            {a.title}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {a.question_count} soru · {assignedCount} öğrenci
                                        </p>
                                    </div>
                                    <div className="ml-3 shrink-0 text-right">
                                        <div className="text-sm font-bold text-gray-800">
                                            {submittedCount}/{assignedCount}
                                        </div>
                                        <div className="text-xs text-gray-400">teslim</div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
