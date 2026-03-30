'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import OpticalForm from '@/components/OpticalForm';
import { format } from 'date-fns';

export default function EditAssignmentPage() {
    const { id } = useParams();
    const { profile } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [title, setTitle] = useState('');
    const [questionCount, setQuestionCount] = useState(20);
    const [optionCount, setOptionCount] = useState(5);
    const [answerKey, setAnswerKey] = useState({});
    const [questionTopics, setQuestionTopics] = useState({});
    const [topics, setTopics] = useState([]);
    const [showAnswerEdit, setShowAnswerEdit] = useState(false);
    const [dueDate, setDueDate] = useState('');

    useEffect(() => {
        if (profile && id) fetchData();
    }, [profile, id]);

    const fetchData = async () => {
        setLoading(true);

        const { data: assignment } = await supabase
            .from('assignments')
            .select('*')
            .eq('id', id)
            .single();

        if (assignment) {
            setTitle(assignment.title);
            setQuestionCount(assignment.question_count);
            setOptionCount(assignment.option_count);
            setAnswerKey(assignment.answer_key || {});
            setQuestionTopics(assignment.question_topics || {});
            
            if (assignment.due_date) {
                // Remove the Z and adjust for datetime-local format
                const d = new Date(assignment.due_date);
                setDueDate(format(d, "yyyy-MM-dd'T'HH:mm"));
            }
        }

        const { data: topicsData } = await supabase
            .from('topics')
            .select('id, name')
            .eq('teacher_id', profile.id)
            .order('name');
        setTopics(topicsData || []);

        setLoading(false);
    };

    const handleAddTopic = async (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;

        const { data, error } = await supabase
            .from('topics')
            .insert([{ teacher_id: profile.id, name: trimmed }])
            .select('id, name')
            .single();

        if (error) {
            alert(error.code === '23505' ? 'Bu konu zaten mevcut.' : error.message);
            return;
        }
        setTopics((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    };

    const handleSave = async () => {
        if (!title.trim()) {
            alert('Ödev başlığı boş olamaz.');
            return;
        }
        setSaving(true);

        const { error } = await supabase
            .from('assignments')
            .update({
                title,
                answer_key: answerKey,
                question_topics: questionTopics,
                due_date: dueDate ? new Date(dueDate).toISOString() : null,
            })
            .eq('id', id);

        if (error) {
            alert('Güncelleme hatası: ' + error.message);
        } else {
            window.location.href = `/teacher/assignments/${id}`;
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-pulse text-gray-400">Yükleniyor...</div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">✏️ Ödevi Düzenle</h1>
                <button
                    onClick={() => router.back()}
                    className="text-sm text-gray-400 hover:text-gray-600 transition-all"
                >
                    ← Geri
                </button>
            </div>

            {/* Başlık */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm space-y-5">
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Ödev Başlığı</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Soru Sayısı</label>
                        <div className="px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-500">
                            {questionCount} soru
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Soru sayısı değiştirilemez</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Şık Sayısı</label>
                        <div className="px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-500">
                            {optionCount} şık
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Şık sayısı değiştirilemez</p>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Son Teslim Tarihi (Opsiyonel)</label>
                    <input
                        type="datetime-local"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm text-gray-700 bg-white"
                    />
                    <p className="text-xs text-gray-400 mt-1.5">
                        Belirtilen tarihten sonra gönderilen ödevler "Geç Teslim" olarak işaretlenir. Temizlemek için alanı boşaltın.
                    </p>
                </div>
            </div>

            {/* Cevap Anahtarı */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <button
                    onClick={() => setShowAnswerEdit(!showAnswerEdit)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-all"
                >
                    <h2 className="text-sm font-bold text-gray-700">🔑 Cevap Anahtarını Düzenle</h2>
                    <span className="text-gray-400 text-xs">
                        {showAnswerEdit ? 'Gizle ▲' : 'Göster ▼'}
                    </span>
                </button>
                {showAnswerEdit && (
                    <div className="border-t border-gray-50 p-4">
                        <OpticalForm
                            questionCount={questionCount}
                            optionCount={optionCount}
                            mode="teacher"
                            initialAnswers={answerKey}
                            showTopics={true}
                            topics={topics}
                            questionTopics={questionTopics}
                            onQuestionTopicChange={(qNumber, topicId) => {
                                setQuestionTopics((prev) => ({ ...prev, [qNumber]: topicId }));
                            }}
                            onAddTopic={handleAddTopic}
                            onSubmit={(answers) => {
                                setAnswerKey(answers);
                                setShowAnswerEdit(false);
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Kaydet Butonu */}
            <div className="flex items-center justify-end gap-3 pt-2">
                <button
                    onClick={() => router.back()}
                    className="px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-all"
                >
                    İptal
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving || !title.trim()}
                    className="px-6 py-2.5 bg-gray-900 text-white font-semibold rounded-xl shadow-sm hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-40 text-sm"
                >
                    {saving ? 'Kaydediliyor...' : '💾 Değişiklikleri Kaydet'}
                </button>
            </div>
        </div>
    );
}
