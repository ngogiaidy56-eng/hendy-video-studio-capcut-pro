import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({});

export async function processImageOCR(imageBuffer: Buffer, mimeType: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: mimeType,
        },
      },
      'Trích xuất toàn bộ chữ (OCR) có trong ảnh này thành văn bản thuần.',
    ],
  });
  return response.text || '';
}
