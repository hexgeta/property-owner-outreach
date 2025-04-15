import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import OpenAI from "openai";

interface Word {
  text: string;
  isHighlighted: boolean;
}

interface SentenceState {
  id: number;
  words: Word[];
  translation: string;
  showTranslation: boolean;
  highlightedIndex: number;
  fontSize: number;
}

interface Sentence {
  text: string;
  translation: string;
  tags: string[];
}

type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

interface AudioCache {
  sentences: { [key: number]: { audio: HTMLAudioElement; text: string } };
}

const client = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true
});

// Add topic buttons interface and data
interface TopicButton {
  name: string;
  icon: string;
  color: string;
}

const TOPIC_BUTTONS: TopicButton[] = [
  {
    name: 'Family',
    icon: 'M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z',
    color: 'from-pink-500 to-rose-500'
  },
  {
    name: 'Travel',
    icon: 'M20.43 5.76a8.18 8.18 0 00-.86-1.87 4.12 4.12 0 00-3.06-1.89c-1.28-.09-2.57-.05-3.85 0H12c-1.28-.05-2.57-.09-3.85 0a4.12 4.12 0 00-3.06 1.89 8.18 8.18 0 00-.86 1.87c-.14.4-.23.81-.28 1.23-.09.75-.1 1.5-.1 2.25v1.1c0 .75.01 1.5.1 2.25.05.42.14.83.28 1.23.19.66.48 1.29.86 1.87a4.12 4.12 0 003.06 1.89c1.28.09 2.57.05 3.85 0h.66c1.28.05 2.57.09 3.85 0a4.12 4.12 0 003.06-1.89c.38-.58.67-1.21.86-1.87.14-.4.23-.81.28-1.23.09-.75.1-1.5.1-2.25v-1.1c0-.75-.01-1.5-.1-2.25a5.92 5.92 0 00-.28-1.23z',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    name: 'Food',
    icon: 'M12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zM12 3a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V3.75A.75.75 0 0112 3zM7.5 15.75a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zM8.25 17.25a.75.75 0 000 1.5h7.5a.75.75 0 000-1.5h-7.5zM9.75 15.75a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zM12 15.75a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zM15.75 15.75a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75z',
    color: 'from-orange-500 to-amber-500'
  },
  {
    name: 'Hobbies',
    icon: 'M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z',
    color: 'from-green-500 to-emerald-500'
  },
  {
    name: 'Work',
    icon: 'M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z',
    color: 'from-purple-500 to-indigo-500'
  },
  {
    name: 'Weather',
    icon: 'M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z',
    color: 'from-yellow-500 to-orange-500'
  }
];

