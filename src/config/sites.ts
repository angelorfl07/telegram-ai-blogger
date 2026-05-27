import fs from 'fs';
import path from 'path';
import { SiteConfig } from '../types';

const SITES_FILE = path.join(process.cwd(), 'storage', 'sites.json');

export function getSites(): SiteConfig[] {
  try {
    if (!fs.existsSync(SITES_FILE)) {
      return [];
    }
    const data = fs.readFileSync(SITES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading sites.json', error);
    return [];
  }
}

export function saveSite(site: Omit<SiteConfig, 'id'>): SiteConfig {
  const sites = getSites();
  const newSite: SiteConfig = {
    ...site,
    id: String(sites.length + 1)
  };
  sites.push(newSite);
  fs.writeFileSync(SITES_FILE, JSON.stringify(sites, null, 2), 'utf-8');
  return newSite;
}

export function getSiteById(id: string): SiteConfig | undefined {
  return getSites().find(s => s.id === id);
}
