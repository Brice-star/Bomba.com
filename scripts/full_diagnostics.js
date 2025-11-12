#!/usr/bin/env node
// Script de diagnostic complet BOMBA
// Usage: node scripts/full_diagnostics.js --url=https://ton-domaine --admin=admin@mail.com --password=tonmdp --image=chemin/image.jpg

const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const argv = require('minimist')(process.argv.slice(2));
const BASE = argv.url || 'http://localhost:3000';
const ADMIN = argv.admin || '';
const PASSWORD = argv.password || '';
const IMAGE = argv.image || '';

async function testStats() {
    try {
        const res = await fetch(`${BASE}/api/admin/statistiques`);
        const data = await res.json();
        console.log('Statistiques:', res.status, data);
    } catch (e) {
        console.error('Erreur stats:', e.message);
    }
}

async function testCommandes() {
    try {
        const res = await fetch(`${BASE}/api/admin/commandes`);
        const data = await res.json();
        console.log('Commandes:', res.status, data);
    } catch (e) {
        console.error('Erreur commandes:', e.message);
    }
}

async function testImageGet(filename) {
    try {
        const res = await fetch(`${BASE}/images/products/${filename}`);
        console.log('GET image', filename, '->', res.status);
    } catch (e) {
        console.error('Erreur GET image:', e.message);
    }
}

async function testUploadImage() {
    if (!ADMIN || !PASSWORD || !IMAGE) {
        console.log('Admin, password et image requis pour upload.');
        return;
    }
    // Login admin
    let cookie = '';
    try {
        const res = await fetch(`${BASE}/api/admin/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email: ADMIN, password: PASSWORD })
        });
        if (!res.ok) throw new Error('Login admin échoué');
        cookie = res.headers.get('set-cookie');
        console.log('Login admin OK');
    } catch (e) {
        console.error('Erreur login admin:', e.message);
        return;
    }
    // Upload image
    try {
        const FormData = require('form-data');
        const form = new FormData();
        form.append('image', fs.createReadStream(IMAGE));
        const res = await fetch(`${BASE}/api/admin/upload-image`, {
            method: 'POST',
            headers: { 'cookie': cookie },
            body: form
        });
        const data = await res.json();
        console.log('Upload image:', res.status, data);
        if (data.imagePath) await testImageGet(path.basename(data.imagePath));
    } catch (e) {
        console.error('Erreur upload image:', e.message);
    }
}

async function testStripe() {
    try {
        // Paiement test (si endpoint public)
        const res = await fetch(`${BASE}/api/stripe/test`, { method: 'POST' });
        const data = await res.json();
        console.log('Paiement Stripe test:', res.status, data);
    } catch (e) {
        console.error('Erreur paiement Stripe:', e.message);
    }
}

(async () => {
    await testStats();
    await testCommandes();
    await testUploadImage();
    await testStripe();
})();
