import axios from 'axios';
import type { DeploymentInfo } from '@gitflow/shared';

export async function getVercelPreview(
  branch: string,
  projectId: string,
  vercelToken: string
): Promise<DeploymentInfo | null> {
  try {
    const res = await axios.get('https://api.vercel.com/v6/deployments', {
      headers: { Authorization: `Bearer ${vercelToken}` },
      params: { projectId, 'meta-gitBranch': branch, limit: 1, state: 'READY' },
    });
    
    const deploy = res.data.deployments?.[0];
    if (!deploy) return null;
    
    return {
      provider: 'vercel',
      url: `https://${deploy.url}`,
      status: 'ready',
      branch,
    };
  } catch (error) {
    console.error('Vercel Preview Failed:', error);
    return null;
  }
}

export async function getNetlifyPreview(
  branch: string,
  siteId: string,
  netlifyToken: string
): Promise<DeploymentInfo | null> {
  try {
    const res = await axios.get(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
      headers: { Authorization: `Bearer ${netlifyToken}` },
      params: { branch, per_page: 1 },
    });
    
    const deploy = res.data[0];
    if (!deploy || deploy.state !== 'ready') return null;
    
    return {
      provider: 'netlify',
      url: `https://${deploy.deploy_ssl_url || deploy.url}`,
      status: 'ready',
      branch,
    };
  } catch (error) {
    console.error('Netlify Preview Failed:', error);
    return null;
  }
}

export async function getCombinedPreviews(branch: string): Promise<DeploymentInfo[]> {
  const previews: DeploymentInfo[] = [];
  
  if (process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID) {
    const v = await getVercelPreview(branch, process.env.VERCEL_PROJECT_ID, process.env.VERCEL_TOKEN);
    if (v) previews.push(v);
  }
  
  if (process.env.NETLIFY_TOKEN && process.env.NETLIFY_SITE_ID) {
    const n = await getNetlifyPreview(branch, process.env.NETLIFY_SITE_ID, process.env.NETLIFY_TOKEN);
    if (n) previews.push(n);
  }
  
  return previews;
}
