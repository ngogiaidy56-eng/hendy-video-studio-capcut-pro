import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

export async function runSandboxCompileTest(codeSnippet: string): Promise<{ success: boolean; logs: string }> {
  const tmpDir = path.join(__dirname, '../../.tmp');
  await fs.ensureDir(tmpDir);
  const tmpFile = path.join(tmpDir, `dry_run_${Date.now()}.ts`);

  try {
    await fs.writeFile(tmpFile, codeSnippet, 'utf-8');
    const output = execSync(`npx tsc --noEmit ${tmpFile}`, { encoding: 'utf-8', stdio: 'pipe' });
    await fs.remove(tmpFile);
    return { success: true, logs: output || 'Biên dịch Sandbox thành công.' };
  } catch (error: any) {
    if (await fs.pathExists(tmpFile)) await fs.remove(tmpFile);
    return { success: false, logs: error.stdout || error.stderr || error.message || 'Lỗi biên dịch TypeScript!' };
  }
}
