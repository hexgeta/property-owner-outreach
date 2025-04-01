import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
  if (!DEEPL_API_KEY) {
    return res.status(500).json({ error: 'DeepL API key not configured' });
  }

  try {
    // First, get the translation from DeepL
    const translateResponse = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        target_lang: 'PT-PT',
        formality: 'default'
      }),
    });

    if (!translateResponse.ok) {
      throw new Error(`DeepL API error: ${translateResponse.statusText}`);
    }

    const translateData = await translateResponse.json();
    
    // For now, we'll return the translation and use browser's TTS
    // In a production environment, you would integrate with a TTS service
    return res.status(200).json({ 
      translation: translateData.translations[0].text,
      // Note: audioUrl would come from your TTS service
      audioUrl: null
    });
  } catch (error) {
    console.error('DeepL API error:', error);
    return res.status(500).json({ error: 'Failed to process text-to-speech request' });
  }
} 