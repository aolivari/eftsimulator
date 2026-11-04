import { loadEnv } from './config.mjs';

export async function createPullRequest({ title, headBranch, baseBranch = 'master', body }) {
  const env = loadEnv();
  const token = env.GITHUB_TOKEN;
  const owner = 'aolivari';
  const repo = 'eftsimulator';

  const fallbackUrl = `https://github.com/${owner}/${repo}/compare/${baseBranch}...${headBranch}?expand=1`;

  if (!token) {
    console.log('ℹ️ GITHUB_TOKEN no configurado. Se generó URL de comparación directa.');
    return { success: false, prUrl: fallbackUrl };
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'AI-Runner-Bot',
      },
      body: JSON.stringify({
        title,
        head: headBranch,
        base: baseBranch,
        body,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      console.log(`🎉 Pull Request creado con éxito: ${data.html_url}`);
      return { success: true, prUrl: data.html_url, prNumber: data.number };
    }

    // Si ya existe un PR abierto para esa rama
    if (data.errors && data.errors[0]?.message?.includes('A pull request already exists')) {
      console.log('ℹ️ Ya existe un Pull Request abierto para esta rama.');
      // Buscar el PR existente
      const searchRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?head=${owner}:${headBranch}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'AI-Runner-Bot',
        },
      });
      const prs = await searchRes.json();
      if (Array.isArray(prs) && prs.length > 0) {
        return { success: true, prUrl: prs[0].html_url, prNumber: prs[0].number };
      }
    }

    console.warn(`⚠️ No se pudo crear el PR vía API (${res.status}): ${JSON.stringify(data.message || data)}`);
    return { success: false, prUrl: fallbackUrl };
  } catch (err) {
    console.warn(`⚠️ Error conectando con GitHub API: ${err.message}`);
    return { success: false, prUrl: fallbackUrl };
  }
}
