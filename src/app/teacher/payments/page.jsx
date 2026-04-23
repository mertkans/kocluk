'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function PaymentsOverviewPage() {
    const { profile } = useAuth();
    const [rows, setRows] = useState([]);   // her öğrenci için hesaplanmış veri
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (profile) fetchData();
    }, [profile]);

    const fetchData = async () => {
        setLoading(true);

        // Öğrencileri çek
        const { data: students } = await supabase
            .from('users')
            .select('id, name, default_lesson_price')
            .eq('role', 'student')
            .eq('created_by', profile.id)
            .order('name');

        if (!students || students.length === 0) {
            setRows([]);
            setLoading(false);
            return;
        }

        const studentIds = students.map(s => s.id);

        // Tüm ders kayıtlarını çek
        const { data: lessons } = await supabase
            .from('private_lessons')
            .select('student_id, price')
            .eq('teacher_id', profile.id)
            .in('student_id', studentIds);

        // Tüm ödemeleri çek
        const { data: payments } = await supabase
            .from('lesson_payments')
            .select('student_id, amount')
            .eq('teacher_id', profile.id)
            .in('student_id', studentIds);

        // Öğrenci bazlı grupla
        const computed = students.map(student => {
            const studentLessons = (lessons || []).filter(l => l.student_id === student.id);
            const studentPayments = (payments || []).filter(p => p.student_id === student.id);

            const totalCharged = studentLessons.reduce((s, l) => s + Number(l.price), 0);
            const totalPaid = studentPayments.reduce((s, p) => s + Number(p.amount), 0);
            const balance = totalPaid - totalCharged; // negatif = borç, pozitif = alacak
            const lessonCount = studentLessons.length;

            return {
                ...student,
                lessonCount,
                totalCharged,
                totalPaid,
                balance,
            };
        }).filter(s => s.lessonCount > 0 || s.totalPaid > 0); // hiç kaydı olmayanları gizle

        setRows(computed);
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-pulse text-gray-400">Yükleniyor...</div>
            </div>
        );
    }

    // Genel toplamlar
    const totalLessons = rows.reduce((s, r) => s + r.lessonCount, 0);
    const totalCharged = rows.reduce((s, r) => s + r.totalCharged, 0);
    const totalPaid = rows.reduce((s, r) => s + r.totalPaid, 0);
    const totalDebt = rows.reduce((s, r) => s + Math.max(0, -r.balance), 0); // sadece borçlar
    const debtorCount = rows.filter(r => r.balance < 0).length;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">💰 Ödeme Takibi</h1>
                <p className="text-sm text-gray-400 mt-0.5">Tüm öğrencilerin ders ve ödeme özeti</p>
            </div>

            {/* Genel Özet Kartlar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
                    <p className="text-2xl font-bold text-gray-900">{totalLessons}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Toplam Ders</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
                    <p className="text-2xl font-bold text-gray-700">{totalCharged.toLocaleString('tr-TR')}₺</p>
                    <p className="text-xs text-gray-400 mt-0.5">Toplam Ücret</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
                    <p className="text-2xl font-bold text-emerald-600">{totalPaid.toLocaleString('tr-TR')}₺</p>
                    <p className="text-xs text-gray-400 mt-0.5">Toplam Ödenen</p>
                </div>
                <div className={`rounded-xl border p-4 text-center shadow-sm ${totalDebt > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
                    <p className={`text-2xl font-bold ${totalDebt > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                        {totalDebt.toLocaleString('tr-TR')}₺
                    </p>
                    <p className={`text-xs mt-0.5 ${totalDebt > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        Ödenmemiş{debtorCount > 0 ? ` (${debtorCount} öğrenci)` : ''}
                    </p>
                </div>
            </div>

            {/* Öğrenci Listesi */}
            {rows.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
                    <p className="text-gray-400 text-sm">Henüz ders kaydı girilmemiş.</p>
                    <p className="text-gray-400 text-xs mt-1">
                        Öğrenci profillerine giderek ders ve ödeme ekleyin.
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">Öğrenciler</h2>

                    {/* Borçlular önce, sonra alacaklılar/eşitler */}
                    {[...rows].sort((a, b) => a.balance - b.balance).map(student => {
                        const hasDebt = student.balance < 0;
                        const hasCredit = student.balance > 0;
                        return (
                            <Link
                                key={student.id}
                                href={`/teacher/students/${student.id}/lessons`}
                                className={`flex items-center justify-between px-4 py-4 rounded-xl border transition-all hover:shadow-md group ${
                                    hasDebt
                                        ? 'bg-white border-red-100 hover:border-red-200'
                                        : hasCredit
                                        ? 'bg-emerald-50/40 border-emerald-100 hover:border-emerald-200'
                                        : 'bg-white border-gray-100 hover:border-gray-200'
                                }`}
                            >
                                {/* Sol: isim + ders sayısı */}
                                <div className="min-w-0">
                                    <p className="font-semibold text-gray-800 text-sm group-hover:text-blue-700 transition-colors truncate">
                                        {student.name}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                                        <span className="text-xs text-gray-400">
                                            📚 {student.lessonCount} ders
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            Toplam: {student.totalCharged.toLocaleString('tr-TR')}₺
                                        </span>
                                        <span className="text-xs text-emerald-600">
                                            Ödenen: {student.totalPaid.toLocaleString('tr-TR')}₺
                                        </span>
                                    </div>
                                </div>

                                {/* Sağ: bakiye */}
                                <div className="shrink-0 ml-4 text-right">
                                    <p className={`text-base font-black ${
                                        hasDebt ? 'text-red-600' : hasCredit ? 'text-emerald-600' : 'text-gray-400'
                                    }`}>
                                        {hasDebt ? '' : hasCredit ? '+' : ''}{student.balance.toLocaleString('tr-TR')}₺
                                    </p>
                                    <p className={`text-[10px] font-semibold uppercase tracking-wide mt-0.5 ${
                                        hasDebt ? 'text-red-400' : hasCredit ? 'text-emerald-400' : 'text-gray-300'
                                    }`}>
                                        {hasDebt ? 'Borç' : hasCredit ? 'Alacak' : 'Denkleşti'}
                                    </p>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
