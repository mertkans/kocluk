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

/**
 * Bir assignment objesinden test listesini çıkarır.
 * Çoklu test varsa (tests alanı dolu) onu döndürür,
 * yoksa eski tek-test formatını [{ ... }] şeklinde döndürür.
 * @param {Object} assignment
 * @returns {Array}
 */
export function getAssignmentTests(assignment) {
    if (assignment.tests && Array.isArray(assignment.tests) && assignment.tests.length > 0) {
        return assignment.tests;
    }
    // Eski format — tek test
    return [{
        id: 'test_0',
        name: assignment.title || 'Test',
        question_count: assignment.question_count,
        option_count: assignment.option_count,
        answer_key: assignment.answer_key || {},
        question_topics: assignment.question_topics || {},
    }];
}

/**
 * Çoklu test ödevinde öğrencinin tüm cevaplarını değerlendirir.
 * @param {Object} studentAnswersMap - Örn: { "test_0": { "1": "A", ... }, "test_1": { ... } }
 * @param {Array}  tests             - getAssignmentTests() çıktısı
 * @returns {{ perTest: Array, overall: Object }}
 */
export function evaluateMultiTestSubmission(studentAnswersMap, tests) {
    let overallCorrect = 0;
    let overallIncorrect = 0;
    let overallEmpty = 0;
    let overallTotal = 0;

    const perTest = tests.map((test) => {
        const studentAnswers = studentAnswersMap[test.id] || {};
        const { score, feedback } = evaluateSubmission(studentAnswers, test.answer_key);

        overallCorrect += score.correct;
        overallIncorrect += score.incorrect;
        overallEmpty += score.empty;
        overallTotal += score.total;

        return {
            testId: test.id,
            testName: test.name,
            score,
            feedback,
        };
    });

    const overallPercentage = overallTotal > 0
        ? Math.round((overallCorrect / overallTotal) * 100)
        : 0;

    return {
        perTest,
        overall: {
            total: overallTotal,
            correct: overallCorrect,
            incorrect: overallIncorrect,
            empty: overallEmpty,
            percentage: overallPercentage,
        },
    };
}
