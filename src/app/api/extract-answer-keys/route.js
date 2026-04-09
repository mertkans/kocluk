import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

// Maksimum 10MB dosya boyutu
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const SUPPORTED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf',
];

// Gemini'den beklediğimiz JSON şeması
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
                        type: SchemaType.OBJECT,
                        description: 'Soru numarası → cevap harfi (örn: {"1":"B","2":"D"})',
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
            model: 'gemini-1.5-flash',
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema,
            },
        });

        const prompt = `Bu görselde/belgede bir sınav kitabının yanıt anahtarı (cevap anahtarı) tablosu var.
Kitabın adı: "${bookName}"

Görevin:
1. Tablodaki TÜM testleri bul (TEST 1, TEST 2, ... şeklinde sıralanmış)
2. Her test için soru numarası → cevap harfi eşlemesini çıkar
3. Cevap harfleri büyük harf olmalı (A, B, C, D veya E)
4. Boş bırakılmış sorular answers objesine dahil edilmemeli
5. option_count: sadece 4 veya 5 olabilir — tablodaki maksimum şık sayısına göre belirle
6. question_count: o testteki toplam soru sayısı (cevabı olan + boş)

Sonucu belirtilen JSON şemasına göre döndür.`;

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

        // Kitap adıyla test adlarını oluştur
        const templates = tests.map((t) => ({
            name: `${bookName} Test ${t.test_number}`,
            question_count: t.question_count,
            option_count: t.option_count || 5,
            answer_key: t.answers,
        }));

        return Response.json({ templates });
    } catch (err) {
        console.error('extract-answer-keys error:', err);
        return Response.json(
            { error: 'Beklenmeyen bir hata oluştu: ' + err.message },
            { status: 500 }
        );
    }
}
