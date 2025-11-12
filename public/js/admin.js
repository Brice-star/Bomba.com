// ================================================
// BOMBA - Script admin dashboard
// ================================================

// Capturer toutes les erreurs JavaScript
window.addEventListener('error', (e) => {
    console.error('❌ ERREUR JAVASCRIPT:', e.message, 'à la ligne', e.lineno);
    console.error('Fichier:', e.filename);
    console.error('Erreur complète:', e.error);
});

// Capturer les promesses rejetées non gérées
window.addEventListener('unhandledrejection', (e) => {
    console.error('❌ PROMESSE REJETÉE:', e.reason);
});

let commandesData = [];
let produitsData = [];
let filtreStatutActuel = 'all';
let autoRefreshInterval = null;
let dernierNombreCommandes = 0;

// Log immédiat pour vérifier que le fichier se charge
console.log('✅ Fichier admin.js chargé');

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initialisation du dashboard admin...');
    
    try {
        // Charger les données avec délai pour voir les logs
        setTimeout(() => {
            chargerStatistiques();
            chargerCommandes();
            chargerProduits();
            chargerGraphiques(); // ✅ Charger les graphiques au démarrage
            chargerDonneesCalendrier(); // ✅ Charger les données du calendrier
            
            // ✅ DÉMARRER L'AUTO-REFRESH ICI (après chargement initial)
            setTimeout(() => {
                demarrerAutoRefresh();
                
                // Initialiser le compteur avec les données actuelles
                fetch('/api/admin/statistiques', { credentials: 'include' })
                    .then(res => res.json())
                    .then(stats => {
                        dernierNombreCommandes = stats.total_commandes || 0;
                        console.log(`📊 Compteur initial: ${dernierNombreCommandes} commandes`);
                    })
                    .catch(err => console.error('Erreur initialisation compteur:', err));
            }, 2000); // Démarrer après 2 secondes
        }, 100);
    
    // Event listeners pour la navigation
    document.querySelectorAll('.admin-nav-item[data-section]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.getAttribute('data-section');
            afficherSection(section);
        });
    });
    
    // Event listener pour la déconnexion
    const deconnexionBtn = document.getElementById('deconnexionBtn');
    if (deconnexionBtn) {
        deconnexionBtn.addEventListener('click', (e) => {
            e.preventDefault();
            deconnexion();
        });
    }
    
    // Event listeners pour les filtres de commandes
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            filtrerCommandes(filter);
        });
    });
    
    // Event listener pour ajouter un produit
    const ajouterBtn = document.getElementById('ajouterProduitBtn');
    if (ajouterBtn) {
        ajouterBtn.addEventListener('click', afficherModalAjoutProduit);
    }
    
    // Event listeners pour fermer les modals
    document.querySelectorAll('.modal-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modalId = this.getAttribute('data-modal');
            fermerModal(modalId);
        });
    });
    
    // Event listener pour le formulaire produit
    const produitForm = document.getElementById('produitForm');
    if (produitForm) {
        produitForm.addEventListener('submit', sauvegarderProduit);
    }
    
    // Event listener pour annuler le modal produit
    const annulerBtn = document.getElementById('annulerProduitBtn');
    if (annulerBtn) {
        annulerBtn.addEventListener('click', () => {
            fermerModal('modalProduit');
        });
    }
    
    // Initialiser l'upload d'images
    initUploadImages();
    
    // Initialiser les onglets analytics
    initAnalyticsTabs();
    
    // Initialiser le calendrier
    initCalendrier();
    
    // Event listener pour le sélecteur de devise des statistiques
    const deviseAffichageSelect = document.getElementById('deviseAffichage');
    if (deviseAffichageSelect) {
        deviseAffichageSelect.addEventListener('change', afficherRevenus);
    }
    
    console.log('✅ Dashboard initialisé avec succès');
    
    } catch (error) {
        console.error('❌ ERREUR lors de l\'initialisation:', error);
    }
});

// ==================== NAVIGATION ====================

function afficherSection(section) {
    // Cacher toutes les sections
    document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));
    
    // Retirer la classe active de tous les liens
    document.querySelectorAll('.admin-nav-item').forEach(item => item.classList.remove('active'));
    
    // Afficher la section demandée
    document.getElementById(`section-${section}`).classList.remove('hidden');
    
    // Mettre à jour le titre
    const titres = {
        'statistiques': 'Statistiques',
        'commandes': 'Gestion des commandes',
        'produits': 'Gestion des produits'
    };
    document.getElementById('sectionTitle').textContent = titres[section] || section;
    
    // Activer le lien de navigation correspondant
    document.querySelector(`.admin-nav-item[data-section="${section}"]`)?.classList.add('active');
}

async function deconnexion() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        try {
            await fetch('/api/admin/logout', { method: 'POST' });
            window.location.href = '/admin/login';
        } catch (error) {
            console.error('Erreur déconnexion:', error);
        }
    }
}

// ==================== STATISTIQUES ====================

// Variable globale pour stocker les revenus par devise
let revenusParDeviseGlobal = {};

// Fonction pour afficher les revenus selon la devise sélectionnée
function afficherRevenus() {
    const deviseSelectionnee = document.getElementById('deviseAffichage')?.value || 'origine';
    const revenusElement = document.getElementById('revenusTotal');
    const detailsElement = document.getElementById('detailsDevises');
    
    if (Object.keys(revenusParDeviseGlobal).length === 0) {
        revenusElement.textContent = formaterMontant(0, 'XAF');
        detailsElement.innerHTML = '';
        return;
    }
    
    if (deviseSelectionnee === 'origine') {
        // Mode détail : afficher toutes les devises
        const devises = Object.keys(revenusParDeviseGlobal);
        if (devises.length === 1) {
            // Une seule devise
            const devise = devises[0];
            revenusElement.textContent = formaterMontant(revenusParDeviseGlobal[devise], devise);
            detailsElement.innerHTML = '';
        } else {
            // Plusieurs devises : afficher le principal + détails
            const principale = devises[0];
            revenusElement.textContent = formaterMontant(revenusParDeviseGlobal[principale], principale);
            
            // Afficher les détails
            const autresDevises = devises.slice(1).map(devise => 
                `+ ${formaterMontant(revenusParDeviseGlobal[devise], devise)}`
            ).join('<br>');
            detailsElement.innerHTML = autresDevises;
        }
    } else {
        // Mode conversion : convertir tout dans la devise sélectionnée
        let totalConverti = 0;
        const details = [];
        
        Object.keys(revenusParDeviseGlobal).forEach(deviseOriginale => {
            const montant = revenusParDeviseGlobal[deviseOriginale];
            const montantConverti = convertirDevise(montant, deviseOriginale, deviseSelectionnee);
            totalConverti += montantConverti;
            
            // Ajouter aux détails
            details.push(`${formaterMontant(montant, deviseOriginale)} = ${formaterMontant(montantConverti, deviseSelectionnee)}`);
        });
        
        revenusElement.textContent = formaterMontant(totalConverti, deviseSelectionnee);
        
        if (details.length > 1) {
            detailsElement.innerHTML = '<div style="opacity: 0.8;">' + details.join('<br>') + '</div>';
        } else {
            detailsElement.innerHTML = '';
        }
    }
}

