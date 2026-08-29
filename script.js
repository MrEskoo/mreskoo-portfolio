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


// Formulaire de commande : ouvre toujours Gmail Web dans un nouvel onglet.
// Le portfolio reste ouvert dans l'onglet actuel, sur PC comme sur téléphone.
const orderForm = document.getElementById('orderForm');

if (orderForm) {
  orderForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!orderForm.checkValidity()) {
      orderForm.reportValidity();
      return;
    }

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
    const gmailUrl =
      `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}` +
      `&su=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;

    // Ouvre Gmail Web dans un nouvel onglet et laisse le portfolio ouvert.
    const gmailWindow = window.open(gmailUrl, '_blank', 'noopener,noreferrer');

    if (!gmailWindow) {
      // Si le navigateur bloque le nouvel onglet, on indique quoi faire.
      toast.textContent = 'Autorise les fenêtres pop-up pour ouvrir Gmail ✉️';
    } else {
      toast.textContent = 'Votre message est prêt dans Gmail ✉️';
    }

    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
  });
}