const ReadingPractice: React.FC = () => {
  const [sentences, setSentences] = useState<SentenceState[]>([]);
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>('beginner');
  const [isPlaying, setIsPlaying] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const sentenceRefs = useRef<{ [key: number]: HTMLDivElement }>({});
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const SENTENCES_PER_PAGE = 5;
  const [isDragging, setIsDragging] = useState<{ [key: number]: boolean }>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wordQueueRef = useRef<{ sentenceId: number; words: string[] }>({ sentenceId: -1, words: [] });
  const isProcessingQueueRef = useRef(false);
  const audioCache = useRef<AudioCache>({ sentences: {} });
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSentences, setGeneratedSentences] = useState<Sentence[]>([]);

  // Add default topics array
  const DEFAULT_TOPICS = [
    'daily life',
    'family',
    'food',
    'travel',
    'hobbies',
    'weather',
    'work',
    'education',
    'sports',
    'entertainment'
  ];

  // Function to get a random topic
  const getRandomTopic = () => {
    const randomIndex = Math.floor(Math.random() * DEFAULT_TOPICS.length);
    return DEFAULT_TOPICS[randomIndex];
  };

  // Add error handling for missing API key
  const checkApiKey = () => {
    if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured. Please add NEXT_PUBLIC_OPENAI_API_KEY to your environment variables.');
    }
  };

  // Update the getDifficultyPrompt function
  const getDifficultyPrompt = (level: DifficultyLevel, topic: string) => {
    const formatInstructions = `
Return ONLY a JSON array of objects with this exact format:
[
  {
    "text": "Portuguese sentence here",
    "translation": "English translation here"
  }
]
Do not include any other text or explanation. The response must be valid parseable JSON.`;

    const basePrompt = `Generate 5 European Portuguese (pt-PT) sentences about "${topic}".`;
    
    let difficultyPrompt = '';
    switch (level) {
      case 'beginner':
        difficultyPrompt = `${basePrompt} Make the sentences very simple, using basic vocabulary and present tense only. Use short sentences with 5-8 words maximum. Example structure: "O gato é preto." (The cat is black)`;
        break;
      case 'intermediate':
        difficultyPrompt = `${basePrompt} Use moderate complexity with past tense and future tense. Include some common expressions and longer sentences. Example structure: "Ontem fui ao cinema com os meus amigos." (Yesterday I went to the cinema with my friends)`;
        break;
      case 'advanced':
        difficultyPrompt = `${basePrompt} Use complex sentence structures, subjunctive mood, and advanced vocabulary. Include idiomatic expressions and sophisticated grammar. Example structure: "Embora tivesse estudado bastante, não consegui passar no exame." (Although I had studied a lot, I couldn't pass the exam)`;
        break;
      default:
        difficultyPrompt = basePrompt;
    }

    return `${difficultyPrompt}\n\n${formatInstructions}`;
  };

  // Initialize sentences on mount and difficulty change
  useEffect(() => {
    // Generate initial sentences for any difficulty level
    const generateInitialSentences = async () => {
      const randomTopic = getRandomTopic();
      setTopic(randomTopic);
      handleTabClick(difficultyLevel);
    };

    generateInitialSentences();
  }, []); // Only run on mount

  // Update the generateSentences function
  const generateSentences = async () => {
    if (!topic.trim()) {
      const randomTopic = getRandomTopic();
      setTopic(randomTopic);
      return;
    }

    setIsGenerating(true);
    try {
      checkApiKey();
      console.log('Generating sentences for topic:', topic);
      
      const completion = await client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a Portuguese language teacher. You must respond with valid JSON only, no additional text or explanations."
          },
          {
            role: "user",
            content: getDifficultyPrompt(difficultyLevel, topic)
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }  // Force JSON response
      });

      const content = completion.choices[0]?.message?.content || '';
      console.log('Raw API response:', content);
      
      let jsonContent;
      try {
        jsonContent = JSON.parse(content);
        // If the response is wrapped in an object, extract the array
        if (jsonContent && typeof jsonContent === 'object' && !Array.isArray(jsonContent)) {
          jsonContent = Object.values(jsonContent)[0];
        }
        if (!Array.isArray(jsonContent)) {
          throw new Error('Response is not an array');
        }
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('Failed to parse API response as JSON');
      }

      console.log('Parsed sentences:', jsonContent);
      
      if (Array.isArray(jsonContent) && jsonContent.every(item => 
        item && typeof item === 'object' && 'text' in item && 'translation' in item
      )) {
        const formattedSentences = jsonContent.map((sentence, index) => ({
          id: index,
          words: sentence.text.split(' ').map(word => ({
            text: word,
            isHighlighted: false
          })),
          translation: sentence.translation,
          showTranslation: false,
          highlightedIndex: -1,
          fontSize: 22,
        }));
        setSentences(formattedSentences);
        setPage(1);
        setTopic('');
      } else {
        throw new Error('Invalid response format from API');
      }
    } catch (error) {
      console.error('Error generating sentences:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to generate sentences: ${errorMessage}. Please try again.`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Update the handleTabClick function
  const handleTabClick = async (level: DifficultyLevel) => {
    setDifficultyLevel(level);
    setIsGenerating(true);
    try {
      checkApiKey();
      const randomTopic = getRandomTopic();
      setTopic(randomTopic);
      const response = await client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a Portuguese language teacher. You must respond with valid JSON only, no additional text or explanations."
          },
          {
            role: "user",
            content: getDifficultyPrompt(level, randomTopic)
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }  // Force JSON response
      });

      const content = response.choices[0]?.message?.content || '';
      console.log('Raw API response:', content);
      
      let jsonContent;
      try {
        jsonContent = JSON.parse(content);
        // If the response is wrapped in an object, extract the array
        if (jsonContent && typeof jsonContent === 'object' && !Array.isArray(jsonContent)) {
          jsonContent = Object.values(jsonContent)[0];
        }
        if (!Array.isArray(jsonContent)) {
          throw new Error('Response is not an array');
        }
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('Failed to parse API response as JSON');
      }

      console.log('Parsed sentences:', jsonContent);
      
      if (Array.isArray(jsonContent) && jsonContent.every(item => 
        item && typeof item === 'object' && 'text' in item && 'translation' in item
      )) {
        const formattedSentences = jsonContent.map((sentence, index) => ({
          id: index,
          words: sentence.text.split(' ').map(word => ({
            text: word,
            isHighlighted: false
          })),
          translation: sentence.translation,
          showTranslation: false,
          highlightedIndex: -1,
          fontSize: 22,
        }));
        setSentences(formattedSentences);
        setPage(1);
      } else {
        throw new Error('Invalid response format from API');
      }
    } catch (error) {
      console.error('Error generating random sentences:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to generate sentences: ${errorMessage}. Please try again.`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Update the intersection observer to maintain font size
  useEffect(() => {
    const observer = new IntersectionObserver(
      async (entries) => {
        const target = entries[0];
        if (target.isIntersecting) {
          setIsGenerating(true);
          try {
            checkApiKey();
            const randomTopic = getRandomTopic();
            const response = await client.chat.completions.create({
              model: "gpt-3.5-turbo",
              messages: [
                {
                  role: "system",
                  content: "You are a Portuguese language teacher. Generate natural European Portuguese sentences with English translations based on the specified difficulty level."
                },
                {
                  role: "user",
                  content: getDifficultyPrompt(difficultyLevel, randomTopic)
                }
              ],
              temperature: 0.7
            });

            const content = response.choices[0]?.message?.content || '';
            const jsonContent = JSON.parse(content);
            
            if (Array.isArray(jsonContent)) {
              const startIndex = sentences.length;
              const formattedSentences = jsonContent.map((sentence, index) => ({
                id: startIndex + index,
                words: sentence.text.split(' ').map(word => ({
                  text: word,
                  isHighlighted: false
                })),
                translation: sentence.translation,
                showTranslation: false,
                highlightedIndex: -1,
                fontSize: sentences[0]?.fontSize || 22, // Use the font size of the first sentence
              }));
              setSentences(prev => [...prev, ...formattedSentences]);
              setPage(prev => prev + 1);

              // Adjust font size after a short delay to ensure DOM is updated
              setTimeout(() => {
                formattedSentences.forEach(sentence => {
                  adjustFontSize(sentence.id);
                });
              }, 100);
            }
          } catch (error) {
            console.error('Error generating more sentences:', error);
          } finally {
            setIsGenerating(false);
          }
        }
      },
      { threshold: 0.5 }
    );

    observerRef.current = observer;

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }

    return () => observer.disconnect();
  }, [page, difficultyLevel, sentences.length]);

  // Function to adjust font size for a specific sentence
  const adjustFontSize = (sentenceId: number) => {
    const container = containerRef.current;
    const sentence = sentenceRefs.current[sentenceId];
    if (!container || !sentence) return;

    let currentSize = 36;
    sentence.style.fontSize = `${currentSize}px`;

    // Get the container width minus padding and speaker button width
    const maxWidth = container.clientWidth - 140; // Increased padding for safety

    // Keep reducing font size until the text fits
    while (sentence.scrollWidth > maxWidth && currentSize > 12) {
      currentSize -= 0.5; // Smaller decrements for finer control
      sentence.style.fontSize = `${currentSize}px`;
    }

    // After font size is adjusted, update the slider width
    const slider = sentenceRefs.current[`slider-${sentenceId}`];
    if (slider) {
      // Use scrollWidth to get the actual text width
      slider.style.width = `${sentence.scrollWidth}px`;
    }

    setSentences(prev => prev.map(s => 
      s.id === sentenceId ? { ...s, fontSize: currentSize } : s
    ));
  };

  // Adjust font size when sentences change
  useEffect(() => {
    sentences.forEach(sentence => {
      adjustFontSize(sentence.id);
    });

    const handleResize = () => {
      sentences.forEach(sentence => {
        adjustFontSize(sentence.id);
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sentences.length]);

  // Update the getAudioFromOpenAI function
  const getAudioFromOpenAI = async (text: string) => {
    try {
      const response = await client.audio.speech.create({
        model: "tts-1",
        voice: "nova",
        input: text,
      });

      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      return url;
    } catch (error) {
      console.error('Error generating speech:', error);
      return null;
    }
  };

  // Add playback speed control
  const playAudioAtSpeed = async (audio: HTMLAudioElement, speed: 'normal' | 'slow' | 'fast') => {
    const speeds = {
      slow: 0.7,
      normal: 1,
      fast: 1.3
    };
    
    audio.playbackRate = speeds[speed];
    await audio.play();
  };

  // Update the preloadSentenceAudio function
  const preloadSentenceAudio = async (sentence: SentenceState) => {
    try {
      setIsLoadingAudio(true);
      const fullText = sentence.words.map(w => w.text).join(' ');
      
      // Load full sentence audio if not cached
      if (!audioCache.current.sentences[sentence.id] || 
          audioCache.current.sentences[sentence.id].text !== fullText) {
        const audioUrl = await getAudioFromOpenAI(fullText);
        if (audioUrl) {
          const audio = new Audio(audioUrl);
          await new Promise((resolve) => {
            audio.addEventListener('loadeddata', resolve, { once: true });
            audio.load();
          });
          audioCache.current.sentences[sentence.id] = { 
            audio,
            text: fullText
          };
        }
      }
    } catch (error) {
      console.error('Failed to preload audio:', error);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  // Preload audio when sentences change
  useEffect(() => {
    sentences.forEach(sentence => {
      preloadSentenceAudio(sentence);
    });
  }, [sentences]);

  // Update the speakFullSentence function
  const speakFullSentence = async (sentenceId: number, speed: 'normal' | 'slow' | 'fast' = 'normal') => {
    const sentence = sentences.find(s => s.id === sentenceId);
    if (!sentence) return;

    setIsPlaying(true);
    try {
      // Stop any playing audio
      Object.values(audioCache.current.sentences).forEach(({ audio }) => {
        audio.pause();
        audio.currentTime = 0;
      });
      
      const fullText = sentence.words.map(w => w.text).join(' ');
      const cached = audioCache.current.sentences[sentenceId];
      
      if (cached && cached.text === fullText) {
        cached.audio.currentTime = 0;
        await playAudioAtSpeed(cached.audio, speed);
        
        // Highlight all words
        setSentences(prev => prev.map(s => {
          if (s.id !== sentenceId) return s;
          return {
            ...s,
            highlightedIndex: s.words.length - 1,
            words: s.words.map(word => ({
              ...word,
              isHighlighted: true
            }))
          };
        }));
      } else {
        const audioUrl = await getAudioFromOpenAI(fullText);
        if (audioUrl) {
          const newAudio = new Audio(audioUrl);
          await newAudio.load();
          audioCache.current.sentences[sentenceId] = {
            audio: newAudio,
            text: fullText
          };
          
          await playAudioAtSpeed(newAudio, speed);
          
          // Highlight all words
          setSentences(prev => prev.map(s => {
            if (s.id !== sentenceId) return s;
            return {
              ...s,
              highlightedIndex: s.words.length - 1,
              words: s.words.map(word => ({
                ...word,
                isHighlighted: true
              }))
            };
          }));
        }
      }
    } catch (error) {
      console.error('Error speaking sentence:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  // Update renderContent to always show loading indicator
  const renderContent = () => {
    if (sentences.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
            Enter a topic above to generate sentences
          </p>
          <p className="text-gray-500 dark:text-gray-500">
            Example topics: dogs, cooking, travel, sports
          </p>
        </div>
      );
    }

    return (
      <>
        {sentences.map((sentence) => (
          <div
            key={sentence.id}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8"
          >
            <div className="relative p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
              <div className="flex flex-col gap-6">
                {/* Text and Audio Controls */}
                <div className="flex items-start justify-between gap-4">
                  <div 
                    ref={el => el && (sentenceRefs.current[sentence.id] = el)}
                    className="flex-1 text-left leading-relaxed"
                    style={{ fontSize: `${sentence.fontSize}px` }}
                  >
                    {sentence.words.map((word, index) => (
                      <span
                        key={index}
                        className={`inline-block transition-colors duration-150 select-none
                          ${word.isHighlighted 
                            ? 'text-blue-600 dark:text-blue-400' 
                            : 'text-gray-600 dark:text-gray-400'
                          }`}
                        style={{ 
                          marginRight: index < sentence.words.length - 1 ? '0.5em' : 0,
                          padding: '0.1em 0',
                        }}
                      >
                        {word.text}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => speakFullSentence(sentence.id, 'slow')}
                      disabled={isPlaying}
                      className="flex-shrink-0 p-2.5 text-gray-500 hover:text-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-50 dark:bg-gray-700 rounded-xl"
                      title="Listen slowly"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06z" />
                        <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
                      </svg>
                      <span className="sr-only">🐢</span>
                    </button>
                    <button
                      onClick={() => speakFullSentence(sentence.id, 'fast')}
                      disabled={isPlaying}
                      className="flex-shrink-0 p-2.5 text-gray-500 hover:text-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-50 dark:bg-gray-700 rounded-xl"
                      title="Listen quickly"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06z" />
                        <path d="M18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                        <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
                      </svg>
                      <span className="sr-only">🐇</span>
                    </button>
                  </div>
                </div>

                {/* Translation Controls */}
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setSentences(prev => prev.map(s => 
                      s.id === sentence.id ? { ...s, showTranslation: !s.showTranslation } : s
                    ))}
                    className="px-4 py-2 text-sm font-medium bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-colors flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
                    </svg>
                    {sentence.showTranslation ? 'Hide Translation' : 'Show Translation'}
                  </button>
                </div>

                {/* Translation */}
                {sentence.showTranslation && (
                  <div className="text-base text-gray-500 dark:text-gray-400 italic pl-2 border-l-2 border-gray-200 dark:border-gray-600">
                    {sentence.translation}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={loadingRef} className="h-20 flex items-center justify-center">
          {isGenerating && (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Practice Reading
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => handleTabClick('beginner')}
                className={`px-4 py-2 rounded-xl transition-all font-medium
                  ${difficultyLevel === 'beginner'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}
              >
                Beginner
              </button>
              <button
                onClick={() => handleTabClick('intermediate')}
                className={`px-4 py-2 rounded-xl transition-all font-medium
                  ${difficultyLevel === 'intermediate'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}
              >
                Intermediate
              </button>
              <button
                onClick={() => handleTabClick('advanced')}
                className={`px-4 py-2 rounded-xl transition-all font-medium
                  ${difficultyLevel === 'advanced'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}
              >
                Advanced
              </button>
            </div>
          </div>
          
          {/* Topic quick-select buttons */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {TOPIC_BUTTONS.map((topicBtn) => (
              <button
                key={topicBtn.name}
                onClick={() => {
                  setTopic(topicBtn.name.toLowerCase());
                  generateSentences();
                }}
                className={`p-3 rounded-xl bg-gradient-to-r ${topicBtn.color} text-white hover:shadow-lg transition-all flex flex-col items-center gap-2 text-sm font-medium`}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="currentColor" 
                  className="w-5 h-5"
                >
                  <path d={topicBtn.icon} />
                </svg>
                {topicBtn.name}
              </button>
            ))}
          </div>
          
          {/* Topic input and generate button */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter a topic..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <button
              onClick={generateSentences}
              disabled={isGenerating}
              className={`px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:shadow-lg transition-all flex items-center gap-2 font-medium
                ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isGenerating ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Generating...
                </div>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
                  </svg>
                  Generate
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Sentences feed */}
      <div ref={containerRef} className="space-y-8">
        {renderContent()}
      </div>
    </div>
  );
};

export default ReadingPractice; 