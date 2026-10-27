/**
 * GUIDE D'UTILISATION - TABLEAU DE BORD AMBROISIE
 * JavaScript complet
 * Version: 2.0
 */

// Attendre que le DOM soit complètement chargé
document.addEventListener('DOMContentLoaded', function() {
    
    // ============================================
    // 1. ANIMATION DES SECTIONS (SCROLL FLUIDE)
    // ============================================
    const allLinks = document.querySelectorAll('.summary a, .back-link, a[href^="#"]');
    
    allLinks.forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && href.startsWith('#') && href !== '#') {
                e.preventDefault();
                const targetId = href;
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                    // Mettre à jour l'URL sans recharger
                    history.pushState(null, null, href);
                }
            }
        });
    });

    // ============================================
    // 2. FAQ : QUESTIONS/REPONSES INTERACTIVES
    // ============================================
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(question => {
        question.addEventListener('click', function() {
            const answer = this.nextElementSibling;
            const icon = this.querySelector('i');
            
            // Fermer les autres réponses (optionnel)
            // Décommentez pour n'avoir qu'une réponse ouverte à la fois
            /*
            faqQuestions.forEach(q => {
                if (q !== this) {
                    const otherAnswer = q.nextElementSibling;
                    if (otherAnswer && otherAnswer.classList.contains('show')) {
                        otherAnswer.classList.remove('show');
                        q.classList.remove('active');
                        const otherIcon = q.querySelector('i');
                        if (otherIcon) otherIcon.style.transform = 'rotate(0deg)';
                    }
                }
            });
            */
            
            // Toggle la réponse courante
            if (answer && answer.classList.contains('show')) {
                answer.classList.remove('show');
                this.classList.remove('active');
                if (icon) icon.style.transform = 'rotate(0deg)';
            } else if (answer) {
                answer.classList.add('show');
                this.classList.add('active');
                if (icon) icon.style.transform = 'rotate(90deg)';
            }
        });
    });

    // ============================================
    // 3. ONGLETS DE DÉMONSTRATION (section 7.1)
    // ============================================
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    if (tabBtns.length) {
        tabBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const index = Array.from(tabBtns).indexOf(this);
                
                // Retirer la classe active de tous les onglets
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Ajouter la classe active à l'onglet cliqué
                this.classList.add('active');
                if (tabContents[index]) {
                    tabContents[index].classList.add('active');
                }
            });
        });
    }

    // ============================================
    // 4. EFFET DE FADE-IN AU SCROLL
    // ============================================
    const sections = document.querySelectorAll('.section');
    
    // Observer pour l'animation d'apparition
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                // Optionnel : arrêter d'observer une fois animé
                // observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Appliquer les styles initiaux et observer
    sections.forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(section);
    });

    // ============================================
    // 5. RETOUR VERS LE TABLEAU DE BORD
    // ============================================
    const backLink = document.getElementById('backLink');
    if (backLink) {
        backLink.addEventListener('click', function(e) {
            e.preventDefault();
            
            /* Le guide est atteint depuis l'une des trois cartes : revenir en
               arrière ramène donc à la bonne, ce qu'aucune URL codée en dur ne
               saurait faire. La carte de Sherbrooke sert de repli, le guide
               vivant dans son dossier. */
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = 'index.html';
            }
        });
    }

    // ============================================
    // 6. LIGHTBOX POUR LES CAPTURES D'ÉCRAN
    // ============================================
    // Lightbox est initialisé automatiquement par la bibliothèque
    // Configuration personnalisée
    if (typeof lightbox !== 'undefined') {
        lightbox.option({
            'resizeDuration': 200,
            'wrapAround': true,
            'albumLabel': 'Image %1 sur %2',
            'fadeDuration': 300,
            'imageFadeDuration': 300
        });
    }
    
    // Alternative : Lightbox manuel si la bibliothèque n'est pas chargée
    if (typeof lightbox === 'undefined') {
        const modalImages = document.querySelectorAll('[data-lightbox]');
        modalImages.forEach(img => {
            img.addEventListener('click', function(e) {
                e.preventDefault();
                const imgSrc = this.href || this.querySelector('img')?.src;
                if (imgSrc) {
                    console.log('Lightbox non disponible - Image: ' + imgSrc);
                    // Alternative simple : ouvrir dans un nouvel onglet
                    // window.open(imgSrc, '_blank');
                }
            });
        });
    }

    // ============================================
    // 7. SMOOTH HOVER SUR LES CARTES
    // ============================================
    const cards = document.querySelectorAll('.card, .icon-card, .screenshot-grid-item');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transition = 'all 0.3s ease';
        });
    });

    // ============================================
    // 8. GESTION DU SOMMAIRE STICKY (amélioration)
    // ============================================
    const summary = document.querySelector('.summary');
    if (summary) {
        const summaryOffset = summary.offsetTop;
        window.addEventListener('scroll', function() {
            if (window.scrollY > summaryOffset) {
                summary.style.boxShadow = 'var(--shadow-md)';
            } else {
                summary.style.boxShadow = 'var(--shadow-sm)';
            }
        });
    }

    // ============================================
    // 9. COMPTAGE DES SECTIONS (pour débogage)
    // ============================================
    console.log('[Guide] Guide d\'utilisation chargé avec succès');
    console.log('[Guide] Sections trouvées : ' + sections.length);
    console.log('[Guide] FAQ trouvées : ' + faqQuestions.length);
    
    // Afficher la version dans la console
    console.log('%c📖 Tableau de bord Ambroisie - Guide d\'utilisation', 'color: #3498db; font-size: 14px; font-weight: bold;');
    console.log('%cVersion: 2.0 | Avril 2026', 'color: #6c757d; font-size: 12px;');
    console.log('%c🖼️ Lightbox intégré pour les captures d\'écran', 'color: #28a745; font-size: 12px;');
    console.log('%c📱 Interface entièrement responsive', 'color: #28a745; font-size: 12px;');

    // ============================================
    // 10. RECHERCHE DANS LE GUIDE (fonctionnalité bonus)
    // ============================================
    // Ajouter une barre de recherche (optionnel)
    const summaryNav = document.querySelector('.summary');
    if (summaryNav && !document.querySelector('.search-container')) {
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        searchContainer.innerHTML = `
            <input type="text" id="guideSearch" placeholder="🔍 Rechercher dans le guide..." class="search-input">
            <div id="searchResults" class="search-results"></div>
        `;
        
        // Insérer la recherche après le sommaire
        summaryNav.insertAdjacentElement('afterend', searchContainer);
        
        const searchInput = document.getElementById('guideSearch');
        const searchResults = document.getElementById('searchResults');
        
        if (searchInput) {
            searchInput.addEventListener('input', function(e) {
                const searchTerm = this.value.toLowerCase().trim();
                if (searchTerm.length < 3) {
                    searchResults.classList.remove('active');
                    searchResults.innerHTML = '';
                    return;
                }
                
                const results = [];
                const sections = document.querySelectorAll('.section');
                
                sections.forEach(section => {
                    const text = section.innerText.toLowerCase();
                    if (text.includes(searchTerm)) {
                        const title = section.querySelector('h2')?.innerText || 'Section';
                        const id = section.id;
                        results.push({ title, id });
                    }
                });
                
                if (results.length > 0) {
                    searchResults.classList.add('active');
                    searchResults.innerHTML = results.map(r => 
                        `<a href="#${r.id}" class="search-result-item">📌 ${r.title}</a>`
                    ).join('');
                    
                    // Ajouter les écouteurs sur les résultats
                    document.querySelectorAll('.search-result-item').forEach(link => {
                        link.addEventListener('click', function(e) {
                            e.preventDefault();
                            const href = this.getAttribute('href');
                            if (href) {
                                searchResults.classList.remove('active');
                                searchResults.innerHTML = '';
                                searchInput.value = '';
                                document.querySelector(href)?.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'start'
                                });
                            }
                        });
                    });
                } else {
                    searchResults.classList.add('active');
                    searchResults.innerHTML = '<div class="search-no-result">Aucun résultat trouvé</div>';
                }
            });
            
            // Fermer les résultats en cliquant ailleurs
            document.addEventListener('click', function(e) {
                if (!searchContainer.contains(e.target)) {
                    searchResults.classList.remove('active');
                }
            });
        }
    }

    // ============================================
    // 11. DÉTECTION DE L'APPAREIL (mobile/tablette)
    // ============================================
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
    
    if (isMobile) {
        console.log('[Guide] 📱 Affichage sur mobile détecté');
        document.body.classList.add('is-mobile');
    } else if (isTablet) {
        console.log('[Guide] 📟 Affichage sur tablette détecté');
        document.body.classList.add('is-tablet');
    } else {
        console.log('[Guide] 💻 Affichage sur ordinateur détecté');
        document.body.classList.add('is-desktop');
    }

    // ============================================
    // 12. PRÉCHARGEMENT DES IMAGES (optionnel)
    // ============================================
    const allImages = document.querySelectorAll('.screenshot-img, .screenshot-mini-img, .screenshot-img-small');
    const imageUrls = Array.from(allImages).map(img => img.src);
    
    // Précharger les images en arrière-plan
    if (imageUrls.length) {
        console.log('[Guide] Préchargement de ' + imageUrls.length + ' images...');
        imageUrls.forEach(url => {
            const img = new Image();
            img.src = url;
        });
    }

    // ============================================
    // 13. ANCRES ACTIVES (highlight dans le sommaire)
    // ============================================
    const summaryLinks = document.querySelectorAll('.summary a');
    
    window.addEventListener('scroll', function() {
        let current = '';
        const scrollPosition = window.scrollY + 100;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });
        
        summaryLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href === `#${current}`) {
                link.classList.add('active');
                link.style.color = 'var(--primary)';
            } else {
                link.style.color = '';
            }
        });
    });

    // ============================================
    // 14. BOUTON RETOUR HAUT DE PAGE
    // ============================================
    const backToTop = document.createElement('button');
    backToTop.innerHTML = '<i class="fas fa-arrow-up"></i>';
    backToTop.className = 'back-to-top';
    backToTop.setAttribute('aria-label', 'Retour en haut');
    document.body.appendChild(backToTop);
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 300) {
            backToTop.classList.add('show');
        } else {
            backToTop.classList.remove('show');
        }
    });
    
    backToTop.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // ============================================
    // 15. MESSAGE DE BIENVENUE (console)
    // ============================================
    console.log('%c✨ Guide prêt à l\'utilisation !', 'color: #28a745; font-size: 12px;');
    console.log('%c💡 Astuce: Utilisez la barre de recherche pour trouver rapidement une section', 'color: #17a2b8; font-size: 12px;');
    console.log('%c📸 Cliquez sur les captures d\'écran pour les agrandir', 'color: #17a2b8; font-size: 12px;');
});

// ============================================
// 16. GESTION DES ERREURS (global)
// ============================================
window.addEventListener('error', function(e) {
    console.error('[Guide] Erreur détectée:', e.message);
    if (e.message.includes('lightbox')) {
        console.warn('[Guide] Lightbox non chargé - Fallback actif');
    }
});

// ============================================
// 17. EXPOSER DES FONCTIONS UTILES (pour débogage)
// ============================================
window.GuideUtils = {
    version: '2.0',
    date: 'Avril 2026',
    getSectionsCount: () => document.querySelectorAll('.section').length,
    scrollToSection: (sectionId) => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return true;
        }
        return false;
    },
    openFAQ: (index) => {
        const faq = document.querySelectorAll('.faq-question')[index];
        if (faq) faq.click();
    }
};

// Afficher l'aide dans la console
console.log('💡 Astuce: Tapez GuideUtils dans la console pour voir les fonctions disponibles');