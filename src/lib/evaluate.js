/**
 * Öğrencinin cevaplarını öğretmenin cevap anahtarıyla karşılaştırır.
 * @param {Object} studentAnswers - Örn: { "1": "A", "2": "B", "3": "D" }
 * @param {Object} answerKey      - Örn: { "1": "A", "2": "C", "3": "D" }
 * @returns {{ score: Object, feedback: Object }}
 */
export function evaluateSubmission(studentAnswers, answerKey) {
    let correct = 0;
    let incorrect = 0;
    let empty = 0;
    const feedback = {};

    const total = Object.keys(answerKey).length;

    for (const [qNum, correctAnswer] of Object.entries(answerKey)) {
        const studentAnswer = studentAnswers[qNum];

        if (!studentAnswer) {
            empty++;
            feedback[qNum] = 'empty';
        } else if (studentAnswer === correctAnswer) {
            correct++;
            feedback[qNum] = 'correct';
        } else {
            incorrect++;
            feedback[qNum] = 'incorrect';
        }
    }

    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

    return {
        score: { total, correct, incorrect, empty, percentage },
        feedback,
    };
}
