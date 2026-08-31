// Vercel Serverless Function
// Configure DISCORD_WEBHOOK_URL in Vercel Project Settings > Environment Variables.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }

  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) {
    return res.status(500).json({ error: 'Webhook Discord non configuré.' });
  }

  const { pseudo, stars, text } = req.body || {};
  const cleanPseudo = String(pseudo || '').trim().slice(0, 30);
  const cleanText = String(text || '').trim();
  const cleanStars = Number(stars);
  const compactLength = cleanText.replace(/\\s/g, '').length;

  if (!cleanPseudo || !cleanText || !Number.isInteger(cleanStars) || cleanStars < 1 || cleanStars > 5) {
    return res.status(400).json({ error: 'Avis incomplet.' });
  }
  if (compactLength > 50) {
    return res.status(400).json({ error: 'Avis trop long.' });
  }

  const starsDisplay = '⭐'.repeat(cleanStars) + '☆'.repeat(5 - cleanStars);
  const payload = {
    username: 'MrEskoo • Avis',
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
    }]
  };

  const discordResponse = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!discordResponse.ok) {
    return res.status(502).json({ error: 'Discord a refusé le message.' });
  }

  return res.status(200).json({ ok: true });
}
