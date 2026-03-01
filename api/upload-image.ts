import { put } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  api: { bodyParser: { sizeLimit: '4mb' } },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { image } = req.body as { image?: string };
  if (!image || typeof image !== 'string') {
    res.status(400).json({ error: 'Missing or invalid image (base64 string)' });
    return;
  }

  try {
    const buffer = Buffer.from(image, 'base64');
    const pathname = `generated/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.png`;
    const blob = await put(pathname, buffer, {
      access: 'public',
      contentType: 'image/png',
    });
    res.status(200).json({ url: blob.url });
  } catch (err: any) {
    console.error('Blob upload error:', err);
    res.status(500).json({ error: err?.message || 'Upload failed' });
  }
}
