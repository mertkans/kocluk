'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function TeacherClassesPage() {
    const { profile } = useAuth();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [className, setClassName] = useState('');
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(null);

    useEffect(() => {
        if (profile) fetchClasses();
    }, [profile]);

    const fetchClasses = async () => {
        setLoading(true);

        // Sınıfları çek
        const { data: classData } = await supabase
            .from('classes')
            .select('*')
            .eq('teacher_id', profile.id)
            .order('created_at', { ascending: false });

        if (!classData || classData.length === 0) {
            setClasses([]);
            setLoading(false);
            return;
        }

        // Öğrencileri çek (sınıflara bağlı)
        const { data: students } = await supabase
            .from('users')
            .select('id, class_id')
            .eq('role', 'student')
            .eq('created_by', profile.id);

        // Submission'ları çek (istatistik için)
        const studentIds = (students || []).map(s => s.id);
        let submissions = [];
        if (studentIds.length > 0) {
            const { data: subData } = await supabase
                .from('submissions')
                .select('student_id, score')
                .in('student_id', studentIds);
            submissions = subData || [];
        }

        // Her sınıf için istatistik hesapla
        const enriched = classData.map(cls => {
            const classStudents = (students || []).filter(s => s.class_id === cls.id);
            const classStudentIds = classStudents.map(s => s.id);
            const classSubs = submissions.filter(sub => classStudentIds.includes(sub.student_id));

            let totalPercent = 0;
            let subCount = 0;
            for (const sub of classSubs) {
                if (sub.score?.percentage != null) {
                    totalPercent += sub.score.percentage;
                    subCount++;
                }
            }

            return {
                ...cls,
                studentCount: classStudents.length,
                avgPercent: subCount > 0 ? Math.round(totalPercent / subCount) : null,
                submissionCount: subCount,
            };
        });

        setClasses(enriched);
        setLoading(false);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!className.trim()) return;
        setFormError('');
        setFormLoading(true);

        const { error } = await supabase
            .from('classes')
            .insert([{ teacher_id: profile.id, name: className.trim() }]);

        if (error) {
            if (error.message?.includes('duplicate') || error.code === '23505') {
                setFormError('Bu isimde bir sınıf zaten var.');
            } else {
                setFormError(error.message);
            }
        } else {
            setClassName('');
            setShowForm(false);
            fetchClasses();
        }
        setFormLoading(false);
    };

    const executeDelete = async () => {
        if (!confirmDelete) return;
        const cls = confirmDelete;
        setConfirmDelete(null);
        setDeleting(cls.id);

        // Sınıfa bağlı öğrencilerin class_id'sini null yap
        await supabase
            .from('users')
            .update({ class_id: null })
            .eq('class_id', cls.id);

        const { error } = await supabase
            .from('classes')
            .delete()
            .eq('id', cls.id);

        if (error) {
            alert('Silme hatası: ' + error.message);
        } else {
            fetchClasses();
        }
        setDeleting(null);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-900">🏫 Sınıflarım</h1>
                <button
                    onClick={() => { setShowForm(!showForm); setFormError(''); }}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 text-white font-semibold rounded-xl shadow-sm hover:bg-gray-800 active:scale-[0.98] transition-all text-sm"
                >
                    {showForm ? '✕ İptal' : '➕ Sınıf Ekle'}
                </button>
            </div>

            {/* Sınıf Ekleme Formu */}
            {showForm && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm">
                    <h2 className="text-base font-bold text-gray-800 mb-4">Yeni Sınıf</h2>

                    {formError && (
                        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">{formError}</div>
                    )}

                    <form onSubmit={handleCreate} className="flex gap-3">
                        <input
                            type="text"
                            required
                            value={className}
                            onChange={(e) => setClassName(e.target.value)}
                            placeholder="Örn: 12-A, 11-MF, Matematik Grubu"
                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                        />
                        <button
                            type="submit"
                            disabled={formLoading}
                            className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl shadow-sm hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 text-sm whitespace-nowrap"
                        >
                            {formLoading ? '...' : 'Oluştur'}
                        </button>
                    </form>
                </div>
            )}

            {/* Sınıf Listesi */}
            {loading ? (
                <div className="flex items-center justify-center h-32">
                    <div className="animate-pulse text-gray-400">Yükleniyor...</div>
                </div>
            ) : classes.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm">
                    Henüz sınıf oluşturmadınız. Yukarıdaki butona tıklayarak başlayın.
                </div>
            ) : (
                <div className="grid gap-3">
                    {classes.map((cls) => {
                        const isDeleting = deleting === cls.id;
                        return (
                            <div
                                key={cls.id}
                                className={`bg-white rounded-xl border border-gray-100 overflow-hidden group transition-all hover:shadow-sm ${
                                    isDeleting ? 'opacity-50 pointer-events-none' : ''
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <Link
                                        href={`/teacher/classes/${cls.id}`}
                                        className="flex-1 flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-all min-w-0"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                                            {cls.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-gray-800 text-sm group-hover:text-blue-700 transition-colors truncate">
                                                {cls.name}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {cls.studentCount} öğrenci
                                                {cls.submissionCount > 0 && ` · ${cls.submissionCount} teslim`}
                                            </p>
                                        </div>
                                        {cls.avgPercent != null && (
                                            <div className={`text-right shrink-0 ${
                                                cls.avgPercent >= 70 ? 'text-emerald-600' :
                                                cls.avgPercent >= 40 ? 'text-amber-600' : 'text-red-600'
                                            }`}>
                                                <p className="text-lg font-bold">%{cls.avgPercent}</p>
                                                <p className="text-xs text-gray-400">ortalama</p>
                                            </div>
                                        )}
                                    </Link>
                                    <div className="flex items-center gap-1 pr-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(cls); }}
                                            disabled={isDeleting}
                                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all"
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
                    <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
                        <div className="text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Sınıfı Sil</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                <strong>&ldquo;{confirmDelete.name}&rdquo;</strong> sınıfını silmek istediğinize emin misiniz?
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                                Sınıftaki öğrenciler silinmez, sadece sınıf atamaları kaldırılır.
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
