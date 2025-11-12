// Gestion des devises et conversions
const DEVISES = {
    XAF: { code: 'XAF', symbole: 'FCFA', nom: 'Franc CFA' },
    USD: { code: 'USD', symbole: '$', nom: 'Dollar américain' },
    CAD: { code: 'CAD', symbole: 'CAD$', nom: 'Dollar canadien' },
    EUR: { code: 'EUR', symbole: '€', nom: 'Euro' }
};

// Taux de change par rapport au FCFA (XAF)
// 1 USD = ~600 XAF, 1 EUR = ~655 XAF, 1 CAD = ~445 XAF (approximatif)
const TAUX_CHANGE = {
    XAF: 1,
    USD: 600,    // 1 USD = 600 FCFA
    EUR: 655,    // 1 EUR = 655 FCFA
    CAD: 445     // 1 CAD = 445 FCFA
};

// Mapping pays → devise pour afficher l'estimation locale
const PAYS_DEVISES = {
    // Pays utilisant le FCFA (XAF)
    'Bénin': 'XAF',
    'Togo': 'XAF',
    'Côte d\'Ivoire': 'XAF',
    'Sénégal': 'XAF',
    'Burkina Faso': 'XAF',
    'Mali': 'XAF',
    'Niger': 'XAF',
    'Cameroun': 'XAF',
    'Gabon': 'XAF',
    'Congo': 'XAF',
    'Tchad': 'XAF',
    'Guinée équatoriale': 'XAF',
    
    // Pays utilisant l'Euro (EUR)
    'France': 'EUR',
    'Belgique': 'EUR',
    'Allemagne': 'EUR',
    'Italie': 'EUR',
    'Espagne': 'EUR',
    'Portugal': 'EUR',
    'Pays-Bas': 'EUR',
    'Luxembourg': 'EUR',
    'Suisse': 'EUR',
    
    // Pays utilisant le Dollar américain (USD)
    'États-Unis': 'USD',
    
    // Pays utilisant le Dollar canadien (CAD)
    'Canada': 'CAD',
    
    // Autres pays (par défaut on affiche en USD)
    'Nigeria': 'USD',
    'Ghana': 'USD',
    'Autre': 'USD'
};

/**
 * Obtient la devise d'un pays
 * @param {string} pays - Le nom du pays
 * @returns {string} - Le code de la devise (XAF, USD, EUR, CAD)
 */
function getDevisePays(pays) {
    return PAYS_DEVISES[pays] || 'USD';
}

/**
 * Formate un montant avec sa devise
 * @param {number} montant - Le montant à formater
 * @param {string} devise - Le code de la devise (XAF, USD, CAD, EUR)
 * @returns {string} - Le montant formaté avec le symbole de la devise
 */
function formaterMontant(montant, devise = 'XAF') {
    const deviseInfo = DEVISES[devise] || DEVISES.XAF;
    const montantFormate = Number(montant).toLocaleString('fr-FR', {
        minimumFractionDigits: devise === 'XAF' ? 0 : 2,
        maximumFractionDigits: devise === 'XAF' ? 0 : 2
    });

    // Pour le FCFA, le symbole est après le montant
    if (devise === 'XAF') {
        return `${montantFormate} ${deviseInfo.symbole}`;
    }
    
    // Pour les autres devises, le symbole est avant
    return `${deviseInfo.symbole}${montantFormate}`;
}

/**
 * Convertit un montant d'une devise à une autre
 * @param {number} montant - Le montant à convertir
 * @param {string} deviseSource - La devise source
 * @param {string} deviseCible - La devise cible
 * @returns {number} - Le montant converti
 */
function convertirDevise(montant, deviseSource, deviseCible) {
    // Convertir d'abord en XAF (base)
    const montantEnXAF = montant * TAUX_CHANGE[deviseSource];
    
    // Puis convertir vers la devise cible
    return montantEnXAF / TAUX_CHANGE[deviseCible];
}

/**
 * Obtient le symbole d'une devise
 * @param {string} devise - Le code de la devise
 * @returns {string} - Le symbole de la devise
 */
function getSymboleDevise(devise) {
    return (DEVISES[devise] || DEVISES.XAF).symbole;
}

/**
 * Obtient le nom complet d'une devise
 * @param {string} devise - Le code de la devise
 * @returns {string} - Le nom de la devise
 */
function getNomDevise(devise) {
    return (DEVISES[devise] || DEVISES.XAF).nom;
}

/**
 * Génère les options HTML pour un select de devises
 * @param {string} deviseSelectionnee - La devise à présélectionner
 * @returns {string} - Les options HTML
 */
function genererOptionsDevises(deviseSelectionnee = 'XAF') {
    return Object.keys(DEVISES).map(code => {
        const devise = DEVISES[code];
        const selected = code === deviseSelectionnee ? 'selected' : '';
        return `<option value="${code}" ${selected}>${devise.symbole} - ${devise.nom}</option>`;
    }).join('');
}

/**
 * Calcule le total d'un panier en tenant compte des différentes devises
 * Convertit tout en XAF pour le calcul
 * @param {Array} articles - Liste des articles avec {prix, devise, quantite}
 * @returns {Object} - {montantXAF, details: [{devise, montant}]}
 */
function calculerTotalPanier(articles) {
    let totalXAF = 0;
    const details = {};

    articles.forEach(article => {
        const montantArticle = article.prix * article.quantite;
        const montantEnXAF = convertirDevise(montantArticle, article.devise, 'XAF');
        totalXAF += montantEnXAF;

        // Grouper par devise pour l'affichage
        if (!details[article.devise]) {
            details[article.devise] = 0;
        }
        details[article.devise] += montantArticle;
    });

    return {
        montantXAF: totalXAF,
        details: Object.keys(details).map(devise => ({
            devise,
            montant: details[devise],
            montantFormate: formaterMontant(details[devise], devise)
        }))
    };
}

/**
 * Valide si un code de devise est supporté
 * @param {string} devise - Le code de la devise à valider
 * @returns {boolean} - true si la devise est supportée
 */
function estDeviseValide(devise) {
    return DEVISES.hasOwnProperty(devise);
}

// Export pour utilisation
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DEVISES,
        TAUX_CHANGE,
        PAYS_DEVISES,
        formaterMontant,
        convertirDevise,
        getSymboleDevise,
        getNomDevise,
        getDevisePays,
        genererOptionsDevises,
        calculerTotalPanier,
        estDeviseValide
    };
}

console.log('✅ currencies.js chargé avec succès');
