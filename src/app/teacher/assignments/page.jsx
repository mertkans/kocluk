'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function AssignmentsListPage() {
    const { profile } = useAuth();
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);

    useEffect(() => {
        if (profile) fetchAssignments();
    }, [profile]);

    const fetchAssignments = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('assignments')
            .select('*, assignment_students(student_id), submissions(id, score)')
            .eq('teacher_id', profile.id)
            .order('created_at', { ascending: false });
        setAssignments(data || []);
        setLoading(false);
    };

    const openDeleteConfirm = (e, assignment) => {
        e.preventDefault();
        e.stopPropagation();
        setConfirmDelete(assignment);
    };

    const executeDelete = async () => {
        if (!confirmDelete) return;
        const assignment = confirmDelete;
        setConfirmDelete(null);
        setDeleting(assignment.id);

        const { error } = await supabase
            .from('assignments')
            .delete()
            .eq('id', assignment.id);

        if (error) {
            console.error('Silme hatası:', error);
            alert('Silme hatası: ' + error.message);
        } else {
            setAssignments((prev) => prev.filter((a) => a.id !== assignment.id));
        }
        setDeleting(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-pulse text-gray-400">Yükleniyor...</div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-900">📋 Ödevlerim</h1>
                <Link
                    href="/teacher/assignments/new"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 text-white font-semibold rounded-xl shadow-sm hover:bg-gray-800 active:scale-[0.98] transition-all text-sm"
                >
                    ➕ Yeni Ödev Oluştur
                </Link>
            </div>

            {assignments.length === 0 ? (
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
                <div className="space-y-3">
                    {assignments.map((a) => {
                        const assignedCount = a.assignment_students?.length || 0;
                        const submittedCount = a.submissions?.length || 0;
                        const avgScore = submittedCount > 0
                            ? Math.round(
                                a.submissions.reduce((acc, s) => acc + (s.score?.percentage || 0), 0) / submittedCount
                            )
                            : null;
                        const isDeleting = deleting === a.id;

                        return (
                            <div
                                key={a.id}
                                className={`bg-white rounded-xl border border-gray-100 overflow-hidden transition-all ${
                                    isDeleting ? 'opacity-50 pointer-events-none' : ''
                                }`}
                            >
                                {/* Üst kısım — Tıklanabilir detay */}
                                <Link
                                    href={`/teacher/assignments/${a.id}`}
                                    className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-all group"
                                >
                                    <div className="min-w-0 flex items-center gap-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-gray-800 text-sm group-hover:text-blue-700 transition-colors">
                                                    {a.title}
                                                </p>
                                                {a.due_date && new Date(a.due_date) < new Date() && (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wide">
                                                        Süresi Doldu
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {a.tests && Array.isArray(a.tests) && a.tests.length > 1
                                                    ? `${a.tests.length} test · ${a.tests.reduce((sum, t) => sum + (t.question_count || 0), 0)} soru`
                                                    : `${a.question_count} soru · ${a.option_count} şık`}
                                                {a.due_date ? ` · Son Teslim: ${new Date(a.due_date).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}` : ` · Oluşturulma: ${new Date(a.created_at).toLocaleDateString('tr-TR')}`}
                                            </p>
                                        </div>
                                    </div>
                                    <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-500 shrink-0 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </Link>

                                {/* Alt kısım — İstatistikler + Aksiyonlar */}
                                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50 bg-gray-50/50">
                                    {/* Mini İstatistikler */}
                                    <div className="flex items-center gap-4 text-xs">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-gray-400">Atanan:</span>
                                            <span className="font-semibold text-gray-700">{assignedCount}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-gray-400">Teslim:</span>
                                            <span className="font-semibold text-emerald-600">{submittedCount}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-gray-400">Bekleyen:</span>
                                            <span className="font-semibold text-amber-600">{assignedCount - submittedCount}</span>
                                        </div>
                                        {avgScore !== null && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-gray-400">Ort:</span>
                                                <span className={`font-semibold ${
                                                    avgScore >= 70 ? 'text-emerald-600' :
                                                    avgScore >= 40 ? 'text-amber-600' : 'text-red-600'
                                                }`}>
                                                    %{avgScore}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Aksiyonlar */}
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Link
                                            href={`/teacher/assignments/${a.id}`}
                                            className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-all"
                                            title="İstatistikleri Gör"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                        </Link>
                                        <Link
                                            href={`/teacher/assignments/${a.id}/edit`}
                                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
                                            title="Düzenle"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </Link>
                                        <button
                                            onClick={(e) => openDeleteConfirm(e, a)}
                                            disabled={isDeleting}
                                            className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all disabled:opacity-50"
                                            title="Sil"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Silme Onay Modalı */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setConfirmDelete(null)}
                    />
                    <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in">
                        <div className="text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Ödevi Sil</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                <strong>&ldquo;{confirmDelete.title}&rdquo;</strong> ödevini silmek istediğinize emin misiniz?
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                                Bu işlem geri alınamaz. İlgili tüm öğrenci atamaları ve teslimler de silinecektir.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all"
                            >
                                İptal
                            </button>
                            <button
                                onClick={executeDelete}
                                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all"
                            >
                                🗑️ Evet, Sil
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
