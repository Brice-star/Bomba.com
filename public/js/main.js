// ================================================
// BOMBA - Script principal (page d'accueil)
// ================================================

// Gestion du panier (localStorage)
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

// Charger les produits au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    chargerProduits();
    
    // Event listener pour le bouton de recherche
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', rechercher);
    }
    
    // Recherche avec la touche Entrée
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                rechercher();
            }
        });
    }
});

// Charger les produits depuis l'API
async function chargerProduits() {
    try {
        const response = await fetch('/api/produits');
        const produits = await response.json();
        
        const productGrid = document.getElementById('productGrid');
        const noProducts = document.getElementById('noProducts');
        
        if (produits.length === 0) {
            productGrid.innerHTML = '';
            noProducts.classList.remove('hidden');
        } else {
            noProducts.classList.add('hidden');
            afficherProduits(produits);
        }
    } catch (error) {
        console.error('Erreur chargement produits:', error);
        document.getElementById('productGrid').innerHTML = 
            '<p class="text-center" style="color: red;">Erreur de chargement des produits</p>';
    }
}

// Afficher les produits dans la grille
function afficherProduits(produits) {
    const productGrid = document.getElementById('productGrid');
    
    if (produits.length === 0) {
        productGrid.innerHTML = '';
        document.getElementById('noProducts').classList.remove('hidden');
        return;
    }
    
    document.getElementById('noProducts').classList.add('hidden');
    
    productGrid.innerHTML = produits.map(produit => {
        const tailles = produit.tailles_disponibles ? produit.tailles_disponibles.split(',') : [];
        
        return `
            <div class="product-card" data-product-id="${produit.id}">
                <img src="${produit.image_principale}" alt="${produit.nom}" class="product-image" 
                     onerror="this.src='/images/products/placeholder.jpg'">
                <div class="product-info">
                    <p class="product-category">${produit.categorie || 'Non catégorisé'}</p>
                    <h3 class="product-name">${produit.nom}</h3>
                    <p class="product-price">${Number(produit.prix).toLocaleString('fr-FR')} FCFA</p>
                    <div class="product-sizes">
                        ${tailles.map(taille => `<span class="size-badge">${taille.trim()}</span>`).join('')}
                    </div>
                    <div class="product-actions">
                        <button class="btn btn-primary btn-voir-produit" 
                                data-product-id="${produit.id}">
                            Voir le produit
                        </button>
                        <button class="btn btn-icon btn-add-cart" 
                                data-product-id="${produit.id}"
                                data-product-nom="${produit.nom}"
                                data-product-prix="${produit.prix}"
                                data-product-image="${produit.image_principale}"
                                data-product-tailles="${produit.tailles_disponibles}"
                                title="Ajouter au panier">
                            🛒
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Ajouter les event listeners après avoir créé le HTML
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            window.location.href = `/produit/${productId}`;
        });
    });

    // Event listeners pour les boutons (avec stopPropagation)
    document.querySelectorAll('.btn-voir-produit').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const productId = this.getAttribute('data-product-id');
            window.location.href = `/produit/${productId}`;
        });
    });

    // Event listeners pour boutons ajout panier rapide
    document.querySelectorAll('.btn-add-cart').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            
            const produitData = {
                id: this.getAttribute('data-product-id'),
                nom: this.getAttribute('data-product-nom'),
                prix: parseFloat(this.getAttribute('data-product-prix')),
                image: this.getAttribute('data-product-image'),
                tailles: this.getAttribute('data-product-tailles').split(',').map(t => t.trim())
            };
            
            // Si le produit a plusieurs tailles, rediriger vers la page produit
            if (produitData.tailles.length > 1) {
                window.location.href = `/produit/${produitData.id}`;
                return;
            }
            
            // Sinon, ajouter directement au panier avec la seule taille disponible
            const taille = produitData.tailles[0] || 'Unique';
            const quantite = 1;
            
            // Récupérer panier existant
            let panier = JSON.parse(localStorage.getItem('panier')) || [];
            
            // Vérifier si produit existe déjà avec cette taille
            const index = panier.findIndex(item => 
                item.id === produitData.id && item.taille === taille
            );
            
            if (index !== -1) {
                // Augmenter quantité
                panier[index].quantite += quantite;
            } else {
                // Ajouter nouveau produit
                panier.push({
                    id: produitData.id,
                    nom: produitData.nom,
                    prix: produitData.prix,
                    image: produitData.image,
                    taille: taille,
                    quantite: quantite
                });
            }
            
            // Sauvegarder
            localStorage.setItem('panier', JSON.stringify(panier));
            
            // Mettre à jour compteur panier
            updateCartCount();
            
            // Animation feedback
            this.innerHTML = '✓';
            this.style.backgroundColor = 'var(--vert)';
            setTimeout(() => {
                this.innerHTML = '🛒';
                this.style.backgroundColor = '';
            }, 1000);
        });
    });
}

// Rechercher des produits
function rechercher() {
    const searchValue = document.getElementById('searchInput').value;
    appliquerFiltres();
}

// Appliquer les filtres
async function appliquerFiltres() {
    const categorie = document.getElementById('categorieFilter').value;
    const taille = document.getElementById('tailleFilter').value;
    const prixMin = document.getElementById('prixMinFilter').value;
    const prixMax = document.getElementById('prixMaxFilter').value;
    const recherche = document.getElementById('searchInput').value;
    
    // Construire l'URL avec les paramètres de filtre
    const params = new URLSearchParams();
    if (categorie) params.append('categorie', categorie);
    if (taille) params.append('taille', taille);
    if (prixMin) params.append('prix_min', prixMin);
    if (prixMax) params.append('prix_max', prixMax);
    if (recherche) params.append('recherche', recherche);
    
    try {
        const response = await fetch(`/api/produits?${params.toString()}`);
        const produits = await response.json();
        afficherProduits(produits);
    } catch (error) {
        console.error('Erreur filtrage produits:', error);
    }
}

// Écouter les changements sur le champ de recherche (recherche en temps réel)
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            // Débounce pour éviter trop de requêtes
            clearTimeout(window.searchTimeout);
            window.searchTimeout = setTimeout(appliquerFiltres, 500);
        });
    }
});