async function chargerStatistiques() {
    try {
        console.log('📊 Chargement des statistiques...');
        const response = await fetch('/api/admin/statistiques');
        
        if (response.status === 429) {
            console.warn('⚠️ Rate limit atteint pour les statistiques');
            return; // Ne pas afficher d'erreur, juste ne pas recharger
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const stats = await response.json();
        console.log('✅ Statistiques chargées:', stats);
        
        // Stocker les revenus par devise globalement
        revenusParDeviseGlobal = stats.revenusParDevise || {};
        
        // Statistiques commandes/produits
        document.getElementById('totalVentes').textContent = stats.totalVentes || 0;
        document.getElementById('commandesEnAttente').textContent = stats.commandesEnAttente || 0;
        
        // Afficher les revenus selon la sélection
        afficherRevenus();
        
        document.getElementById('produitsTotal').textContent = stats.produitsTotal || 0;
        
        // Statistiques visites
        document.getElementById('visiteursAujourdhui').textContent = stats.aujourdhui.visiteurs_uniques || 0;
        document.getElementById('pagesVuesAujourdhui').textContent = stats.aujourdhui.nombre_visites || 0;
        
        // Visiteurs UNIQUES sur 7 jours (nouvelle méthode: compte chaque personne 1 seule fois)
        document.getElementById('visiteurs7jours').textContent = stats.visiteurs7joursUniques || 0;
        
        // Visiteurs UNIQUES GLOBAUX (nouvelle méthode: compte chaque personne 1 seule fois sur toute la période)
        document.getElementById('visiteursTotal').textContent = stats.visiteursUniquesGlobal || 0;
        
        console.log('✅ Toutes les statistiques affichées');
    } catch (error) {
        console.error('❌ Erreur chargement statistiques:', error);
        // Afficher des valeurs par défaut en cas d'erreur
        document.getElementById('totalVentes').textContent = '-';
        document.getElementById('commandesEnAttente').textContent = '-';
        document.getElementById('revenusTotal').textContent = formaterMontant(0, 'XAF');
        document.getElementById('produitsTotal').textContent = '-';
        document.getElementById('visiteursAujourdhui').textContent = '-';
        document.getElementById('pagesVuesAujourdhui').textContent = '-';
        document.getElementById('visiteurs7jours').textContent = '-';
        document.getElementById('visiteursTotal').textContent = '-';
    }
}

// ==================== COMMANDES ====================

async function chargerCommandes() {
    try {
        console.log('📦 Chargement des commandes...');
        const response = await fetch('/api/admin/commandes');
        
        if (response.status === 429) {
            throw new Error('RATE_LIMIT');
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        commandesData = await response.json();
        console.log(`✅ ${commandesData.length} commandes chargées`);
        
        // Mettre à jour le badge de notifications
        await mettreAJourBadgeNotifications();
        
        afficherCommandes();
    } catch (error) {
        console.error('❌ Erreur chargement commandes:', error);
        const tbody = document.getElementById('commandesTableBody');
        if (tbody) {
            if (error.message === 'RATE_LIMIT') {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="color: orange; padding: 2rem;"><strong>⚠️ Trop de requêtes</strong><br>Veuillez patienter quelques secondes avant de rafraîchir à nouveau.</td></tr>';
            } else {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="color: red;">Erreur de chargement des commandes</td></tr>';
            }
        }
    }
}

// Mettre à jour le badge de notifications
async function mettreAJourBadgeNotifications() {
    try {
        const response = await fetch('/api/admin/commandes/non-vues/count');
        const data = await response.json();
        const badge = document.getElementById('badgeNouvellesCommandes');
        
        if (data.count > 0) {
            badge.textContent = data.count;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    } catch (error) {
        console.error('❌ Erreur mise à jour badge:', error);
    }
}

function afficherCommandes() {
    const tbody = document.getElementById('commandesTableBody');
    
    // Filtrer les commandes
    let commandesFiltrees = commandesData;
    if (filtreStatutActuel !== 'all') {
        commandesFiltrees = commandesData.filter(c => c.statut === filtreStatutActuel);
    }
    
    if (commandesFiltrees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Aucune commande trouvée</td></tr>';
        return;
    }
    
    tbody.innerHTML = commandesFiltrees.map(commande => {
        // Extraire les références des produits de la commande
        const produits = JSON.parse(commande.produits_commandes || '[]');
        const references = produits.map(p => {
            if (p.reference) return p.reference;
            return p.id ? `BOMBA-${String(p.id).padStart(4, '0')}` : 'N/A';
        });
        const referencesAffichees = references.length > 2 
            ? references.slice(0, 2).join(', ') + `... (+${references.length - 2})`
            : references.join(', ');
        
        // Indicateur visuel pour nouvelle commande
        const nouvelleCommande = !commande.vue;
        const badgeNouveau = nouvelleCommande ? '<span style="display: inline-block; width: 8px; height: 8px; background: #ff4444; border-radius: 50%; margin-left: 5px; animation: pulse 2s infinite;" title="Nouvelle commande"></span>' : '';
        
        return `
        <tr style="${nouvelleCommande ? 'background: rgba(255, 68, 68, 0.05);' : ''}">
            <td><strong>${commande.numero_commande}${badgeNouveau}</strong></td>
            <td>${commande.nom_client}</td>
            <td>${commande.pays}</td>
            <td><span style="color: var(--marron-clair); font-weight: 600; font-size: 0.9rem;">${referencesAffichees}</span></td>
            <td><strong>${formaterMontant(commande.montant_total, commande.devise || 'XAF')}</strong></td>
            <td>${new Date(commande.date_commande).toLocaleDateString('fr-FR')}</td>
            <td><span class="status-badge status-${commande.statut.toLowerCase().replace(' ', '-')}">${commande.statut}</span></td>
            <td class="action-buttons">
                <button class="btn-icon btn-view" data-action="view" data-commande-id="${commande.id}" title="Voir">👁️</button>
                <button class="btn-icon btn-edit" data-action="edit-status" data-commande-id="${commande.id}" title="Modifier">✏️</button>
            </td>
        </tr>
        `;
    }).join('');
    
    // Ajouter les event listeners pour les boutons d'action
    document.querySelectorAll('.btn-icon[data-action="view"]').forEach(btn => {
        btn.addEventListener('click', async function() {
            const commandeId = this.getAttribute('data-commande-id');
            await afficherDetailsCommande(parseInt(commandeId));
        });
    });
    
    document.querySelectorAll('.btn-icon[data-action="edit-status"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const commandeId = this.getAttribute('data-commande-id');
            modifierStatutCommande(parseInt(commandeId));
        });
    });
}

function filtrerCommandes(statut) {
    filtreStatutActuel = statut;
    afficherCommandes();
    
    // Mettre à jour les onglets actifs
    document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
}

