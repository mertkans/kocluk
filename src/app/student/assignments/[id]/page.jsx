'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import OpticalForm from '@/components/OpticalForm';
import { evaluateSubmission, evaluateMultiTestSubmission, getAssignmentTests } from '@/lib/evaluate';

export default function StudentAssignmentPage() {
    const { id } = useParams();
    const { profile } = useAuth();
    const [assignment, setAssignment] = useState(null);
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Çoklu test state
    const [tests, setTests] = useState([]);
    const [answersMap, setAnswersMap] = useState({});    // { test_0: { 1: "A", ... }, test_1: { ... } }
    const [feedbackMap, setFeedbackMap] = useState({});  // { test_0: { 1: "correct", ... }, ... }
    const [perTestScores, setPerTestScores] = useState([]);
    const [overallScore, setOverallScore] = useState(null);

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

        if (aData) {
            const assignmentTests = getAssignmentTests(aData);
            setTests(assignmentTests);

            // Daha önce çözülmüş mü kontrol et
            const { data: subData } = await supabase
                .from('submissions')
                .select('*')
                .eq('assignment_id', id)
                .eq('student_id', profile.id)
                .single();

            if (subData) {
                setSubmission(subData);

                // Eski format mı yoksa yeni format mı kontrol et
                const isMultiTest = assignmentTests.length > 1 || (aData.tests && Array.isArray(aData.tests));

                if (isMultiTest) {
                    // Yeni format: answers = { test_0: {...}, test_1: {...} }
                    // veya eski teslim ise düz obje olabilir
                    let savedAnswersMap = subData.answers;
                    if (savedAnswersMap && !savedAnswersMap['test_0'] && assignmentTests.length === 1) {
                        // Eski format cevapları tek teste çevir
                        savedAnswersMap = { 'test_0': savedAnswersMap };
                    }
                    setAnswersMap(savedAnswersMap || {});

                    const evaluation = evaluateMultiTestSubmission(savedAnswersMap || {}, assignmentTests);
                    const fbMap = {};
                    evaluation.perTest.forEach((pt) => {
                        fbMap[pt.testId] = pt.feedback;
                    });
                    setFeedbackMap(fbMap);
                    setPerTestScores(evaluation.perTest);
                    setOverallScore(evaluation.overall);
                } else {
                    // Tek test — eski format
                    const studentAnswers = subData.answers || {};
                    setAnswersMap({ 'test_0': studentAnswers });

                    const evaluation = evaluateSubmission(studentAnswers, assignmentTests[0].answer_key);
                    setFeedbackMap({ 'test_0': evaluation.feedback });
                    setPerTestScores([{ testId: 'test_0', testName: assignmentTests[0].name, score: evaluation.score, feedback: evaluation.feedback }]);
                    setOverallScore(evaluation.score);
                }
            }
        }
        setLoading(false);
    };

    const handleSubmit = async () => {
        if (submitting) return;

        // Validate: en az bir testte cevap girilmiş mi?
        const totalAnswered = Object.values(answersMap).reduce((sum, a) => sum + Object.keys(a || {}).length, 0);
        if (totalAnswered === 0) {
            alert('En az bir test için cevap girmelisiniz.');
            return;
        }

        setSubmitting(true);

        try {
            const isMultiTest = tests.length > 1 || (assignment.tests && Array.isArray(assignment.tests));

            let scoreToSave;
            let answersToSave;

            if (isMultiTest) {
                const evaluation = evaluateMultiTestSubmission(answersMap, tests);
                scoreToSave = {
                    ...evaluation.overall,
                    perTest: evaluation.perTest.map((pt) => ({
                        testId: pt.testId,
                        testName: pt.testName,
                        ...pt.score,
                    })),
                };
                answersToSave = answersMap;

                setFeedbackMap({});
                const fbMap = {};
                evaluation.perTest.forEach((pt) => {
                    fbMap[pt.testId] = pt.feedback;
                });
                setFeedbackMap(fbMap);
                setPerTestScores(evaluation.perTest);
                setOverallScore(evaluation.overall);
            } else {
                // Tek test uyumluluğu
                const singleAnswers = answersMap['test_0'] || {};
                const evaluation = evaluateSubmission(singleAnswers, tests[0].answer_key);
                scoreToSave = evaluation.score;
                answersToSave = singleAnswers;

                setFeedbackMap({ 'test_0': evaluation.feedback });
                setPerTestScores([{ testId: 'test_0', testName: tests[0].name, score: evaluation.score, feedback: evaluation.feedback }]);
                setOverallScore(evaluation.score);
            }

            const { data, error } = await supabase
                .from('submissions')
                .insert([{
                    assignment_id: id,
                    student_id: profile.id,
                    answers: answersToSave,
                    score: scoreToSave,
                }])
                .select()
                .single();

            if (error) throw error;

            setSubmission(data);
        } catch (err) {
            alert('Gönderim hatası: ' + err.message);
        }
        setSubmitting(false);
    };

    // Test cevaplarını güncelleme (form onSubmit callback)
    const handleTestAnswersChange = (testId, answers) => {
        setAnswersMap((prev) => ({
            ...prev,
            [testId]: answers,
        }));
    };

    if (loading || !assignment) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-pulse text-gray-400">Yükleniyor...</div>
            </div>
        );
    }

    const isSubmitted = !!submission;
    const totalQuestions = tests.reduce((sum, t) => sum + (Object.keys(t.answer_key || {}).length || t.question_count), 0);
    const totalAnswered = Object.values(answersMap).reduce((sum, a) => sum + Object.keys(a || {}).length, 0);

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{assignment.title}</h1>
                <p className="text-sm text-gray-400 mt-0.5">
                    {tests.length > 1 ? `${tests.length} test · ` : ''}{totalQuestions} soru
                </p>
            </div>

            {/* Genel Skor Kartı */}
            {isSubmitted && overallScore && (
                <div className={`rounded-2xl p-5 border ${overallScore.percentage >= 70 ? 'bg-emerald-50 border-emerald-100' :
                        overallScore.percentage >= 40 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'
                    }`}>
                    <div className="text-center">
                        <div className={`text-5xl font-black ${overallScore.percentage >= 70 ? 'text-emerald-600' :
                                overallScore.percentage >= 40 ? 'text-amber-600' : 'text-red-600'
                            }`}>
                            %{overallScore.percentage}
                        </div>
                        <p className="text-sm mt-2">
                            <span className="text-emerald-600 font-semibold">{overallScore.correct} doğru</span>
                            <span className="text-gray-300 mx-2">·</span>
                            <span className="text-red-600 font-semibold">{overallScore.incorrect} yanlış</span>
                            {overallScore.empty > 0 && (
                                <>
                                    <span className="text-gray-300 mx-2">·</span>
                                    <span className="text-gray-500 font-semibold">{overallScore.empty} boş</span>
                                </>
                            )}
                        </p>
                        {tests.length > 1 && (
                            <p className="text-xs text-gray-400 mt-1">{tests.length} testin toplamı</p>
                        )}
                    </div>
                </div>
            )}

            {/* Test bazlı skor kartları (çoklu test varsa) */}
            {isSubmitted && perTestScores.length > 1 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {perTestScores.map((pt) => (
                        <div
                            key={pt.testId}
                            className={`rounded-xl p-3 border text-center ${pt.score.percentage >= 70 ? 'bg-emerald-50/60 border-emerald-100' :
                                pt.score.percentage >= 40 ? 'bg-amber-50/60 border-amber-100' : 'bg-red-50/60 border-red-100'
                                }`}
                        >
                            <p className="text-xs font-medium text-gray-600 truncate">{pt.testName}</p>
                            <p className={`text-xl font-black mt-1 ${pt.score.percentage >= 70 ? 'text-emerald-600' :
                                pt.score.percentage >= 40 ? 'text-amber-600' : 'text-red-600'
                                }`}>
                                %{pt.score.percentage}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                                {pt.score.correct}D / {pt.score.incorrect}Y
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Testler — Alt Alta */}
            {tests.map((test, index) => (
                <div key={test.id} className="space-y-3">
                    {/* Test Başlığı (çoklu test varsa) */}
                    {tests.length > 1 && (
                        <div className="flex items-center gap-3">
                            <div className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                                <span className="text-white text-xs font-bold">{index + 1}</span>
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-gray-800">{test.name || `Test ${index + 1}`}</h2>
                                <p className="text-xs text-gray-400">
                                    {test.question_count} soru · {test.option_count} şık
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Optik Form */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 shadow-sm">
                        <OpticalForm
                            questionCount={test.question_count}
                            optionCount={test.option_count}
                            mode="student"
                            initialAnswers={isSubmitted ? (answersMap[test.id] || {}) : (answersMap[test.id] || {})}
                            readOnly={isSubmitted}
                            feedback={feedbackMap[test.id] || {}}
                            answerKey={isSubmitted ? test.answer_key : {}}
                            onChange={(answers) => handleTestAnswersChange(test.id, answers)}
                            hideSubmit={true}
                        />
                    </div>
                </div>
            ))}

            {/* Gönder Butonu (tüm testler için tek buton) */}
            {!isSubmitted && (
                <div className="sticky bottom-4 z-10">
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || totalAnswered === 0}
                        className="w-full py-3.5 bg-gray-900 text-white font-semibold rounded-xl shadow-lg hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {submitting
                            ? 'Gönderiliyor...'
                            : `📤 Tüm Cevaplarımı Gönder (${totalAnswered}/${totalQuestions})`}
                    </button>
                </div>
            )}

            {submitting && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 shadow-xl text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
                        <p className="text-sm text-gray-600 mt-3">Cevaplarınız gönderiliyor...</p>
                    </div>
                </div>
            )}
        </div>
    );
}
