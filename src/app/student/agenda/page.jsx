'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const HOURS = Array.from({ length: 17 }, (_, i) => i + 8); // 8:00 to 24:00

export default function AgendaPage() {
    const { profile } = useAuth();
    const [agenda, setAgenda] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (profile) {
            fetchAgenda();
        }
    }, [profile]);

    const fetchAgenda = async () => {
        try {
            const { data, error } = await supabase
                .from('student_agendas')
                .select('data')
                .eq('student_id', profile.id)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
                throw error;
            }

            if (data) {
                setAgenda(data.data || {});
            }
        } catch (err) {
            console.error('Ajanda yüklenirken hata:', err);
            // Fallback to localStorage for development/testing if table not ready
            const localData = localStorage.getItem(`agenda_${profile.id}`);
            if (localData) setAgenda(JSON.parse(localData));
        } finally {
            setLoading(false);
        }
    };

    const saveAgenda = async (newAgenda) => {
        setSaving(true);
        setMessage(null);
        try {
            const { error } = await supabase
                .from('student_agendas')
                .upsert({
                    student_id: profile.id,
                    data: newAgenda,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            setMessage({ type: 'success', text: 'Ajanda başarıyla kaydedildi.' });
        } catch (err) {
            console.error('Ajanda kaydedilirken hata:', err);
            localStorage.setItem(`agenda_${profile.id}`, JSON.stringify(newAgenda));
            setMessage({ type: 'info', text: 'Veritabanına bağlanılamadı, yerel olarak kaydedildi.' });
        } finally {
            setSaving(false);
        }
    };

    const handleCellChange = (day, hour, value) => {
        const key = `${day}-${hour}`;
        const newAgenda = { ...agenda, [key]: value };
        setAgenda(newAgenda);
    };

    const handleCellKeyDown = (dayIndex, hour, event) => {
        if (event.key !== 'Enter' || event.shiftKey) return;

        event.preventDefault();

        const nextHour = hour + 1;
        if (nextHour > 24) return;

        const nextCell = document.querySelector(
            `textarea[data-day="${dayIndex}"][data-hour="${nextHour}"]`
        );

        if (nextCell) {
            nextCell.focus();
        }
    };

    const totalSlots = DAYS.length * HOURS.length;
    const filledSlots = Object.values(agenda).filter((value) => (value || '').trim().length > 0).length;
    const completionRate = Math.round((filledSlots / totalSlots) * 100);

    if (loading) return <div className="p-8 text-center text-gray-500">Yükleniyor...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-amber-50 p-6 sm:p-8">
                <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-sky-200/40 blur-2xl" />
                <div className="absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-amber-200/40 blur-2xl" />

                <div className="relative flex flex-col items-center gap-4 text-center">
                    <h1 className="text-2xl font-bold text-gray-900">Ajandam</h1>
                    <p className="max-w-2xl text-sm text-gray-600">
                        Haftalık çalışma planını gün gün düzenle. Her kutuya ders, konu veya tekrar notu yaz.
                    </p>
                </div>
            </div>

            {message && (
                <div className={`rounded-xl border p-4 text-center text-sm font-semibold ${
                    message.type === 'success'
                        ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                        : 'border-sky-100 bg-sky-50 text-sky-700'
                }`}>
                    {message.text}
                </div>
            )}

            <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-[900px] w-full border-collapse">
                        <thead>
                            <tr className="bg-gradient-to-r from-gray-50 to-sky-50 border-b border-gray-100">
                                <th className="w-24 border-r border-gray-100 px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Saat</th>
                                {DAYS.map((day) => (
                                    <th key={day} className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        {day}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {HOURS.map((hour) => (
                                <tr key={hour} className="h-10 border-b border-gray-50 last:border-0">
                                    <td className="h-10 border-r border-gray-100 bg-gray-50/70 px-2 py-1 text-center">
                                        <span className="text-xs font-semibold text-gray-700">
                                            {hour.toString().padStart(2, '0')}:00
                                        </span>
                                    </td>
                                    {DAYS.map((day, dayIndex) => {
                                        const key = `${dayIndex}-${hour}`;
                                        const hasValue = (agenda[key] || '').trim().length > 0;
                                        return (
                                            <td key={day} className="border-r border-gray-50 p-0 last:border-r-0">
                                                <textarea
                                                    data-day={dayIndex}
                                                    data-hour={hour}
                                                    value={agenda[key] || ''}
                                                    onChange={(e) => handleCellChange(dayIndex, hour, e.target.value)}
                                                    onKeyDown={(e) => handleCellKeyDown(dayIndex, hour, e)}
                                                    placeholder="Planını yaz"
                                                    className={`h-full w-full resize-none bg-transparent px-2 py-1 text-center text-xs font-medium text-gray-700 outline-none transition-all placeholder:text-gray-300 focus:bg-sky-50 ${
                                                        hasValue ? 'bg-amber-50/50' : ''
                                                    }`}
                                                />
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50 to-amber-50 p-5 sm:p-6">
                <div className="flex justify-center">
                    <button
                        onClick={() => saveAgenda(agenda)}
                        disabled={saving}
                        className={`rounded-xl px-7 py-3 text-sm font-semibold text-white transition-all ${
                            saving
                                ? 'cursor-not-allowed bg-gray-400'
                                : 'bg-gradient-to-r from-sky-600 to-cyan-600 shadow-lg shadow-cyan-100 hover:scale-[1.01] hover:from-sky-700 hover:to-cyan-700'
                        }`}
                    >
                        {saving ? 'Kaydediliyor...' : 'Planı Kaydet'}
                    </button>
                </div>

                <div className="mt-5 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-center shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Toplam Dilim</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">{totalSlots}</p>
                    </div>
                    <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-center shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Dolu Dilim</p>
                        <p className="mt-1 text-2xl font-bold text-sky-600">{filledSlots}</p>
                    </div>
                    <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-center shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Tamamlanma</p>
                        <p className="mt-1 text-2xl font-bold text-emerald-600">%{completionRate}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