async function afficherDetailsCommande(commandeId) {
    const commande = commandesData.find(c => c.id === commandeId);
    if (!commande) return;
    
    // Marquer la commande comme vue (attendre la fin avant d'afficher les détails)
    await marquerCommandeCommeVue(commandeId);
    
    const produits = JSON.parse(commande.produits_commandes || '[]');
    
    const detailsHTML = `
        <div class="order-detail-section">
            <h3>Informations générales</h3>
            <div class="order-detail-line">
                <span>Numéro:</span>
                <strong>${commande.numero_commande}</strong>
            </div>
            <div class="order-detail-line">
                <span>Date:</span>
                <strong>${new Date(commande.date_commande).toLocaleDateString('fr-FR')}</strong>
            </div>
            <div class="order-detail-line">
                <span>Statut:</span>
                <strong>${commande.statut}</strong>
            </div>
        </div>
        
        <div class="order-detail-section">
            <h3>Client</h3>
            <div class="order-detail-line">
                <span>Nom:</span>
                <strong>${commande.nom_client}</strong>
            </div>
            <div class="order-detail-line">
                <span>Email:</span>
                <strong>${commande.email_client}</strong>
            </div>
            <div class="order-detail-line">
                <span>Téléphone:</span>
                <strong>${commande.telephone_client}</strong>
            </div>
            <div class="order-detail-line">
                <span>Pays:</span>
                <strong>${commande.pays}</strong>
            </div>
            <div class="order-detail-line">
                <span>Adresse:</span>
                <strong>${commande.adresse_livraison}</strong>
            </div>
        </div>
        
        <div class="order-detail-section">
            <h3>Produits commandés</h3>
            ${produits.map((p, index) => {
                console.log('Produit dans commande:', p);
                const produitId = p.id || 'undefined';
                const produitNom = (p.nom || 'Produit sans nom').replace(/'/g, "\\'");
                return `
                <div class="product-list-item" style="display: flex; gap: 1rem; align-items: flex-start; padding: 1rem; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 1rem; background: white;">
                    ${p.image ? `
                        <div style="flex-shrink: 0;">
                            <img src="${p.image}" 
                                 alt="${p.nom}" 
                                 style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; display: block;">
                        </div>
                    ` : ''}
                    <div style="flex: 1;">
                        <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 0.5rem;">${p.nom}</div>
                        <div style="color: #666; font-size: 0.9rem; margin-bottom: 0.3rem;">
                            📋 Référence: <strong style="color: var(--marron-clair);">${p.reference || (p.id ? `BOMBA-${String(p.id).padStart(4, '0')}` : 'N/A')}</strong>
                        </div>
                        <div style="color: #666; margin-bottom: 0.3rem;">📏 Taille: <strong>${p.taille}</strong></div>
                        <div style="color: #666; margin-bottom: 0.3rem;">📦 Quantité: <strong>${p.quantite}</strong></div>
                        <div style="color: var(--vert-profond); font-weight: 600; font-size: 1.05rem; margin-bottom: 0.5rem;">💰 ${formaterMontant(p.prix, p.devise || 'XAF')}</div>
                        
                        <button class="btn-voir-galerie" 
                                data-produit-id="${produitId}" 
                                data-produit-nom="${produitNom}"
                                style="background: var(--marron-fonce); color: white; border: none; padding: 0.5rem 1rem; border-radius: 5px; cursor: pointer; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 0.5rem;">
                            📷 Voir toutes les photos
                        </button>
                    </div>
                </div>
            `}).join('')}
        </div>
        
        <div class="order-detail-section">
            <div class="order-detail-line" style="font-size: 1.25rem;">
                <span>Total:</span>
                <strong style="color: var(--vert-profond);">${formaterMontant(commande.montant_total, commande.devise || 'XAF')}</strong>
            </div>
            <div class="order-detail-line">
                <span>Livraison estimée:</span>
                <strong>${new Date(commande.date_livraison_estimee).toLocaleDateString('fr-FR')}</strong>
            </div>
        </div>
    `;
    
    document.getElementById('detailsCommande').innerHTML = detailsHTML;
    document.getElementById('modalCommande').classList.remove('hidden');
    
    // Attacher les événements aux boutons de galerie
    setTimeout(() => {
        document.querySelectorAll('.btn-voir-galerie').forEach(btn => {
            btn.addEventListener('click', function() {
                const produitId = this.getAttribute('data-produit-id');
                const produitNom = this.getAttribute('data-produit-nom');
                console.log('📷 Bouton cliqué - ID:', produitId, 'Nom:', produitNom);
                window.afficherGalerieProduit(produitId, produitNom);
            });
        });
    }, 100);
}

async function modifierStatutCommande(commandeId) {
    const commande = commandesData.find(c => c.id === commandeId);
    if (!commande) return;
    
    const detailsHTML = `
        <div class="order-detail-section">
            <p><strong>Commande:</strong> ${commande.numero_commande}</p>
            <p><strong>Client:</strong> ${commande.nom_client}</p>
        </div>
        
        <div class="form-group">
            <label for="statutSelect">Changer le statut:</label>
            <select id="statutSelect" class="status-select">
                <option value="En cours" ${commande.statut === 'En cours' ? 'selected' : ''}>En cours</option>
                <option value="Préparation" ${commande.statut === 'Préparation' ? 'selected' : ''}>En préparation</option>
                <option value="Expédiée" ${commande.statut === 'Expédiée' ? 'selected' : ''}>Expédiée</option>
                <option value="Livrée" ${commande.statut === 'Livrée' ? 'selected' : ''}>Livrée</option>
            </select>
        </div>
        
        <button class="btn btn-primary" id="sauvegarderStatutBtn" data-commande-id="${commandeId}" style="width: 100%; margin-top: 1rem;">
            Enregistrer
        </button>
    `;
    
    document.getElementById('detailsCommande').innerHTML = detailsHTML;
    document.getElementById('modalCommande').classList.remove('hidden');
    
    // Event listener pour le bouton sauvegarder
    document.getElementById('sauvegarderStatutBtn').addEventListener('click', function() {
        const commandeId = parseInt(this.getAttribute('data-commande-id'));
        sauvegarderStatutCommande(commandeId);
    });
}

