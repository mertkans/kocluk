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

    if (loading) return <div className="p-8 text-center text-gray-500">Yükleniyor...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">📅 Haftalık Ajandam</h1>
                    <p className="text-sm text-gray-500">Haftalık çalışma planını buradan düzenleyebilirsin.</p>
                </div>
                <button
                    onClick={() => saveAgenda(agenda)}
                    disabled={saving}
                    className={`px-6 py-2 rounded-lg font-semibold text-white transition-all ${
                        saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md active:scale-95'
                    }`}
                >
                    {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-lg text-sm font-medium ${
                    message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                    'bg-blue-50 text-blue-700 border border-blue-100'
                }`}>
                    {message.text}
                </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center border-r border-gray-100 w-24">Saat</th>
                            {DAYS.map(day => (
                                <th key={day} className="py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">
                                    {day}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {HOURS.map(hour => (
                            <tr key={hour} className="border-b border-gray-50 last:border-0 group">
                                <td className="py-3 px-2 text-center bg-gray-50/50 border-r border-gray-100">
                                    <span className="text-xs font-bold text-gray-600">
                                        {hour.toString().padStart(2, '0')}:00
                                    </span>
                                </td>
                                {DAYS.map((day, dayIndex) => {
                                    const key = `${dayIndex}-${hour}`;
                                    return (
                                        <td key={day} className="p-0 border-r border-gray-50 last:border-r-0">
                                            <textarea
                                                value={agenda[key] || ''}
                                                onChange={(e) => handleCellChange(dayIndex, hour, e.target.value)}
                                                placeholder="..."
                                                className="w-full h-20 p-2 text-xs text-gray-700 resize-none bg-transparent focus:bg-blue-50/30 focus:ring-1 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-200"
                                            />
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end pt-4">
                <button
                    onClick={() => saveAgenda(agenda)}
                    disabled={saving}
                    className={`px-8 py-3 rounded-xl font-bold text-white transition-all shadow-lg ${
                        saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-black active:scale-95'
                    }`}
                >
                    {saving ? 'Kaydediliyor...' : 'Tüm Planı Kaydet'}
                </button>
            </div>
        </div>
    );
}
