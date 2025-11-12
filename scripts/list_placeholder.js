const db = require('../config/database');
(async () => {
  try {
    const [cnt] = await db.query("SELECT COUNT(*) AS c FROM produits WHERE image_principale LIKE '%placeholder.svg' OR image_principale IS NULL OR image_principale = ''");
    console.log('placeholder_count=', cnt[0].c);
    const [rows] = await db.query("SELECT id, nom, image_principale, categorie FROM produits WHERE image_principale LIKE '%placeholder.svg' OR image_principale IS NULL OR image_principale = '' LIMIT 200");
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