async function sauvegarderStatutCommande(commandeId) {
    const nouveauStatut = document.getElementById('statutSelect').value;
    
    try {
        const response = await fetch(`/api/admin/commandes/${commandeId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ statut: nouveauStatut })
        });
        
        if (response.ok) {
            alert('Statut mis à jour avec succès');
            fermerModal('modalCommande');
            chargerCommandes();
            chargerStatistiques();
        } else {
            alert('Erreur lors de la mise à jour');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la mise à jour');
    }
}

// Marquer une commande comme vue
async function marquerCommandeCommeVue(commandeId) {
    try {
        const response = await fetch(`/api/admin/commandes/${commandeId}/marquer-vue`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Erreur lors du marquage');
        }
        
        // Mettre à jour localement dans les données
        const commande = commandesData.find(c => c.id === commandeId);
        if (commande && !commande.vue) {
            commande.vue = true;
            console.log(`✅ Commande ${commandeId} marquée comme vue`);
            
            // Mettre à jour le badge uniquement
            await mettreAJourBadgeNotifications();
            
            // Mettre à jour visuellement la ligne du tableau si elle est visible
            const row = document.querySelector(`button[data-commande-id="${commandeId}"]`)?.closest('tr');
            if (row) {
                row.style.background = '';
                const badge = row.querySelector('td:first-child span[title="Nouvelle commande"]');
                if (badge) {
                    badge.remove();
                }
            }
        }
    } catch (error) {
        console.error('❌ Erreur marquage commande:', error);
    }
}

// ==================== PRODUITS ====================

async function chargerProduits() {
    try {
        console.log('👔 Chargement des produits...');
        const response = await fetch('/api/produits');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        produitsData = await response.json();
        console.log(`✅ ${produitsData.length} produits chargés`);
        afficherProduits();
    } catch (error) {
        console.error('❌ Erreur chargement produits:', error);
        const tbody = document.getElementById('produitsTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color: red;">Erreur de chargement des produits</td></tr>';
        }
    }
}

function afficherProduits() {
    const tbody = document.getElementById('produitsTableBody');
    
    if (produitsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Aucun produit trouvé</td></tr>';
        return;
    }
    
    tbody.innerHTML = produitsData.map(produit => `
        <tr>
            <td><img src="${produit.image_principale}" alt="${produit.nom}" onerror="this.src='/images/products/placeholder.jpg'"></td>
            <td><strong style="color: var(--marron-clair);">${produit.reference || `BOMBA-${String(produit.id).padStart(4, '0')}`}</strong></td>
            <td><strong>${produit.nom}</strong></td>
            <td>${produit.categorie}</td>
            <td><strong>${formaterMontant(produit.prix, produit.devise || 'XAF')}</strong></td>
            <td>${produit.tailles_disponibles}</td>
            <td class="action-buttons">
                <button class="btn-icon btn-edit" data-action="edit-product" data-produit-id="${produit.id}" title="Modifier">✏️</button>
                <button class="btn-icon btn-delete" data-action="delete-product" data-produit-id="${produit.id}" title="Supprimer">🗑️</button>
            </td>
        </tr>
    `).join('');
    
    // Ajouter les event listeners pour les boutons d'action
    document.querySelectorAll('.btn-icon[data-action="edit-product"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const produitId = parseInt(this.getAttribute('data-produit-id'));
            modifierProduit(produitId);
        });
    });
    
    document.querySelectorAll('.btn-icon[data-action="delete-product"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const produitId = parseInt(this.getAttribute('data-produit-id'));
            supprimerProduit(produitId);
        });
    });
}

function afficherModalAjoutProduit() {
    document.getElementById('modalProduitTitle').textContent = 'Ajouter un produit';
    document.getElementById('produitForm').reset();
    document.getElementById('produitId').value = '';
    
    // Réinitialiser les uploads d'images
    resetUploadImages();
    
    document.getElementById('modalProduit').classList.remove('hidden');
}

function modifierProduit(produitId) {
    const produit = produitsData.find(p => p.id === produitId);
    if (!produit) return;
    
    document.getElementById('modalProduitTitle').textContent = 'Modifier le produit';
    document.getElementById('produitId').value = produit.id;
    document.getElementById('produitNom').value = produit.nom;
    document.getElementById('produitDescription').value = produit.description;
    document.getElementById('produitTextileDisponibilite').value = produit.textile_disponibilite || '';
    document.getElementById('produitPrix').value = produit.prix;
    document.getElementById('produitDevise').value = produit.devise || 'XAF';
    document.getElementById('produitCategorie').value = produit.categorie;
    
    // Cocher les tailles disponibles
    const tailles = produit.tailles_disponibles.split(',').map(t => t.trim());
    document.querySelectorAll('.taille-checkbox').forEach(checkbox => {
        checkbox.checked = tailles.includes(checkbox.value);
    });
    
    // Charger les images existantes
    chargerImagesExistantes(produit.image_principale, produit.images_secondaires);
    
    document.getElementById('modalProduit').classList.remove('hidden');
}

async function sauvegarderProduit(event) {
    event.preventDefault();
    
    const produitId = document.getElementById('produitId').value;
    const taillesSelectionnees = Array.from(document.querySelectorAll('.taille-checkbox:checked'))
        .map(cb => cb.value)
        .join(',');
    
    if (!taillesSelectionnees) {
        alert('Veuillez sélectionner au moins une taille');
        return;
    }
    
    const textileDisponibilite = document.getElementById('produitTextileDisponibilite').value.trim();
    
    const produitData = {
        nom: document.getElementById('produitNom').value,
        description: document.getElementById('produitDescription').value,
        textile_disponibilite: textileDisponibilite || 'Chaque tenue BOMBA est fabriquée à la main par des artisans locaux avec des tissus africains authentiques. En raison de la disponibilité variable des tissus sur le marché, le motif exact ou les couleurs peuvent légèrement différer du visuel présenté. Le modèle, la coupe et la qualité restent strictement identiques. Ces variations rendent chaque pièce unique et exclusive.',
        prix: document.getElementById('produitPrix').value,
        devise: document.getElementById('produitDevise').value,
        categorie: document.getElementById('produitCategorie').value,
        image_principale: document.getElementById('produitImagePrincipale').value,
        images_secondaires: document.getElementById('produitImagesSecondaires').value,
        tailles_disponibles: taillesSelectionnees
    };
    
    try {
        const url = produitId ? `/api/admin/produits/${produitId}` : '/api/admin/produits';
        const method = produitId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(produitData)
        });
        
        if (response.ok) {
            alert(produitId ? 'Produit modifié avec succès' : 'Produit ajouté avec succès');
            fermerModal('modalProduit');
            chargerProduits();
            chargerStatistiques();
        } else {
            alert('Erreur lors de l\'enregistrement');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de l\'enregistrement');
    }
}

async function supprimerProduit(produitId) {
    if (!confirm('Voulez-vous vraiment supprimer ce produit ?')) return;
    
    try {
        const response = await fetch(`/api/admin/produits/${produitId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('Produit supprimé avec succès');
            chargerProduits();
            chargerStatistiques();
        } else {
            alert('Erreur lors de la suppression');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la suppression');
    }
}

// ==================== MODALES ====================

function fermerModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// Fermer la modale en cliquant en dehors
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.add('hidden');
    }
}

// ==================== GALERIE PHOTO ====================

window.afficherGalerieProduit = async function(produitId, nomProduit) {
    try {
        console.log('📷 Chargement de la galerie pour le produit', produitId);
        
        // Récupérer les détails complets du produit
        const response = await fetch(`/api/produits/${produitId}`);
        if (!response.ok) {
            throw new Error('Impossible de charger les images du produit');
        }
        
        const produit = await response.json();
        
        // Préparer toutes les images (principale + secondaires)
        const images = [produit.image_principale];
        if (produit.images_secondaires) {
            const imagesSecondaires = produit.images_secondaires.split(',').map(img => img.trim());
            images.push(...imagesSecondaires);
        }
        
        // Créer le HTML de la galerie
        const galerieHTML = `
            <div style="text-align: center; margin-bottom: 1rem;">
                <h2 style="margin: 0; color: var(--marron-fonce);">${nomProduit}</h2>
                <p style="color: #666; margin: 0.5rem 0;">Cliquez sur une image pour la télécharger</p>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; overflow-y: auto; max-height: 70vh; padding: 1rem;">
                ${images.map((img, index) => `
                    <div style="border: 2px solid #e0e0e0; border-radius: 8px; background: #f9f9f9; overflow: hidden;">
                        <img src="${img}" 
                             alt="${nomProduit} - Photo ${index + 1}" 
                             style="width: 100%; height: 300px; object-fit: cover; display: block; cursor: pointer;"
                             onclick="window.open('${img}', '_blank')"
                             title="Cliquer pour agrandir">
                        <div style="padding: 0.75rem; text-align: center; background: white; border-top: 1px solid #e0e0e0;">
                            <strong>Photo ${index + 1}</strong>
                            ${index === 0 ? '<span style="color: var(--vert-profond); font-size: 0.85rem;"> (Principale)</span>' : ''}
                        </div>
                        <button class="btn-download-img" 
                                data-url="${img}" 
                                data-name="${nomProduit.replace(/'/g, '')}-Photo${index + 1}.jpg"
                                style="width: 100%; background: var(--marron-fonce); color: white; border: none; padding: 0.75rem; cursor: pointer; font-size: 0.95rem; font-weight: 500; transition: background 0.2s;">
                            ⬇️ Télécharger cette photo
                        </button>
                    </div>
                `).join('')}
            </div>
            </div>
        `;
        
        document.getElementById('galerieContent').innerHTML = galerieHTML;
        document.getElementById('modalGalerie').classList.remove('hidden');
        
        // Attacher les événements aux boutons de téléchargement
        setTimeout(() => {
            document.querySelectorAll('.btn-download-img').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const url = this.getAttribute('data-url');
                    const name = this.getAttribute('data-name');
                    console.log('🖱️ Clic sur télécharger:', url, name);
                    window.telechargerImage(url, name);
                });
                
                // Ajouter l'effet hover
                btn.addEventListener('mouseover', function() {
                    this.style.background = 'var(--marron-clair)';
                });
                btn.addEventListener('mouseout', function() {
                    this.style.background = 'var(--marron-fonce)';
                });
            });
            console.log(`✅ ${document.querySelectorAll('.btn-download-img').length} boutons de téléchargement attachés`);
        }, 100);
        
    } catch (error) {
        console.error('❌ Erreur chargement galerie:', error);
        alert('Impossible de charger les photos du produit');
    }
}

window.telechargerImage = function(imageUrl, nomFichier) {
    console.log('📥 Téléchargement demandé:', imageUrl, nomFichier);
    
    // Méthode simple et efficace
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = nomFichier;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    // Nettoyer après un court délai
    setTimeout(() => {
        document.body.removeChild(link);
    }, 100);
    
    console.log('✅ Téléchargement lancé');
};

// ==================== GESTION UPLOAD D'IMAGES ====================

// Variables globales pour stocker les images
let imagePrincipaleUrl = '';
let imagesSecondairesUrls = [];

