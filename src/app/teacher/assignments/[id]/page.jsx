'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import OpticalForm from '@/components/OpticalForm';
import dynamic from 'next/dynamic';

const BarChartComponent = dynamic(() => import('recharts').then(mod => {
    const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = mod;
    return function Chart({ data }) {
        return (
            <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        );
    };
}), { ssr: false });

const HorizontalBarComponent = dynamic(() => import('recharts').then(mod => {
    const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } = mod;
    return function HBar({ data }) {
        const getColor = (val) => {
            if (val >= 70) return '#10b981';
            if (val >= 40) return '#f59e0b';
            return '#ef4444';
        };
        return (
            <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
                <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip formatter={(v) => `%${v}`} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                        {data.map((entry, idx) => (
                            <Cell key={idx} fill={getColor(entry.value)} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        );
    };
}), { ssr: false });

export default function AssignmentDetailPage() {
    const { id } = useParams();
    const { profile } = useAuth();
    const [assignment, setAssignment] = useState(null);
    const [assignedStudents, setAssignedStudents] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAnswerKey, setShowAnswerKey] = useState(false);

    useEffect(() => {
        if (profile && id) fetchData();
    }, [profile, id]);

    const fetchData = async () => {
        setLoading(true);

        const { data: aData } = await supabase
            .from('assignments')
            .select('*')
            .eq('id', id)
            .single();
        setAssignment(aData);

        const { data: asData } = await supabase
            .from('assignment_students')
            .select('student_id, users!assignment_students_student_id_fkey(name, class_level)')
            .eq('assignment_id', id);
        setAssignedStudents(asData || []);

        const { data: subData } = await supabase
            .from('submissions')
            .select('*, users!submissions_student_id_fkey(name, class_level)')
            .eq('assignment_id', id);
        setSubmissions(subData || []);

        // Konuları çek (cevap anahtarında referans edilen)
        if (profile) {
            const { data: topicsData } = await supabase
                .from('topics')
                .select('id, name')
                .eq('teacher_id', profile.id);
            setTopics(topicsData || []);
        }

        setLoading(false);
    };

    if (loading || !assignment) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-pulse text-gray-400">Yükleniyor...</div>
            </div>
        );
    }

    // İstatistikler
    const submittedCount = submissions.length;
    const avgScore = submissions.length > 0
        ? Math.round(submissions.reduce((acc, s) => acc + (s.score?.percentage || 0), 0) / submissions.length)
        : 0;
    const scoreDistribution = [
        { name: '0-25', value: submissions.filter(s => (s.score?.percentage || 0) <= 25).length },
        { name: '26-50', value: submissions.filter(s => (s.score?.percentage || 0) > 25 && (s.score?.percentage || 0) <= 50).length },
        { name: '51-75', value: submissions.filter(s => (s.score?.percentage || 0) > 50 && (s.score?.percentage || 0) <= 75).length },
        { name: '76-100', value: submissions.filter(s => (s.score?.percentage || 0) > 75).length },
    ];

    // Konu bazlı analiz
    const questionTopics = assignment.question_topics || {};
    const hasTopics = Object.values(questionTopics).some(Boolean);

    const topicAnalysis = (() => {
        if (!hasTopics || submissions.length === 0) return [];

        // Her konu için: soru numaraları, doğru/toplam hesaplama
        const topicMap = {};
        for (const [qNum, topicId] of Object.entries(questionTopics)) {
            if (!topicId) continue;
            if (!topicMap[topicId]) {
                topicMap[topicId] = { questions: [], correct: 0, total: 0 };
            }
            topicMap[topicId].questions.push(parseInt(qNum));
        }

        // Her submission'da her sorunun doğru/yanlış durumuna bak
        for (const sub of submissions) {
            const studentAnswers = sub.answers || {};
            const ansKey = assignment.answer_key || {};

            for (const [topicId, info] of Object.entries(topicMap)) {
                for (const qNum of info.questions) {
                    info.total++;
                    if (studentAnswers[qNum] === ansKey[qNum]) {
                        info.correct++;
                    }
                }
            }
        }

        return Object.entries(topicMap)
            .map(([topicId, info]) => {
                const topic = topics.find((t) => t.id === topicId);
                return {
                    name: topic?.name || 'Bilinmeyen',
                    value: info.total > 0 ? Math.round((info.correct / info.total) * 100) : 0,
                    questionCount: info.questions.length,
                    correct: info.correct,
                    total: info.total,
                };
            })
            .sort((a, b) => a.value - b.value);
    })();

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
                <p className="text-sm text-gray-400 mt-1">
                    {assignment.question_count} soru · {assignment.option_count} şık
                </p>
            </div>

            {/* İstatistik Kartları */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{assignedStudents.length}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Atanan</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{submittedCount}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Teslim</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">{assignedStudents.length - submittedCount}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Bekleyen</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">%{avgScore}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Ort. Başarı</p>
                </div>
            </div>

            {/* Puan Dağılımı Grafiği */}
            {submissions.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <h2 className="text-sm font-bold text-gray-700 mb-4">📈 Puan Dağılımı</h2>
                    <BarChartComponent data={scoreDistribution} />
                </div>
            )}

            {/* Konu Bazlı Analiz */}
            {hasTopics && topicAnalysis.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                    <h2 className="text-sm font-bold text-gray-700">📊 Konu Bazlı Başarı Analizi</h2>

                    {submissions.length > 0 ? (
                        <>
                            <HorizontalBarComponent data={topicAnalysis} />

                            {/* Konu detay tablosu */}
                            <div className="space-y-1.5 mt-4">
                                {topicAnalysis.map((t) => (
                                    <div
                                        key={t.name}
                                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div
                                                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                                    t.value >= 70 ? 'bg-emerald-500' :
                                                    t.value >= 40 ? 'bg-amber-500' : 'bg-red-500'
                                                }`}
                                            />
                                            <span className="text-sm font-medium text-gray-700 truncate">{t.name}</span>
                                            <span className="text-xs text-gray-400 shrink-0">({t.questionCount} soru)</span>
                                        </div>
                                        <span className={`text-sm font-bold shrink-0 ml-3 ${
                                            t.value >= 70 ? 'text-emerald-600' :
                                            t.value >= 40 ? 'text-amber-600' : 'text-red-600'
                                        }`}>
                                            %{t.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-gray-400 text-center py-4">
                            Henüz teslim yok. Öğrenciler ödevlerini teslim ettikçe konu bazlı analiz burada görünecek.
                        </p>
                    )}
                </div>
            )}

            {/* Cevap Anahtarı */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <button
                    onClick={() => setShowAnswerKey(!showAnswerKey)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-all"
                >
                    <h2 className="text-sm font-bold text-gray-700">🔑 Cevap Anahtarı</h2>
                    <span className="text-gray-400 text-xs">{showAnswerKey ? 'Gizle ▲' : 'Göster ▼'}</span>
                </button>
                {showAnswerKey && (
                    <div className="border-t border-gray-50 p-4">
                        <OpticalForm
                            questionCount={assignment.question_count}
                            optionCount={assignment.option_count}
                            mode="teacher"
                            initialAnswers={assignment.answer_key}
                            readOnly={true}
                            showTopics={hasTopics}
                            topics={topics}
                            questionTopics={questionTopics}
                        />
                    </div>
                )}
            </div>

            {/* Öğrenci Sonuçları */}
            <div>
                <h2 className="text-base font-bold text-gray-800 mb-3">👨‍🎓 Öğrenci Sonuçları</h2>
                <div className="space-y-2">
                    {assignedStudents.map((as) => {
                        const submission = submissions.find((s) => s.student_id === as.student_id);
                        const student = as.users;
                        return (
                            <div
                                key={as.student_id}
                                className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100"
                            >
                                <div className="min-w-0">
                                    <p className="font-medium text-gray-800 text-sm truncate">{student?.name}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {student?.class_level || ''}
                                    </p>
                                </div>
                                {submission ? (
                                    <div className="ml-3 shrink-0 flex items-center gap-3">
                                        {assignment.due_date && new Date(submission.submitted_at) > new Date(assignment.due_date) && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wide">
                                                Geç Teslim
                                            </span>
                                        )}
                                        <div className="text-right">
                                            <div className={`text-sm font-bold ${submission.score?.percentage >= 70 ? 'text-emerald-600' :
                                                    submission.score?.percentage >= 40 ? 'text-amber-600' : 'text-red-600'
                                                }`}>
                                                %{submission.score?.percentage}
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {submission.score?.correct}D / {submission.score?.incorrect}Y / {submission.score?.empty}B
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <span className="ml-3 shrink-0 px-2.5 py-1 bg-amber-50 text-amber-600 text-xs font-medium rounded-full">
                                        Bekliyor
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
