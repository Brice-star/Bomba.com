// ================================================
// BOMBA - Script admin dashboard
// ================================================

let commandesData = [];
let produitsData = [];
let filtreStatutActuel = 'all';

document.addEventListener('DOMContentLoaded', () => {
    chargerStatistiques();
    chargerCommandes();
    chargerProduits();
    
    // Event listeners pour la navigation
    document.querySelectorAll('.admin-nav-item[data-section]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.getAttribute('data-section');
            afficherSection(section);
        });
    });
    
    // Event listener pour la déconnexion
    document.getElementById('deconnexionBtn').addEventListener('click', (e) => {
        e.preventDefault();
        deconnexion();
    });
    
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
    document.getElementById('produitForm').addEventListener('submit', sauvegarderProduit);
    
    // Event listener pour annuler le modal produit
    document.getElementById('annulerProduitBtn').addEventListener('click', () => {
        fermerModal('modalProduit');
    });
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
    
    // Activer le lien de navigation
    event.target.classList.add('active');
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

async function chargerStatistiques() {
    try {
        const response = await fetch('/api/admin/statistiques');
        const stats = await response.json();
        
        document.getElementById('totalVentes').textContent = stats.totalVentes;
        document.getElementById('commandesEnAttente').textContent = stats.commandesEnAttente;
        document.getElementById('revenusTotal').textContent = Number(stats.revenusTotal).toLocaleString('fr-FR') + ' FCFA';
        document.getElementById('produitsTotal').textContent = stats.produitsTotal;
    } catch (error) {
        console.error('Erreur chargement statistiques:', error);
    }
}

// ==================== COMMANDES ====================

async function chargerCommandes() {
    try {
        const response = await fetch('/api/admin/commandes');
        commandesData = await response.json();
        afficherCommandes();
    } catch (error) {
        console.error('Erreur chargement commandes:', error);
        document.getElementById('commandesTableBody').innerHTML = 
            '<tr><td colspan="7" class="text-center" style="color: red;">Erreur de chargement</td></tr>';
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
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Aucune commande trouvée</td></tr>';
        return;
    }
    
    tbody.innerHTML = commandesFiltrees.map(commande => `
        <tr>
            <td><strong>${commande.numero_commande}</strong></td>
            <td>${commande.nom_client}</td>
            <td>${commande.pays}</td>
            <td><strong>${Number(commande.montant_total).toLocaleString('fr-FR')} FCFA</strong></td>
            <td>${new Date(commande.date_commande).toLocaleDateString('fr-FR')}</td>
            <td><span class="status-badge status-${commande.statut.toLowerCase().replace(' ', '-')}">${commande.statut}</span></td>
            <td class="action-buttons">
                <button class="btn-icon btn-view" data-action="view" data-commande-id="${commande.id}" title="Voir">👁️</button>
                <button class="btn-icon btn-edit" data-action="edit-status" data-commande-id="${commande.id}" title="Modifier">✏️</button>
            </td>
        </tr>
    `).join('');
    
    // Ajouter les event listeners pour les boutons d'action
    document.querySelectorAll('.btn-icon[data-action="view"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const commandeId = this.getAttribute('data-commande-id');
            afficherDetailsCommande(parseInt(commandeId));
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

function afficherDetailsCommande(commandeId) {
    const commande = commandesData.find(c => c.id === commandeId);
    if (!commande) return;
    
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
            ${produits.map(p => `
                <div class="product-list-item">
                    <strong>${p.nom}</strong><br>
                    Taille: ${p.taille} | Quantité: ${p.quantite} | Prix: ${Number(p.prix).toLocaleString('fr-FR')} FCFA
                </div>
            `).join('')}
        </div>
        
        <div class="order-detail-section">
            <div class="order-detail-line" style="font-size: 1.25rem;">
                <span>Total:</span>
                <strong style="color: var(--vert-profond);">${Number(commande.montant_total).toLocaleString('fr-FR')} FCFA</strong>
            </div>
            <div class="order-detail-line">
                <span>Livraison estimée:</span>
                <strong>${new Date(commande.date_livraison_estimee).toLocaleDateString('fr-FR')}</strong>
            </div>
        </div>
    `;
    
    document.getElementById('detailsCommande').innerHTML = detailsHTML;
    document.getElementById('modalCommande').classList.remove('hidden');
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

// ==================== PRODUITS ====================

async function chargerProduits() {
    try {
        const response = await fetch('/api/produits');
        produitsData = await response.json();
        afficherProduits();
    } catch (error) {
        console.error('Erreur chargement produits:', error);
        document.getElementById('produitsTableBody').innerHTML = 
            '<tr><td colspan="6" class="text-center" style="color: red;">Erreur de chargement</td></tr>';
    }
}

function afficherProduits() {
    const tbody = document.getElementById('produitsTableBody');
    
    if (produitsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Aucun produit trouvé</td></tr>';
        return;
    }
    
    tbody.innerHTML = produitsData.map(produit => `
        <tr>
            <td><img src="${produit.image_principale}" alt="${produit.nom}" onerror="this.src='/images/products/placeholder.jpg'"></td>
            <td><strong>${produit.nom}</strong></td>
            <td>${produit.categorie}</td>
            <td><strong>${Number(produit.prix).toLocaleString('fr-FR')} FCFA</strong></td>
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
    document.getElementById('produitCategorie').value = produit.categorie;
    document.getElementById('produitImagePrincipale').value = produit.image_principale;
    document.getElementById('produitImagesSecondaires').value = produit.images_secondaires || '';
    
    // Cocher les tailles disponibles
    const tailles = produit.tailles_disponibles.split(',').map(t => t.trim());
    document.querySelectorAll('.taille-checkbox').forEach(checkbox => {
        checkbox.checked = tailles.includes(checkbox.value);
    });
    
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
