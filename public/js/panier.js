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
    
    cartItems.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.nom}" class="cart-item-image"
                 onerror="this.src='/images/products/placeholder.jpg'">
            
            <div class="cart-item-info">
                <h3>${item.nom}</h3>
                <p class="cart-item-details">Taille: ${item.taille}</p>
                <p class="cart-item-details">Prix unitaire: ${Number(item.prix).toLocaleString('fr-FR')} FCFA</p>
            </div>
            
            <div class="cart-item-actions">
                <p class="cart-item-price">${(Number(item.prix) * item.quantite).toLocaleString('fr-FR')} FCFA</p>
                
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
    `).join('');
    
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
    const subtotal = cart.reduce((sum, item) => sum + (Number(item.prix) * item.quantite), 0);
    
    document.getElementById('subtotal').textContent = subtotal.toLocaleString('fr-FR') + ' FCFA';
    document.getElementById('total').textContent = subtotal.toLocaleString('fr-FR') + ' FCFA';
}

function procederAuPaiement() {
    const cart = getCart();
    
    if (cart.length === 0) {
        alert('Votre panier est vide');
        return;
    }
    
    window.location.href = '/paiement';
}
