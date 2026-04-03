'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const HorizontalBarComponent = dynamic(() => import('recharts').then(mod => {
    const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } = mod;
    return function HBar({ data }) {
        const getColor = (val) => {
            if (val >= 70) return '#10b981';
            if (val >= 40) return '#f59e0b';
            return '#ef4444';
        };
        return (
            <ResponsiveContainer width="100%" height={Math.max(200, data.length * 45)}>
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

export default function ClassDetailPage() {
    const { id } = useParams();
    const { profile } = useAuth();
    const [classInfo, setClassInfo] = useState(null);
    const [students, setStudents] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (profile && id) fetchData();
    }, [profile, id]);

    const fetchData = async () => {
        setLoading(true);

        // Sınıf bilgisi
        const { data: cls } = await supabase
            .from('classes')
            .select('*')
            .eq('id', id)
            .single();
        setClassInfo(cls);

        // Sınıftaki öğrenciler
        const { data: studentData } = await supabase
            .from('users')
            .select('id, name, email, class_id')
            .eq('role', 'student')
            .eq('class_id', id);
        setStudents(studentData || []);

        // Tüm öğrencilerin submissionları
        const studentIds = (studentData || []).map(s => s.id);
        if (studentIds.length > 0) {
            const { data: subData } = await supabase
                .from('submissions')
                .select('*, assignments!submissions_assignment_id_fkey(id, title, question_count, answer_key, question_topics)')
                .in('student_id', studentIds);
            setSubmissions(subData || []);
        }

        // Konular
        const { data: topicsData } = await supabase
            .from('topics')
            .select('id, name')
            .eq('teacher_id', profile.id);
        setTopics(topicsData || []);

        setLoading(false);
    };

    // Öğrenci bazlı istatistikler
    const studentStats = useMemo(() => {
        return students.map(student => {
            const subs = submissions.filter(sub => sub.student_id === student.id);
            let totalQ = 0, correct = 0;

            for (const sub of subs) {
                const assignment = sub.assignments;
                if (!assignment) continue;
                const answerKey = assignment.answer_key || {};
                const studentAnswers = sub.answers || {};

                for (const [qNum, correctAns] of Object.entries(answerKey)) {
                    totalQ++;
                    if (studentAnswers[qNum] === correctAns) correct++;
                }
            }

            return {
                ...student,
                submissionCount: subs.length,
                totalQuestions: totalQ,
                correct,
                percentage: totalQ > 0 ? Math.round((correct / totalQ) * 100) : null,
            };
        }).sort((a, b) => (b.percentage ?? -1) - (a.percentage ?? -1));
    }, [students, submissions]);

    // Genel sınıf istatistikleri
    const classStats = useMemo(() => {
        let totalQ = 0, correct = 0, incorrect = 0, empty = 0;

        for (const sub of submissions) {
            const assignment = sub.assignments;
            if (!assignment) continue;
            const answerKey = assignment.answer_key || {};
            const studentAnswers = sub.answers || {};

            for (const [qNum, correctAns] of Object.entries(answerKey)) {
                totalQ++;
                const sa = studentAnswers[qNum];
                if (!sa) empty++;
                else if (sa === correctAns) correct++;
                else incorrect++;
            }
        }

        const percentage = totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0;
        return { totalQ, correct, incorrect, empty, percentage, submissionCount: submissions.length };
    }, [submissions]);

    // Konu bazlı istatistikler
    const topicStats = useMemo(() => {
        const topicMap = {};

        for (const sub of submissions) {
            const assignment = sub.assignments;
            if (!assignment) continue;
            const answerKey = assignment.answer_key || {};
            const questionTopics = assignment.question_topics || {};
            const studentAnswers = sub.answers || {};

            for (const [qNum, correctAns] of Object.entries(answerKey)) {
                const topicId = questionTopics[qNum];
                if (!topicId) continue;

                if (!topicMap[topicId]) {
                    topicMap[topicId] = { total: 0, correct: 0, incorrect: 0, empty: 0 };
                }

                const sa = studentAnswers[qNum];
                topicMap[topicId].total++;
                if (!sa) topicMap[topicId].empty++;
                else if (sa === correctAns) topicMap[topicId].correct++;
                else topicMap[topicId].incorrect++;
            }
        }

        return Object.entries(topicMap)
            .map(([topicId, stats]) => {
                const topic = topics.find(t => t.id === topicId);
                return {
                    id: topicId,
                    name: topic?.name || 'Bilinmeyen',
                    ...stats,
                    percentage: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
                };
            })
            .sort((a, b) => a.percentage - b.percentage);
    }, [submissions, topics]);

    if (loading || !classInfo) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-pulse text-gray-400">Yükleniyor...</div>
            </div>
        );
    }

    const chartData = topicStats.map(t => ({ name: t.name, value: t.percentage }));

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Başlık */}
            <div className="flex items-center gap-3">
                <Link
                    href="/teacher/classes"
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">🏫 {classInfo.name}</h1>
                    <p className="text-sm text-gray-400">{students.length} öğrenci</p>
                </div>
            </div>

            {/* Genel İstatistikler */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{students.length}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Öğrenci</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{classStats.submissionCount}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Teslim</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{classStats.correct}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Doğru</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                    <p className={`text-2xl font-bold ${
                        classStats.percentage >= 70 ? 'text-emerald-600' :
                        classStats.percentage >= 40 ? 'text-amber-600' : 'text-red-600'
                    }`}>%{classStats.percentage}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Ortalama Başarı</p>
                </div>
            </div>

            {/* Doğru/Yanlış/Boş Bar */}
            {classStats.totalQ > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <div className="flex rounded-full overflow-hidden h-4">
                        {classStats.correct > 0 && (
                            <div
                                className="bg-emerald-500 transition-all duration-500"
                                style={{ width: `${(classStats.correct / classStats.totalQ) * 100}%` }}
                                title={`Doğru: ${classStats.correct}`}
                            />
                        )}
                        {classStats.incorrect > 0 && (
                            <div
                                className="bg-red-500 transition-all duration-500"
                                style={{ width: `${(classStats.incorrect / classStats.totalQ) * 100}%` }}
                                title={`Yanlış: ${classStats.incorrect}`}
                            />
                        )}
                        {classStats.empty > 0 && (
                            <div
                                className="bg-gray-300 transition-all duration-500"
                                style={{ width: `${(classStats.empty / classStats.totalQ) * 100}%` }}
                                title={`Boş: ${classStats.empty}`}
                            />
                        )}
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Doğru ({classStats.correct})</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Yanlış ({classStats.incorrect})</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300" /> Boş ({classStats.empty})</span>
                    </div>
                </div>
            )}

            {/* Konu Bazlı Analiz */}
            {topicStats.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                    <h2 className="text-sm font-bold text-gray-700">📊 Konu Bazlı Sınıf Performansı</h2>
                    <HorizontalBarComponent data={chartData} />

                    <div className="space-y-1.5 mt-2">
                        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-3 text-xs font-medium text-gray-400">
                            <span>Konu</span>
                            <span className="w-12 text-center">Soru</span>
                            <span className="w-12 text-center">Doğru</span>
                            <span className="w-12 text-center">Yanlış</span>
                            <span className="w-14 text-center">Başarı</span>
                        </div>
                        {topicStats.map(t => (
                            <div
                                key={t.id}
                                className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center px-3 py-2.5 rounded-lg bg-gray-50"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                        t.percentage >= 70 ? 'bg-emerald-500' :
                                        t.percentage >= 40 ? 'bg-amber-500' : 'bg-red-500'
                                    }`} />
                                    <span className="text-sm font-medium text-gray-700 truncate">{t.name}</span>
                                </div>
                                <span className="w-12 text-center text-sm text-gray-600">{t.total}</span>
                                <span className="w-12 text-center text-sm text-emerald-600 font-medium">{t.correct}</span>
                                <span className="w-12 text-center text-sm text-red-600 font-medium">{t.incorrect}</span>
                                <span className={`w-14 text-center text-sm font-bold ${
                                    t.percentage >= 70 ? 'text-emerald-600' :
                                    t.percentage >= 40 ? 'text-amber-600' : 'text-red-600'
                                }`}>%{t.percentage}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Öğrenci Sıralaması */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
                <h2 className="text-sm font-bold text-gray-700">👨‍🎓 Öğrenci Performansları</h2>

                {studentStats.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Bu sınıfta henüz öğrenci yok.</p>
                ) : (
                    <div className="space-y-1.5">
                        {studentStats.map((s, idx) => (
                            <Link
                                key={s.id}
                                href={`/teacher/students/${s.id}`}
                                className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-gray-50 transition-all group"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="w-6 text-xs font-bold text-gray-300 text-right shrink-0">
                                        {idx + 1}.
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-800 group-hover:text-blue-700 transition-colors truncate">
                                            {s.name}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {s.submissionCount} teslim · {s.totalQuestions} soru
                                        </p>
                                    </div>
                                </div>
                                {s.percentage != null ? (
                                    <span className={`text-sm font-bold shrink-0 ${
                                        s.percentage >= 70 ? 'text-emerald-600' :
                                        s.percentage >= 40 ? 'text-amber-600' : 'text-red-600'
                                    }`}>
                                        %{s.percentage}
                                    </span>
                                ) : (
                                    <span className="text-xs text-gray-300 shrink-0">Teslim yok</span>
                                )}
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Veri yoksa */}
            {submissions.length === 0 && students.length > 0 && (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center">
                    <p className="text-gray-400 text-sm">Bu sınıftaki öğrenciler henüz ödev teslim etmemiş.</p>
                </div>
            )}
        </div>
    );
}
