import fs from 'fs-extra';
import path from 'path';

export class MaintenanceEngine {
  public static async patchSourceFile(filePath: string, patchContent: string): Promise<boolean> {
    try {
      const fullPath = path.resolve(filePath);
      await fs.ensureFile(fullPath);
      await fs.writeFile(fullPath, patchContent, 'utf-8');
      return true;
    } catch (error) {
      console.error(`Không thể vá file ${filePath}:`, error);
      return false;
    }
  }

  public static toggleSystemMaintenance(status: boolean): string {
    const flagPath = path.join(__dirname, '../../config/maintenance.lock');
    if (status) {
      fs.writeFileSync(flagPath, JSON.stringify({ lockedAt: new Date().toISOString(), status: 'MAINTENANCE' }));
      return 'Hệ thống đã chuyển sang CHẾ ĐỘ BẢO TRÌ.';
    } else {
      if (fs.existsSync(flagPath)) fs.unlinkSync(flagPath);
      return 'Hệ thống đã hoạt động bình thường trở lại.';
    }
  }
}
