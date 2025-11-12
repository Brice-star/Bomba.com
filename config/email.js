/**
 * ==========================================
 * CONFIGURATION EMAIL - BOMBA E-COMMERCE
 * ==========================================
 * 
 * Gestion de l'envoi d'emails automatiques :
 * - Confirmation de commande
 * - Facture / Reçu
 * - Suivi de commande
 */

const nodemailer = require('nodemailer');

// Configuration du transporteur email
// En développement, on utilise un service de test comme Ethereal ou Gmail
// En production, utilisez SendGrid, AWS SES, ou votre serveur SMTP professionnel

let transporter;

/**
 * Initialiser le transporteur email
 */
async function initEmailTransporter() {
    // Si Gmail est configuré, l'utiliser directement
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD && process.env.EMAIL_SERVICE === 'gmail') {
        try {
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD
                },
                pool: true,
                maxConnections: 1,
                rateDelta: 1000,
                rateLimit: 5
            });
            
            // Vérifier la connexion avec timeout
            try {
                await Promise.race([
                    transporter.verify(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
                ]);
                console.log('📧 Email configuré: GMAIL (emails réels)');
                console.log(`📧 Expéditeur: ${process.env.EMAIL_USER}`);
            } catch (verifyError) {
                console.log('⚠️  Vérification email ignorée (peut être lent)');
                console.log('📧 Email configuré: GMAIL (emails réels - non vérifié)');
                console.log(`📧 Expéditeur: ${process.env.EMAIL_USER}`);
            }
            return;
        } catch (error) {
            console.error('❌ Erreur configuration Gmail:', error.message);
            console.log('⚠️  Basculement vers mode test Ethereal...');
        }
    }
    
    // Sinon, utiliser Ethereal Email (service de test gratuit)
    // Les emails sont visibles sur https://ethereal.email
    try {
        // Créer un compte de test automatiquement
        const testAccount = await nodemailer.createTestAccount();
        
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
        
        console.log('📧 Email configuré: MODE TEST (Ethereal)');
        console.log('📧 Les emails seront visibles sur: https://ethereal.email');
        console.log(`📧 Compte test: ${testAccount.user}`);
        
    } catch (error) {
        console.error('❌ Erreur configuration email:', error);
        transporter = null;
    }
}

/**
 * Envoyer un email de confirmation de commande
 */
