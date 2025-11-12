const fs = require('fs');
const path = require('path');
const db = require('../config/database');

(async () => {
  try {
    console.log('Connecting to DB...');
    const [rows] = await db.query('SELECT id, nom, image_principale, categorie FROM produits');
    console.log('Products fetched:', rows.length);

    const missing = [];
    const baseDir = path.join(__dirname, '..', 'public', 'images', 'products');

    for (const r of rows) {
      const img = r.image_principale;
      if (!img || img.trim() === '' || img.includes('placeholder')) {
        missing.push({ id: r.id, nom: r.nom, image_principale: img, categorie: r.categorie, reason: 'empty or placeholder' });
        continue;
      }
      // Normalize possible leading slashes
      const candidate = img.startsWith('/') ? img.slice(1) : img;
      const filePath = path.join(baseDir, candidate);
      if (!fs.existsSync(filePath)) {
        missing.push({ id: r.id, nom: r.nom, image_principale: img, categorie: r.categorie, reason: 'file missing', expected_path: path.relative(process.cwd(), filePath) });
      }
    }

    // Ensure reports dir
    const reportsDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const outJson = path.join(reportsDir, 'missing_images.json');
    const outCsv = path.join(reportsDir, 'missing_images.csv');
    fs.writeFileSync(outJson, JSON.stringify({ generated_at: new Date().toISOString(), total_products: rows.length, missing_count: missing.length, missing }, null, 2));

    // CSV
    const csvHeader = 'id,nom,image_principale,categorie,reason,expected_path';
    const csvLines = missing.map(m => `${m.id},"${(m.nom||'').replace(/"/g,'""')}","${(m.image_principale||'').replace(/"/g,'""')}","${(m.categorie||'').replace(/"/g,'""')}",${m.reason},"${(m.expected_path||'').replace(/"/g,'""')}"`);
    fs.writeFileSync(outCsv, [csvHeader, ...csvLines].join('\n'));

    console.log(`Scan complete. total=${rows.length} missing=${missing.length}`);
    console.log(`Reports: ${outJson}, ${outCsv}`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
