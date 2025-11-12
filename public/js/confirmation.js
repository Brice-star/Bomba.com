// ================================================
// BOMBA - Script page confirmation
// ================================================

document.addEventListener('DOMContentLoaded', () => {
    afficherConfirmation();
});

async function afficherConfirmation() {
    const derniereCommande = sessionStorage.getItem('derniere_commande');
    
    if (!derniereCommande) {
        // Si pas de commande récente, rediriger vers l'accueil
        window.location.href = '/';
        return;
    }
    
    const commande = JSON.parse(derniereCommande);
    
    // Afficher le numéro de commande
    document.getElementById('orderNumber').textContent = commande.numero;
    
    // Afficher la date de livraison estimée
    const dateLivraison = new Date(commande.date_livraison);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const dateFormatee = dateLivraison.toLocaleDateString('fr-FR', options);
    
    document.getElementById('deliveryEstimate').textContent = `Livraison estimée le ${dateFormatee}`;
    
    // Vérifier si on vient de Stripe (avec session_id dans l'URL) ET si c'est la première visite
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    // Utiliser sessionStorage pour marquer que la vérification a déjà été faite
    const verificationKey = `payment_verified_${sessionId}`;
    const dejaVerifie = sessionStorage.getItem(verificationKey);
    
    if (sessionId && !dejaVerifie) {
        console.log('🔍 Vérification du paiement Stripe (première visite)...');
        
        try {
            // Vérifier le paiement (mais l'email est envoyé par le webhook, pas ici)
            const response = await fetch(`/api/stripe/verify-payment/${sessionId}`);
            const result = await response.json();
            
            if (result.paid) {
                console.log('✅ Paiement confirmé');
                // Marquer comme vérifié pour éviter les appels répétés
                sessionStorage.setItem(verificationKey, 'true');
                
                // Nettoyer l'URL pour éviter la re-vérification lors d'un refresh
                const urlSansSession = window.location.pathname + '?order=' + urlParams.get('order');
                window.history.replaceState({}, document.title, urlSansSession);
            } else {
                console.log('⚠️ Paiement non confirmé');
            }
        } catch (error) {
            console.error('❌ Erreur vérification paiement:', error);
        }
    } else if (sessionId && dejaVerifie) {
        console.log('ℹ️ Paiement déjà vérifié - pas de nouvelle vérification');
    }
    
    // Ne pas nettoyer la session pour permettre de revoir la page de confirmation
    // sessionStorage.removeItem('derniere_commande');
}
