import { api } from "./api";
import { fallbackStore } from "./fallbackStore";
import { normalizeStats, normalizeTrendPoint } from "./normalizers";
import { env } from "../config/env";
import type { DashboardStats, TrendPoint } from "../types/domain";
import { isRecord, readArray } from "../utils/typeGuards";

export const adminService = {
  async getDashboard(): Promise<{ stats: DashboardStats; trends: TrendPoint[] }> {
    try {
      const payload = await api.get<unknown>("/developer/stats");
      const source = isRecord(payload) ? payload : {};
      return {
        stats: normalizeStats(source.stats ?? source),
        trends: readArray(source, ["trends", "chart", "activity"], normalizeTrendPoint)
      };
    } catch (error) {
      if (!env.enableDemoFallback) throw error;
      return fallbackStore.stats();
    }
  }
};
