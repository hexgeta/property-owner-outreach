import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { topic, difficultyLevel } = req.body;
    if (!topic || !difficultyLevel) {
      return res.status(400).json({ error: 'Topic and difficulty level are required' });
    }

    const formatInstructions = `
You must respond with a JSON array of objects in this exact format:
{
  "sentences": [
    {
      "text": "Portuguese sentence here",
      "translation": "English translation here"
    }
  ]
}`;

    const basePrompt = `Generate 5 European Portuguese (pt-PT) sentences about "${topic}". Return them in JSON format.`;
    
    let difficultyPrompt = '';
    switch (difficultyLevel) {
      case 'beginner':
        difficultyPrompt = `${basePrompt} Make the sentences very simple, using basic vocabulary and present tense only. Use short sentences with 5-8 words maximum.`;
        break;
      case 'intermediate':
        difficultyPrompt = `${basePrompt} Use moderate complexity with past tense and future tense. Include some common expressions and longer sentences.`;
        break;
      case 'advanced':
        difficultyPrompt = `${basePrompt} Use complex sentence structures, subjunctive mood, and advanced vocabulary. Include idiomatic expressions and sophisticated grammar.`;
        break;
      default:
        difficultyPrompt = basePrompt;
    }

    const prompt = `${difficultyPrompt}\n\n${formatInstructions}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a Portuguese language teacher. You must respond with valid JSON only, following the exact format specified."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in response');
    }

    res.status(200).json(JSON.parse(content));
  } catch (error) {
    console.error('Error generating sentences:', error);
    res.status(500).json({ error: 'Failed to generate sentences' });
  }
} 