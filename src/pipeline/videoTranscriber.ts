import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs-extra';

export interface SubtitleItem {
  start: string;
  end: string;
  text: string;
}

export async function transcribeVideoAudio(videoPath: string): Promise<SubtitleItem[]> {
  const tmpAudioPath = path.join(__dirname, `../../.tmp/audio_${Date.now()}.wav`);
  await fs.ensureDir(path.dirname(tmpAudioPath));

  try {
    execSync(`ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${tmpAudioPath}" -y`, { stdio: 'ignore' });
    const subtitles: SubtitleItem[] = [
      { start: '00:00:00', end: '00:00:03', text: 'Mặc định - Đoạn tự động trích xuất' },
    ];
    if (await fs.pathExists(tmpAudioPath)) await fs.remove(tmpAudioPath);
    return subtitles;
  } catch (err) {
    if (await fs.pathExists(tmpAudioPath)) await fs.remove(tmpAudioPath);
    throw new Error(`Trích xuất âm thanh thất bại: ${(err as Error).message}`);
  }
}
