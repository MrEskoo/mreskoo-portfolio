import crypto from 'node:crypto';

// Reçoit un avis et crée un message Discord avec les informations à valider.
function json(res, status, body) { return res.status(status).json(body); }

function parseDataImage(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) return null;
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > 500 * 1024) return null;
  const ext = match[1].toLowerCase().replace('jpeg', 'jpg').replace('image/', '');
  return { buffer, ext };
}

async function githubRequest(path, options = {}) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  if (!token || !owner || !repo) throw new Error('Configuration GitHub incomplète.');
  return fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
}

async function uploadReviewPhoto(dataUrl) {
  const parsed = parseDataImage(dataUrl);
  if (!parsed) throw new Error('Photo invalide ou trop lourde (500 Ko maximum).');
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  const filename = `assets/reviews/${crypto.randomUUID()}.${parsed.ext}`;
  const response = await githubRequest(filename, {
    method: 'PUT',
    body: JSON.stringify({
      message: 'Ajout photo avis',
      content: parsed.buffer.toString('base64'),
      branch
    })
  });
  if (!response.ok) throw new Error('Impossible d’enregistrer la photo.');
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filename}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Méthode non autorisée.' });

  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ID;
  if (!token || !channelId) return json(res, 500, { error: 'Configuration Discord incomplète.' });

  const body = req.body || {};
  const cleanPseudo = String(body.pseudo || '').trim().slice(0, 30);
  const cleanText = String(body.text || '').trim();
  const cleanStars = Number(body.stars);
  const types = Array.isArray(body.types) ? body.types.map(v => String(v).trim()).filter(Boolean).slice(0, 8) : [];
  const channel = String(body.channel || '').trim().slice(0, 300);
  const compactLength = cleanText.replace(/\s/g, '').length;

  if (!cleanPseudo || !cleanText || !Number.isFinite(cleanStars) || cleanStars < 0.5 || cleanStars > 5 || Math.round(cleanStars * 2) !== cleanStars * 2) {
    return json(res, 400, { error: 'Avis incomplet ou note invalide.' });
  }
  if (compactLength > 50) return json(res, 400, { error: 'Avis trop long.' });
  if (!types.length) return json(res, 400, { error: 'Choisis au moins un type de vidéo.' });
  if (!channel) return json(res, 400, { error: 'Ajoute le lien de ta chaîne.' });
  if (!/^https?:\/\//i.test(channel)) return json(res, 400, { error: 'Le lien de chaîne doit commencer par http:// ou https://.' });

  let photoUrl = '';
  try {
    if (body.photoData) photoUrl = await uploadReviewPhoto(body.photoData);
  } catch (error) {
    return json(res, 400, { error: error.message || 'Photo invalide.' });
  }

  const fullStars = Math.floor(cleanStars);
  const half = cleanStars % 1 === 0.5;
  const starsDisplay = Array.from({ length: 5 }, (_, i) => {
    if (i < fullStars) return '⭐';
    if (i === fullStars && half) return '⯨';
    return '☆';
  }).join('');

  const fields = [
    { name: '👤 Pseudo', value: cleanPseudo, inline: true },
    { name: '⭐ Note', value: `${starsDisplay} (${cleanStars}/5)`, inline: true },
    { name: '🎬 Types de vidéos', value: types.join(' • ') },
    { name: '🔗 Chaîne', value: channel },
    { name: '📝 Avis', value: cleanText }
  ];

  const embed = {
    title: '⭐ Nouvel avis à valider',
    color: 0x5865F2,
    fields,
    footer: { text: 'Avis envoyé depuis le portfolio • À valider avant publication' },
    timestamp: new Date().toISOString()
  };
  if (photoUrl) embed.thumbnail = { url: photoUrl };

  const payload = {
    content: '',
    embeds: [embed],
    components: [{
      type: 1,
      components: [
        { type: 2, style: 3, label: 'Accepter', custom_id: 'review_accept' },
        { type: 2, style: 4, label: 'Refuser', custom_id: 'review_reject' }
      ]
    }]
  };

  const discordResponse = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!discordResponse.ok) {
    const details = await discordResponse.text();
    console.error('Discord:', details);
    return json(res, 502, { error: 'Discord a refusé le message.' });
  }

  return json(res, 200, { ok: true });
}
