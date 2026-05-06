/**
 * TÜBİYAT - Toplu Soru Yükleme Otomasyonu
 * 
 * Bu script, questions.json dosyasındaki soruları Firestore veritabanına yükler.
 * Kullanım: node automation_import.js
 */

const fs = require('fs');

// Firebase Yapılandırması (appConfig.js'den alınmıştır)
const CONFIG = {
    apiKey: "AIzaSyAiybvG-Fa3wavK27CuuJfSdLJ6eKkMckc",
    projectId: "ekmtal"
};

const QUESTIONS_FILE = 'bulk_questions.txt';
const COLLECTION_PATH = `artifacts/ekmtal/public/data/questions`;

async function uploadQuestions() {
    if (!fs.existsSync(QUESTIONS_FILE)) {
        console.error(`❌ Hata: ${QUESTIONS_FILE} bulunamadı!`);
        console.log(`Lütfen yüklenecek soruları ${QUESTIONS_FILE} dosyasına metin formatında kaydedin.`);
        return;
    }

    const rawData = fs.readFileSync(QUESTIONS_FILE, 'utf8').trim();
    let questions = [];

    const blocks = rawData.split(/\r?\n\s*\r?\n/);
    
    for (const block of blocks) {
        const lines = block.split(/\r?\n/).map(l => l.trim()).filter(l => l);
        if (lines.length >= 4) {
            let cat = 'level1'; // Varsayılan kategori
            if (lines.length >= 5) {
                const catText = lines[4].toLowerCase();
                if (catText.includes('kolay')) cat = 'level1';
                else if (catText.includes('orta')) cat = 'level2';
                else if (catText.includes('zor')) cat = 'level3';
                else if (catText.includes('level1')) cat = 'level1';
                else if (catText.includes('level2')) cat = 'level2';
                else if (catText.includes('level3')) cat = 'level3';
            }
            questions.push({
                q: lines[0],
                d: lines[1],
                y1: lines[2],
                y2: lines[3],
                category: cat
            });
        }
    }

    if (questions.length === 0) {
        console.error("❌ Hata: Geçerli formatta soru bulunamadı. Lütfen dosya içeriğini kontrol edin.");
        return;
    }

    console.log(`🚀 ${questions.length} soru veritabanına yükleniyor...`);

    let successCount = 0;
    let errorCount = 0;

    for (const q of questions) {
        // Firestore REST API Formatına Dönüştür
        const payload = {
            fields: {
                q: { stringValue: q.q },
                d: { stringValue: q.d },
                y1: { stringValue: q.y1 },
                y2: { stringValue: q.y2 },
                category: { stringValue: q.category || 'level1' },
                createdAt: { stringValue: new Date().toISOString() }
            }
        };

        const url = `https://firestore.googleapis.com/v1/projects/${CONFIG.projectId}/databases/(default)/documents/${COLLECTION_PATH}?key=${CONFIG.apiKey}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                successCount++;
                process.stdout.write(`\r✅ İlerleme: ${successCount}/${questions.length}`);
            } else {
                const error = await response.json();
                console.error(`\n❌ Soru yüklenemedi: ${q.q}`);
                console.error(JSON.stringify(error, null, 2));
                errorCount++;
            }
        } catch (err) {
            console.error(`\n❌ İstek hatası: ${err.message}`);
            errorCount++;
        }
    }

    console.log(`\n\n✨ İşlem Tamamlandı!`);
    console.log(`✅ Başarılı: ${successCount}`);
    console.log(`❌ Hatalı: ${errorCount}`);
    
    if (successCount > 0) {
        console.log("\nUygulamayı yenileyerek yeni soruları görebilirsiniz.");
    }
}

uploadQuestions();
