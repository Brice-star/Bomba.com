// ================================================
// BOMBA - Script page suivi de commande
// ================================================

document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    
    // Event listener pour le bouton rechercher
    const rechercherBtn = document.getElementById('rechercherBtn');
    if (rechercherBtn) {
        rechercherBtn.addEventListener('click', rechercherCommande);
    }
    
    // Recherche avec la touche Entrée
    const orderNumberInput = document.getElementById('orderNumber');
    if (orderNumberInput) {
        orderNumberInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                rechercherCommande();
            }
        });
    }
    
    // Si un numéro de commande est dans l'URL, le chercher automatiquement
    const urlParams = new URLSearchParams(window.location.search);
    const orderNum = urlParams.get('numero');
    if (orderNum) {
        document.getElementById('orderNumber').value = orderNum;
        rechercherCommande();
    }
});

function updateCartCount() {
    const cart = localStorage.getItem('bomba_cart');
    const cartData = cart ? JSON.parse(cart) : [];
    const totalItems = cartData.reduce((sum, item) => sum + item.quantite, 0);
    const cartCountElement = document.getElementById('cartCount');
    if (cartCountElement) {
        cartCountElement.textContent = totalItems;
    }
}

async function rechercherCommande() {
    const orderNumber = document.getElementById('orderNumber').value.trim();
    const trackingError = document.getElementById('trackingError');
    const trackingResult = document.getElementById('trackingResult');
    
    if (!orderNumber) {
        trackingError.textContent = 'Veuillez entrer un numéro de commande';
        trackingError.classList.remove('hidden');
        return;
    }
    
    trackingError.classList.add('hidden');
    trackingResult.style.display = 'none';
    
    try {
        const response = await fetch(`/api/commandes/${orderNumber}`);
        
        if (!response.ok) {
            throw new Error('Commande non trouvée');
        }
        
        const commande = await response.json();
        afficherDetailsCommande(commande);
    } catch (error) {
        console.error('Erreur:', error);
        trackingError.textContent = 'Commande non trouvée. Vérifiez le numéro et réessayez.';
        trackingError.classList.remove('hidden');
    }
}

function afficherDetailsCommande(commande) {
    const trackingResult = document.getElementById('trackingResult');
    
    // Afficher les détails de la commande
    const produitsCommandes = JSON.parse(commande.produits_commandes || '[]');
    
    const detailsHTML = `
        <div class="detail-line">
            <span>Numéro de commande:</span>
            <strong>${commande.numero_commande}</strong>
        </div>
        <div class="detail-line">
            <span>Date de commande:</span>
            <strong>${new Date(commande.date_commande).toLocaleDateString('fr-FR')}</strong>
        </div>
        <div class="detail-line">
            <span>Client:</span>
            <strong>${commande.nom_client}</strong>
        </div>
        <div class="detail-line">
            <span>Pays de livraison:</span>
            <strong>${commande.pays}</strong>
        </div>
        <div class="detail-line">
            <span>Montant total:</span>
            <strong>${Number(commande.montant_total).toLocaleString('fr-FR')} FCFA</strong>
        </div>
        <div class="detail-line" style="border-bottom: none;">
            <span>Produits:</span>
            <strong>${produitsCommandes.length} article(s)</strong>
        </div>
    `;
    
    document.getElementById('orderDetails').innerHTML = detailsHTML;
    
    // Mettre à jour la timeline
    const statuts = ['En cours', 'Préparation', 'Expédiée', 'Livrée'];
    const statutActuel = commande.statut;
    const indexStatutActuel = statuts.indexOf(statutActuel);
    
    document.querySelectorAll('.timeline-item').forEach((item, index) => {
        if (index <= indexStatutActuel) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Afficher la date de livraison estimée
    const dateLivraison = new Date(commande.date_livraison_estimee);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const dateFormatee = dateLivraison.toLocaleDateString('fr-FR', options);
    
    document.getElementById('estimatedDelivery').textContent = dateFormatee;
    
    // Afficher le résultat
    trackingResult.style.display = 'block';
    trackingResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Permettre la recherche avec la touche Entrée
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('orderNumber').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            rechercherCommande();
        }
    });
});
