'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import OpticalForm from '@/components/OpticalForm';
import { getAssignmentTests } from '@/lib/evaluate';
import { format } from 'date-fns';

export default function EditAssignmentPage() {
    const { id } = useParams();
    const { profile } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [title, setTitle] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [tests, setTests] = useState([]);
    const [topics, setTopics] = useState([]);
    const [answerKeyTemplates, setAnswerKeyTemplates] = useState([]);
    const [isLegacy, setIsLegacy] = useState(false); // eski format ödev mi?

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

            if (assignment.due_date) {
                const d = new Date(assignment.due_date);
                setDueDate(format(d, "yyyy-MM-dd'T'HH:mm"));
            }

            // Test listesini çıkar
            const assignmentTests = getAssignmentTests(assignment);
            const legacy = !assignment.tests || !Array.isArray(assignment.tests) || assignment.tests.length === 0;
            setIsLegacy(legacy);

            setTests(assignmentTests.map((t, i) => ({
                ...t,
                _expanded: false,
            })));
        }

        const { data: topicsData } = await supabase
            .from('topics')
            .select('id, name')
            .eq('teacher_id', profile.id)
            .order('name');
        setTopics(topicsData || []);

        const { data: templatesData } = await supabase
            .from('answer_key_templates')
            .select('id, name, question_count, option_count, answer_key, category')
            .eq('teacher_id', profile.id)
            .order('name');
        setAnswerKeyTemplates(templatesData || []);

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

    const updateTest = useCallback((index, updatedTest) => {
        setTests((prev) => prev.map((t, i) => (i === index ? updatedTest : t)));
    }, []);

    const handleSave = async () => {
        if (!title.trim()) {
            alert('Ödev başlığı boş olamaz.');
            return;
        }
        setSaving(true);

        // Tests dizisini temizle
        const cleanTests = tests.map((t, i) => ({
            id: t.id || `test_${i}`,
            name: t.name || `Test ${i + 1}`,
            question_count: t.question_count,
            option_count: t.option_count,
            answer_key: t.answer_key,
            question_topics: t.question_topics || {},
        }));

        const firstTest = cleanTests[0];

        const updatePayload = {
            title,
            due_date: dueDate ? new Date(dueDate).toISOString() : null,
            // Ana alanları ilk testten güncelle (geriye dönük uyumluluk)
            question_count: firstTest.question_count,
            option_count: firstTest.option_count,
            answer_key: firstTest.answer_key,
            question_topics: firstTest.question_topics,
            tests: cleanTests,
        };

        const { error } = await supabase
            .from('assignments')
            .update(updatePayload)
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

            {/* Başlık + Tarih */}
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

                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Son Teslim Tarihi (Opsiyonel)</label>
                    <input
                        type="datetime-local"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm text-gray-700 bg-white"
                    />
                    <p className="text-xs text-gray-400 mt-1.5">
                        Belirtilen tarihten sonra gönderilen ödevler &quot;Geç Teslim&quot; olarak işaretlenir. Temizlemek için alanı boşaltın.
                    </p>
                </div>
            </div>

            {/* Testler */}
            <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-gray-800">📝 Testler</h2>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full">
                    {tests.length} test
                </span>
            </div>

            <div className="space-y-4">
                {tests.map((test, index) => {
                    const expanded = test._expanded;
                    const answeredCount = Object.keys(test.answer_key || {}).length;
                    const qt = test.question_topics || {};

                    return (
                        <div key={test.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            {/* Header */}
                            <button
                                onClick={() => updateTest(index, { ...test, _expanded: !expanded })}
                                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/60 transition-all group"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                                        <span className="text-white text-sm font-bold">{index + 1}</span>
                                    </div>
                                    <div className="text-left min-w-0">
                                        <p className="font-semibold text-gray-800 text-sm truncate">{test.name || `Test ${index + 1}`}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {test.question_count} soru · {test.option_count} şık · {answeredCount} cevap
                                        </p>
                                    </div>
                                </div>
                                <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Body */}
                            {expanded && (
                                <div className="border-t border-gray-100 px-5 py-5 space-y-4">
                                    {/* Test adı düzenleme */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Test Adı</label>
                                        <input
                                            type="text"
                                            value={test.name}
                                            onChange={(e) => updateTest(index, { ...test, name: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                                        />
                                    </div>

                                    {/* Soru/Şık sayısı (sadece gösterim) */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 mb-1.5">Soru Sayısı</label>
                                            <div className="px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-500">
                                                {test.question_count} soru
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">Soru sayısı değiştirilemez</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 mb-1.5">Şık Sayısı</label>
                                            <div className="px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-500">
                                                {test.option_count} şık
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">Şık sayısı değiştirilemez</p>
                                        </div>
                                    </div>

                                    {/* Optik Form */}
                                    <OpticalForm
                                        questionCount={test.question_count}
                                        optionCount={test.option_count}
                                        mode="teacher"
                                        initialAnswers={test.answer_key}
                                        showTopics={true}
                                        topics={topics}
                                        questionTopics={qt}
                                        onQuestionTopicChange={(qNumber, topicId) => {
                                            const newTopics = { ...qt, [qNumber]: topicId };
                                            updateTest(index, { ...test, question_topics: newTopics });
                                        }}
                                        onAddTopic={handleAddTopic}
                                        onSubmit={(answers) => {
                                            updateTest(index, { ...test, answer_key: answers, _expanded: false });
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
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
