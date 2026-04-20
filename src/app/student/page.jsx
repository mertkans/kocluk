'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function StudentDashboard() {
    const { profile } = useAuth();
    const [assignments, setAssignments] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (profile) fetchData();
    }, [profile]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Bana atanan ödevleri çek
            const { data: asData, error: asError } = await supabase
                .from('assignment_students')
                .select('assignment_id, assignments(*)')
                .eq('student_id', profile.id);
            
            if (asError) throw asError;

            const assignmentList = (asData || []).map((a) => a.assignments).filter(Boolean);
            setAssignments(assignmentList);

            // Teslim ettiğim ödevleri çek
            const { data: subData, error: subError } = await supabase
                .from('submissions')
                .select('assignment_id, score')
                .eq('student_id', profile.id);
            
            if (subError) throw subError;

            setSubmissions(subData || []);
        } catch (err) {
            console.error('Öğrenci verisi çekme hatası:', err);
            setError(err.message || 'Ödevlerinizi yüklerken bir sorun oluştu.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <div className="animate-pulse text-gray-400">Veriler Yükleniyor... (Lütfen Bekleyin)</div>
                <button onClick={() => window.location.reload()} className="text-xs text-blue-500 underline mt-2">Takıldıysa sayfayı yenileyin</button>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto bg-red-50 border border-red-100 p-6 rounded-xl text-center">
                <h3 className="text-red-800 font-bold mb-2">Hata Oluştu</h3>
                <p className="text-red-600 text-sm mb-4">{error}</p>
                <button onClick={fetchData} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Tekrar Dene</button>
            </div>
        );
    }

    const submittedIds = new Set(submissions.map((s) => s.assignment_id));
    const pending = assignments.filter((a) => !submittedIds.has(a.id));
    const completed = assignments.filter((a) => submittedIds.has(a.id));

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">📋 Ödevlerim</h1>

            {/* İstatistik */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{assignments.length}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Toplam</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">{pending.length}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Bekleyen</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{completed.length}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Tamamlanan</p>
                </div>
            </div>

            {/* Bekleyen Ödevler */}
            {pending.length > 0 && (
                <div>
                    <h2 className="text-base font-bold text-gray-800 mb-3">⏳ Bekleyen Ödevler</h2>
                    <div className="space-y-2">
                        {pending.map((a) => (
                            <Link
                                key={a.id}
                                href={`/student/assignments/${a.id}`}
                                className="flex items-center justify-between bg-white rounded-xl px-4 py-3.5 border border-amber-100 hover:border-amber-200 hover:shadow-sm transition-all group"
                            >
                                <div>
                                    <p className="font-medium text-gray-800 text-sm group-hover:text-blue-700 transition-colors">
                                        {a.title}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {a.tests && Array.isArray(a.tests) && a.tests.length > 1
                                            ? `${a.tests.length} test · ${a.tests.reduce((sum, t) => sum + (t.question_count || 0), 0)} soru`
                                            : `${a.question_count} soru · ${a.option_count} şık`}
                                    </p>
                                </div>
                                <span className="shrink-0 ml-3 px-3 py-1.5 bg-amber-50 text-amber-600 text-xs font-semibold rounded-full">
                                    Çöz →
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Tamamlanan Ödevler */}
            {completed.length > 0 && (
                <div>
                    <h2 className="text-base font-bold text-gray-800 mb-3">✅ Tamamlanan Ödevler</h2>
                    <div className="space-y-2">
                        {completed.map((a) => {
                            const sub = submissions.find((s) => s.assignment_id === a.id);
                            return (
                                <Link
                                    key={a.id}
                                    href={`/student/assignments/${a.id}`}
                                    className="flex items-center justify-between bg-white rounded-xl px-4 py-3.5 border border-gray-100 hover:shadow-sm transition-all group"
                                >
                                    <div>
                                        <p className="font-medium text-gray-800 text-sm group-hover:text-blue-700 transition-colors">
                                            {a.title}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {a.tests && Array.isArray(a.tests) && a.tests.length > 1
                                                ? `${a.tests.length} test · ${a.tests.reduce((sum, t) => sum + (t.question_count || 0), 0)} soru`
                                                : `${a.question_count} soru · ${a.option_count} şık`}
                                        </p>
                                    </div>
                                    <div className="shrink-0 ml-3 text-right">
                                        <div className={`text-sm font-bold ${sub?.score?.percentage >= 70 ? 'text-emerald-600' :
                                                sub?.score?.percentage >= 40 ? 'text-amber-600' : 'text-red-600'
                                            }`}>
                                            %{sub?.score?.percentage || 0}
                                        </div>
                                        <p className="text-xs text-gray-400">
                                            {sub?.score?.correct}D / {sub?.score?.incorrect}Y
                                        </p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            {assignments.length === 0 && (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm">
                    Henüz size atanmış ödev bulunmuyor.
                </div>
            )}
        </div>
    );
}
