'use client';

import { useState, useRef, useEffect } from 'react';

const ALL_OPTIONS = ['A', 'B', 'C', 'D', 'E'];

// Konu seçim dropdown bileşeni
function TopicDropdown({ topics, selectedTopicId, onChange, onAddTopic }) {
    const [open, setOpen] = useState(false);
    const [addMode, setAddMode] = useState(false);
    const [newName, setNewName] = useState('');
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
                setAddMode(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const selectedTopic = topics.find((t) => t.id === selectedTopicId);

    const handleAdd = () => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        onAddTopic(trimmed);
        setNewName('');
        setAddMode(false);
        setOpen(false);
    };

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all max-w-[120px] sm:max-w-[160px] truncate ${
                    selectedTopic
                        ? 'bg-violet-50 text-violet-700 border border-violet-200'
                        : 'bg-gray-50 text-gray-400 border border-gray-200 hover:border-gray-300'
                }`}
                title={selectedTopic?.name || 'Konu seç'}
            >
                <span className="truncate">{selectedTopic?.name || 'Konu'}</span>
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
                    <div className="max-h-48 overflow-y-auto">
                        {/* Konu yok seçeneği */}
                        <button
                            type="button"
                            onClick={() => { onChange(null); setOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-all ${
                                !selectedTopicId ? 'text-blue-600 font-semibold bg-blue-50/50' : 'text-gray-400'
                            }`}
                        >
                            — Konu yok
                        </button>
                        {topics.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => { onChange(t.id); setOpen(false); }}
                                className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-all ${
                                    t.id === selectedTopicId
                                        ? 'text-violet-700 font-semibold bg-violet-50/50'
                                        : 'text-gray-700'
                                }`}
                            >
                                {t.name}
                            </button>
                        ))}
                    </div>

                    {/* Yeni konu ekle */}
                    <div className="border-t border-gray-100">
                        {addMode ? (
                            <div className="p-2 flex gap-1">
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
                                        if (e.key === 'Escape') setAddMode(false);
                                    }}
                                    autoFocus
                                    placeholder="Konu adı..."
                                    className="flex-1 px-2 py-1 text-xs rounded-lg border border-gray-200 focus:border-violet-400 outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={handleAdd}
                                    className="px-2 py-1 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700"
                                >
                                    Ekle
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setAddMode(true)}
                                className="w-full text-left px-3 py-2 text-xs text-violet-600 font-medium hover:bg-violet-50 transition-all"
                            >
                                ➕ Yeni konu ekle...
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function OpticalForm({
    questionCount = 10,
    optionCount = 5,
    mode = 'student',
    initialAnswers = {},
    onSubmit,
    onChange,
    readOnly = false,
    feedback = {},
    answerKey = {},
    // Konu prop'ları (sadece teacher modunda kullanılır)
    showTopics = false,
    topics = [],
    questionTopics = {},
    onQuestionTopicChange,
    onAddTopic,
    // Buton özelleştirme
    submitLabel,
    submitDisabled = false,
    hideSubmit = false,
}) {
    const [answers, setAnswers] = useState(initialAnswers);
    const [bulkTopicOpen, setBulkTopicOpen] = useState(false);
    const bulkRef = useRef(null);
    const currentOptions = ALL_OPTIONS.slice(0, optionCount);

    useEffect(() => {
        const handler = (e) => {
            if (bulkRef.current && !bulkRef.current.contains(e.target)) {
                setBulkTopicOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSelect = (qNumber, option) => {
        if (readOnly) return;
        setAnswers((prev) => {
            const copy = { ...prev };
            if (copy[qNumber] === option) {
                delete copy[qNumber];
            } else {
                copy[qNumber] = option;
            }
            if (onChange) onChange(copy);
            return copy;
        });
    };

    const handleSubmit = () => {
        if (onSubmit) onSubmit(answers);
    };

    const handleBulkAssign = (topicId) => {
        if (!onQuestionTopicChange) return;
        for (let i = 1; i <= questionCount; i++) {
            onQuestionTopicChange(i, topicId);
        }
        setBulkTopicOpen(false);
    };

    const answeredCount = Object.keys(answers).length;
    const topicAssignedCount = showTopics
        ? Object.values(questionTopics).filter(Boolean).length
        : 0;

    return (
        <div className="w-full max-w-3xl mx-auto">
            {/* Üst Bilgi */}
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                        {mode === 'teacher' ? '🔑 Cevap Anahtarı' : '📝 Optik Form'}
                    </h2>
                    <p className="text-gray-400 text-xs mt-0.5">
                        {questionCount} soru · {optionCount} şık
                    </p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    {!readOnly && (
                        <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">
                            {answeredCount}/{questionCount} yanıtlandı
                        </div>
                    )}
                    {showTopics && !readOnly && (
                        <div className="bg-violet-50 text-violet-700 px-3 py-1 rounded-full font-medium">
                            {topicAssignedCount}/{questionCount} konu
                        </div>
                    )}
                </div>
            </div>

            {/* Tümüne Ata */}
            {showTopics && !readOnly && topics.length > 0 && (
                <div className="mb-3 flex items-center gap-2" ref={bulkRef}>
                    <span className="text-xs text-gray-500 font-medium">📎 Tümüne Ata:</span>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setBulkTopicOpen(!bulkTopicOpen)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-100 text-violet-700 border border-violet-200 hover:bg-violet-200 transition-all"
                        >
                            Konu seç ve tümüne uygula
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {bulkTopicOpen && (
                            <div className="absolute left-0 top-full mt-1 w-52 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
                                <div className="max-h-48 overflow-y-auto">
                                    <button
                                        type="button"
                                        onClick={() => handleBulkAssign(null)}
                                        className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 transition-all"
                                    >
                                        — Tüm konuları kaldır
                                    </button>
                                    {topics.map((t) => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => handleBulkAssign(t.id)}
                                            className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-all"
                                        >
                                            {t.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Sorular */}
            <div className="space-y-1.5">
                {Array.from({ length: questionCount }, (_, i) => i + 1).map((qNumber) => {
                    const selectedOption = answers[qNumber];
                    const qFeedback = feedback[qNumber];
                    const correctAnswer = answerKey[qNumber];

                    let rowBg = 'bg-white hover:bg-gray-50';
                    let borderClass = 'border-l-4 border-transparent';
                    if (qFeedback === 'correct') {
                        rowBg = 'bg-emerald-50/60';
                        borderClass = 'border-l-4 border-emerald-500';
                    } else if (qFeedback === 'incorrect') {
                        rowBg = 'bg-red-50/60';
                        borderClass = 'border-l-4 border-red-500';
                    } else if (qFeedback === 'empty') {
                        rowBg = 'bg-amber-50/40';
                        borderClass = 'border-l-4 border-amber-400';
                    }

                    return (
                        <div
                            key={qNumber}
                            className={`flex items-center px-3 py-2.5 sm:py-3 rounded-lg transition-all duration-200 ${rowBg} ${borderClass}`}
                        >
                            <span className="w-7 sm:w-8 font-bold text-gray-500 text-sm tabular-nums">
                                {qNumber}.
                            </span>

                            <div className="flex flex-1 justify-between sm:justify-start sm:gap-3 ml-1 sm:ml-3">
                                {currentOptions.map((option) => {
                                    const isSelected = selectedOption === option;
                                    const isCorrectAnswer = readOnly && qFeedback === 'incorrect' && correctAnswer === option;

                                    let btnClass =
                                        'bg-white text-gray-500 border-2 border-gray-200 hover:border-blue-400 hover:text-blue-600';

                                    if (isSelected && !readOnly) {
                                        btnClass =
                                            'bg-blue-600 text-white shadow-md ring-2 ring-blue-200 ring-offset-1 scale-105';
                                    } else if (readOnly && isSelected && qFeedback === 'correct') {
                                        btnClass =
                                            'bg-emerald-500 text-white ring-2 ring-emerald-200 ring-offset-1';
                                    } else if (readOnly && isSelected && qFeedback === 'incorrect') {
                                        btnClass =
                                            'bg-red-500 text-white ring-2 ring-red-200 ring-offset-1';
                                    } else if (isCorrectAnswer) {
                                        btnClass =
                                            'bg-emerald-100 text-emerald-700 border-2 border-emerald-400 ring-1 ring-emerald-300';
                                    } else if (readOnly && isSelected && !qFeedback) {
                                        btnClass =
                                            'bg-blue-600 text-white ring-2 ring-blue-200 ring-offset-1 cursor-default';
                                    } else if (readOnly) {
                                        btnClass = 'bg-gray-100 text-gray-300 border-2 border-gray-100 cursor-default';
                                    }

                                    return (
                                        <button
                                            key={option}
                                            onClick={() => handleSelect(qNumber, option)}
                                            disabled={readOnly}
                                            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full font-semibold text-xs sm:text-sm flex items-center justify-center transition-all duration-150 focus:outline-none touch-manipulation ${btnClass}`}
                                        >
                                            {option}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Konu dropdown (sadece teacher modunda ve showTopics aktifken) */}
                            {showTopics && !readOnly && (
                                <div className="ml-2 shrink-0">
                                    <TopicDropdown
                                        topics={topics}
                                        selectedTopicId={questionTopics[qNumber] || null}
                                        onChange={(topicId) => onQuestionTopicChange?.(qNumber, topicId)}
                                        onAddTopic={(name) => onAddTopic?.(name)}
                                    />
                                </div>
                            )}

                            {/* Konu gösterimi (read-only modda) */}
                            {showTopics && readOnly && questionTopics[qNumber] && (
                                <span className="ml-2 shrink-0 px-2 py-1 bg-violet-50 text-violet-600 text-xs font-medium rounded-lg truncate max-w-[120px]">
                                    {topics.find((t) => t.id === questionTopics[qNumber])?.name || ''}
                                </span>
                            )}

                            {/* Geri bildirim ikonu */}
                            {qFeedback && (
                                <span className="ml-2 text-lg">
                                    {qFeedback === 'correct' && '✅'}
                                    {qFeedback === 'incorrect' && '❌'}
                                    {qFeedback === 'empty' && '➖'}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Gönder butonu */}
            {!hideSubmit && !readOnly && (
                <div className="mt-6 sticky bottom-4 z-10">
                    <button
                        onClick={handleSubmit}
                        disabled={submitDisabled || answeredCount === 0}
                        className="w-full py-3.5 bg-gray-900 text-white font-semibold rounded-xl shadow-lg hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {submitLabel ||
                            (mode === 'teacher'
                                ? `✅ Cevap Anahtarını Kaydet (${answeredCount}/${questionCount})`
                                : `📤 Cevaplarımı Gönder (${answeredCount}/${questionCount})`)}
                    </button>
                </div>
            )}
        </div>
    );
}
