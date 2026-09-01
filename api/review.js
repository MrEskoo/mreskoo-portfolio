// Vercel Serverless Function: reçoit un avis et crée un message Discord avec des boutons.

function json(res, status, body) {
  return res.status(status).json(body);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Méthode non autorisée.' });

  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ID;
  if (!token || !channelId) return json(res, 500, { error: 'Configuration Discord incomplète.' });

  const { pseudo, stars, text } = req.body || {};
  const cleanPseudo = String(pseudo || '').trim().slice(0, 30);
  const cleanText = String(text || '').trim();
  const cleanStars = Number(stars);
  const compactLength = cleanText.replace(/\s/g, '').length;

  if (!cleanPseudo || !cleanText || !Number.isInteger(cleanStars) || cleanStars < 1 || cleanStars > 5) {
    return json(res, 400, { error: 'Avis incomplet.' });
  }
  if (compactLength > 50) return json(res, 400, { error: 'Avis trop long.' });

  const starsDisplay = '⭐'.repeat(cleanStars) + '☆'.repeat(5 - cleanStars);
  const payload = {
    content: '',
    embeds: [{
      title: '⭐ Nouvel avis à valider',
      color: 0x5865F2,
      fields: [
        { name: '👤 Pseudo', value: cleanPseudo, inline: true },
        { name: '⭐ Note', value: `${starsDisplay} (${cleanStars}/5)`, inline: true },
        { name: '📝 Avis', value: cleanText }
      ],
      footer: { text: 'Avis envoyé depuis le portfolio • À valider avant publication' },
      timestamp: new Date().toISOString()
    }],
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
    headers: {
      'Authorization': `Bot ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!discordResponse.ok) {
    const details = await discordResponse.text();
    console.error('Discord:', details);
    return json(res, 502, { error: 'Discord a refusé le message.' });
  }

  return json(res, 200, { ok: true });
}
