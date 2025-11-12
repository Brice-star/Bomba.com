// ================================================
// BOMBA - Configuration Stripe (Paiement sécurisé)
// ================================================

require('dotenv').config();

// Vérifier que les clés Stripe sont définies
if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ ERREUR: STRIPE_SECRET_KEY non définie dans .env');
    process.exit(1);
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

console.log('✅ Stripe initialisé avec clé:', process.env.STRIPE_SECRET_KEY.substring(0, 20) + '...');


// Configuration des devises supportées par Stripe
const DEVISE_STRIPE_MAP = {
    'XAF': 'xof', // Franc CFA (West Africa)
    'EUR': 'eur',
    'USD': 'usd',
    'CAD': 'cad'
};

// Fonction pour créer une session de paiement Stripe Checkout
async function createCheckoutSession(orderData) {
    try {
        // Déterminer la devise Stripe
        const devise = orderData.devise || 'XAF';
        const stripeCurrency = DEVISE_STRIPE_MAP[devise] || 'xof';
        
        // Calculer le montant en centimes
        const amount = Math.round(orderData.montant_total * 100);
        
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: stripeCurrency,
                        product_data: {
                            name: 'Commande BOMBA',
                            description: `Commande #${orderData.numero_commande}`,
                            images: ['https://votre-domaine.com/logo.png'], // À remplacer
                        },
                        unit_amount: amount,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.BASE_URL || 'http://localhost:3000'}/confirmation?session_id={CHECKOUT_SESSION_ID}&order=${orderData.numero_commande}`,
            cancel_url: `${process.env.BASE_URL || 'http://localhost:3000'}/panier`,
            metadata: {
                order_id: orderData.id.toString(),
                order_number: orderData.numero_commande,
                currency: devise
            },
        });

        return {
            success: true,
            sessionId: session.id,
            url: session.url
        };
    } catch (error) {
        console.error('❌ Erreur Stripe Checkout:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Fonction pour vérifier un paiement
async function verifyPayment(sessionId) {
    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        
        return {
            success: true,
            paid: session.payment_status === 'paid',
            amount: session.amount_total / 100,
            currency: session.currency,
            metadata: session.metadata
        };
    } catch (error) {
        console.error('❌ Erreur vérification paiement:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Fonction pour créer un remboursement
async function createRefund(paymentIntentId, amount) {
    try {
        const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
            amount: amount ? Math.round(amount * 100) : undefined,
        });

        return {
            success: true,
            refund: refund
        };
    } catch (error) {
        console.error('❌ Erreur remboursement:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Fonction pour valider le webhook Stripe
function validateWebhook(payload, signature) {
    try {
        const event = stripe.webhooks.constructEvent(
            payload,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
        return { success: true, event };
    } catch (error) {
        console.error('❌ Erreur validation webhook:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    stripe,
    createCheckoutSession,
    verifyPayment,
    createRefund,
    validateWebhook,
    DEVISE_STRIPE_MAP
};
