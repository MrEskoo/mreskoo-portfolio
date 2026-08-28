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


// Formulaire de commande : essaie d'abord l'application e-mail par défaut (ex. Gmail),
// puis propose Gmail Web si aucune application ne prend en charge mailto.
const orderForm = document.getElementById('orderForm');

if (orderForm) {
  orderForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(orderForm);
    const nom = String(formData.get('nom') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const type = String(formData.get('type') || '').trim();
    const message = String(formData.get('message') || '').trim();

    const subject = `Nouvelle commande - ${nom}`;
    const body =
`Bonjour MrEskoo,

Je souhaite passer une commande de montage vidéo.

Nom / pseudo : ${nom}
E-mail : ${email}
Type de montage : ${type}

Description du projet :
${message}

Envoyé depuis le portfolio MrEskoo.`;

    const to = 'collabesko@gmail.com';
    const mailtoUrl =
      `mailto:${encodeURIComponent(to)}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;

    // Sur PC, mailto ouvre le gestionnaire d'e-mails par défaut.
    // Si Gmail (PWA/app) est configuré comme gestionnaire, Gmail s'ouvre.
    // Le site reste dans son onglet.
    const fallbackTimer = setTimeout(() => {
      const useWeb = confirm(
        'Aucune application e-mail ne semble avoir été ouverte.\n\n' +
        'Voulez-vous ouvrir Gmail Web avec votre commande préremplie ?'
      );

      if (useWeb) {
        const gmailUrl =
          `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}` +
          `&su=${encodeURIComponent(subject)}` +
          `&body=${encodeURIComponent(body)}`;
        window.open(gmailUrl, '_blank', 'noopener,noreferrer');
      }
    }, 1200);

    // Tente l'application/gestionnaire mail du PC sans quitter le portfolio.
    window.location.href = mailtoUrl;

    // Le changement d'URL vers mailto peut être bloqué par certains navigateurs.
    window.addEventListener('blur', () => clearTimeout(fallbackTimer), { once: true });

    toast.textContent = 'Votre message est prêt à être envoyé ✉️';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  });
}
