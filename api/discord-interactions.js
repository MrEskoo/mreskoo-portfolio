const crypto = require('crypto');
const { getFile, putFile, deleteFile, readJson } = require('../lib/github');



async function rawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

function verifyDiscord(req, body) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  if (!publicKey || !signature || !timestamp) return false;
  try {
    const keyDer = Buffer.from('302a300506032b6570032100' + publicKey, 'hex');
    const key = crypto.createPublicKey({ key: keyDer, format: 'der', type: 'spki' });
    return crypto.verify(null, Buffer.from(timestamp + body), key, Buffer.from(signature, 'hex'));
  } catch { return false; }
}

function respond(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

async function discordEdit(messageId, channelId, content, token) {
  return fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, components: [] })
  });
}

async function handler(req, res) {
  if (req.method !== 'POST') return respond(res, 405, { error: 'Method not allowed' });
  const body = await rawBody(req);
  if (!verifyDiscord(req, body)) return respond(res, 401, { error: 'Signature invalide' });

  let interaction;
  try { interaction = JSON.parse(body); } catch { return respond(res, 400, { error: 'JSON invalide' }); }
  if (interaction.type === 1) return respond(res, 200, { type: 1 });
  if (interaction.type !== 3) return respond(res, 200, { type: 6 });

  const ownerId = process.env.DISCORD_OWNER_ID;
  const userId = interaction.member?.user?.id || interaction.user?.id;
  if (!ownerId || userId !== ownerId) {
    return respond(res, 200, { type: 4, data: { content: '❌ Tu n’es pas autorisé à valider les avis.', flags: 64 } });
  }

  const [prefix, action, id] = String(interaction.data?.custom_id || '').split(':');
  if (prefix !== 'review' || !id || !['approve', 'reject'].includes(action)) return respond(res, 200, { type: 6 });

  try {
    const pendingFile = await getFile(`pending_reviews/${id}.json`);
    if (!pendingFile) return respond(res, 200, { type: 4, data: { content: '⚠️ Cet avis a déjà été traité.', flags: 64 } });
    const pending = JSON.parse(Buffer.from(pendingFile.content.replace(/\n/g, ''), 'base64').toString('utf8'));

    if (action === 'approve') {
      const { data: reviews, sha } = await readJson('reviews.json', []);
      const next = Array.isArray(reviews) ? reviews : [];
      next.push({ pseudo: pending.pseudo, stars: pending.stars, text: pending.text, approvedAt: new Date().toISOString() });
      await putFile('reviews.json', JSON.stringify(next, null, 2) + '\n', `Publication avis ${id}`, sha || undefined);
    }

    await deleteFile(`pending_reviews/${id}.json`, `${action === 'approve' ? 'Validation' : 'Refus'} avis ${id}`, pendingFile.sha);

    const status = action === 'approve' ? '🟢 **Avis accepté et publié sur le site.**' : '🔴 **Avis refusé.**';
    const token = process.env.DISCORD_BOT_TOKEN;
    await discordEdit(interaction.message.id, process.env.DISCORD_CHANNEL_ID, status + `\n👤 ${pending.pseudo} • ⭐ ${pending.stars}/5`, token);
    return respond(res, 200, { type: 6 });
  } catch (e) {
    console.error(e);
    return respond(res, 200, { type: 4, data: { content: '❌ Erreur pendant la validation. Vérifie la configuration GitHub/Vercel.', flags: 64 } });
  }
}

module.exports = handler;
module.exports.config = { api: { bodyParser: false } };
