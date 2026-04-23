'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

const DURATION_OPTIONS = [30, 45, 60, 90, 120];

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function todayLocal() {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

export default function StudentLessonsPage() {
    const { id } = useParams();
    const { profile } = useAuth();

    const [student, setStudent] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Ders ekleme formu
    const [showLessonForm, setShowLessonForm] = useState(false);
    const [lessonForm, setLessonForm] = useState({
        lesson_date: todayLocal(),
        duration_minutes: 60,
        subject: '',
        price: '',
    });
    const [lessonSaving, setLessonSaving] = useState(false);

    // Ödeme ekleme formu
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        payment_date: todayLocal(),
        amount: '',
        notes: '',
    });
    const [paymentSaving, setPaymentSaving] = useState(false);

    useEffect(() => {
        if (profile && id) fetchData();
    }, [profile, id]);

    const fetchData = async () => {
        setLoading(true);

        const { data: studentData } = await supabase
            .from('users')
            .select('id, name, email, phone, default_lesson_price')
            .eq('id', id)
            .single();
        setStudent(studentData);

        // Varsayılan fiyatı form'a uygula
        if (studentData?.default_lesson_price) {
            setLessonForm(prev => ({ ...prev, price: String(studentData.default_lesson_price) }));
        }

        const { data: lessonsData } = await supabase
            .from('private_lessons')
            .select('*')
            .eq('student_id', id)
            .eq('teacher_id', profile.id)
            .order('lesson_date', { ascending: false });
        setLessons(lessonsData || []);

        const { data: paymentsData } = await supabase
            .from('lesson_payments')
            .select('*')
            .eq('student_id', id)
            .eq('teacher_id', profile.id)
            .order('payment_date', { ascending: false });
        setPayments(paymentsData || []);

        setLoading(false);
    };

    const handleAddLesson = async () => {
        if (!lessonForm.lesson_date || !lessonForm.price) return;
        setLessonSaving(true);
        const { data, error } = await supabase
            .from('private_lessons')
            .insert([{
                teacher_id: profile.id,
                student_id: id,
                lesson_date: lessonForm.lesson_date,
                duration_minutes: lessonForm.duration_minutes,
                subject: lessonForm.subject.trim() || null,
                price: parseFloat(lessonForm.price),
            }])
            .select()
            .single();

        if (!error && data) {
            setLessons(prev => [data, ...prev].sort((a, b) => b.lesson_date.localeCompare(a.lesson_date)));
            setLessonForm({
                lesson_date: todayLocal(),
                duration_minutes: 60,
                subject: '',
                price: student?.default_lesson_price ? String(student.default_lesson_price) : '',
            });
            setShowLessonForm(false);
        } else if (error) {
            alert('Ders eklenemedi: ' + error.message);
        }
        setLessonSaving(false);
    };

    const handleAddPayment = async () => {
        if (!paymentForm.payment_date || !paymentForm.amount) return;
        setPaymentSaving(true);
        const { data, error } = await supabase
            .from('lesson_payments')
            .insert([{
                teacher_id: profile.id,
                student_id: id,
                payment_date: paymentForm.payment_date,
                amount: parseFloat(paymentForm.amount),
                notes: paymentForm.notes.trim() || null,
            }])
            .select()
            .single();

        if (!error && data) {
            setPayments(prev => [data, ...prev].sort((a, b) => b.payment_date.localeCompare(a.payment_date)));
            setPaymentForm({ payment_date: todayLocal(), amount: '', notes: '' });
            setShowPaymentForm(false);
        } else if (error) {
            alert('Ödeme eklenemedi: ' + error.message);
        }
        setPaymentSaving(false);
    };

    const handleDeleteLesson = async (lessonId) => {
        if (!confirm('Bu ders kaydını silmek istediğinizden emin misiniz?')) return;
        const { error } = await supabase.from('private_lessons').delete().eq('id', lessonId);
        if (!error) setLessons(prev => prev.filter(l => l.id !== lessonId));
    };

    const handleDeletePayment = async (paymentId) => {
        if (!confirm('Bu ödeme kaydını silmek istediğinizden emin misiniz?')) return;
        const { error } = await supabase.from('lesson_payments').delete().eq('id', paymentId);
        if (!error) setPayments(prev => prev.filter(p => p.id !== paymentId));
    };

    if (loading || !student) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-pulse text-gray-400">Yükleniyor...</div>
            </div>
        );
    }

    // Hesaplamalar
    const totalCharged = lessons.reduce((sum, l) => sum + Number(l.price), 0);
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = totalPaid - totalCharged; // pozitif = alacak, negatif = borç

    // Birleşik zaman çizelgesi (en yeni üstte)
    const timeline = [
        ...lessons.map(l => ({ ...l, _type: 'lesson' })),
        ...payments.map(p => ({ ...p, _type: 'payment' })),
    ].sort((a, b) => {
        const dateA = a._type === 'lesson' ? a.lesson_date : a.payment_date;
        const dateB = b._type === 'lesson' ? b.lesson_date : b.payment_date;
        return dateB.localeCompare(dateA);
    });

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Başlık */}
            <div className="flex items-center gap-3">
                <Link href={`/teacher/students/${id}`} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Ödeme Takibi</h1>
                    <p className="text-sm text-gray-400 mt-0.5">{student.name}</p>
                </div>
            </div>

            {/* Özet Kartlar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
                    <p className="text-2xl font-bold text-gray-900">{lessons.length}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Toplam Ders</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
                    <p className="text-2xl font-bold text-gray-700">
                        {totalCharged.toLocaleString('tr-TR')}₺
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Toplam Ücret</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
                    <p className="text-2xl font-bold text-emerald-600">
                        {totalPaid.toLocaleString('tr-TR')}₺
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Ödenen</p>
                </div>
                <div className={`rounded-xl border p-4 text-center shadow-sm ${
                    balance > 0
                        ? 'bg-emerald-50 border-emerald-100'
                        : balance < 0
                        ? 'bg-red-50 border-red-100'
                        : 'bg-white border-gray-100'
                }`}>
                    <p className={`text-2xl font-bold ${
                        balance > 0 ? 'text-emerald-600' : balance < 0 ? 'text-red-600' : 'text-gray-500'
                    }`}>
                        {balance > 0 ? '+' : ''}{balance.toLocaleString('tr-TR')}₺
                    </p>
                    <p className={`text-xs mt-0.5 ${
                        balance > 0 ? 'text-emerald-500' : balance < 0 ? 'text-red-500' : 'text-gray-400'
                    }`}>
                        {balance > 0 ? 'Alacak' : balance < 0 ? 'Kalan Borç' : 'Borç Yok'}
                    </p>
                </div>
            </div>

            {/* Aksiyon Butonları */}
            <div className="flex gap-3">
                <button
                    onClick={() => { setShowLessonForm(!showLessonForm); setShowPaymentForm(false); }}
                    className={`flex-1 py-2.5 text-sm font-semibold rounded-xl border transition-all ${
                        showLessonForm
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                    📚 {showLessonForm ? 'Formu Kapat' : 'Ders Ekle'}
                </button>
                <button
                    onClick={() => { setShowPaymentForm(!showPaymentForm); setShowLessonForm(false); }}
                    className={`flex-1 py-2.5 text-sm font-semibold rounded-xl border transition-all ${
                        showPaymentForm
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                    💰 {showPaymentForm ? 'Formu Kapat' : 'Ödeme Ekle'}
                </button>
            </div>

            {/* Ders Ekleme Formu */}
            {showLessonForm && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
                    <h2 className="text-sm font-bold text-gray-700">📚 Yeni Ders Kaydı</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Tarih</label>
                            <input
                                type="date"
                                value={lessonForm.lesson_date}
                                onChange={e => setLessonForm({ ...lessonForm, lesson_date: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Ücret (₺)</label>
                            <input
                                type="number" min="0" step="1"
                                value={lessonForm.price}
                                onChange={e => setLessonForm({ ...lessonForm, price: e.target.value })}
                                placeholder="0"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-gray-500 mb-2">Süre</label>
                            <div className="flex gap-2 flex-wrap">
                                {DURATION_OPTIONS.map(d => (
                                    <button
                                        key={d}
                                        type="button"
                                        onClick={() => setLessonForm({ ...lessonForm, duration_minutes: d })}
                                        className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                                            lessonForm.duration_minutes === d
                                                ? 'bg-gray-900 text-white border-gray-900'
                                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        {d} dk
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Konu Notu (opsiyonel)</label>
                            <input
                                type="text"
                                value={lessonForm.subject}
                                onChange={e => setLessonForm({ ...lessonForm, subject: e.target.value })}
                                placeholder="Örn: Türev, Integral..."
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setShowLessonForm(false)}
                            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            onClick={handleAddLesson}
                            disabled={lessonSaving || !lessonForm.lesson_date || !lessonForm.price}
                            className="px-6 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 active:scale-[0.97] transition-all disabled:opacity-40 shadow-sm"
                        >
                            {lessonSaving ? 'Kaydediliyor...' : '📚 Dersi Kaydet'}
                        </button>
                    </div>
                </div>
            )}

            {/* Ödeme Ekleme Formu */}
            {showPaymentForm && (
                <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm space-y-4">
                    <h2 className="text-sm font-bold text-gray-700">💰 Yeni Ödeme Kaydı</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Tarih</label>
                            <input
                                type="date"
                                value={paymentForm.payment_date}
                                onChange={e => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Tutar (₺)</label>
                            <input
                                type="number" min="0" step="1"
                                value={paymentForm.amount}
                                onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                placeholder="0"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all text-sm"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Not (opsiyonel)</label>
                            <input
                                type="text"
                                value={paymentForm.notes}
                                onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                placeholder="Örn: Nakit ödeme..."
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all text-sm"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setShowPaymentForm(false)}
                            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            onClick={handleAddPayment}
                            disabled={paymentSaving || !paymentForm.payment_date || !paymentForm.amount}
                            className="px-6 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 active:scale-[0.97] transition-all disabled:opacity-40 shadow-sm"
                        >
                            {paymentSaving ? 'Kaydediliyor...' : '💰 Ödemeyi Kaydet'}
                        </button>
                    </div>
                </div>
            )}

            {/* Zaman Çizelgesi */}
            {timeline.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center">
                    <p className="text-gray-400 text-sm">Henüz ders veya ödeme kaydı yok.</p>
                    <p className="text-gray-400 text-xs mt-1">Yukarıdaki butonları kullanarak eklemeye başlayın.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    <h2 className="text-sm font-bold text-gray-600 px-1">Kayıtlar</h2>
                    {timeline.map((item) => {
                        const isLesson = item._type === 'lesson';
                        return (
                            <div
                                key={`${item._type}_${item.id}`}
                                className={`group flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all ${
                                    isLesson
                                        ? 'bg-white border-gray-100 hover:border-gray-200'
                                        : 'bg-emerald-50/60 border-emerald-100 hover:border-emerald-200'
                                }`}
                            >
                                {/* İkon */}
                                <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-base ${
                                    isLesson ? 'bg-gray-100' : 'bg-emerald-100'
                                }`}>
                                    {isLesson ? '📚' : '💰'}
                                </div>

                                {/* İçerik */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-sm font-semibold ${isLesson ? 'text-gray-800' : 'text-emerald-700'}`}>
                                            {isLesson
                                                ? `${item.duration_minutes} dk ders`
                                                : `${Number(item.amount).toLocaleString('tr-TR')}₺ ödeme`}
                                        </span>
                                        {isLesson && item.subject && (
                                            <span className="text-xs text-gray-400 truncate">· {item.subject}</span>
                                        )}
                                        {!isLesson && item.notes && (
                                            <span className="text-xs text-gray-400 truncate">· {item.notes}</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {formatDate(isLesson ? item.lesson_date : item.payment_date)}
                                    </p>
                                </div>

                                {/* Tutar / Sil */}
                                <div className="shrink-0 flex items-center gap-3">
                                    {isLesson && (
                                        <span className="text-sm font-bold text-gray-700">
                                            {Number(item.price).toLocaleString('tr-TR')}₺
                                        </span>
                                    )}
                                    <button
                                        onClick={() => isLesson ? handleDeleteLesson(item.id) : handleDeletePayment(item.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                        title="Sil"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
