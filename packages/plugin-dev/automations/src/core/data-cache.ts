import { PluginAPI } from '@super-productivity/plugin-api';

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

export class DataCache {
  private projectsCache: CacheItem<any[]> | null = null;
  private tagsCache: CacheItem<any[]> | null = null;
  private readonly TTL = 60000; // 60 seconds

  constructor(private plugin: PluginAPI) {}

  async getProjects(): Promise<any[]> {
    const now = Date.now();
    if (this.projectsCache && now - this.projectsCache.timestamp < this.TTL) {
      return this.projectsCache.data;
    }

    const projects = await this.plugin.getAllProjects();
    this.projectsCache = { data: projects, timestamp: now };
    return projects;
  }

  async getTags(): Promise<any[]> {
    const now = Date.now();
    if (this.tagsCache && now - this.tagsCache.timestamp < this.TTL) {
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