function initUploadImages() {
    console.log('🎨 Initialisation du système d\'upload d\'images...');
    
    // Image principale
    const dropZonePrincipale = document.getElementById('dropZonePrincipale');
    const fileInputPrincipale = document.getElementById('fileInputPrincipale');
    const previewPrincipale = document.getElementById('previewPrincipale');
    const imgPreviewPrincipale = document.getElementById('imgPreviewPrincipale');
    
    // Images secondaires
    const dropZoneSecondaires = document.getElementById('dropZoneSecondaires');
    const fileInputSecondaires = document.getElementById('fileInputSecondaires');
    const previewSecondaires = document.getElementById('previewSecondaires');
    
    if (!dropZonePrincipale || !dropZoneSecondaires) {
        console.error('❌ Éléments d\'upload non trouvés');
        return;
    }
    
    // ===== IMAGE PRINCIPALE =====
    
    // Click sur la drop zone
    dropZonePrincipale.addEventListener('click', () => {
        fileInputPrincipale.click();
    });
    
    // Drag & Drop événements
    dropZonePrincipale.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZonePrincipale.classList.add('dragover');
    });
    
    dropZonePrincipale.addEventListener('dragleave', () => {
        dropZonePrincipale.classList.remove('dragover');
    });
    
    dropZonePrincipale.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZonePrincipale.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            uploadImagePrincipale(files[0]);
        }
    });
    
    // Sélection de fichier
    fileInputPrincipale.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            uploadImagePrincipale(file);
        }
    });
    
    // Bouton supprimer image principale
    document.addEventListener('click', (e) => {
        if (e.target.closest('.btn-remove-image[data-target="principale"]')) {
            supprimerImagePrincipale();
        }
    });
    
    // ===== IMAGES SECONDAIRES =====
    
    // Click sur la drop zone
    dropZoneSecondaires.addEventListener('click', () => {
        fileInputSecondaires.click();
    });
    
    // Drag & Drop événements
    dropZoneSecondaires.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZoneSecondaires.classList.add('dragover');
    });
    
    dropZoneSecondaires.addEventListener('dragleave', () => {
        dropZoneSecondaires.classList.remove('dragover');
    });
    
    dropZoneSecondaires.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZoneSecondaires.classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            uploadImagesSecondaires(files);
        }
    });
    
    // Sélection de fichiers multiples
    fileInputSecondaires.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            uploadImagesSecondaires(files);
        }
    });
    
    console.log('✅ Système d\'upload initialisé');
}

async function uploadImagePrincipale(file) {
    console.log('📤 Upload image principale:', file.name);
    
    // Validation
    if (!file.type.startsWith('image/')) {
        alert('❌ Veuillez sélectionner un fichier image valide');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        alert('❌ L\'image ne doit pas dépasser 10 MB');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('image', file);
        
        // Afficher le loader
        const dropZone = document.getElementById('dropZonePrincipale');
        dropZone.innerHTML = '<div class="upload-loading"><div class="spinner"></div> Upload en cours...</div>';
        
        const response = await fetch('/api/admin/upload-image', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('❌ Erreur serveur:', data);
            throw new Error(data.error || 'Erreur lors de l\'upload');
        }
        
        if (data.success) {
            imagePrincipaleUrl = data.imagePath;
            document.getElementById('produitImagePrincipale').value = data.imagePath;
            
            // Afficher la prévisualisation
            const imgPreview = document.getElementById('imgPreviewPrincipale');
            imgPreview.src = data.imagePath;
            document.getElementById('previewPrincipale').classList.remove('hidden');
            document.getElementById('dropZonePrincipale').classList.add('hidden');
            
            console.log('✅ Image principale uploadée:', data.imagePath);
        } else {
            throw new Error(data.error || 'Erreur inconnue');
        }
    } catch (error) {
        console.error('❌ Erreur upload:', error);
        alert('❌ Erreur lors de l\'upload de l\'image: ' + error.message);
        
        // Restaurer la drop zone
        restaurerDropZonePrincipale();
    }
}

function supprimerImagePrincipale() {
    console.log('🗑️ Suppression image principale');
    
    imagePrincipaleUrl = '';
    document.getElementById('produitImagePrincipale').value = '';
    document.getElementById('previewPrincipale').classList.add('hidden');
    document.getElementById('dropZonePrincipale').classList.remove('hidden');
    
    // Restaurer le contenu de la drop zone
    restaurerDropZonePrincipale();
}

function restaurerDropZonePrincipale() {
    document.getElementById('dropZonePrincipale').innerHTML = `
        <div class="drop-zone-content">
            <span class="drop-zone-icon">📤</span>
            <p>Cliquez ou glissez-déposez votre image ici</p>
            <small>JPEG, PNG, WebP, GIF - Maximum 5MB</small>
        </div>
    `;
}

async function uploadImagesSecondaires(files) {
    console.log('📤 Upload images secondaires:', files.length, 'fichiers');
    
    // Vérifier le nombre total d'images
    if (imagesSecondairesUrls.length + files.length > 5) {
        alert('❌ Vous ne pouvez pas ajouter plus de 5 images secondaires');
        return;
    }
    
    // Valider chaque fichier
    for (const file of files) {
        if (!file.type.startsWith('image/')) {
            alert('❌ Tous les fichiers doivent être des images');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            alert('❌ Chaque image ne doit pas dépasser 10 MB');
            return;
        }
    }
    
    try {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('images', file);
        });
        
        // Afficher le loader
        const dropZone = document.getElementById('dropZoneSecondaires');
        dropZone.innerHTML = '<div class="upload-loading"><div class="spinner"></div> Upload en cours...</div>';
        
        const response = await fetch('/api/admin/upload-images', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('❌ Erreur serveur:', data);
            throw new Error(data.error || 'Erreur lors de l\'upload');
        }
        
        if (data.success) {
            // Ajouter les nouvelles images
            imagesSecondairesUrls = [...imagesSecondairesUrls, ...data.imagePaths];
            updateImagesSecondairesPreview();
            
            console.log('✅ Images secondaires uploadées:', data.imagePaths);
        } else {
            throw new Error(data.error || 'Erreur inconnue');
        }
    } catch (error) {
        console.error('❌ Erreur upload:', error);
        alert('❌ Erreur lors de l\'upload des images: ' + error.message);
    } finally {
        // Restaurer la drop zone
        restaurerDropZoneSecondaires();
    }
}

function updateImagesSecondairesPreview() {
    const previewContainer = document.getElementById('previewSecondaires');
    const hiddenInput = document.getElementById('produitImagesSecondaires');
    
    // Mettre à jour le champ caché
    hiddenInput.value = imagesSecondairesUrls.join(',');
    
    // Afficher les prévisualisations
    if (imagesSecondairesUrls.length > 0) {
        previewContainer.classList.remove('hidden');
        previewContainer.innerHTML = imagesSecondairesUrls.map((url, index) => `
            <div class="preview-item" draggable="true" data-index="${index}">
                <span class="preview-item-order">${index + 1}</span>
                <img src="${url}" alt="Image ${index + 1}">
                <div class="preview-item-controls">
                    <button type="button" class="btn-remove-secondary" data-index="${index}">
                        ❌
                    </button>
                </div>
            </div>
        `).join('');
        
        // Ajouter les event listeners pour les boutons de suppression
        document.querySelectorAll('.btn-remove-secondary').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const index = parseInt(this.getAttribute('data-index'));
                supprimerImageSecondaire(index);
            });
        });
        
        // Activer le drag & drop pour réorganiser
        initDragAndDropReorder();
    } else {
        previewContainer.classList.add('hidden');
        previewContainer.innerHTML = '';
    }
}

function supprimerImageSecondaire(index) {
    console.log('🗑️ Suppression image secondaire:', index);
    imagesSecondairesUrls.splice(index, 1);
    updateImagesSecondairesPreview();
}

