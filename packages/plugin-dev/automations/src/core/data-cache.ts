import { PluginAPI } from '@super-productivity/plugin-api';

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

export class DataCache {
  private projectsCache: CacheItem<any[]> | null = null;
  private tagsCache: CacheItem<any[]> | null = null;
  private static readonly CACHE_TTL_MS = 60000;

  constructor(private plugin: PluginAPI) {}

  async getProjects(): Promise<any[]> {
    const now = Date.now();
    if (this.projectsCache && now - this.projectsCache.timestamp < DataCache.CACHE_TTL_MS) {
      return this.projectsCache.data;
    }

    const projects = await this.plugin.getAllProjects();
    this.projectsCache = { data: projects, timestamp: now };
    return projects;
  }

  async getTags(): Promise<any[]> {
    const now = Date.now();
    if (this.tagsCache && now - this.tagsCache.timestamp < DataCache.CACHE_TTL_MS) {
      return this.tagsCache.data;
    }

    const tags = await this.plugin.getAllTags();
    this.tagsCache = { data: tags, timestamp: now };
    return tags;
  }

  invalidate() {
    this.projectsCache = null;
    this.tagsCache = null;
  }
}
