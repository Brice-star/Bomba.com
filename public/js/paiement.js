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
    
    // Écouter les changements de pays pour la conversion
    document.getElementById('pays').addEventListener('change', afficherConversionPays);
    
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
    
    // Utiliser la fonction calculerTotalPanier de currencies.js
    const resultat = calculerTotalPanier(cart.map(item => ({
        prix: item.prix,
        devise: item.devise || 'XAF',
        quantite: item.quantite
    })));
    
    let resumeHTML = cart.map(item => {
        const devise = item.devise || 'XAF';
        return `
        <div class="order-item">
            <span>${item.nom} (${item.taille}) x ${item.quantite}</span>
            <span>${formaterMontant(item.prix * item.quantite, devise)}</span>
        </div>
    `;
    }).join('') + `
        <div class="order-item" style="border-top: 2px solid rgba(0,0,0,0.2); padding-top: 1rem;">
            <span><strong>Livraison</strong></span>
            <span><strong>Gratuite</strong></span>
        </div>
    `;
    
    // Ajouter le total selon le nombre de devises
    if (resultat.details.length > 1) {
        // Plusieurs devises : afficher les détails
        resultat.details.forEach(d => {
            resumeHTML += `
                <div class="order-item" style="font-size: 0.9rem; color: #666;">
                    <span>${getNomDevise(d.devise)}</span>
                    <span>${d.montantFormate}</span>
                </div>
            `;
        });
        resumeHTML += `
            <div class="order-item order-total">
                <span>Total (converti en FCFA)</span>
                <span>${formaterMontant(resultat.montantXAF, 'XAF')}</span>
            </div>
        `;
    } else {
        // Une seule devise
        const devise = resultat.details[0]?.devise || 'XAF';
        const montant = resultat.details[0]?.montant || 0;
        resumeHTML += `
            <div class="order-item order-total">
                <span>Total</span>
                <span>${formaterMontant(montant, devise)}</span>
            </div>
        `;
    }
    
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

/**
 * Affiche l'estimation du montant en devise locale selon le pays sélectionné
 */
function afficherConversionPays() {
    const pays = document.getElementById('pays').value;
    const conversionInfo = document.getElementById('conversionInfo');
    const conversionDetails = document.getElementById('conversionDetails');
    
    if (!pays) {
        conversionInfo.style.display = 'none';
        return;
    }
    
    // Obtenir la devise du pays
    const devisePays = getDevisePays(pays);
    
    // Calculer le total du panier
    const cart = getCart();
    const resultat = calculerTotalPanier(cart.map(item => ({
        prix: item.prix,
        devise: item.devise || 'XAF',
        quantite: item.quantite
    })));
    
    // Si le panier est en plusieurs devises, on utilise la devise principale
    let deviseCommande = 'EUR'; // Par défaut EUR (car tous les produits seront en EUR maintenant)
    let montantCommande = 0;
    
    if (resultat.details.length === 1) {
        deviseCommande = resultat.details[0].devise;
        montantCommande = resultat.details[0].montant;
    } else {
        // Trouver la devise avec le plus d'articles
        const compteur = {};
        cart.forEach(item => {
            const dev = item.devise || 'XAF';
            compteur[dev] = (compteur[dev] || 0) + item.quantite;
        });
        deviseCommande = Object.keys(compteur).reduce((a, b) => compteur[a] > compteur[b] ? a : b);
        
        // Calculer le montant dans cette devise
        cart.forEach(item => {
            if ((item.devise || 'XAF') === deviseCommande) {
                montantCommande += item.prix * item.quantite;
            }
        });
    }
    
    // Si la devise du pays est la même que la commande, pas besoin d'afficher
    if (devisePays === deviseCommande) {
        conversionInfo.style.display = 'none';
        return;
    }
    
    // Convertir le montant vers la devise du pays
    const montantConverti = convertirDevise(montantCommande, deviseCommande, devisePays);
    
    // Afficher l'estimation
    conversionDetails.innerHTML = `
        📍 Vous êtes au <strong>${pays}</strong><br>
        💰 Montant à payer : <strong>${formaterMontant(montantCommande, deviseCommande)}</strong><br>
        💱 Estimation en devise locale : <strong>≈ ${formaterMontant(montantConverti, devisePays)}</strong><br>
        <small style="opacity: 0.8;">La conversion sera effectuée par votre banque au taux du jour. Le montant peut légèrement varier.</small>
    `;
    conversionInfo.style.display = 'block';
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
    
    // Calculer le montant total avec gestion multi-devises
    const resultat = calculerTotalPanier(cart.map(item => ({
        prix: item.prix,
        devise: item.devise || 'XAF',
        quantite: item.quantite
    })));
    
    // Déterminer la devise principale (celle avec le montant le plus élevé)
    let devisePrincipale = 'XAF';
    let montantTotal = resultat.montantXAF;
    
    if (resultat.details.length === 1) {
        devisePrincipale = resultat.details[0].devise;
        montantTotal = resultat.details[0].montant;
    }
    
    // Préparer les données de commande
    const commandeData = {
        nom_client: nom,
        email_client: email,
        telephone_client: telephone,
        adresse_livraison: adresse,
        pays: pays,
        produits_commandes: cart,
        montant_total: montantTotal,
        devise: devisePrincipale
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
                devise: devisePrincipale,
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