function restaurerDropZoneSecondaires() {
    document.getElementById('dropZoneSecondaires').innerHTML = `
        <div class="drop-zone-content">
            <span class="drop-zone-icon">📤</span>
            <p>Cliquez ou glissez-déposez vos images ici</p>
            <small>Vous pouvez sélectionner plusieurs images à la fois</small>
        </div>
    `;
}

// Drag & Drop pour réorganiser les images secondaires
function initDragAndDropReorder() {
    let draggedIndex = null;
    
    document.querySelectorAll('.preview-item').forEach(item => {
        item.addEventListener('dragstart', function(e) {
            draggedIndex = parseInt(this.getAttribute('data-index'));
            this.classList.add('dragging');
        });
        
        item.addEventListener('dragend', function() {
            this.classList.remove('dragging');
        });
        
        item.addEventListener('dragover', function(e) {
            e.preventDefault();
        });
        
        item.addEventListener('drop', function(e) {
            e.preventDefault();
            const dropIndex = parseInt(this.getAttribute('data-index'));
            
            if (draggedIndex !== null && draggedIndex !== dropIndex) {
                // Réorganiser le tableau
                const draggedItem = imagesSecondairesUrls[draggedIndex];
                imagesSecondairesUrls.splice(draggedIndex, 1);
                imagesSecondairesUrls.splice(dropIndex, 0, draggedItem);
                
                // Mettre à jour l'affichage
                updateImagesSecondairesPreview();
                
                console.log('🔄 Images réorganisées');
            }
        });
    });
}

// Réinitialiser les uploads lors de l'ouverture du modal
function resetUploadImages() {
    console.log('🔄 Réinitialisation des uploads');
    
    imagePrincipaleUrl = '';
    imagesSecondairesUrls = [];
    
    document.getElementById('produitImagePrincipale').value = '';
    document.getElementById('produitImagesSecondaires').value = '';
    
    document.getElementById('previewPrincipale').classList.add('hidden');
    document.getElementById('previewSecondaires').classList.add('hidden');
    
    document.getElementById('dropZonePrincipale').classList.remove('hidden');
    
    restaurerDropZonePrincipale();
    restaurerDropZoneSecondaires();
}

// Charger les images existantes lors de l'édition d'un produit
function chargerImagesExistantes(imagePrincipale, imagesSecondaires) {
    console.log('📥 Chargement images existantes');
    
    // Image principale
    if (imagePrincipale) {
        imagePrincipaleUrl = imagePrincipale;
        document.getElementById('produitImagePrincipale').value = imagePrincipale;
        document.getElementById('imgPreviewPrincipale').src = imagePrincipale;
        document.getElementById('previewPrincipale').classList.remove('hidden');
        document.getElementById('dropZonePrincipale').classList.add('hidden');
    }
    
    // Images secondaires
    if (imagesSecondaires) {
        imagesSecondairesUrls = imagesSecondaires.split(',').filter(url => url.trim() !== '');
        updateImagesSecondairesPreview();
    }
}

console.log('✅ Fonctions d\'upload d\'images chargées');

// ==================== GRAPHIQUES & CALENDRIER ====================

// Variables globales pour les graphiques
let visiteursChart, ventesChart, revenusChart, statutsChart;
let calendarData = {};
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// Initialiser les onglets analytics
function initAnalyticsTabs() {
    const tabs = document.querySelectorAll('.analytics-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Désactiver tous les onglets
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.analytics-content').forEach(c => c.classList.add('hidden'));
            
            // Activer l'onglet sélectionné
            this.classList.add('active');
            document.getElementById('section-' + targetTab).classList.remove('hidden');
            
            // Note: Les graphiques et calendrier sont déjà chargés au démarrage
            // Pas besoin de les recharger
        });
    });
}

// Charger et afficher les graphiques
async function chargerGraphiques() {
    try {
        console.log('📊 Chargement des graphiques...');
        
        // Vérifier que Chart.js est chargé
        if (typeof Chart === 'undefined') {
            console.error('❌ Chart.js n\'est pas chargé !');
            console.error('Vérifiez que le CDN Chart.js est accessible');
            return;
        }
        
        console.log('✅ Chart.js chargé, version:', Chart.version || 'v2.x');
        
        // Vérifier que les canvas existent
        const canvasIds = ['visiteursChart', 'ventesChart', 'revenusChart', 'statutsChart'];
        for (const id of canvasIds) {
            const canvas = document.getElementById(id);
            if (!canvas) {
                console.error(`❌ Canvas ${id} introuvable dans le DOM`);
                return;
            }
        }
        console.log('✅ Tous les canvas sont présents');
        
        const response = await fetch('/api/admin/statistiques');
        if (!response.ok) {
            throw new Error('Erreur API: ' + response.status);
        }
        
        const stats = await response.json();
        console.log('📊 Statistiques reçues pour graphiques:', {
            derniers30jours: stats.derniers30jours?.length || 0,
            historique: stats.historique?.length || 0
        });
        
        // Graphique des visiteurs
        console.log('🔄 Création graphique visiteurs...');
        creerGraphiqueVisiteurs(stats.derniers30jours);
        
        // Graphique des ventes (basé sur les commandes)
        console.log('🔄 Création graphique ventes...');
        creerGraphiqueVentes();
        
        // Graphique des revenus
        console.log('🔄 Création graphique revenus...');
        creerGraphiqueRevenus();
        
        // Graphique des statuts
        console.log('🔄 Création graphique statuts...');
        creerGraphiqueStatuts();
        
        console.log('✅ Tous les graphiques sont créés');
    } catch (error) {
        console.error('❌ Erreur chargement graphiques:', error);
        console.error('Stack:', error.stack);
    }
}

// Créer le graphique des visiteurs
function creerGraphiqueVisiteurs(data) {
    const ctx = document.getElementById('visiteursChart');
    if (!ctx) {
        console.error('❌ Canvas visiteursChart introuvable');
        return;
    }
    
    console.log('📊 Création graphique visiteurs avec', data ? data.length : 0, 'jours de données');
    
    // Détruire le graphique existant
    if (visiteursChart) {
        visiteursChart.destroy();
    }
    
    // Vérifier si nous avons des données
    if (!data || data.length === 0) {
        console.warn('⚠️ Aucune donnée pour le graphique visiteurs');
        return;
    }
    
    // Préparer les données (inverser pour avoir du plus ancien au plus récent)
    const labels = data.slice().reverse().map(d => {
        const date = new Date(d.date_visite);
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    });
    
    const visiteurs = data.slice().reverse().map(d => d.visiteurs_uniques);
    const pagesVues = data.slice().reverse().map(d => d.nombre_visites);
    
    console.log('📈 Données préparées:', { labels: labels.length, maxVisiteurs: Math.max(...visiteurs) });
    
    try {
        visiteursChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Visiteurs uniques',
                    data: visiteurs,
                    borderColor: '#ff6b35',
                    backgroundColor: 'rgba(255, 107, 53, 0.1)',
                    borderWidth: 2,
                    lineTension: 0.4,
                    fill: true
                }, {
                    label: 'Pages vues',
                    data: pagesVues,
                    borderColor: '#8b4513',
                    backgroundColor: 'rgba(139, 69, 19, 0.1)',
                    borderWidth: 2,
                    lineTension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                legend: {
                    display: true,
                    position: 'top'
            },
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true,
                        precision: 0
                    }
                }]
            }
        }
    });
    console.log('✅ Graphique visiteurs créé');
    } catch (error) {
        console.error('❌ Erreur création graphique visiteurs:', error);
    }
}

