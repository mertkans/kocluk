'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function TeacherStudentsPage() {
    const { profile } = useAuth();
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', classId: '', defaultLessonPrice: '' });
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [createdStudent, setCreatedStudent] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(null);

    useEffect(() => {
        if (profile) {
            fetchStudents();
            fetchClasses();
        }
    }, [profile]);

    const fetchStudents = async () => {
        setLoading(true);
        // Önce classes join ile dene, hata olursa sadece users çek
        let { data, error } = await supabase
            .from('users')
            .select('*, classes(name)')
            .eq('role', 'student')
            .eq('created_by', profile.id)
            .order('created_at', { ascending: false });

        if (error) {
            // classes tablosu yoksa join'siz dene
            const res = await supabase
                .from('users')
                .select('*')
                .eq('role', 'student')
                .eq('created_by', profile.id)
                .order('created_at', { ascending: false });
            data = res.data;
        }
        setStudents(data || []);
        setLoading(false);
    };

    const fetchClasses = async () => {
        const { data, error } = await supabase
            .from('classes')
            .select('id, name')
            .eq('teacher_id', profile.id)
            .order('name');
        if (!error) setClasses(data || []);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormLoading(true);
        setCreatedStudent(null);

        if (!formData.classId) {
            setFormError('Lütfen bir sınıf seçin.');
            setFormLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/students/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, teacherId: profile.id }),
            });
            const data = await res.json();

            if (data.success) {
                setCreatedStudent(data.student);
                setFormData({ name: '', email: '', phone: '', classId: '', defaultLessonPrice: '' });
                fetchStudents();
            } else {
                setFormError(data.error);
            }
        } catch {
            setFormError('Bir hata oluştu.');
        }
        setFormLoading(false);
    };

    const executeDelete = async () => {
        if (!confirmDelete) return;
        const student = confirmDelete;
        setConfirmDelete(null);
        setDeleting(student.id);

        try {
            const res = await fetch('/api/admin/delete-user', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: student.id }),
            });
            const data = await res.json();

            if (data.success) {
                setStudents((prev) => prev.filter((s) => s.id !== student.id));
            } else {
                alert('Silme hatası: ' + (data.error || 'Bilinmeyen hata'));
            }
        } catch {
            alert('Bir hata oluştu.');
        }
        setDeleting(null);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-900">👨‍🎓 Öğrencilerim</h1>
                <button
                    onClick={() => { setShowForm(!showForm); setCreatedStudent(null); setFormError(''); }}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 text-white font-semibold rounded-xl shadow-sm hover:bg-gray-800 active:scale-[0.98] transition-all text-sm"
                >
                    {showForm ? '✕ İptal' : '➕ Öğrenci Ekle'}
                </button>
            </div>

            {/* Öğrenci Ekleme Formu */}
            {showForm && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm">
                    <h2 className="text-base font-bold text-gray-800 mb-4">Yeni Öğrenci Kaydı</h2>

                    {formError && (
                        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">{formError}</div>
                    )}

                    {createdStudent && (
                        <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                            <p className="text-emerald-800 font-semibold text-sm mb-2">✅ Öğrenci başarıyla oluşturuldu!</p>
                            <div className="bg-white rounded-lg p-3 text-sm space-y-1 border border-emerald-100">
                                <p><span className="text-gray-500">Ad Soyad:</span> <span className="font-medium">{createdStudent.name}</span></p>
                                <p><span className="text-gray-500">Email:</span> <span className="font-medium">{createdStudent.email}</span></p>
                                <p><span className="text-gray-500">Şifre:</span> <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{createdStudent.password}</span></p>
                            </div>
                            <p className="text-xs text-emerald-600 mt-2">⚠️ Bu şifreyi öğrenciye iletin. Daha sonra öğrenci detay sayfasından tekrar görebilirsiniz.</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-600 mb-1">Ad Soyad *</label>
                            <input type="text" required value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Öğrenci adı soyadı"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Email *</label>
                            <input type="email" required value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="ogrenci@email.com"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Telefon</label>
                            <input type="tel" value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="05XX XXX XX XX"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Sınıf *</label>
                            {classes.length === 0 ? (
                                <div className="px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-700">
                                    Önce <Link href="/teacher/classes" className="underline font-semibold">bir sınıf oluşturun</Link>.
                                </div>
                            ) : (
                                <select
                                    required
                                    value={formData.classId}
                                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm bg-white"
                                >
                                    <option value="">Sınıf seçin...</option>
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Varsayılan Ders Ücreti (₺)</label>
                            <input type="number" min="0" step="1" value={formData.defaultLessonPrice}
                                onChange={(e) => setFormData({ ...formData, defaultLessonPrice: e.target.value })}
                                placeholder="Örn: 500"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <button type="submit" disabled={formLoading || classes.length === 0}
                                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-sm hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 text-sm"
                            >
                                {formLoading ? 'Oluşturuluyor...' : '👨‍🎓 Öğrenciyi Kaydet'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Öğrenci Listesi */}
            {loading ? (
                <div className="flex items-center justify-center h-32">
                    <div className="animate-pulse text-gray-400">Yükleniyor...</div>
                </div>
            ) : students.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm">
                    Henüz öğrenci eklemediniz.
                </div>
            ) : (
                <div className="space-y-2">
                    {students.map((s) => {
                        const isDeleting = deleting === s.id;
                        const className = s.classes?.name;
                        return (
                            <div
                                key={s.id}
                                className={`bg-white rounded-xl border border-gray-100 overflow-hidden group ${
                                    isDeleting ? 'opacity-50 pointer-events-none' : ''
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <Link
                                        href={`/teacher/students/${s.id}`}
                                        className="flex-1 flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-all min-w-0"
                                    >
                                        <div className="min-w-0">
                                            <p className="font-medium text-gray-800 text-sm truncate group-hover:text-blue-700 transition-colors">{s.name}</p>
                                            <p className="text-xs text-gray-400 mt-0.5 truncate">
                                                {className && <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-semibold mr-1.5">{className}</span>}
                                                {s.email}{s.phone && ` · ${s.phone}`}
                                            </p>
                                        </div>
                                    </Link>
                                    <div className="flex items-center gap-1 pr-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Link
                                            href={`/teacher/students/${s.id}`}
                                            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-all"
                                            title="İstatistikler"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                        </Link>
                                        <button
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(s); }}
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
                            <h3 className="text-lg font-bold text-gray-900">Öğrenciyi Sil</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                <strong>&ldquo;{confirmDelete.name}&rdquo;</strong> öğrencisini silmek istediğinize emin misiniz?
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                                Bu işlem geri alınamaz. Öğrencinin tüm ödev teslimleri de silinecektir.
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
