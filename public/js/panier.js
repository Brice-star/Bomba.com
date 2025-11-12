// ================================================
// BOMBA - Script page panier
// ================================================

document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    afficherPanier();
    
    // Event listener pour le bouton "Procéder au paiement"
    const procederBtn = document.getElementById('procederPaiementBtn');
    if (procederBtn) {
        procederBtn.addEventListener('click', procederAuPaiement);
    }
});

function getCart() {
    const cart = localStorage.getItem('bomba_cart');
    return cart ? JSON.parse(cart) : [];
}

function saveCart(cart) {
    localStorage.setItem('bomba_cart', JSON.stringify(cart));
    updateCartCount();
}

function updateCartCount() {
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + item.quantite, 0);
    const cartCountElement = document.getElementById('cartCount');
    if (cartCountElement) {
        cartCountElement.textContent = totalItems;
    }
}

function afficherPanier() {
    const cart = getCart();
    const cartItems = document.getElementById('cartItems');
    const emptyCart = document.getElementById('emptyCart');
    const cartSummary = document.getElementById('cartSummary');
    
    if (cart.length === 0) {
        cartItems.innerHTML = '';
        emptyCart.classList.remove('hidden');
        cartSummary.classList.add('hidden');
        return;
    }
    
    emptyCart.classList.add('hidden');
    cartSummary.classList.remove('hidden');
    
    cartItems.innerHTML = cart.map((item, index) => {
        const devise = item.devise || 'XAF';
        return `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.nom}" class="cart-item-image"
                 onerror="this.src='/images/products/placeholder.jpg'">
            
            <div class="cart-item-info">
                <h3>${item.nom}</h3>
                <p class="cart-item-details">Taille: ${item.taille}</p>
                <p class="cart-item-details">Prix unitaire: ${formaterMontant(item.prix, devise)}</p>
            </div>
            
            <div class="cart-item-actions">
                <p class="cart-item-price">${formaterMontant(item.prix * item.quantite, devise)}</p>
                
                <div class="quantity-controls">
                    <button data-action="decrease" data-index="${index}">-</button>
                    <span>${item.quantite}</span>
                    <button data-action="increase" data-index="${index}">+</button>
                </div>
                
                <button class="btn btn-danger btn-supprimer" data-index="${index}">
                    Supprimer
                </button>
            </div>
        </div>
    `;
    }).join('');
    
    // Ajouter les event listeners
    document.querySelectorAll('[data-action="decrease"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            modifierQuantite(index, -1);
        });
    });
    
    document.querySelectorAll('[data-action="increase"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            modifierQuantite(index, 1);
        });
    });
    
    document.querySelectorAll('.btn-supprimer').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            supprimerArticle(index);
        });
    });
    
    calculerTotal();
}

function modifierQuantite(index, delta) {
    const cart = getCart();
    cart[index].quantite = Math.max(1, cart[index].quantite + delta);
    saveCart(cart);
    afficherPanier();
}

function supprimerArticle(index) {
    if (confirm('Voulez-vous vraiment supprimer cet article ?')) {
        const cart = getCart();
        cart.splice(index, 1);
        saveCart(cart);
        afficherPanier();
    }
}

function calculerTotal() {
    const cart = getCart();
    
    // Utiliser la fonction calculerTotalPanier de currencies.js
    const resultat = calculerTotalPanier(cart.map(item => ({
        prix: item.prix,
        devise: item.devise || 'XAF',
        quantite: item.quantite
    })));
    
    // Afficher les détails si plusieurs devises
    if (resultat.details.length > 1) {
        const detailsHTML = resultat.details.map(d => 
            `<div style="font-size: 0.9rem; color: #666;">${d.montantFormate}</div>`
        ).join('');
        document.getElementById('subtotal').innerHTML = detailsHTML;
        document.getElementById('total').innerHTML = detailsHTML + 
            `<div style="margin-top: 0.5rem; font-weight: bold;">Total: ${formaterMontant(resultat.montantXAF, 'XAF')}</div>`;
    } else {
        // Une seule devise
        const devise = resultat.details[0]?.devise || 'XAF';
        const montant = resultat.details[0]?.montant || 0;
        document.getElementById('subtotal').textContent = formaterMontant(montant, devise);
        document.getElementById('total').textContent = formaterMontant(montant, devise);
    }
}

function procederAuPaiement() {
    const cart = getCart();
    
    if (cart.length === 0) {
        alert('Votre panier est vide');
        return;
    }
    
    window.location.href = '/paiement';
}
