import crypto from 'node:crypto';

function json(res, status, body) { return res.status(status).json(body); }

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  if (aa.length !== bb.length || aa.length === 0) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function checkPassword(req) {
  const configured = process.env.ADMIN_PASSWORD;
  const provided = req.headers['x-admin-password'];
  return !!configured && safeEqual(provided, configured);
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

async function getReviews() {
  const response = await githubRequest('reviews.json');
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
  const body = {
    message,
    content: Buffer.from(JSON.stringify(reviews, null, 2) + '\n').toString('base64'),
    branch
  };
  if (sha) body.sha = sha;
  const response = await githubRequest('reviews.json', { method: 'PUT', body: JSON.stringify(body) });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub PUT ${response.status}: ${text}`);
  }
}

export default async function handler(req, res) {
  if (!['GET', 'DELETE'].includes(req.method)) return json(res, 405, { error: 'Méthode non autorisée.' });
  if (!checkPassword(req)) return json(res, 401, { error: 'Mot de passe incorrect.' });

  try {
    const { reviews, sha } = await getReviews();

    if (req.method === 'GET') return json(res, 200, { reviews });

    const { id } = req.body || {};
    if (!id) return json(res, 400, { error: 'ID de l’avis manquant.' });
    const updated = reviews.filter(review => String(review.id) !== String(id));
    if (updated.length === reviews.length) return json(res, 404, { error: 'Avis introuvable.' });

    await saveReviews(updated, sha, 'Avis supprimé depuis l’espace Modifier');
    return json(res, 200, { ok: true, reviews: updated });
  } catch (error) {
    console.error('Admin reviews:', error);
    return json(res, 500, { error: 'Impossible de modifier les avis pour le moment.' });
  }
}