// Créer le graphique des ventes
async function creerGraphiqueVentes() {
    const ctx = document.getElementById('ventesChart');
    if (!ctx) {
        console.error('❌ Canvas ventesChart introuvable');
        return;
    }
    
    try {
        console.log('📊 Chargement données ventes...');
        const response = await fetch('/api/admin/commandes');
        const commandes = await response.json();
        console.log(`✅ ${commandes.length} commandes récupérées`);
        
        // Grouper par date (30 derniers jours)
        const ventesParJour = {};
        const dateAujourdhui = new Date();
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date(dateAujourdhui);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            ventesParJour[dateStr] = 0;
        }
        
        commandes.forEach(cmd => {
            const dateCmd = new Date(cmd.date_commande).toISOString().split('T')[0];
            if (ventesParJour.hasOwnProperty(dateCmd)) {
                ventesParJour[dateCmd]++;
            }
        });
        
        const labels = Object.keys(ventesParJour).map(d => {
            const date = new Date(d);
            return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        });
        
        const data = Object.values(ventesParJour);
        const totalVentes = data.reduce((a, b) => a + b, 0);
        console.log(`📈 ${totalVentes} ventes sur 30 jours`);
        
        if (ventesChart) {
            ventesChart.destroy();
        }
        
        ventesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Nombre de ventes',
                    data: data,
                    backgroundColor: 'rgba(255, 107, 53, 0.7)',
                    borderColor: '#ff6b35',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                legend: {
                    display: false
                },
                scales: {
                    yAxes: [{
                        ticks: {
                            beginAtZero: true,
                            precision: 0
                        }
                    }]
                }
            }
        });
        console.log('✅ Graphique ventes créé');
    } catch (error) {
        console.error('❌ Erreur graphique ventes:', error);
    }
}

// Créer le graphique des revenus
async function creerGraphiqueRevenus() {
    const ctx = document.getElementById('revenusChart');
    if (!ctx) {
        console.error('❌ Canvas revenusChart introuvable');
        return;
    }
    
    try {
        console.log('📊 Chargement données revenus...');
        const response = await fetch('/api/admin/commandes');
        const commandes = await response.json();
        
        // Grouper par date
        const revenusParJour = {};
        const dateAujourdhui = new Date();
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date(dateAujourdhui);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            revenusParJour[dateStr] = 0;
        }
        
        commandes.forEach(cmd => {
            const dateCmd = new Date(cmd.date_commande).toISOString().split('T')[0];
            if (revenusParJour.hasOwnProperty(dateCmd)) {
                // Convertir en XAF pour agréger
                const montant = parseFloat(cmd.montant_total || 0);
                const devise = cmd.devise || 'XAF';
                const montantXAF = convertirDevise(montant, devise, 'XAF');
                revenusParJour[dateCmd] += montantXAF;
            }
        });
        
        const labels = Object.keys(revenusParJour).map(d => {
            const date = new Date(d);
            return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        });
        
        const data = Object.values(revenusParJour);
        const totalRevenus = data.reduce((a, b) => a + b, 0);
        console.log(`💰 Revenus 30 jours: ${formaterMontant(totalRevenus, 'XAF')}`);
        
        if (revenusChart) {
            revenusChart.destroy();
        }
        
        revenusChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Revenus (converti en FCFA)',
                    data: data,
                    borderColor: '#388e3c',
                    backgroundColor: 'rgba(56, 142, 60, 0.1)',
                    borderWidth: 2,
                    lineTension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                legend: {
                    display: false
                },
                scales: {
                    yAxes: [{
                        ticks: {
                            beginAtZero: true,
                            callback: function(value) {
                                return value.toLocaleString('fr-FR') + ' F';
                            }
                        }
                    }]
                }
            }
        });
        console.log('✅ Graphique revenus créé');
    } catch (error) {
        console.error('❌ Erreur graphique revenus:', error);
    }
}

// Créer le graphique des statuts
async function creerGraphiqueStatuts() {
    const ctx = document.getElementById('statutsChart');
    if (!ctx) {
        console.error('❌ Canvas statutsChart introuvable');
        return;
    }
    
    try {
        console.log('📊 Chargement données statuts...');
        const response = await fetch('/api/admin/commandes');
        const commandes = await response.json();
        
        // Compter par statut
        const statutsCount = {
            'En cours': 0,
            'Préparation': 0,
            'Expédiée': 0,
            'Livrée': 0
        };
        
        commandes.forEach(cmd => {
            if (statutsCount.hasOwnProperty(cmd.statut)) {
                statutsCount[cmd.statut]++;
            }
        });
        
        console.log('📋 Répartition:', statutsCount);
        
        if (statutsChart) {
            statutsChart.destroy();
        }
        
        statutsChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statutsCount),
                datasets: [{
                    data: Object.values(statutsCount),
                    backgroundColor: [
                        'rgba(255, 107, 53, 0.8)',
                        'rgba(255, 193, 7, 0.8)',
                        'rgba(33, 150, 243, 0.8)',
                        'rgba(76, 175, 80, 0.8)'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                legend: {
                    position: 'bottom'
                }
            }
        });
        console.log('✅ Graphique statuts créé');
    } catch (error) {
        console.error('❌ Erreur graphique statuts:', error);
    }
}

// ==================== CALENDRIER ====================

// Initialiser le calendrier
function initCalendrier() {
    // Navigation mois
    document.getElementById('prevMonth')?.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        afficherCalendrier();
    });
    
    document.getElementById('nextMonth')?.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        afficherCalendrier();
    });
}

// Charger les données du calendrier
async function chargerDonneesCalendrier() {
    try {
        console.log('📅 Chargement des données calendrier...');
        
        // Récupérer les statistiques de visites
        const responseStats = await fetch('/api/admin/statistiques');
        const stats = await responseStats.json();
        
        // Récupérer les commandes
        const responseCommandes = await fetch('/api/admin/commandes');
        const commandes = await responseCommandes.json();
        
        // Construire un objet avec toutes les données par date
        calendarData = {};
        
        // Ajouter TOUTES les stats de visites (historique complet)
        if (stats.historique && stats.historique.length > 0) {
            console.log('📊 Chargement de', stats.historique.length, 'jours d\'historique');
            stats.historique.forEach(day => {
                const date = day.date_visite;
                calendarData[date] = {
                    visiteurs: day.visiteurs_uniques || 0,
                    pagesVues: day.nombre_visites || 0,
                    commandes: 0,
                    revenus: 0
                };
            });
        } else {
            console.warn('⚠️ Aucun historique disponible');
        }
        
        // Ajouter les commandes
        commandes.forEach(cmd => {
            const date = new Date(cmd.date_commande).toISOString().split('T')[0];
            if (!calendarData[date]) {
                calendarData[date] = { visiteurs: 0, pagesVues: 0, commandes: 0, revenus: 0 };
            }
            calendarData[date].commandes++;
            calendarData[date].revenus += parseFloat(cmd.montant_total || 0);
        });
        
        console.log('✅ Données calendrier chargées:', Object.keys(calendarData).length, 'jours');
        afficherCalendrier();
    } catch (error) {
        console.error('❌ Erreur chargement calendrier:', error);
    }
}

// Afficher le calendrier
function afficherCalendrier() {
    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return;
    
    // Mettre à jour le titre
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    document.getElementById('currentMonthYear').textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    // Vider le calendrier
    calendarGrid.innerHTML = '';
    
    // Ajouter les en-têtes des jours
    const dayHeaders = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });
    
    // Premier jour du mois et nombre de jours
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Ajuster pour commencer le lundi (0 = Dim, 1 = Lun, etc.)
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;
    
    // Jours du mois précédent
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
        const dayDiv = creerJourCalendrier(prevMonthLastDay - i, true);
        calendarGrid.appendChild(dayDiv);
    }
    
    // Jours du mois actuel
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dateStr = date.toISOString().split('T')[0];
        const isToday = date.toDateString() === today.toDateString();
        
        const dayDiv = creerJourCalendrier(day, false, dateStr, isToday);
        calendarGrid.appendChild(dayDiv);
    }
    
    // Jours du mois suivant pour compléter
    const remainingDays = 42 - (startDay + daysInMonth);
    for (let day = 1; day <= remainingDays; day++) {
        const dayDiv = creerJourCalendrier(day, true);
        calendarGrid.appendChild(dayDiv);
    }
}

