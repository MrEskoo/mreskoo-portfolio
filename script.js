const menuBtn = document.querySelector('.menu-btn');
const navbar = document.querySelector('.navbar');

if (menuBtn) {
  menuBtn.addEventListener('click', () => navbar.classList.toggle('open'));
}

document.querySelectorAll('nav a').forEach(link => {
  link.addEventListener('click', () => navbar.classList.remove('open'));
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

const toast = document.getElementById('toast');
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

// Copie les coordonnées de contact.
document.querySelectorAll('[data-copy]').forEach(button => {
  button.addEventListener('click', async () => {
    const value = button.dataset.copy;
    try {
      await navigator.clipboard.writeText(value);
      showToast(`Copié : ${value}`);
    } catch {
      showToast(value);
    }
  });
});

// Sélection automatique de l'offre depuis la section Tarifs.
const offerSelect = document.getElementById('offre');
document.querySelectorAll('.offer-choice').forEach(link => {
  link.addEventListener('click', () => {
    const offer = link.dataset.offer;
    if (offerSelect && offer) {
      offerSelect.value = offer;
    }
  });
});

// Prépare puis copie une demande personnalisée dans le presse-papiers.
const orderForm = document.getElementById('order-form');
if (orderForm) {
  orderForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = orderForm.elements.nom.value.trim();
    const offer = orderForm.elements.offre.value;
    const message = orderForm.elements.message.value.trim();

    if (!name || !offer || !message) {
      showToast('⚠️ Remplis tous les champs.');
      return;
    }

    const personalizedMessage = `Bonjour MrEskoo,\n\nJe souhaite passer une commande de montage vidéo.\n\n👤 Nom / pseudo : ${name}\n💰 Offre choisie : ${offer}\n📝 Description du projet :\n${message}\n\nMerci !`;

    try {
      await navigator.clipboard.writeText(personalizedMessage);
      showToast('✅ Ta demande a été copiée ! Tu peux maintenant la coller sur Discord ou Gmail.');
    } catch {
      const fallback = document.createElement('textarea');
      fallback.value = personalizedMessage;
      fallback.style.position = 'fixed';
      fallback.style.opacity = '0';
      document.body.appendChild(fallback);
      fallback.focus();
      fallback.select();
      try { document.execCommand('copy'); } catch {}
      fallback.remove();
      showToast('✅ Ta demande a été copiée !');
    }
  });
}

// ===== Système d'avis =====
const reviewModal = document.getElementById('review-modal');
const openReviewBtn = document.getElementById('open-review');
const reviewForm = document.getElementById('review-form');
const starButtons = document.querySelectorAll('.star');
const reviewCount = document.getElementById('review-count');
const reviewText = document.getElementById('review-text');
const reviewsList = document.getElementById('reviews-list');
let selectedStars = 0;

// Avis validés : ajoute ici uniquement les avis que tu as acceptés.
const approvedReviews = [
  // Exemple : { pseudo: 'Pseudo', stars: 5, text: 'Super montage !' }
];

function renderReviews() {
  if (!reviewsList) return;
  if (!approvedReviews.length) {
    reviewsList.innerHTML = '<p class="reviews-empty">Aucun avis publié pour le moment.</p>';
    return;
  }
  reviewsList.innerHTML = approvedReviews.map(review => `
    <article class="review-item">
      <div class="review-top">
        <span class="review-pseudo">${escapeHtml(review.pseudo)}</span>
        <span class="review-stars" aria-label="${review.stars} sur 5">${'★'.repeat(review.stars)}${'☆'.repeat(5-review.stars)}</span>
      </div>
      <p>${escapeHtml(review.text)}</p>
    </article>
  `).join('');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]));
}

function setStars(value) {
  selectedStars = value;
  starButtons.forEach(star => {
    star.classList.toggle('active', Number(star.dataset.star) <= value);
  });
}

starButtons.forEach(star => {
  star.addEventListener('click', () => setStars(Number(star.dataset.star)));
});

if (reviewText && reviewCount) {
  reviewText.addEventListener('input', () => {
    const count = reviewText.value.replace(/\s/g, '').length;
    reviewCount.textContent = count;
    reviewCount.style.color = count > 50 ? '#ff5b72' : '';
    if (count > 50) {
      let result = '';
      let n = 0;
      for (const char of reviewText.value) {
        if (!/\s/.test(char)) n++;
        if (n > 50) break;
        result += char;
      }
      reviewText.value = result;
      reviewCount.textContent = result.replace(/\s/g, '').length;
    }
  });
}

function closeReview() {
  reviewModal?.classList.remove('open');
  reviewModal?.setAttribute('aria-hidden', 'true');
}

openReviewBtn?.addEventListener('click', () => {
  reviewModal?.classList.add('open');
  reviewModal?.setAttribute('aria-hidden', 'false');
  setStars(0);
  reviewForm?.reset();
  if (reviewCount) reviewCount.textContent = '0';
});

document.querySelectorAll('[data-close-review]').forEach(el => el.addEventListener('click', closeReview));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeReview(); });

if (reviewForm) {
  reviewForm.addEventListener('submit', event => {
    event.preventDefault();
    const pseudo = document.getElementById('review-pseudo').value.trim();
    const text = reviewText.value.trim();
    const compactLength = text.replace(/\s/g, '').length;

    if (!selectedStars) return showToast('⭐ Choisis une note.');
    if (!pseudo) return showToast('⚠️ Mets ton pseudo.');
    if (!text) return showToast('⚠️ Écris ton avis.');
    if (compactLength > 50) return showToast('⚠️ Ton avis dépasse 50 caractères.');

    const personalizedReview = `Bonjour MrEskoo,\n\n⭐ Nouvelle demande d'avis à valider\n\n👤 Pseudo : ${pseudo}\n⭐ Note : ${selectedStars}/5\n📝 Avis : ${text}\n\nÀ valider avant publication.`;
    const gmailUrl = 'https://mail.google.com/mail/?view=cm&fs=1&to=collabesko@gmail.com&su=' +
      encodeURIComponent('Nouvel avis à valider - ' + pseudo) + '&body=' + encodeURIComponent(personalizedReview);
    window.open(gmailUrl, '_blank', 'noopener');
    closeReview();
    showToast('📨 Ton avis a été envoyé pour validation.');
  });
}

renderReviews();
