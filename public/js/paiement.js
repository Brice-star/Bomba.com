// ================================================
// BOMBA - Script page paiement
// ================================================

let stripePublicKey = null;

document.addEventListener('DOMContentLoaded', async () => {
    updateCartCount();
    afficherResume();
    await chargerConfigStripe();
    initialiserMethodesPaiement();
    
    // Écouter les changements de pays pour la livraison
    document.getElementById('pays').addEventListener('change', calculerLivraison);
    
    // Event listener pour le bouton de validation
    const validerBtn = document.getElementById('validerCommandeBtn');
    if (validerBtn) {
        validerBtn.addEventListener('click', validerCommande);
    }
});

// Charger la configuration Stripe depuis le serveur
async function chargerConfigStripe() {
    try {
        const response = await fetch('/api/stripe/config');
        const config = await response.json();
        stripePublicKey = config.publishableKey;
    } catch (error) {
        console.error('Erreur chargement config Stripe:', error);
    }
}

function getCart() {
    const cart = localStorage.getItem('bomba_cart');
    return cart ? JSON.parse(cart) : [];
}

function updateCartCount() {
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + item.quantite, 0);
    const cartCountElement = document.getElementById('cartCount');
    if (cartCountElement) {
        cartCountElement.textContent = totalItems;
    }
}

function afficherResume() {
    const cart = getCart();
    
    if (cart.length === 0) {
        window.location.href = '/panier';
        return;
    }
    
    const subtotal = cart.reduce((sum, item) => sum + (Number(item.prix) * item.quantite), 0);
    
    const resumeHTML = cart.map(item => `
        <div class="order-item">
            <span>${item.nom} (${item.taille}) x ${item.quantite}</span>
            <span>${(Number(item.prix) * item.quantite).toLocaleString('fr-FR')} FCFA</span>
        </div>
    `).join('') + `
        <div class="order-item" style="border-top: 2px solid rgba(0,0,0,0.2); padding-top: 1rem;">
            <span><strong>Livraison</strong></span>
            <span><strong>Gratuite</strong></span>
        </div>
        <div class="order-item order-total">
            <span>Total</span>
            <span>${subtotal.toLocaleString('fr-FR')} FCFA</span>
        </div>
    `;
    
    document.getElementById('orderSummary').innerHTML = resumeHTML;
}

function calculerLivraison() {
    const pays = document.getElementById('pays').value;
    const deliveryInfo = document.getElementById('deliveryInfo');
    
    if (!pays) {
        deliveryInfo.style.display = 'none';
        return;
    }
    
    // Calculer la date de livraison estimée
    const aujourdhui = new Date();
    let joursLivraison = 30; // Par défaut 1 mois
    
    // 3 semaines pour les pays africains
    const paysAfricains = ['Bénin', 'Togo', 'Côte d\'Ivoire', 'Nigeria', 'Ghana', 'Sénégal', 'Burkina Faso', 'Mali'];
    if (paysAfricains.includes(pays)) {
        joursLivraison = 21;
    }
    
    const dateLivraison = new Date(aujourdhui);
    dateLivraison.setDate(dateLivraison.getDate() + joursLivraison);
    
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const dateFormatee = dateLivraison.toLocaleDateString('fr-FR', options);
    
    document.getElementById('deliveryDate').textContent = dateFormatee;
    deliveryInfo.style.display = 'block';
}

function initialiserStripe() {
    // Initialiser Stripe (vous devrez ajouter votre clé publique Stripe)
    // Pour le moment, on simule l'interface
    const stripePublicKey = 'pk_test_VOTRE_CLE_PUBLIQUE_STRIPE'; // À remplacer
    
    // Note: Dans un environnement de production, utilisez:
    // stripe = Stripe(stripePublicKey);
    // elements = stripe.elements();
    // cardElement = elements.create('card');
    // cardElement.mount('#stripeCardElement');
    
    // Pour le moment, afficher un message
    document.getElementById('stripeCardElement').innerHTML = `
        <p style="color: var(--marron-clair); padding: 1rem; text-align: center;">
            ℹ️ L'intégration Stripe nécessite une clé API valide.<br>
            Ajoutez votre clé dans le fichier .env : STRIPE_PUBLIC_KEY=pk_...
        </p>
    `;
}

function initialiserMethodesPaiement() {
    const methodElements = document.querySelectorAll('.payment-method');
    
    methodElements.forEach(element => {
        element.addEventListener('click', function() {
            methodElements.forEach(el => el.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

async function validerCommande(event) {
    event.preventDefault();
    
    // Vérifier les champs obligatoires
    const nom = document.getElementById('nom').value.trim();
    const email = document.getElementById('email').value.trim();
    const telephone = document.getElementById('telephone').value.trim();
    const pays = document.getElementById('pays').value;
    const adresse = document.getElementById('adresse').value.trim();
    
    if (!nom || !email || !telephone || !pays || !adresse) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
    }
    
    const cart = getCart();
    if (cart.length === 0) {
        alert('Votre panier est vide');
        window.location.href = '/panier';
        return;
    }
    
    // Calculer le montant total
    const montantTotal = cart.reduce((sum, item) => sum + (Number(item.prix) * item.quantite), 0);
    
    // Préparer les données de commande
    const commandeData = {
        nom_client: nom,
        email_client: email,
        telephone_client: telephone,
        adresse_livraison: adresse,
        pays: pays,
        produits_commandes: cart,
        montant_total: montantTotal
    };
    
    try {
        // Désactiver le bouton pour éviter les doubles soumissions
        const bouton = event.target;
        bouton.disabled = true;
        bouton.textContent = '⏳ Traitement en cours...';
        
        // Étape 1 : Créer la commande dans la base de données
        const responseCommande = await fetch('/api/commandes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(commandeData)
        });
        
        const dataCommande = await responseCommande.json();
        
        if (!responseCommande.ok || !dataCommande.success) {
            throw new Error(dataCommande.error || 'Erreur lors de la création de la commande');
        }

        // Étape 2 : Créer la session de paiement Stripe
        bouton.textContent = '💳 Redirection vers le paiement...';
        
        const responseStripe = await fetch('/api/stripe/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                numero_commande: dataCommande.numero_commande,
                montant_total: montantTotal,
                commande_id: dataCommande.commande_id
            })
        });
        
        const dataStripe = await responseStripe.json();
        
        if (!responseStripe.ok || !dataStripe.success) {
            throw new Error(dataStripe.error || 'Erreur lors de la création du paiement');
        }

        // Étape 3 : Stocker les infos pour la page de confirmation
        sessionStorage.setItem('derniere_commande', JSON.stringify({
            numero: dataCommande.numero_commande,
            date_livraison: dataCommande.date_livraison_estimee
        }));

        // Vider le panier
        localStorage.removeItem('bomba_cart');

        // Étape 4 : Rediriger vers Stripe Checkout
        window.location.href = dataStripe.url;
        
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la validation de la commande: ' + error.message);
        event.target.disabled = false;
        event.target.textContent = 'Valider et Payer';
    }
}
