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
  sliderPosition: number;
}

interface Sentence {
  text: string;
  translation: string;
  tags: string[];
}

type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

interface AudioCache {
  words: { [key: string]: { audio: HTMLAudioElement; text: string } };
  sentences: { [key: number]: { audio: HTMLAudioElement; text: string } };
}

const client = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true
});

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
  const audioCache = useRef<AudioCache>({ words: {}, sentences: {} });
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

  // Update the prompts for different difficulty levels
  const getDifficultyPrompt = (level: DifficultyLevel, topic: string) => {
    const basePrompt = `Generate 5 European Portuguese (pt-PT) sentences about "${topic}". Format your response as a JSON array of objects, each with "text" (Portuguese) and "translation" (English) properties.`;
    
    switch (level) {
      case 'beginner':
        return `${basePrompt} Make the sentences very simple, using basic vocabulary and present tense only. Use short sentences with 5-8 words maximum. Example: "O gato é preto." (The cat is black)`;
      case 'intermediate':
        return `${basePrompt} Use moderate complexity with past tense and future tense. Include some common expressions and longer sentences. Example: "Ontem fui ao cinema com os meus amigos." (Yesterday I went to the cinema with my friends)`;
      case 'advanced':
        return `${basePrompt} Use complex sentence structures, subjunctive mood, and advanced vocabulary. Include idiomatic expressions and sophisticated grammar. Example: "Embora tivesse estudado bastante, não consegui passar no exame." (Although I had studied a lot, I couldn't pass the exam)`;
      default: // 'ai' or fallback
        return basePrompt;
    }
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
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a Portuguese language teacher. Generate natural European Portuguese sentences with English translations based on the specified difficulty level."
          },
          {
            role: "user",
            content: getDifficultyPrompt(difficultyLevel, topic)
          }
        ],
        temperature: 0.7
      });

      const content = completion.choices[0]?.message?.content || '';
      const jsonContent = JSON.parse(content);
      console.log('Parsed sentences:', jsonContent);
      
      if (Array.isArray(jsonContent)) {
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
          sliderPosition: 0
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
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a Portuguese language teacher. Generate natural European Portuguese sentences with English translations based on the specified difficulty level."
          },
          {
            role: "user",
            content: getDifficultyPrompt(level, randomTopic)
          }
        ],
        temperature: 0.7
      });

      const content = response.choices[0]?.message?.content || '';
      const jsonContent = JSON.parse(content);
      console.log('Parsed sentences:', jsonContent);
      
      if (Array.isArray(jsonContent)) {
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
          sliderPosition: 0
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
              model: "gpt-4",
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
                sliderPosition: 0
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
        voice: "nova", // Changed to nova for European Portuguese
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

  // Update the preloadSentenceAudio function
  const preloadSentenceAudio = async (sentence: SentenceState) => {
    try {
      setIsLoadingAudio(true);
      const words = sentence.words.map(w => w.text);
      const fullText = words.join(' ');
      
      // Create unique keys for caching
      const sentenceKey = sentence.id;
      
      // Load full sentence audio if not cached
      if (!audioCache.current.sentences[sentenceKey] || 
          audioCache.current.sentences[sentenceKey].text !== fullText) {
        const audioUrl = await getAudioFromOpenAI(fullText);
        if (audioUrl) {
          const audio = new Audio(audioUrl);
          await new Promise((resolve) => {
            audio.addEventListener('loadeddata', resolve, { once: true });
            audio.load();
          });
          audioCache.current.sentences[sentenceKey] = { 
            audio,
            text: fullText
          };
        }
      }
      
      // Load individual word audio if not cached
      await Promise.all(words.map(async (word, index) => {
        const wordKey = `${sentence.id}-${index}-${word}`;
        if (!audioCache.current.words[wordKey] || 
            audioCache.current.words[wordKey].text !== word) {
          const audioUrl = await getAudioFromOpenAI(word);
          if (audioUrl) {
            const audio = new Audio(audioUrl);
            await new Promise((resolve) => {
              audio.addEventListener('loadeddata', resolve, { once: true });
              audio.load();
            });
            audioCache.current.words[wordKey] = {
              audio,
              text: word
            };
          }
        }
      }));
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

  // Handle slider interaction for a specific sentence
  const handleSliderMove = (clientX: number, sentenceId: number, containerRect: DOMRect) => {
    const sentence = sentences.find(s => s.id === sentenceId);
    if (!sentence) return;

    // Calculate the exact percentage position
    const relativeX = Math.max(0, Math.min(clientX - containerRect.left, containerRect.width));
    const percentage = (relativeX / containerRect.width) * 100;
    
    // Calculate word index based on percentage thresholds
    const wordCount = sentence.words.length;
    const wordIndex = Math.min(
      Math.floor((percentage / 100) * wordCount),
      wordCount - 1
    );

    if (isDragging[sentenceId]) {
      // Stop any playing audio and speech
      window.speechSynthesis.cancel();
      Object.values(audioCache.current.words).forEach(({ audio }) => audio.pause());
      Object.values(audioCache.current.sentences).forEach(({ audio }) => audio.pause());
      
      // Only speak the word when crossing word boundaries
      if (wordIndex > sentence.highlightedIndex) {
        const word = sentence.words[wordIndex].text;
        const wordKey = `${sentenceId}-${wordIndex}-${word}`;
        const cached = audioCache.current.words[wordKey];
        
        if (cached && cached.text === word) {
          cached.audio.currentTime = 0;
          cached.audio.playbackRate = 1.0;
          cached.audio.play();
        } else {
          const utterance = new SpeechSynthesisUtterance(word);
          if (voices.length > 0) {
            utterance.voice = voices[0];
          }
          utterance.lang = 'pt-PT';
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.volume = 1;
          window.speechSynthesis.speak(utterance);
        }
      }

      // Update UI with smooth slider position
      setSentences(prev => prev.map(s => {
        if (s.id !== sentenceId) return s;
        return {
          ...s,
          sliderPosition: percentage,
          highlightedIndex: wordIndex,
          words: s.words.map((word, index) => ({
            ...word,
            isHighlighted: index <= wordIndex
          }))
        };
      }));
    }
  };

  // Mouse event handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      Object.entries(isDragging).forEach(([sentenceId, dragging]) => {
        if (dragging) {
          const container = document.querySelector(`[data-slider-id="${sentenceId}"]`);
          if (container) {
            handleSliderMove(e.clientX, parseInt(sentenceId), container.getBoundingClientRect());
          }
        }
      });
    };

    const handleMouseUp = () => {
      setIsDragging({});
    };

    if (Object.values(isDragging).some(Boolean)) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, sentences]);

  // Touch event handlers
  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // Prevent scrolling while dragging
      Object.entries(isDragging).forEach(([sentenceId, dragging]) => {
        if (dragging) {
          const container = document.querySelector(`[data-slider-id="${sentenceId}"]`);
          if (container) {
            handleSliderMove(e.touches[0].clientX, parseInt(sentenceId), container.getBoundingClientRect());
          }
        }
      });
    };

    const handleTouchEnd = () => {
      setIsDragging({});
    };

    if (Object.values(isDragging).some(Boolean)) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, sentences]);

  // Update the cleanup function
  useEffect(() => {
    return () => {
      Object.values(audioCache.current.words).forEach(({ audio }) => {
        audio.pause();
        const src = audio.src;
        audio.src = '';
        URL.revokeObjectURL(src);
      });
      Object.values(audioCache.current.sentences).forEach(({ audio }) => {
        audio.pause();
        const src = audio.src;
        audio.src = '';
        URL.revokeObjectURL(src);
      });
      audioCache.current = { 
        words: {}, 
        sentences: {} 
      };
    };
  }, [difficultyLevel]);

  // Update the speakWord function
  const speakWord = async (word: string, sentenceId: number, wordIndex: number) => {
    // Stop any playing audio
    Object.values(audioCache.current.words).forEach(({ audio }) => audio.pause());
    Object.values(audioCache.current.sentences).forEach(({ audio }) => audio.pause());
    
    const wordKey = `${sentenceId}-${wordIndex}-${word}`;
    const cached = audioCache.current.words[wordKey];
    
    if (cached && cached.text === word) {
      cached.audio.currentTime = 0;
      cached.audio.playbackRate = 1.0;
      await cached.audio.play();
    } else {
      // If not cached or text doesn't match, get new audio
      const audioUrl = await getAudioFromOpenAI(word);
      if (audioUrl) {
        const newAudio = new Audio(audioUrl);
        await newAudio.load();
        audioCache.current.words[wordKey] = {
          audio: newAudio,
          text: word
        };
        await newAudio.play();
      }
    }
  };

  // Update the speakFullSentence function
  const speakFullSentence = async (sentenceId: number) => {
    const sentence = sentences.find(s => s.id === sentenceId);
    if (!sentence) return;

    setIsPlaying(true);
    try {
      // Stop any playing audio
      Object.values(audioCache.current.words).forEach(({ audio }) => audio.pause());
      Object.values(audioCache.current.sentences).forEach(({ audio }) => audio.pause());
      
      const fullText = sentence.words.map(w => w.text).join(' ');
      const cached = audioCache.current.sentences[sentenceId];
      
      if (cached && cached.text === fullText) {
        cached.audio.currentTime = 0;
        cached.audio.playbackRate = 1.0;
        
        // Highlight all words immediately
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

        await cached.audio.play();
      } else {
        // If not cached or text doesn't match, get new audio
        const audioUrl = await getAudioFromOpenAI(fullText);
        if (audioUrl) {
          const newAudio = new Audio(audioUrl);
          await newAudio.load();
          audioCache.current.sentences[sentenceId] = {
            audio: newAudio,
            text: fullText
          };
          
          // Highlight all words immediately
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

          await newAudio.play();
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
            {/* Reading Area */}
            <div className="relative p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
              <div className="flex flex-col gap-6">
                {/* Text and Speaker */}
                <div className="flex items-start justify-between gap-4">
                  <div 
                    ref={el => el && (sentenceRefs.current[sentence.id] = el)}
                    className="flex-1 text-left leading-relaxed"
                    style={{ fontSize: `${sentence.fontSize}px` }}
                  >
                    {sentence.words.map((word, index) => (
                      <span
                        key={index}
                        className={`inline-block transition-colors duration-150 cursor-pointer select-none
                          ${word.isHighlighted 
                            ? 'text-blue-600 dark:text-blue-400' 
                            : 'text-gray-600 dark:text-gray-400'
                          }`}
                        style={{ 
                          marginRight: index < sentence.words.length - 1 ? '0.5em' : 0,
                          padding: '0.1em 0',
                        }}
                        onClick={() => {
                          speakWord(word.text, sentence.id, index);
                          setSentences(prev => prev.map(s => {
                            if (s.id !== sentence.id) return s;
                            return {
                              ...s,
                              highlightedIndex: index,
                              words: s.words.map((w, i) => ({
                                ...w,
                                isHighlighted: i <= index
                              }))
                            };
                          }));
                        }}
                      >
                        {word.text}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => speakFullSentence(sentence.id)}
                    disabled={isPlaying}
                    className="flex-shrink-0 p-2.5 text-gray-500 hover:text-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-50 dark:bg-gray-700 rounded-xl"
                    title="Listen to full sentence"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 24 24" 
                      fill="currentColor" 
                      className="w-6 h-6"
                    >
                      <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z"/>
                      <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z"/>
                    </svg>
                  </button>
                </div>

                {/* Interactive Area */}
                <div className="space-y-6">
                  {/* Slider */}
                  <div className="relative flex justify-start">
                    <div 
                      ref={el => el && (sentenceRefs.current[`slider-${sentence.id}`] = el)}
                      data-slider-id={sentence.id}
                      className="relative h-3 cursor-pointer rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700"
                      style={{ 
                        width: sentenceRefs.current[sentence.id]?.clientWidth || 'auto',
                        maxWidth: '100%'
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setIsDragging(prev => ({ ...prev, [sentence.id]: true }));
                        handleSliderMove(e.clientX, sentence.id, rect);
                      }}
                      onTouchStart={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setIsDragging(prev => ({ ...prev, [sentence.id]: true }));
                        handleSliderMove(e.touches[0].clientX, sentence.id, rect);
                      }}
                    >
                      {/* Progress bar */}
                      <div 
                        className={`absolute top-0 left-0 h-full bg-blue-500/20 transform-gpu will-change-transform
                          ${isDragging[sentence.id] ? '' : 'transition-all duration-75 ease-linear'}`}
                        style={{ 
                          width: `${sentence.sliderPosition}%`,
                        }}
                      />
                      
                      {/* Handle */}
                      <div 
                        className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none transform-gpu will-change-transform
                          ${isDragging[sentence.id] ? '' : 'transition-all duration-75 ease-linear'}`}
                        style={{ 
                          left: `${sentence.sliderPosition}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        <div className="h-5 w-5 bg-blue-500 rounded-full shadow-lg" />
                      </div>
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