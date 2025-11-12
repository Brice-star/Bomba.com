const fs = require('fs');
const path = require('path');
const db = require('../config/database');

function tokens(s) {
    return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter(Boolean);
}

function scoreName(a, b) {
    const ta = tokens(a);
    const tb = tokens(b);
    let score = 0;
    ta.forEach(t => { if (tb.includes(t)) score++; });
    return score;
}

async function run() {
    const imagesDir = path.join(__dirname, '..', 'public', 'images', 'products');
    const files = fs.existsSync(imagesDir) ? fs.readdirSync(imagesDir) : [];

    console.log('Found', files.length, 'files in', imagesDir);

    const [rows] = await db.query('SELECT id, image_principale, nom FROM produits');
    const suggestions = [];

    for (const p of rows) {
        const img = p.image_principale || '';
        const base = img.split('/').pop();
        const exists = files.includes(base);
        if (exists) continue;

        // find best candidate by token overlap
        let best = null; let bestScore = 0;
        for (const f of files) {
            const s = scoreName(base, f) + scoreName(p.nom || '', f);
            if (s > bestScore) { bestScore = s; best = f; }
        }

        suggestions.push({ id: p.id, nom: p.nom, current: img, candidate: best, score: bestScore });
    }

    console.log('Suggestions for', suggestions.length, 'products with missing files');
    suggestions.forEach(s => {
        console.log(`ID ${s.id} | score=${s.score} | current=${s.current} | candidate=${s.candidate} | nom=${s.nom}`);
    });

    if (suggestions.length === 0) {
        console.log('No missing images detected.');
        process.exit(0);
    }

    const apply = process.argv.includes('--apply');
    if (!apply) {
        console.log('\nDRY RUN (no DB changes). To apply suggested updates run with --apply');
        process.exit(0);
    }

    for (const s of suggestions) {
        if (!s.candidate) continue;
        const newPath = '/images/products/' + s.candidate;
        console.log('Updating product', s.id, '=>', newPath);
        await db.query('UPDATE produits SET image_principale = ? WHERE id = ?', [newPath, s.id]);
    }

    console.log('Applied updates.');
    process.exit(0);
}

run().catch(err => { console.error(err); process.exit(2); });
