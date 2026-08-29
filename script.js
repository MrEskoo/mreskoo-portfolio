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
