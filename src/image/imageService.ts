import fs from 'fs';
import path from 'path';
import axios from 'axios';
import sharp from 'sharp';
import { env } from '../config/env';
import type { GeneratedImage } from '../types';
import { withRetry } from '../utils/retry';

function ensureImageDir(): string {
  const dir = path.resolve('storage/images');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export async function generateFeatureImage(prompt: string, slug: string): Promise<GeneratedImage> {
  return withRetry(async () => {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_IMAGE_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
    const fullPrompt = `${prompt}. Estilo ${env.IMAGE_STYLE}, horizontal, moderno, tecnológico, sem texto, sem letras, sem logotipos, otimizado para capa de blog.`;
    const response = await axios.post(endpoint, {
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    }, { timeout: env.REQUEST_TIMEOUT_MS });

    const parts = response.data?.candidates?.[0]?.content?.parts ?? [];
    const inline = parts.find((part: any) => part.inlineData?.data);
    if (!inline?.inlineData?.data) throw new Error('Gemini não retornou imagem inline.');

    const input = Buffer.from(inline.inlineData.data, 'base64');
    const fileName = `${slug}.webp`;
    const outputPath = path.join(ensureImageDir(), fileName);

    await sharp(input)
      .resize(env.IMAGE_WIDTH, env.IMAGE_HEIGHT, { fit: 'cover' })
      .webp({ quality: 82, effort: 5 })
      .toFile(outputPath);

    return { localPath: outputPath, fileName, mimeType: 'image/webp', width: env.IMAGE_WIDTH, height: env.IMAGE_HEIGHT };
  }, 'gemini.generateFeatureImage', env.RETRY_ATTEMPTS);
}
