// ================================================
// BOMBA - Script page produit détaillée
// ================================================

let produitActuel = null;
let tailleSelectionnee = null;
let quantite = 1;

document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    chargerDetailProduit();
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

async function chargerDetailProduit() {
    const productId = window.location.pathname.split('/').pop();
    
    try {
        const response = await fetch(`/api/produits/${productId}`);
        
        if (!response.ok) {
            throw new Error('Produit non trouvé');
        }
        
        produitActuel = await response.json();
        afficherDetailProduit();
    } catch (error) {
        console.error('Erreur chargement produit:', error);
        document.getElementById('productDetail').innerHTML = `
            <div class="text-center" style="padding: 3rem;">
                <h2>Produit non trouvé</h2>
                <p style="color: var(--marron-clair); margin: 1rem 0;">Le produit que vous recherchez n'existe pas.</p>
                <a href="/" class="btn btn-primary">Retour à l'accueil</a>
            </div>
        `;
    }
}

function afficherDetailProduit() {
    const tailles = produitActuel.tailles_disponibles ? produitActuel.tailles_disponibles.split(',') : [];
    const imagesSecondaires = produitActuel.images_secondaires ? produitActuel.images_secondaires.split(',') : [];
    const toutesImages = [produitActuel.image_principale, ...imagesSecondaires];
    
    // ===== MISE À JOUR DES META TAGS SEO =====
    const baseUrl = 'https://bombaclothing.com';
    const productUrl = `${baseUrl}/produit.html?id=${produitActuel.id}`;
    const productImage = `${baseUrl}${produitActuel.image_principale}`;
    const productDescription = produitActuel.description || `${produitActuel.nom} - Vêtement africain de luxe BOMBA`;
    const productTitle = `${produitActuel.nom} - ${formaterMontant(produitActuel.prix, produitActuel.devise || 'XAF')} | BOMBA`;
    
    // Mettre à jour le titre de la page
    document.getElementById('page-title').textContent = productTitle;
    document.title = productTitle;
    
    // Mettre à jour les meta tags
    document.querySelector('meta[name="description"]').setAttribute('content', productDescription);
    document.getElementById('canonical-url').setAttribute('href', productUrl);
    
    // Open Graph tags
    document.getElementById('og-title').setAttribute('content', productTitle);
    document.getElementById('og-description').setAttribute('content', productDescription);
    document.getElementById('og-url').setAttribute('content', productUrl);
    document.getElementById('og-image').setAttribute('content', productImage);
    document.getElementById('og-price').setAttribute('content', produitActuel.prix);
    document.getElementById('og-currency').setAttribute('content', produitActuel.devise || 'XAF');
    
    // Twitter Card tags
    document.getElementById('twitter-title').setAttribute('content', productTitle);
    document.getElementById('twitter-description').setAttribute('content', productDescription);
    document.getElementById('twitter-image').setAttribute('content', productImage);
    
    const html = `
        <div class="product-detail-container">
            <div class="product-images">
                <img src="${toutesImages[0]}" alt="${produitActuel.nom}" class="main-image" id="mainImage"
                     onerror="this.src='/images/products/placeholder.jpg'">
                <div class="thumbnail-images">
                    ${toutesImages.map((img, index) => `
                        <img src="${img}" alt="${produitActuel.nom}" class="thumbnail ${index === 0 ? 'active' : ''}" 
                             data-image-url="${img}"
                             onerror="this.src='/images/products/placeholder.jpg'">
                    `).join('')}
                </div>
            </div>
            
            <div class="product-details">
                <p style="color: var(--marron-clair); font-weight: 600; margin-bottom: 0.5rem;">
                    ${produitActuel.categorie || 'Non catégorisé'}
                </p>
                <h1>${produitActuel.nom}</h1>
                <p class="product-price" style="font-size: 2rem; margin: 1rem 0;">
                    ${formaterMontant(produitActuel.prix, produitActuel.devise || 'XAF')}
                </p>
                
                <div style="border-top: 2px solid var(--gris-clair); padding-top: 1.5rem; margin-top: 1.5rem;">
                    <h3>Description</h3>
                    <p style="color: var(--marron-clair); line-height: 1.8;">
                        ${produitActuel.description || 'Aucune description disponible.'}
                    </p>
                </div>
                
                <!-- Section Authenticité & Disponibilité des tissus -->
                <div style="background: linear-gradient(135deg, #f9f5f0 0%, #fef8f3 100%); 
                            border-left: 4px solid var(--orange); 
                            padding: 1.5rem; 
                            margin-top: 2rem; 
                            border-radius: 12px;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
                        <span style="font-size: 1.75rem;">🪡</span>
                        <h3 style="margin: 0; color: var(--marron-fonce);">Authenticité & Disponibilité des tissus</h3>
                    </div>
                    <p style="color: var(--marron-clair); line-height: 1.8; margin: 0; font-size: 0.95rem;">
                        ${produitActuel.textile_disponibilite || 'Chaque tenue BOMBA est fabriquée à la main par des artisans locaux avec des tissus africains authentiques. En raison de la disponibilité variable des tissus sur le marché, le motif exact ou les couleurs peuvent légèrement différer du visuel présenté. Le modèle, la coupe et la qualité restent strictement identiques. Ces variations rendent chaque pièce unique et exclusive.'}
                    </p>
                </div>
                
                <div style="margin-top: 2rem;">
                    <h3>Taille</h3>
                    <div class="size-selector">
                        ${tailles.map(taille => `
                            <div class="size-option" data-taille="${taille.trim()}">
                                ${taille.trim()}
                            </div>
                        `).join('')}
                    </div>
                    <p id="tailleError" class="hidden" style="color: red; margin-top: 0.5rem;">
                        Veuillez sélectionner une taille
                    </p>
                </div>
                
                <div style="margin-top: 2rem;">
                    <h3>Quantité</h3>
                    <div class="quantity-selector">
                        <button class="quantity-btn" id="decreaseQty">-</button>
                        <span class="quantity-value" id="quantityValue">1</span>
                        <button class="quantity-btn" id="increaseQty">+</button>
                    </div>
                </div>
                
                <div class="action-buttons">
                    <button class="btn btn-primary" id="addToCartBtn" style="flex: 2;">
                        🛒 Ajouter au panier
                    </button>
                    <button class="btn btn-secondary" id="buyNowBtn" style="flex: 1;">
                        Acheter maintenant
                    </button>
                </div>
                
                <div id="successMessage" class="alert alert-success hidden" style="margin-top: 1rem;">
                    Produit ajouté au panier avec succès !
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('productDetail').innerHTML = html;
    
    // ===== AJOUTER SCHEMA.ORG JSON-LD POUR LE PRODUIT =====
    const schemaData = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": produitActuel.nom,
        "description": produitActuel.description || `${produitActuel.nom} - Vêtement africain de luxe BOMBA`,
        "image": `${baseUrl}${produitActuel.image_principale}`,
        "sku": `BOMBA-${produitActuel.id}`,
        "brand": {
            "@type": "Brand",
            "name": "BOMBA"
        },
        "offers": {
            "@type": "Offer",
            "url": productUrl,
            "priceCurrency": produitActuel.devise || "XAF",
            "price": produitActuel.prix,
            "availability": "https://schema.org/InStock",
            "priceValidUntil": new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]
        },
        "category": produitActuel.categorie || "Vêtements",
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "5",
            "reviewCount": "1"
        }
    };
    
    // Injecter le JSON-LD dans le head
    let existingSchema = document.getElementById('product-schema');
    if (existingSchema) {
        existingSchema.remove();
    }
    
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'product-schema';
    script.textContent = JSON.stringify(schemaData);
    document.head.appendChild(script);
    
    // Ajouter les event listeners après avoir créé le HTML
    attachEventListeners();
}

function attachEventListeners() {
    // Event listeners pour les miniatures d'images
    document.querySelectorAll('.thumbnail').forEach(thumb => {
        thumb.addEventListener('click', function() {
            const imageUrl = this.getAttribute('data-image-url');
            changerImagePrincipale(imageUrl, this);
        });
    });
    
    // Event listeners pour la sélection de taille
    document.querySelectorAll('.size-option').forEach(option => {
        option.addEventListener('click', function() {
            const taille = this.getAttribute('data-taille');
            selectionnerTaille(taille, this);
        });
    });
    
    // Event listeners pour la quantité
    document.getElementById('decreaseQty').addEventListener('click', () => modifierQuantite(-1));
    document.getElementById('increaseQty').addEventListener('click', () => modifierQuantite(1));
    
    // Event listeners pour les boutons d'action
    document.getElementById('addToCartBtn').addEventListener('click', ajouterAuPanier);
    document.getElementById('buyNowBtn').addEventListener('click', acheterMaintenant);
}

function changerImagePrincipale(imageUrl, thumbnailElement) {
    document.getElementById('mainImage').src = imageUrl;
    
    // Retirer la classe active de toutes les miniatures
    document.querySelectorAll('.thumbnail').forEach(thumb => thumb.classList.remove('active'));
    // Ajouter la classe active à la miniature cliquée
    thumbnailElement.classList.add('active');
}

function selectionnerTaille(taille, element) {
    tailleSelectionnee = taille;
    
    // Retirer la classe active de toutes les options
    document.querySelectorAll('.size-option').forEach(opt => opt.classList.remove('active'));
    // Ajouter la classe active à l'option sélectionnée
    element.classList.add('active');
    
    // Cacher le message d'erreur
    document.getElementById('tailleError').classList.add('hidden');
}

function modifierQuantite(delta) {
    quantite = Math.max(1, quantite + delta);
    document.getElementById('quantityValue').textContent = quantite;
}

function ajouterAuPanier() {
    if (!tailleSelectionnee) {
        document.getElementById('tailleError').classList.remove('hidden');
        return;
    }
    
    const cart = getCart();
    
    // Vérifier si le produit avec cette taille existe déjà
    const existingItemIndex = cart.findIndex(item => 
        item.id === produitActuel.id && item.taille === tailleSelectionnee
    );
    
    if (existingItemIndex > -1) {
        // Augmenter la quantité
        cart[existingItemIndex].quantite += quantite;
    } else {
        // Ajouter un nouveau produit
        cart.push({
            id: produitActuel.id,
            nom: produitActuel.nom,
            prix: produitActuel.prix,
            devise: produitActuel.devise || 'XAF',
            image: produitActuel.image_principale,
            reference: produitActuel.reference || `BOMBA-${String(produitActuel.id).padStart(4, '0')}`,
            taille: tailleSelectionnee,
            quantite: quantite
        });
    }
    
    saveCart(cart);
    
    // Afficher le message de succès
    const successMsg = document.getElementById('successMessage');
    successMsg.classList.remove('hidden');
    setTimeout(() => {
        successMsg.classList.add('hidden');
    }, 3000);
}

function acheterMaintenant() {
    if (!tailleSelectionnee) {
        document.getElementById('tailleError').classList.remove('hidden');
        return;
    }
    
    // Rediriger directement vers le panier sans ajouter de nouveau produit
    window.location.href = '/panier';
}
