import crypto from 'node:crypto';

export const config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function send(res, status, body) {
  return res.status(status).json(body);
}

function verifyDiscordRequest(rawBody, signature, timestamp, publicKey) {
  if (!signature || !timestamp || !publicKey) return false;
  try {
    const rawKey = Buffer.from(publicKey, 'hex');
    if (rawKey.length !== 32) return false;
    // Ed25519 public key -> SubjectPublicKeyInfo (SPKI) DER wrapper.
    const spki = Buffer.concat([
      Buffer.from('302a300506032b6570032100', 'hex'),
      rawKey
    ]);
    return crypto.verify(
      null,
      Buffer.from(`${timestamp}${rawBody}`),
      { key: spki, format: 'der', type: 'spki' },
      Buffer.from(signature, 'hex')
    );
  } catch (error) {
    console.error('Discord signature verification:', error);
    return false;
  }
}

async function githubRequest(path, options = {}) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  if (!token || !owner || !repo) throw new Error('Configuration GitHub incomplète.');

  const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`, {
    ...options,
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  return response;
}

async function getReviews() {
  const path = 'reviews.json';
  const response = await githubRequest(path);
  if (response.status === 404) return { reviews: [], sha: null };
  if (!response.ok) throw new Error(`GitHub GET ${response.status}`);
  const data = await response.json();
  const content = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8');
  let reviews = [];
  try { reviews = JSON.parse(content); } catch { reviews = []; }
  if (!Array.isArray(reviews)) reviews = [];
  return { reviews, sha: data.sha };
}

async function saveReviews(reviews, sha, message) {
  const branch = process.env.GITHUB_BRANCH || 'main';
  const content = Buffer.from(JSON.stringify(reviews, null, 2) + '\n').toString('base64');
  const body = { message, content, branch };
  if (sha) body.sha = sha;
  const response = await githubRequest('reviews.json', { method: 'PUT', body: JSON.stringify(body) });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub PUT ${response.status}: ${text}`);
  }
}

function parseReviewFromMessage(message) {
  const fields = message?.embeds?.[0]?.fields || [];
  const pseudo = fields.find(f => f.name === '👤 Pseudo')?.value || '';
  const noteValue = fields.find(f => f.name === '⭐ Note')?.value || '';
  const text = fields.find(f => f.name === '📝 Avis')?.value || '';
  const match = noteValue.match(/\((\d)\/5\)/);
  const stars = match ? Number(match[1]) : 0;
  return { pseudo, stars, text };
}

async function editDiscordMessage(channelId, messageId, token, payload) {
  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discord PATCH ${response.status}: ${text}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Méthode non autorisée.' });

  const rawBody = await readRawBody(req);
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  const publicKey = process.env.DISCORD_PUBLIC_KEY;

  if (!verifyDiscordRequest(rawBody, signature, timestamp, publicKey)) {
    return res.status(401).send('Signature Discord invalide.');
  }

  let interaction;
  try { interaction = JSON.parse(rawBody.toString('utf8')); }
  catch { return send(res, 400, { error: 'JSON invalide.' }); }

  // Discord PING de vérification de l'endpoint.
  if (interaction.type === 1) return send(res, 200, { type: 1 });

  if (interaction.type !== 3) return send(res, 200, { type: 4, data: { content: 'Interaction non prise en charge.', flags: 64 } });

  const ownerId = process.env.DISCORD_OWNER_ID;
  if (!ownerId || interaction.member?.user?.id !== ownerId) {
    return send(res, 200, { type: 4, data: { content: '⛔ Tu n’es pas autorisé à gérer les avis.', flags: 64 } });
  }

  const customId = interaction.data?.custom_id;
  const channelId = interaction.channel_id;
  const messageId = interaction.message?.id;
  const token = process.env.DISCORD_BOT_TOKEN;

  try {
    if (customId === 'review_accept') {
      const review = parseReviewFromMessage(interaction.message);
      if (!review.pseudo || !review.text || !review.stars) throw new Error('Avis introuvable dans le message Discord.');

      const { reviews, sha } = await getReviews();
      if (!reviews.some(r => r.sourceMessageId === messageId)) {
        reviews.push({
          id: crypto.randomUUID(),
          sourceMessageId: messageId,
          pseudo: review.pseudo,
          stars: review.stars,
          text: review.text,
          createdAt: new Date().toISOString()
        });
        await saveReviews(reviews, sha, `Avis accepté : ${review.pseudo}`);
      }

      // Réponse immédiate Discord + remplacement des boutons par le bouton Supprimer.
      await editDiscordMessage(channelId, messageId, token, {
        components: [{ type: 1, components: [{ type: 2, style: 4, label: 'Supprimer', custom_id: 'review_delete' }] }],
        embeds: [{
          ...interaction.message.embeds?.[0],
          title: '✅ Avis accepté',
          footer: { text: 'Avis publié sur le portfolio' }
        }]
      });

      return send(res, 200, { type: 4, data: { content: '✅ Avis accepté et publié. Le bouton Supprimer est maintenant disponible.', flags: 64 } });
    }

    if (customId === 'review_reject') {
      await editDiscordMessage(channelId, messageId, token, {
        components: [],
        embeds: [{
          ...interaction.message.embeds?.[0],
          title: '❌ Avis refusé',
          footer: { text: 'Avis refusé — non publié' }
        }]
      });
      return send(res, 200, { type: 4, data: { content: '❌ Avis refusé.', flags: 64 } });
    }

    if (customId === 'review_delete') {
      const { reviews, sha } = await getReviews();
      const updated = reviews.filter(r => r.sourceMessageId !== messageId);
      if (updated.length !== reviews.length) {
        await saveReviews(updated, sha, 'Avis supprimé');
      }

      await editDiscordMessage(channelId, messageId, token, {
        components: [],
        embeds: [{
          ...interaction.message.embeds?.[0],
          title: '🗑️ Avis supprimé',
          footer: { text: 'Avis supprimé du portfolio' }
        }]
      });

      return send(res, 200, { type: 4, data: { content: '🗑️ Avis supprimé du portfolio.', flags: 64 } });
    }

    return send(res, 200, { type: 4, data: { content: 'Action inconnue.', flags: 64 } });
  } catch (error) {
    console.error(error);
    return send(res, 200, { type: 4, data: { content: '❌ Une erreur est survenue pendant la validation.', flags: 64 } });
  }
}
