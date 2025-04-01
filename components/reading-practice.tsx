import React, { useState, useRef, useEffect } from 'react';
import sentencesData from '@/data/sentences.json';
import axios from 'axios';

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
  const audioCache = useRef<{ [key: string]: HTMLAudioElement }>({});
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  // Initialize sentences on mount and difficulty change
  useEffect(() => {
    const initialSentences = sentencesData[difficultyLevel]
      .slice(0, SENTENCES_PER_PAGE)
      .map((sentence, index) => ({
        id: index,
        words: sentence.text.split(' ').map(word => ({
          text: word,
          isHighlighted: false
        })),
        translation: sentence.translation,
        showTranslation: false,
        highlightedIndex: -1,
        fontSize: 36
      }));
    setSentences(initialSentences);
    setPage(1);
  }, [difficultyLevel]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting) {
          const nextSentences = sentencesData[difficultyLevel]
            .slice(page * SENTENCES_PER_PAGE, (page + 1) * SENTENCES_PER_PAGE)
            .map((sentence, index) => ({
              id: page * SENTENCES_PER_PAGE + index,
              words: sentence.text.split(' ').map(word => ({
                text: word,
                isHighlighted: false
              })),
              translation: sentence.translation,
              showTranslation: false,
              highlightedIndex: -1,
              fontSize: 36
            }));
          
          if (nextSentences.length > 0) {
            setSentences(prev => [...prev, ...nextSentences]);
            setPage(prev => prev + 1);
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
  }, [page, difficultyLevel]);

  // Function to adjust font size for a specific sentence
  const adjustFontSize = (sentenceId: number) => {
    const container = containerRef.current;
    const sentence = sentenceRefs.current[sentenceId];
    if (!container || !sentence) return;

    let currentSize = 36;
    sentence.style.fontSize = `${currentSize}px`;

    // Get the container width minus padding and speaker button width
    const maxWidth = container.clientWidth - 100; // Account for padding and speaker button

    while (sentence.scrollWidth > maxWidth && currentSize > 16) {
      currentSize -= 2;
      sentence.style.fontSize = `${currentSize}px`;
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

  // Voice loading
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      const portugueseVoices = availableVoices
        .filter(voice => 
          voice.lang.startsWith('pt') || 
          voice.lang === 'pt-PT' || 
          voice.lang === 'pt-BR'
        )
        .sort((a, b) => {
          // Prioritize Google voices
          if (a.name.includes('Google') && !b.name.includes('Google')) return -1;
          if (!a.name.includes('Google') && b.name.includes('Google')) return 1;
          // Then prioritize European Portuguese
          if (a.lang === 'pt-PT' && b.lang !== 'pt-PT') return -1;
          if (a.lang !== 'pt-PT' && b.lang === 'pt-PT') return 1;
          return 0;
        });
      setVoices(portugueseVoices);
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Preload audio for all words in a sentence
  const preloadSentenceAudio = async (sentence: SentenceState) => {
    try {
      setIsLoadingAudio(true);
      const words = sentence.words.map(w => w.text);
      
      // Load audio for each word
      await Promise.all(words.map(async (word) => {
        if (!audioCache.current[word]) {
          const response = await axios.post('/api/tts', { text: word });
          const audio = new Audio(response.data.audioUrl);
          await audio.load();
          audioCache.current[word] = audio;
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

  // Process word queue with cached audio
  const processWordQueue = async () => {
    if (isProcessingQueueRef.current || wordQueueRef.current.words.length === 0) return;
    
    isProcessingQueueRef.current = true;
    
    try {
      while (wordQueueRef.current.words.length > 0) {
        const word = wordQueueRef.current.words[0];
        wordQueueRef.current.words = wordQueueRef.current.words.slice(1);
        
        // Use cached audio if available, otherwise fallback to speech synthesis
        if (audioCache.current[word]) {
          await new Promise<void>((resolve) => {
            const audio = audioCache.current[word];
            audio.onended = () => resolve();
            audio.onerror = () => resolve();
            audio.currentTime = 0;
            audio.play();
          });
        } else {
          await new Promise<void>((resolve) => {
            const utterance = new SpeechSynthesisUtterance(word);
            if (voices.length > 0) {
              utterance.voice = voices[0];
            }
            utterance.lang = 'pt-PT';
            utterance.rate = 1.2;
            utterance.pitch = 1.0;
            utterance.volume = 1;
            
            utterance.onend = () => resolve();
            utterance.onerror = () => resolve();
            
            window.speechSynthesis.speak(utterance);
          });
        }
      }
    } catch (error) {
      console.error('Error processing word queue:', error);
    } finally {
      isProcessingQueueRef.current = false;
    }
  };

  // Handle slider interaction for a specific sentence
  const handleSliderMove = (clientX: number, sentenceId: number, containerRect: DOMRect) => {
    const sentence = sentences.find(s => s.id === sentenceId);
    if (!sentence) return;

    const relativeX = Math.max(0, Math.min(clientX - containerRect.left, containerRect.width));
    const wordWidth = containerRect.width / sentence.words.length;
    const newIndex = Math.min(Math.floor(relativeX / wordWidth), sentence.words.length - 1);

    // Only allow moving forward
    if (isDragging[sentenceId] && newIndex > sentence.highlightedIndex) {
      // Clear queue and cancel current speech if switching sentences
      if (wordQueueRef.current.sentenceId !== sentenceId) {
        wordQueueRef.current = { sentenceId, words: [] };
        window.speechSynthesis.cancel();
        isProcessingQueueRef.current = false;
      }

      // Calculate words to be spoken (only forward)
      const wordsToSpeak = sentence.words
        .slice(sentence.highlightedIndex + 1, newIndex + 1)
        .map(w => w.text);

      // Add new words to queue
      wordQueueRef.current.words = [...wordQueueRef.current.words, ...wordsToSpeak];

      // Update UI immediately
      setSentences(prev => prev.map(s => {
        if (s.id !== sentenceId) return s;
        return {
          ...s,
          highlightedIndex: newIndex,
          words: s.words.map((word, index) => ({
            ...word,
            isHighlighted: index <= newIndex
          }))
        };
      }));

      // Start processing queue if not already processing
      if (!isProcessingQueueRef.current) {
        processWordQueue();
      }
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

  // Clean up on unmount or sentence change
  useEffect(() => {
    return () => {
      wordQueueRef.current = { sentenceId: -1, words: [] };
      isProcessingQueueRef.current = false;
      window.speechSynthesis.cancel();
      Object.values(audioCache.current).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      audioCache.current = {};
    };
  }, [difficultyLevel]);

  // Speak functions using cached audio
  const speakWord = async (word: string) => {
    if (audioCache.current[word]) {
      const audio = audioCache.current[word];
      audio.currentTime = 0;
      await audio.play();
    } else {
      // Fallback to speech synthesis
      const utterance = new SpeechSynthesisUtterance(word);
      if (voices.length > 0) {
        utterance.voice = voices[0];
      }
      utterance.lang = 'pt-PT';
      utterance.rate = 1.2;
      utterance.pitch = 1.0;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const speakFullSentence = async (sentenceId: number) => {
    const sentence = sentences.find(s => s.id === sentenceId);
    if (!sentence) return;

    setIsPlaying(true);
    try {
      for (const word of sentence.words) {
        await speakWord(word.text);
      }
    } finally {
      setIsPlaying(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      {/* Difficulty selector */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            Practice Reading
          </h2>
          <div className="flex gap-2">
            {(['beginner', 'intermediate', 'advanced'] as DifficultyLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => setDifficultyLevel(level)}
                className={`px-3 py-1 rounded capitalize transition-colors
                  ${difficultyLevel === level
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
                  }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sentences feed */}
      <div ref={containerRef} className="space-y-6">
        {sentences.map((sentence) => (
          <div
            key={sentence.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
          >
            {/* Reading Area */}
            <div className="relative p-6 bg-gray-50 dark:bg-gray-700 rounded-lg leading-relaxed select-none">
              <div className="flex items-center gap-2 mb-4">
                <div 
                  ref={el => el && (sentenceRefs.current[sentence.id] = el)}
                  className="flex-1 flex flex-nowrap whitespace-nowrap overflow-hidden"
                  style={{ fontSize: `${sentence.fontSize}px` }}
                >
                  {sentence.words.map((word, index) => (
                    <span
                      key={index}
                      className={`word px-2 transition-colors duration-150 cursor-pointer
                        ${word.isHighlighted 
                          ? 'text-blue-500' 
                          : 'text-gray-400 dark:text-gray-500'
                        }`}
                      onClick={() => {
                        speakWord(word.text);
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
                  className="flex-shrink-0 p-2 text-gray-500 hover:text-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

              {/* Slider */}
              <div 
                data-slider-id={sentence.id}
                className="relative h-12 cursor-pointer mt-2 mb-4 w-full bg-gray-100 dark:bg-gray-600 rounded-xl overflow-hidden"
                style={{ width: sentenceRefs.current[sentence.id]?.offsetWidth }}
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
                {/* Word markers */}
                <div className="absolute top-0 left-0 w-full h-full flex">
                  {sentence.words.map((_, index) => (
                    <div
                      key={index}
                      className="h-full border-r border-gray-300 dark:border-gray-500 last:border-none"
                      style={{ width: `${100 / sentence.words.length}%` }}
                    />
                  ))}
                </div>

                {/* Progress bar */}
                <div 
                  className={`absolute top-0 left-0 h-full bg-blue-500/10 transform-gpu will-change-transform
                    ${isDragging[sentence.id] ? 'transition-none' : 'transition-transform duration-75 ease-out'}`}
                  style={{ 
                    width: `${((sentence.highlightedIndex + 1) / sentence.words.length) * 100}%`,
                  }}
                />
                
                {/* Handle */}
                <div 
                  className={`absolute top-0 flex items-center justify-center pointer-events-none transform-gpu will-change-transform
                    ${isDragging[sentence.id] ? 'transition-none' : 'transition-transform duration-75 ease-out'}`}
                  style={{ 
                    left: `${((sentence.highlightedIndex + 1) / sentence.words.length) * 100}%`,
                    transform: 'translateX(-50%)',
                  }}
                >
                  <div className="bg-white rounded-lg shadow-lg p-2 border border-gray-200">
                    <div className="w-4 h-4 bg-blue-500 rounded" />
                  </div>
                </div>
              </div>

              {/* Translation toggle */}
              <button 
                onClick={() => setSentences(prev => prev.map(s => 
                  s.id === sentence.id ? { ...s, showTranslation: !s.showTranslation } : s
                ))}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              >
                {sentence.showTranslation ? 'Hide Translation' : 'Show Translation'}
              </button>

              {/* Translation */}
              {sentence.showTranslation && (
                <div className="mt-4 text-lg text-gray-600 dark:text-gray-400 italic">
                  {sentence.translation}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        <div ref={loadingRef} className="h-20 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    </div>
  );
};

export default ReadingPractice; 