async function envoyerEmailConfirmation(commandeData) {
    const {
        numero_commande,
        email,
        nom,
        prenom,
        montant_total,
        devise,
        produits, // JSON string des produits
        adresse,
        ville,
        pays,
        telephone,
        date_commande
    } = commandeData;

    // Parser les produits
    let produitsDetails = [];
    try {
        produitsDetails = JSON.parse(produits);
    } catch (e) {
        console.error('Erreur parsing produits:', e);
    }

    // Formater la devise
    const deviseSymbol = {
        'EUR': '€',
        'USD': '$',
        'CAD': 'CAD$',
        'XAF': 'F CFA'
    }[devise] || devise;

    // Construire la liste des produits pour l'email
    let listeProduits = '';
    produitsDetails.forEach(produit => {
        listeProduits += `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
                ${produit.nom}
                ${produit.taille ? `<br><small style="color: #666;">Taille: ${produit.taille}</small>` : ''}
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
                ${produit.quantite}
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
                ${produit.prix} ${deviseSymbol}
            </td>
        </tr>`;
    });

    // HTML de l'email
    const htmlEmail = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2c1810 0%, #3d2415 100%); color: #d4af37; padding: 30px; text-align: center; }
            .content { background: #fff; padding: 30px; border: 1px solid #ddd; }
            .footer { background: #f5f5dc; padding: 20px; text-align: center; font-size: 0.9em; color: #666; }
            .order-info { background: #f9f9f9; padding: 20px; margin: 20px 0; border-left: 4px solid #8b6914; }
            .button { display: inline-block; background: #2d5016; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .total { font-size: 1.3em; font-weight: bold; color: #2c1810; text-align: right; padding: 15px; background: #f5f5dc; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0; font-size: 2em;">BOMBA</h1>
                <p style="margin: 10px 0 0 0; color: #f5f5dc;">by Lyne's Design</p>
            </div>
            
            <div class="content">
                <h2 style="color: #2c1810;">✅ Commande Confirmée !</h2>
                
                <p>Bonjour <strong>${prenom} ${nom}</strong>,</p>
                
                <p>Merci pour votre commande ! Nous avons bien reçu votre paiement et votre commande est maintenant en préparation.</p>
                
                <div class="order-info">
                    <h3 style="margin-top: 0; color: #2c1810;">📋 Détails de votre commande</h3>
                    <p style="margin: 5px 0;"><strong>Numéro de commande:</strong> <span style="color: #8b6914; font-size: 1.2em;">#${numero_commande}</span></p>
                    <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(date_commande).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p style="margin: 5px 0;"><strong>Montant total:</strong> ${montant_total} ${deviseSymbol}</p>
                </div>
                
                <h3 style="color: #2c1810;">🛍️ Articles commandés</h3>
                <table>
                    <thead>
                        <tr style="background: #f5f5dc;">
                            <th style="padding: 10px; text-align: left;">Produit</th>
                            <th style="padding: 10px; text-align: center;">Quantité</th>
                            <th style="padding: 10px; text-align: right;">Prix</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${listeProduits}
                    </tbody>
                </table>
                
                <div class="total">
                    TOTAL: ${montant_total} ${deviseSymbol}
                </div>
                
                <h3 style="color: #2c1810;">📦 Adresse de livraison</h3>
                <p style="margin: 5px 0;">${prenom} ${nom}</p>
                <p style="margin: 5px 0;">${adresse}</p>
                <p style="margin: 5px 0;">${ville}, ${pays}</p>
                <p style="margin: 5px 0;">📞 ${telephone}</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="http://localhost:3000/suivi?numero=${numero_commande}" class="button" style="color: #fff;">
                        🔍 Suivre ma commande
                    </a>
                </div>
                
                <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
                    <h4 style="margin-top: 0; color: #856404;">📞 Besoin d'aide ?</h4>
                    <p style="margin: 5px 0;">Notre équipe est là pour vous !</p>
                    <p style="margin: 5px 0;"><strong>Email:</strong> support@bomba-ecommerce.com</p>
                    <p style="margin: 5px 0;"><strong>Téléphone:</strong> +229 XX XX XX XX</p>
                    <p style="margin: 5px 0;"><strong>Numéro de commande:</strong> #${numero_commande}</p>
                    <p style="margin: 10px 0 0 0; font-size: 0.9em; color: #666;">
                        <em>Mentionnez toujours votre numéro de commande lors de vos contacts.</em>
                    </p>
                </div>
            </div>
            
            <div class="footer">
                <p><strong>BOMBA by Lyne's Design</strong></p>
                <p>Vêtements africains modernes et élégants</p>
                <p style="margin-top: 15px; font-size: 0.85em;">
                    Vous recevez cet email car vous avez passé une commande sur notre site.<br>
                    Cet email est automatique, merci de ne pas y répondre.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;

    // Texte brut (fallback)
    const texteEmail = `
BOMBA by Lyne's Design
Confirmation de commande

Bonjour ${prenom} ${nom},

Merci pour votre commande ! Nous avons bien reçu votre paiement.

DÉTAILS DE VOTRE COMMANDE
--------------------------
Numéro de commande: #${numero_commande}
Date: ${new Date(date_commande).toLocaleDateString('fr-FR')}
Montant total: ${montant_total} ${deviseSymbol}

ARTICLES COMMANDÉS
--------------------------
${produitsDetails.map(p => `${p.nom} ${p.taille ? `(Taille: ${p.taille})` : ''} - Qté: ${p.quantite} - ${p.prix} ${deviseSymbol}`).join('\n')}

TOTAL: ${montant_total} ${deviseSymbol}

ADRESSE DE LIVRAISON
--------------------------
${prenom} ${nom}
${adresse}
${ville}, ${pays}
Tél: ${telephone}

SUIVI DE COMMANDE
--------------------------
Suivez votre commande sur: http://localhost:3000/suivi?numero=${numero_commande}

BESOIN D'AIDE ?
--------------------------
Email: support@bomba-ecommerce.com
Téléphone: +229 XX XX XX XX
Numéro de commande: #${numero_commande}

--
BOMBA by Lyne's Design
Vêtements africains modernes et élégants
    `;

    // En mode développement avec Ethereal, envoyer et afficher le lien
    if (transporter) {
        try {
            // Utiliser l'email configuré ou un email par défaut
            const fromEmail = process.env.EMAIL_FROM || 
                             `"BOMBA by Lyne's Design" <${process.env.EMAIL_USER || 'noreply@bomba-ecommerce.com'}>`;
            
            const info = await transporter.sendMail({
                from: fromEmail,
                to: email,
                subject: `✅ Confirmation de commande #${numero_commande} - BOMBA`,
                text: texteEmail,
                html: htmlEmail
            });

            // En mode test Ethereal, afficher le lien pour voir l'email
            if (process.env.NODE_ENV !== 'production') {
                const previewUrl = nodemailer.getTestMessageUrl(info);
                console.log('\n📧 ========== EMAIL ENVOYÉ ==========');
                console.log(`✅ Email envoyé à: ${email}`);
                console.log(`🔗 Voir l'email: ${previewUrl}`);
                console.log('=====================================\n');
            }

            return { success: true, messageId: info.messageId, previewUrl: nodemailer.getTestMessageUrl(info) };
        } catch (error) {
            console.error('❌ Erreur envoi email:', error);
            return { success: false, error: error.message };
        }
    }

    // Si pas de transporter configuré, juste logger
    console.log('\n📧 ========== EMAIL DE CONFIRMATION ==========');
    console.log(`À: ${email}`);
    console.log(`Sujet: Confirmation de commande #${numero_commande}`);
    console.log('--------------------------------------------');
    console.log(texteEmail);
    console.log('============================================\n');
    return { success: true, mode: 'log-only' };
}

/**
 * Envoyer un email de notification de changement de statut
 */
async function envoyerEmailStatut(commandeData, nouveauStatut) {
    const {
        numero_commande,
        email_client,
        nom_client
    } = commandeData;

    let sujet, titre, message, emoji;
    
    switch(nouveauStatut) {
        case 'Expédiée':
            emoji = '📦';
            titre = 'Votre commande est en route !';
            sujet = `${emoji} Commande expédiée #${numero_commande}`;
            message = `
                <p>Bonne nouvelle ! Votre commande a été expédiée et est maintenant en route vers vous.</p>
                <p>Vous devriez la recevoir dans les prochains jours selon votre pays de livraison.</p>
            `;
            break;
            
        case 'Livrée':
            emoji = '✅';
            titre = 'Votre commande est arrivée !';
            sujet = `${emoji} Commande livrée #${numero_commande}`;
            message = `
                <p>Excellente nouvelle ! Votre commande a été livrée avec succès.</p>
                <p>Nous espérons que vous apprécierez vos achats BOMBA !</p>
                <p style="margin-top: 20px;">
                    <strong>Besoin d'aide ?</strong><br>
                    N'hésitez pas à nous contacter si vous avez des questions.
                </p>
            `;
            break;
            
        default:
            return { success: false, error: 'Statut non géré pour notification email' };
    }

    const htmlEmail = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2c1810 0%, #3d2415 100%); color: #d4af37; padding: 30px; text-align: center; }
            .content { background: #fff; padding: 30px; border: 1px solid #ddd; }
            .footer { background: #f5f5dc; padding: 20px; text-align: center; font-size: 0.9em; color: #666; }
            .status-badge { display: inline-block; background: #2d5016; color: #fff; padding: 10px 20px; border-radius: 25px; font-weight: bold; margin: 20px 0; }
            .button { display: inline-block; background: #2d5016; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0; font-size: 2em;">BOMBA</h1>
                <p style="margin: 10px 0 0 0; color: #f5f5dc;">by Lyne's Design</p>
            </div>
            
            <div class="content">
                <h2 style="color: #2c1810;">${emoji} ${titre}</h2>
                
                <p>Bonjour <strong>${nom_client}</strong>,</p>
                
                ${message}
                
                <div style="background: #f9f9f9; padding: 20px; margin: 20px 0; border-left: 4px solid #8b6914;">
                    <p style="margin: 5px 0;"><strong>Numéro de commande:</strong> <span style="color: #8b6914; font-size: 1.2em;">#${numero_commande}</span></p>
                    <p style="margin: 5px 0;"><strong>Statut:</strong> <span class="status-badge">${nouveauStatut}</span></p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="http://localhost:3000/suivi?numero=${numero_commande}" class="button" style="color: #fff;">
                        🔍 Suivre ma commande
                    </a>
                </div>
            </div>
            
            <div class="footer">
                <p><strong>BOMBA by Lyne's Design</strong></p>
                <p>Vêtements africains modernes et élégants</p>
                <p style="margin-top: 15px; font-size: 0.85em;">
                    Vous recevez cet email car le statut de votre commande a changé.<br>
                    Cet email est automatique, merci de ne pas y répondre.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;

    if (transporter) {
        try {
            const fromEmail = process.env.EMAIL_FROM || 
                             `"BOMBA by Lyne's Design" <${process.env.EMAIL_USER || 'noreply@bomba-ecommerce.com'}>`;
            
            const info = await transporter.sendMail({
                from: fromEmail,
                to: email_client,
                subject: sujet,
                html: htmlEmail
            });

            console.log(`✅ Email de notification (${nouveauStatut}) envoyé à:`, email_client);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Erreur envoi email statut:', error);
            return { success: false, error: error.message };
        }
    }

    return { success: false, error: 'Transporteur email non configuré' };
}

/**
 * Envoyer une notification à l'admin lors d'une nouvelle commande
 */
async function envoyerEmailNotificationAdmin(commandeData) {
    const {
        numero_commande,
        nom_client,
        email_client,
        telephone_client,
        pays,
        montant_total,
        devise,
        produits // JSON array
    } = commandeData;
    
    // Formater la devise
    const deviseSymbol = {
        'XAF': 'FCFA',
        'EUR': '€',
        'USD': '$',
        'CAD': 'CAD$'
    };
    
    const montantFormate = `${parseFloat(montant_total).toLocaleString('fr-FR')} ${deviseSymbol[devise] || devise}`;
    
    // Email de l'admin
    const emailAdmin = process.env.EMAIL_ADMIN || process.env.EMAIL_USER;
    
    if (!emailAdmin) {
        console.log('⚠️  Email admin non configuré');
        return { success: false, error: 'Email admin non configuré' };
    }
    
    const htmlEmail = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6B4423 0%, #8B6B47 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .alert { background: #ff4444; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center; font-weight: bold; }
            .info-box { background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #6B4423; }
            .info-line { margin: 8px 0; }
            .label { color: #666; font-weight: bold; }
            .value { color: #333; }
            .products { margin-top: 20px; }
            .product-item { background: white; padding: 10px; margin: 10px 0; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
            .btn { display: inline-block; padding: 12px 30px; background: #6B4423; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔔 NOUVELLE COMMANDE</h1>
            </div>
            <div class="content">
                <div class="alert">
                    ⚠️ Vous avez reçu une nouvelle commande !
                </div>
                
                <div class="info-box">
                    <h3 style="margin-top: 0; color: #6B4423;">📦 Détails de la commande</h3>
                    <div class="info-line">
                        <span class="label">Numéro:</span>
                        <span class="value">${numero_commande}</span>
                    </div>
                    <div class="info-line">
                        <span class="label">Montant:</span>
                        <span class="value" style="font-size: 1.2em; font-weight: bold; color: #6B4423;">${montantFormate}</span>
                    </div>
                </div>
                
                <div class="info-box">
                    <h3 style="margin-top: 0; color: #6B4423;">👤 Informations client</h3>
                    <div class="info-line">
                        <span class="label">Nom:</span>
                        <span class="value">${nom_client}</span>
                    </div>
                    <div class="info-line">
                        <span class="label">Email:</span>
                        <span class="value">${email_client}</span>
                    </div>
                    <div class="info-line">
                        <span class="label">Téléphone:</span>
                        <span class="value">${telephone_client}</span>
                    </div>
                    <div class="info-line">
                        <span class="label">Pays:</span>
                        <span class="value">${pays}</span>
                    </div>
                </div>
                
                <div class="products">
                    <h3 style="color: #6B4423;">🛍️ Produits commandés</h3>
                    ${produits.map(p => `
                        <div class="product-item">
                            <strong>${p.nom}</strong><br>
                            Quantité: ${p.quantite} | Prix: ${parseFloat(p.prix).toLocaleString('fr-FR')} ${deviseSymbol[devise] || devise}
                        </div>
                    `).join('')}
                </div>
                
                <div style="text-align: center;">
                    <a href="${process.env.BASE_URL || 'http://localhost:3000'}/admin/dashboard" class="btn">
                        Voir dans le dashboard
                    </a>
                </div>
            </div>
            <div class="footer">
                <p>BOMBA by Lyne's Design - Administration</p>
            </div>
        </div>
    </body>
    </html>
    `;
    
    if (transporter) {
        try {
            const fromEmail = process.env.EMAIL_FROM || 
                             `"BOMBA by Lyne's Design" <${process.env.EMAIL_USER || 'noreply@bomba-ecommerce.com'}>`;
            
            const info = await transporter.sendMail({
                from: fromEmail,
                to: emailAdmin,
                subject: `🔔 Nouvelle commande ${numero_commande}`,
                html: htmlEmail
            });
            
            console.log(`✅ Email de notification admin envoyé pour commande ${numero_commande}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Erreur envoi email admin:', error);
            return { success: false, error: error.message };
        }
    }
    
    return { success: false, error: 'Transporteur email non configuré' };
}

// Initialiser au démarrage (fonction async)
initEmailTransporter().catch(err => {
    console.error('❌ Erreur initialisation email:', err);
});

module.exports = {
    envoyerEmailConfirmation,
    envoyerEmailStatut,
    envoyerEmailNotificationAdmin
};
