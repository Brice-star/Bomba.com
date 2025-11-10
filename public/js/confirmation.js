// ================================================
// BOMBA - Script page confirmation
// ================================================

document.addEventListener('DOMContentLoaded', () => {
    afficherConfirmation();
});

function afficherConfirmation() {
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
    
    // Nettoyer la session après affichage
    // sessionStorage.removeItem('derniere_commande');
}
