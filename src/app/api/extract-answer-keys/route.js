import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const SUPPORTED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf',
];

// answers → array formatında tanımlıyoruz (dinamik key sorununu aşmak için)
const responseSchema = {
    type: SchemaType.OBJECT,
    properties: {
        tests: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    test_number: {
                        type: SchemaType.INTEGER,
                        description: 'Test numarası (1, 2, 3 ...)',
                    },
                    question_count: {
                        type: SchemaType.INTEGER,
                        description: 'Bu testteki toplam soru sayısı',
                    },
                    option_count: {
                        type: SchemaType.INTEGER,
                        description: 'Kaç şık var (4 veya 5)',
                    },
                    answers: {
                        type: SchemaType.ARRAY,
                        description: 'Her sorunun cevabı',
                        items: {
                            type: SchemaType.OBJECT,
                            properties: {
                                q: {
                                    type: SchemaType.INTEGER,
                                    description: 'Soru numarası (1, 2, 3...)',
                                },
                                a: {
                                    type: SchemaType.STRING,
                                    description: 'Cevap harfi: A, B, C, D veya E',
                                },
                            },
                            required: ['q', 'a'],
                        },
                    },
                },
                required: ['test_number', 'question_count', 'option_count', 'answers'],
            },
        },
    },
    required: ['tests'],
};

export async function POST(request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return Response.json(
                { error: 'GEMINI_API_KEY tanımlı değil. Lütfen .env.local dosyasına ekleyin.' },
                { status: 500 }
            );
        }

        const formData = await request.formData();
        const file = formData.get('file');
        const bookName = formData.get('bookName')?.trim();

        if (!file || !bookName) {
            return Response.json(
                { error: 'Dosya ve kitap adı zorunludur.' },
                { status: 400 }
            );
        }

        if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
            return Response.json(
                { error: `Desteklenmeyen dosya türü: ${file.type}. Lütfen JPG, PNG, WEBP veya PDF yükleyin.` },
                { status: 400 }
            );
        }

        if (file.size > MAX_FILE_SIZE) {
            return Response.json(
                { error: 'Dosya boyutu 10MB\'ı aşıyor.' },
                { status: 400 }
            );
        }

        // Dosyayı base64'e çevir
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');

        // Gemini API'ye gönder
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-flash-lite-latest',
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema,
            },
        });

        const prompt = `Bu görselde/belgede bir sınav kitabının yanıt anahtarı (cevap anahtarı) tablosu var.
Kitabın adı: "${bookName}"

Görevin:
1. Tablodaki TÜM testleri bul (TEST 1, TEST 2, ... şeklinde sıralanmış)
2. Her test için soru numarası ve cevap harfini çıkar
3. answers dizisi: her eleman {q: <soru_no>, a: "<cevap_harfi>"} formatında olmalı
4. Cevap harfleri büyük harf (A, B, C, D veya E)
5. Boş/cevapsız sorular dahil edilmemeli
6. option_count: 4 veya 5 (tablodaki maksimum şık sayısına göre)
7. question_count: o testteki toplam soru sayısı

Örnek çıktı formatı:
{
  "tests": [
    {
      "test_number": 1,
      "question_count": 15,
      "option_count": 5,
      "answers": [
        {"q": 1, "a": "B"},
        {"q": 2, "a": "D"},
        {"q": 3, "a": "A"}
      ]
    }
  ]
}`;

        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [
                    { text: prompt },
                    { inlineData: { data: base64Data, mimeType: file.type } },
                ],
            }],
        });

        const rawJson = result.response.text();
        let parsed;
        try {
            parsed = JSON.parse(rawJson);
        } catch {
            return Response.json(
                { error: 'Yapay zeka yanıtı parse edilemedi. Lütfen tekrar deneyin.' },
                { status: 500 }
            );
        }

        const tests = parsed.tests || [];
        if (tests.length === 0) {
            return Response.json(
                { error: 'Görselde cevap anahtarı tespit edilemedi. Lütfen daha net bir görsel deneyin.' },
                { status: 422 }
            );
        }

        // answers array'ini { "1": "B", "2": "D" } formatına çevir
        const templates = tests.map((t) => {
            const answerKey = {};
            if (Array.isArray(t.answers)) {
                for (const item of t.answers) {
                    if (item.q && item.a) {
                        answerKey[String(item.q)] = item.a.toUpperCase();
                    }
                }
            }
            return {
                name: `${bookName} Test ${t.test_number}`,
                question_count: t.question_count,
                option_count: t.option_count || 5,
                answer_key: answerKey,
            };
        });

        return Response.json({ templates });
    } catch (err) {
        console.error('extract-answer-keys error:', err);
        return Response.json(
            { error: 'Beklenmeyen bir hata oluştu: ' + err.message },
            { status: 500 }
        );
    }
}
