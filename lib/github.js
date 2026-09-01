const API = 'https://api.github.com';

function config() {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH = 'main' } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) throw new Error('GitHub n’est pas configuré.');
  return { token: GITHUB_TOKEN, owner: GITHUB_OWNER, repo: GITHUB_REPO, branch: GITHUB_BRANCH };
}

async function github(path, options = {}) {
  const c = config();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${c.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) throw new Error(data?.message || `GitHub HTTP ${res.status}`);
  return data;
}

function repoPath(file) {
  const c = config();
  return `/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}/contents/${file}`;
}

async function getFile(file) {
  const c = config();
  try {
    return await github(`${repoPath(file)}?ref=${encodeURIComponent(c.branch)}`);
  } catch (e) {
    if (/404|Not Found/i.test(e.message)) return null;
    throw e;
  }
}

async function putFile(file, content, message, sha = undefined) {
  const c = config();
  const body = { message, content: Buffer.from(content, 'utf8').toString('base64'), branch: c.branch };
  if (sha) body.sha = sha;
  return github(repoPath(file), { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) });
}

async function deleteFile(file, message, sha) {
  const c = config();
  return github(repoPath(file), { method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({message, sha, branch:c.branch}) });
}

async function readJson(file, fallback) {
  const f = await getFile(file);
  if (!f) return { data: fallback, sha: null };
  const content = Buffer.from(f.content.replace(/\n/g, ''), 'base64').toString('utf8');
  return { data: JSON.parse(content), sha: f.sha };
}

module.exports = { config, github, getFile, putFile, deleteFile, readJson };