// Créer un jour du calendrier
function creerJourCalendrier(dayNumber, isOtherMonth, dateStr = null, isToday = false) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day';
    
    if (isOtherMonth) {
        dayDiv.classList.add('other-month');
    }
    
    if (isToday) {
        dayDiv.classList.add('today');
    }
    
    // Numéro du jour
    const dayNumberSpan = document.createElement('div');
    dayNumberSpan.className = 'calendar-day-number';
    dayNumberSpan.textContent = dayNumber;
    dayDiv.appendChild(dayNumberSpan);
    
    // Données du jour
    if (dateStr && calendarData[dateStr]) {
        const data = calendarData[dateStr];
        const visiteurs = data.visiteurs || 0;
        
        // Définir le niveau d'activité
        let activity = 'low';
        if (visiteurs > 50) activity = 'high';
        else if (visiteurs > 10) activity = 'medium';
        
        dayDiv.setAttribute('data-activity', activity);
        
        // Afficher les données
        const dataDiv = document.createElement('div');
        dataDiv.className = 'calendar-day-data';
        dataDiv.innerHTML = `👁️ ${visiteurs}`;
        dayDiv.appendChild(dataDiv);
        
        // Click pour voir les détails
        dayDiv.addEventListener('click', () => afficherDetailsJour(dateStr, data));
    }
    
    return dayDiv;
}

// Afficher les détails d'un jour
function afficherDetailsJour(dateStr, data) {
    // Retirer la sélection précédente
    document.querySelectorAll('.calendar-day.selected').forEach(d => d.classList.remove('selected'));
    
    // Sélectionner le jour cliqué
    event.target.closest('.calendar-day')?.classList.add('selected');
    
    // Afficher les détails
    const detailsCard = document.getElementById('dayDetails');
    detailsCard.classList.remove('hidden');
    
    const date = new Date(dateStr);
    document.getElementById('selectedDate').textContent = date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    document.getElementById('dayVisiteurs').textContent = data.visiteurs || 0;
    document.getElementById('dayPagesVues').textContent = data.pagesVues || 0;
    document.getElementById('dayCommandes').textContent = data.commandes || 0;
    
    // Convertir les revenus si nécessaire
    const revenus = data.revenus || 0;
    const devise = data.devise || 'XAF';
    document.getElementById('dayRevenus').textContent = formaterMontant(revenus, devise);
    
    // Scroller vers les détails
    detailsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

console.log('✅ Fonctions graphiques et calendrier chargées');

// ================================================
// SYSTÈME DE MISE À JOUR AUTOMATIQUE EN TEMPS RÉEL
// ================================================

/**
 * Démarrer la mise à jour automatique du dashboard
 */
function demarrerAutoRefresh() {
    // Vérifier toutes les 3 secondes pour un vrai temps réel
    const INTERVALLE = 3000; // 3 secondes
    
    console.log('🔄 Auto-refresh activé (toutes les 3 secondes) - TEMPS RÉEL');
    
    autoRefreshInterval = setInterval(async () => {
        try {
            console.log('🔄 [Auto-refresh] Vérification en cours...'); // LOG AJOUTÉ
            
            // Récupérer les nouvelles statistiques
            const response = await fetch('/api/admin/statistiques', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                // Si erreur 401, l'utilisateur n'est plus connecté
                if (response.status === 401) {
                    console.log('⚠️ Session expirée, arrêt de l\'auto-refresh');
                    arreterAutoRefresh();
                    return;
                }
                throw new Error('Erreur réseau');
            }
            
            const stats = await response.json();
            console.log('📊 [Auto-refresh] Stats reçues:', stats); // LOG AJOUTÉ
            
            // Vérifier s'il y a de nouvelles commandes
            const nouvellesCommandes = stats.total_commandes || 0;
            console.log(`📈 [Auto-refresh] Commandes: ${dernierNombreCommandes} → ${nouvellesCommandes}`); // LOG AJOUTÉ
            
            // TOUJOURS mettre à jour les statistiques (pas seulement si nouvelles commandes)
            console.log('🔄 [Auto-refresh] Mise à jour des statistiques...'); // LOG AJOUTÉ
            await chargerStatistiques();
            
            if (nouvellesCommandes > dernierNombreCommandes) {
                console.log(`🔔 Nouvelles commandes détectées: ${nouvellesCommandes - dernierNombreCommandes}`);
                
                // Mettre à jour le badge de notification
                mettreAJourBadgeNotification(nouvellesCommandes - dernierNombreCommandes);
                
                // Recharger les commandes
                await chargerCommandes();
                
                // Mettre à jour les graphiques
                await chargerGraphiques();
            }
            
            // Mettre à jour la section active en temps réel
            const sectionActive = document.querySelector('.admin-section:not(.hidden)');
            if (sectionActive) {
                const sectionId = sectionActive.id;
                
                // Mettre à jour selon la section active
                switch(sectionId) {
                    case 'commandesSection':
                        await chargerCommandes();
                        break;
                    case 'produitsSection':
                        await chargerProduits();
                        break;
                    case 'graphiquesSection':
                        await chargerGraphiques();
                        break;
                    case 'calendrierSection':
                        await chargerDonneesCalendrier();
                        break;
                }
            }
            
            dernierNombreCommandes = nouvellesCommandes;
            
        } catch (error) {
            console.error('❌ Erreur auto-refresh:', error);
        }
    }, INTERVALLE);
}

/**
 * Arrêter la mise à jour automatique
 */
function arreterAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        console.log('⏹️ Auto-refresh arrêté');
    }
}

/**
 * Afficher un badge de notification pour les nouvelles commandes
 */
function mettreAJourBadgeNotification(nombre) {
    // Créer ou mettre à jour le badge sur l'icône de notifications
    let badge = document.getElementById('notificationBadge');
    
    if (!badge) {
        // Créer le badge s'il n'existe pas
        badge = document.createElement('span');
        badge.id = 'notificationBadge';
        badge.style.cssText = `
            position: absolute;
            top: -5px;
            right: -5px;
            background: #ff4444;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: bold;
            animation: pulse 1s infinite;
        `;
        
        // Ajouter au menu "Commandes"
        const commandesNavItem = document.querySelector('.admin-nav-item[data-section="commandes"]');
        if (commandesNavItem) {
            commandesNavItem.style.position = 'relative';
            commandesNavItem.appendChild(badge);
        }
    }
    
    // Mettre à jour le nombre
    badge.textContent = nombre > 9 ? '9+' : nombre;
    badge.style.display = 'flex';
    
    // Animation pulse
    if (!document.getElementById('badgeAnimation')) {
        const style = document.createElement('style');
        style.id = 'badgeAnimation';
        style.textContent = `
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Afficher une notification navigateur (si permissions accordées)
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Nouvelle commande BOMBA ! 🎉', {
            body: `Vous avez ${nombre} nouvelle${nombre > 1 ? 's' : ''} commande${nombre > 1 ? 's' : ''}`,
            icon: '/images/logo.png',
            badge: '/images/logo.png'
        });
    }
}

/**
 * Masquer le badge de notification
 */
function masquerBadgeNotification() {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        badge.style.display = 'none';
    }
}

// Demander la permission pour les notifications navigateur
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            console.log('✅ Notifications navigateur activées');
        }
    });
}

// Masquer le badge quand on clique sur "Commandes"
document.addEventListener('click', (e) => {
    const commandesNav = e.target.closest('.admin-nav-item[data-section="commandes"]');
    if (commandesNav) {
        masquerBadgeNotification();
    }
});

// Arrêter l'auto-refresh quand on quitte la page
window.addEventListener('beforeunload', () => {
    arreterAutoRefresh();
});

console.log('✅ Système de mise à jour automatique chargé');
