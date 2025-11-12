/**
 * ==========================================
 * SYSTÈME DE CONSENTEMENT DES COOKIES (RGPD)
 * ==========================================
 * 
 * Gestion du consentement des cookies conformément au RGPD.
 * - Bannière de consentement en bas de page
 * - Modal de personnalisation des cookies
 * - Stockage du consentement (durée: 13 mois)
 * - Catégories: Essentiels, Analytiques, Fonctionnels
 */

(function() {
    'use strict';

    // ========== CONFIGURATION ==========
    const COOKIE_NAME = 'bomba_cookie_consent';
    const COOKIE_DURATION_DAYS = 395; // 13 mois
    const CONSENT_VERSION = '1.0';

    // ========== ÉTAT DES CONSENTEMENTS ==========
    let consentState = {
        version: CONSENT_VERSION,
        timestamp: null,
        essential: true,      // Toujours actifs (obligatoires)
        analytics: false,     // Suivi des visiteurs
        functional: false     // Fonctionnalités améliorées (panier, etc.)
    };

    // ========== GESTION DES COOKIES ==========
    
    /**
     * Définit un cookie
     */
    function setCookie(name, value, days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = 'expires=' + date.toUTCString();
        document.cookie = name + '=' + value + ';' + expires + ';path=/;SameSite=Lax';
    }

    /**
     * Récupère un cookie
     */
    function getCookie(name) {
        const nameEQ = name + '=';
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            let cookie = cookies[i];
            while (cookie.charAt(0) === ' ') cookie = cookie.substring(1);
            if (cookie.indexOf(nameEQ) === 0) {
                return cookie.substring(nameEQ.length);
            }
        }
        return null;
    }

    /**
     * Supprime un cookie
     */
    function deleteCookie(name) {
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
    }

    /**
     * Sauvegarde le consentement
     */
    function saveConsent() {
        consentState.timestamp = new Date().toISOString();
        const consentData = JSON.stringify(consentState);
        setCookie(COOKIE_NAME, consentData, COOKIE_DURATION_DAYS);
        
        // Déclencher un événement personnalisé pour informer les autres scripts
        window.dispatchEvent(new CustomEvent('cookieConsentChanged', {
            detail: consentState
        }));
    }

    /**
     * Charge le consentement sauvegardé
     */
    function loadConsent() {
        const savedConsent = getCookie(COOKIE_NAME);
        if (savedConsent) {
            try {
                const parsedConsent = JSON.parse(savedConsent);
                // Vérifier si la version correspond
                if (parsedConsent.version === CONSENT_VERSION) {
                    consentState = parsedConsent;
                    return true;
                }
            } catch (e) {
                console.error('Erreur lors du chargement du consentement:', e);
            }
        }
        return false;
    }

    /**
     * Vérifie si une catégorie de cookies est autorisée
     */
    window.hasAnalyticsConsent = function() {
        return consentState.analytics === true;
    };

    window.hasFunctionalConsent = function() {
        return consentState.functional === true;
    };

    // ========== INTERFACE UTILISATEUR ==========

    /**
     * Crée la bannière de consentement
     */
    function createCookieBanner() {
        const banner = document.createElement('div');
        banner.id = 'cookie-banner';
        banner.innerHTML = `
            <div class="cookie-banner-content">
                <div class="cookie-banner-text">
                    <h3>🍪 Gestion des cookies</h3>
                    <p>
                        Nous utilisons des cookies pour améliorer votre expérience sur notre site. 
                        Certains cookies sont essentiels au fonctionnement du site, 
                        tandis que d'autres nous aident à comprendre comment vous utilisez notre site.
                        <a href="/confidentialite" target="_blank">En savoir plus</a>
                    </p>
                </div>
                <div class="cookie-banner-buttons">
                    <button class="cookie-btn cookie-btn-reject" id="cookie-reject-btn">
                        Tout refuser
                    </button>
                    <button class="cookie-btn cookie-btn-customize" id="cookie-customize-btn">
                        Personnaliser
                    </button>
                    <button class="cookie-btn cookie-btn-accept" id="cookie-accept-btn">
                        Tout accepter
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(banner);
        
        // Ajouter les event listeners
        document.getElementById('cookie-reject-btn').addEventListener('click', rejectAll);
        document.getElementById('cookie-customize-btn').addEventListener('click', openModal);
        document.getElementById('cookie-accept-btn').addEventListener('click', acceptAll);
        
        // Afficher la bannière avec animation
        setTimeout(() => {
            banner.classList.add('show');
        }, 500);
    }

    /**
     * Crée le modal de personnalisation
     */
    function createCookieModal() {
        const modal = document.createElement('div');
        modal.id = 'cookie-modal';
        modal.innerHTML = `
            <div class="cookie-modal-content">
                <div class="cookie-modal-header">
                    <h2>⚙️ Gérer mes cookies</h2>
                    <button class="cookie-modal-close" id="cookie-modal-close-btn">&times;</button>
                </div>
                <div class="cookie-modal-body">
                    <div class="cookie-category">
                        <div class="cookie-category-header">
                            <h3>🔒 Cookies essentiels</h3>
                            <span class="always-active">Toujours actifs</span>
                        </div>
                        <p>
                            Ces cookies sont nécessaires au fonctionnement du site et ne peuvent pas être désactivés. 
                            Ils permettent des fonctionnalités de base comme la navigation sécurisée et l'accès à votre panier.
                        </p>
                    </div>

                    <div class="cookie-category">
                        <div class="cookie-category-header">
                            <h3>📊 Cookies analytiques</h3>
                            <label class="cookie-switch">
                                <input type="checkbox" id="consent-analytics">
                                <span class="cookie-slider"></span>
                            </label>
                        </div>
                        <p>
                            Ces cookies nous permettent de mesurer l'audience de notre site et d'analyser les visites 
                            pour améliorer nos services. Aucune donnée personnelle n'est collectée.
                        </p>
                    </div>

                    <div class="cookie-category">
                        <div class="cookie-category-header">
                            <h3>⚡ Cookies fonctionnels</h3>
                            <label class="cookie-switch">
                                <input type="checkbox" id="consent-functional">
                                <span class="cookie-slider"></span>
                            </label>
                        </div>
                        <p>
                            Ces cookies améliorent votre expérience en mémorisant vos préférences 
                            (devise, langue) et en facilitant votre navigation sur le site.
                        </p>
                    </div>
                </div>
                <div class="cookie-modal-footer">
                    <button class="cookie-btn cookie-btn-reject" id="cookie-save-custom-btn">
                        Enregistrer mes choix
                    </button>
                    <button class="cookie-btn cookie-btn-accept" id="cookie-accept-modal-btn">
                        Tout accepter
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Ajouter les event listeners
        document.getElementById('cookie-modal-close-btn').addEventListener('click', closeModal);
        document.getElementById('cookie-save-custom-btn').addEventListener('click', saveCustomConsent);
        document.getElementById('cookie-accept-modal-btn').addEventListener('click', acceptAll);

        // Fermer le modal en cliquant en dehors
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                window.cookieConsent.closeModal();
            }
        });
    }

    /**
     * Crée le bouton de gestion des cookies (affiché après consentement)
     */
    function createSettingsButton() {
        const button = document.createElement('button');
        button.id = 'cookie-settings-btn';
        button.innerHTML = 'COOKIES';
        button.title = 'Gérer mes préférences de cookies';
        button.addEventListener('click', openModal);
        document.body.appendChild(button);
        
        // Afficher le bouton uniquement si le consentement a été donné
        if (loadConsent()) {
            button.classList.add('show');
        }
    }

    /**
     * Cache la bannière
     */
    function hideBanner() {
        const banner = document.getElementById('cookie-banner');
        if (banner) {
            banner.classList.remove('show');
            setTimeout(() => {
                banner.remove();
            }, 400);
        }
        
        // Afficher le bouton de gestion
        const settingsBtn = document.getElementById('cookie-settings-btn');
        if (settingsBtn) {
            settingsBtn.classList.add('show');
        }
    }

    /**
     * Ouvre le modal de personnalisation
     */
    function openModal() {
        const modal = document.getElementById('cookie-modal');
        if (modal) {
            // Mettre à jour les valeurs des checkboxes
            document.getElementById('consent-analytics').checked = consentState.analytics;
            document.getElementById('consent-functional').checked = consentState.functional;
            
            modal.classList.add('show');
            document.body.style.overflow = 'hidden'; // Empêcher le scroll
        }
    }

    /**
     * Ferme le modal
     */
    function closeModal() {
        const modal = document.getElementById('cookie-modal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = ''; // Restaurer le scroll
        }
    }

    /**
     * Accepter tous les cookies
     */
    function acceptAll() {
        consentState.essential = true;
        consentState.analytics = true;
        consentState.functional = true;
        saveConsent();
        hideBanner();
        closeModal();
        
        console.log('✅ Tous les cookies acceptés');
    }

    /**
     * Refuser tous les cookies non essentiels
     */
    function rejectAll() {
        consentState.essential = true;
        consentState.analytics = false;
        consentState.functional = false;
        saveConsent();
        hideBanner();
        closeModal();
        
        // Supprimer les cookies analytiques existants si présents
        deleteCookie('bomba_visitor_id');
        
        console.log('❌ Cookies non essentiels refusés');
    }

    /**
     * Sauvegarder les préférences personnalisées
     */
    function saveCustomConsent() {
        consentState.essential = true; // Toujours vrai
        consentState.analytics = document.getElementById('consent-analytics').checked;
        consentState.functional = document.getElementById('consent-functional').checked;
        saveConsent();
        hideBanner();
        closeModal();
        
        // Supprimer les cookies analytiques si refusés
        if (!consentState.analytics) {
            deleteCookie('bomba_visitor_id');
        }
        
        console.log('💾 Préférences personnalisées sauvegardées:', consentState);
    }

    // ========== EXPOSITION DES FONCTIONS PUBLIQUES ==========
    window.cookieConsent = {
        acceptAll: acceptAll,
        rejectAll: rejectAll,
        openModal: openModal,
        closeModal: closeModal,
        saveCustomConsent: saveCustomConsent,
        hasAnalyticsConsent: hasAnalyticsConsent,
        hasFunctionalConsent: hasFunctionalConsent,
        getConsentState: function() { return consentState; }
    };

    // ========== INITIALISATION ==========
    function init() {
        // Charger le lien CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/css/cookie-banner.css';
        document.head.appendChild(link);

        // Vérifier si le consentement existe déjà
        const hasConsent = loadConsent();
        
        if (!hasConsent) {
            // Créer et afficher la bannière si pas de consentement
            createCookieBanner();
        }
        
        // Toujours créer le modal et le bouton de paramètres
        createCookieModal();
        createSettingsButton();

        console.log('🍪 Système de consentement des cookies initialisé');
    }

    // Initialiser au chargement du DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
