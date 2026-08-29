const menuBtn = document.querySelector('.menu-btn');
const navbar = document.querySelector('.navbar');
menuBtn.addEventListener('click', () => navbar.classList.toggle('open'));

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
document.querySelectorAll('[data-copy]').forEach(button => {
  button.addEventListener('click', async () => {
    const value = button.dataset.copy;
    try {
      await navigator.clipboard.writeText(value);
      toast.textContent = `Copié : ${value}`;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 1800);
    } catch {
      toast.textContent = value;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 1800);
    }
  });
});


// Sélection automatique de l'offre depuis la section Tarifs
const offerSelect = document.getElementById('offre');
document.querySelectorAll('.offer-choice').forEach(link => {
  link.addEventListener('click', () => {
    const offer = link.dataset.offer;
    if (offerSelect) offerSelect.value = offer;
  });
});

// Création d'une demande personnalisée dans Gmail Web
const orderForm = document.getElementById('order-form');
if (orderForm) {
  orderForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(orderForm);
    const nom = (formData.get('nom') || '').trim();
    const offre = formData.get('offre') || '';
    const description = (formData.get('message') || '').trim();

    const subject = `Demande de montage — ${offre}`;
    const body = `Salut MrEskoo !\n\nJe souhaite passer une commande de montage.\n\n👤 Nom / pseudo : ${nom}\n💰 Offre choisie : ${offre}\n\n📝 Mon projet :\n${description}\n\nMerci !`;

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=collabesko@gmail.com&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');

    toast.textContent = 'Votre demande est prête dans Gmail ✉️';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  });
}
