'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import OpticalForm from '@/components/OpticalForm';
import { evaluateSubmission } from '@/lib/evaluate';

export default function StudentAssignmentPage() {
    const { id } = useParams();
    const { profile } = useAuth();
    const [assignment, setAssignment] = useState(null);
    const [submission, setSubmission] = useState(null);
    const [feedback, setFeedback] = useState({});
    const [score, setScore] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

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

        // Daha önce çözülmüş mü kontrol et
        const { data: subData } = await supabase
            .from('submissions')
            .select('*')
            .eq('assignment_id', id)
            .eq('student_id', profile.id)
            .single();

        if (subData) {
            setSubmission(subData);
            setScore(subData.score);
            // Geri bildirimi yeniden hesapla
            if (aData) {
                const evaluation = evaluateSubmission(subData.answers, aData.answer_key);
                setFeedback(evaluation.feedback);
            }
        }
        setLoading(false);
    };

    const handleSubmit = async (studentAnswers) => {
        if (submitting) return;
        setSubmitting(true);

        try {
            const evaluation = evaluateSubmission(studentAnswers, assignment.answer_key);

            const { data, error } = await supabase
                .from('submissions')
                .insert([{
                    assignment_id: id,
                    student_id: profile.id,
                    answers: studentAnswers,
                    score: evaluation.score,
                }])
                .select()
                .single();

            if (error) throw error;

            setSubmission(data);
            setFeedback(evaluation.feedback);
            setScore(evaluation.score);
        } catch (err) {
            alert('Gönderim hatası: ' + err.message);
        }
        setSubmitting(false);
    };

    if (loading || !assignment) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-pulse text-gray-400">Yükleniyor...</div>
            </div>
        );
    }

    const isSubmitted = !!submission;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{assignment.title}</h1>
                <p className="text-sm text-gray-400 mt-0.5">
                    {assignment.question_count} soru · {assignment.option_count} şık
                </p>
            </div>

            {/* Skor Kartı */}
            {isSubmitted && score && (
                <div className={`rounded-2xl p-5 border ${score.percentage >= 70 ? 'bg-emerald-50 border-emerald-100' :
                        score.percentage >= 40 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'
                    }`}>
                    <div className="text-center">
                        <div className={`text-5xl font-black ${score.percentage >= 70 ? 'text-emerald-600' :
                                score.percentage >= 40 ? 'text-amber-600' : 'text-red-600'
                            }`}>
                            %{score.percentage}
                        </div>
                        <p className="text-sm mt-2">
                            <span className="text-emerald-600 font-semibold">{score.correct} doğru</span>
                            <span className="text-gray-300 mx-2">·</span>
                            <span className="text-red-600 font-semibold">{score.incorrect} yanlış</span>
                            {score.empty > 0 && (
                                <>
                                    <span className="text-gray-300 mx-2">·</span>
                                    <span className="text-gray-500 font-semibold">{score.empty} boş</span>
                                </>
                            )}
                        </p>
                    </div>
                </div>
            )}

            {/* Optik Form */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 shadow-sm">
                <OpticalForm
                    questionCount={assignment.question_count}
                    optionCount={assignment.option_count}
                    mode="student"
                    initialAnswers={submission?.answers || {}}
                    readOnly={isSubmitted}
                    feedback={feedback}
                    answerKey={isSubmitted ? assignment.answer_key : {}}
                    onSubmit={handleSubmit}
                />
            </div>

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
