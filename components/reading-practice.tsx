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

interface WordTiming {
  word: string;
  start: number;
  end: number;
}

interface AudioCache {
  sentences: { 
    [key: number]: { 
      audio: HTMLAudioElement; 
      text: string;
      wordTimings?: WordTiming[];
    } 
  };
}

// Update the getAudioFromOpenAI function
const getAudioFromOpenAI = async (text: string) => {
  try {
    const response = await fetch('/api/generate-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate speech');
    }

    const audioBlob = await response.blob();
    const url = URL.createObjectURL(audioBlob);
    return url;
  } catch (error) {
    console.error('Error generating speech:', error);
    if (error instanceof Error) {
      alert(`Failed to generate audio: ${error.message}`);
    }
    return null;
  }
};

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

const estimateWordTimings = (words: string[], totalDuration: number): WordTiming[] => {
  const totalCharacters = words.join(' ').length;
  let currentTime = 0;
  
  return words.map((word, index) => {
    // Estimate duration based on word length relative to total text length
    const duration = (word.length / totalCharacters) * totalDuration;
    const timing = {
      word,
      start: currentTime,
      end: currentTime + duration
    };
    currentTime += duration;
    return timing;
  });
};

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

  // Function to get a random topic
  const getRandomTopic = () => {
    const randomIndex = Math.floor(Math.random() * DEFAULT_TOPICS.length);
    return DEFAULT_TOPICS[randomIndex];
  };

  // On mount, set a random topic and auto-generate sentences
  useEffect(() => {
    if (!topic) {
      const randomTopic = getRandomTopic();
      setTopic(randomTopic);
      // Generate sentences for the random topic and current difficulty
      (async () => {
        setIsGenerating(true);
        try {
          const response = await fetch('/api/generate-sentences', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              topic: randomTopic,
              difficultyLevel
            })
          });
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to generate sentences');
          }
          const jsonContent = await response.json();
          if (jsonContent.sentences && Array.isArray(jsonContent.sentences)) {
            const formattedSentences = jsonContent.sentences.map((sentence, index) => ({
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
          console.error('Error generating sentences:', error);
        } finally {
          setIsGenerating(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update the generateSentences function
  const generateSentences = async () => {
    if (!topic.trim()) {
      const randomTopic = getRandomTopic();
      setTopic(randomTopic);
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-sentences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          difficultyLevel
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate sentences');
      }

      const jsonContent = await response.json();
      
      if (jsonContent.sentences && Array.isArray(jsonContent.sentences)) {
        const formattedSentences = jsonContent.sentences.map((sentence, index) => ({
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
        // Only clear topic if it was empty and we used a random one
        if (!topic.trim()) {
          setTopic('');
        }
      } else {
        throw new Error('Invalid response format from API');
      }
    } catch (error) {
      console.error('Error generating sentences:', error);
      if (error instanceof Error) {
        alert(`Failed to generate sentences: ${error.message}. Please try again.`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Update the handleTabClick function
  const handleTabClick = async (level: DifficultyLevel) => {
    setDifficultyLevel(level);
    setIsGenerating(true);
    try {
      const randomTopic = getRandomTopic();
      setTopic(randomTopic);
      
      const response = await fetch('/api/generate-sentences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: randomTopic,
          difficultyLevel: level
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate sentences');
      }

      const jsonContent = await response.json();
      
      if (jsonContent.sentences && Array.isArray(jsonContent.sentences)) {
        const formattedSentences = jsonContent.sentences.map((sentence, index) => ({
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
      console.error('Error generating sentences:', error);
      if (error instanceof Error) {
        alert(`Failed to generate sentences: ${error.message}. Please try again.`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Update the intersection observer to use the current topic and difficulty
  useEffect(() => {
    const observer = new IntersectionObserver(
      async (entries) => {
        const target = entries[0];
        if (target.isIntersecting && !isGenerating && topic) {
          setIsGenerating(true);
          try {
            const response = await fetch('/api/generate-sentences', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                topic,
                difficultyLevel
              })
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Failed to generate sentences');
            }

            const jsonContent = await response.json();
            
            if (jsonContent.sentences && Array.isArray(jsonContent.sentences)) {
              const startIndex = sentences.length;
              const formattedSentences = jsonContent.sentences.map((sentence, index) => ({
                id: startIndex + index,
                words: sentence.text.split(' ').map(word => ({
                  text: word,
                  isHighlighted: false
                })),
                translation: sentence.translation,
                showTranslation: false,
                highlightedIndex: -1,
                fontSize: sentences[0]?.fontSize || 22,
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
            console.error('Error loading more sentences:', error);
            if (error instanceof Error) {
              alert(`Failed to load more sentences: ${error.message}. Please try again.`);
            }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, difficultyLevel, sentences.length, topic, isGenerating]);

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

  // Add playback speed control
  const playAudioAtSpeed = async (audio: HTMLAudioElement, speed: 'normal' | 'slow' | 'fast') => {
    const speeds = {
      slow: 0.7,
      normal: 1,
      fast: 1
    };
    
    audio.playbackRate = speeds[speed];
    await audio.play();
  };

  // Add cleanup effect
  useEffect(() => {
    return () => {
      // Clean up all audio elements and object URLs
      Object.values(audioCache.current.sentences).forEach(({ audio }) => {
        if (audio) {
          audio.pause();
          audio.src = '';
          audio.load();
        }
      });
      // Reset the audio cache
      audioCache.current = { sentences: {} };
    };
  }, []);

  // Update the preloadSentenceAudio function to clean up old audio
  const preloadSentenceAudio = async (sentence: SentenceState) => {
    try {
      setIsLoadingAudio(true);
      const fullText = sentence.words.map(w => w.text).join(' ');
      
      // Clean up old audio if it exists
      if (audioCache.current.sentences[sentence.id]) {
        const oldAudio = audioCache.current.sentences[sentence.id].audio;
        oldAudio.pause();
        oldAudio.src = '';
        oldAudio.load();
        delete audioCache.current.sentences[sentence.id];
      }
      
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
      let audioObj = audioCache.current.sentences[sentenceId]?.audio;

      if (!audioObj || audioCache.current.sentences[sentenceId]?.text !== fullText) {
        const audioUrl = await getAudioFromOpenAI(fullText);
        if (audioUrl) {
          audioObj = new Audio(audioUrl);
          audioCache.current.sentences[sentenceId] = { audio: audioObj, text: fullText };
        }
      }

      if (audioObj) {
        await playAudioAtSpeed(audioObj, speed);
        // Optionally: highlight the whole sentence while playing
        setSentences(prev => prev.map(s =>
          s.id === sentenceId
            ? { ...s, words: s.words.map(w => ({ ...w, isHighlighted: true })) }
            : s
        ));
        audioObj.addEventListener('ended', () => {
          setIsPlaying(false);
          setSentences(prev => prev.map(s =>
            s.id === sentenceId
              ? { ...s, words: s.words.map(w => ({ ...w, isHighlighted: false })) }
              : s
          ));
        });
      }
    } catch (error) {
      console.error('Error speaking sentence:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  // Update the renderContent to always show loading indicator
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
                          }
                          hover:text-blue-500 dark:hover:text-blue-300`}
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