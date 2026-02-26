import axios from 'axios';
import db from '../../db.js';

interface GitHubRelease {
  version: string;
  assetUrl: string;
  publishedAt: string;
}

export class GitHubService {
  private getHeaders(url?: string) {
    const isGitHubApi = url?.startsWith('https://api.github.com');
    const isBinaryDownload = url?.includes('/releases/download/') || url?.includes('/assets/');
    
    const tokenRow = db.prepare("SELECT value FROM settings WHERE key = 'github_token'").get() as { value: string } | undefined;
    
    const headers: Record<string, string> = {
      'User-Agent': 'Quatrix-Panel-Updater',
    };

    if (isGitHubApi) {
      headers['Accept'] = 'application/vnd.github.v3+json';
      if (tokenRow?.value) {
        headers['Authorization'] = `token ${tokenRow.value}`;
      }
    } else if (isBinaryDownload) {
      headers['Accept'] = 'application/octet-stream';
    } else {
      headers['Accept'] = '*/*';
    }

    return headers;
  }

  /**
   * Fetches the latest release info for a plugin from GitHub
   * @param repo GitHub repository (owner/repo)
   * @returns Detailed release info
   */
  async getLatestRelease(repo: string): Promise<GitHubRelease | null> {
    try {
      const url = `https://api.github.com/repos/${repo}/releases/latest`;
      const response = await axios.get(url, {
        headers: this.getHeaders(url),
        timeout: 10000,
      });

      const release = response.data;

      // Asset selection priority:
      // 1. with-runtime-linux .zip (CSS: includes .NET runtime, works without system .NET)
      // 2. Any linux .zip
      // 3. Any .zip or .tar.gz
      // 4. First asset as fallback
      const assets: any[] = release.assets || [];
      const asset =
        assets.find(
          (a: any) =>
            a.name.toLowerCase().includes('with-runtime-linux') && a.name.endsWith('.zip')
        ) ||
        assets.find(
          (a: any) => a.name.toLowerCase().includes('linux') && a.name.endsWith('.zip')
        ) ||
        assets.find((a: any) => a.name.endsWith('.zip') || a.name.endsWith('.tar.gz')) ||
        assets[0];

      if (!asset) return null;

      return {
        version: release.tag_name,
        assetUrl: asset.browser_download_url,
        publishedAt: release.published_at,
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn(`[GitHub] Repository not found or no releases: ${repo}`);
      } else {
        console.error(`[GitHub] Failed to fetch release for ${repo}:`, error.message);
      }
      return null;
    }
  }

  /**
   * Downloads a release asset
   * @param url Download URL
   * @returns Buffer of the file
   */
  async downloadAsset(url: string): Promise<Buffer> {
    try {
      console.log(`[GITHUB] Downloading asset from ${url}...`);
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: this.getHeaders(url),
        timeout: 120000,
        maxRedirects: 5,
      });
      return Buffer.from(response.data);
    } catch (err: any) {
      const status = err.response?.status;
      const message = err.message;
      console.error(`[GITHUB] Asset download failed (${status || 'network error'}): ${message}`);
      throw new Error(`Failed to download plugin asset: ${message}`);
    }
  }
}

export const githubService = new GitHubService();
