import { useState, useRef, useCallback } from 'react';

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  audioBlob: Blob | null;
  audioStream: MediaStream | null;
  elapsedTime: number;
  startRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  clearRecording: () => void;
  maxDurationReached: boolean;
  vadEnabled: boolean;
  toggleVAD: () => void;
  vadPaused: boolean;
}

export const useAudioRecorder = (maxDuration?: number): UseAudioRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [maxDurationReached, setMaxDurationReached] = useState(false);
  const [vadEnabled, setVadEnabled] = useState(false);
  const [vadPaused, setVadPaused] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxDurationRef = useRef<number | undefined>(maxDuration);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const vadCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceStartRef = useRef<number>(0);
  const SILENCE_THRESHOLD = 0.01; // Audio level threshold
  const SILENCE_DURATION = 2000; // 2 seconds of silence before auto-pause

  const startRecording = useCallback(async () => {
    try {
      console.log('🎤 Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      console.log('✓ Microphone access granted');
      console.log('🎙️ Creating MediaRecorder...');
      
      setAudioStream(stream);
      
      // Set up VAD if enabled
      if (vadEnabled) {
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        const analyzer = audioContext.createAnalyser();
        analyzerRef.current = analyzer;
        analyzer.fftSize = 2048;
        analyzer.smoothingTimeConstant = 0.8;
        
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyzer);
        
        const dataArray = new Uint8Array(analyzer.frequencyBinCount);
        
        // Start VAD monitoring
        vadCheckIntervalRef.current = setInterval(() => {
          analyzer.getByteFrequencyData(dataArray);
          
          // Calculate average audio level
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          const normalizedLevel = average / 255;
          
          if (normalizedLevel < SILENCE_THRESHOLD) {
            // Silence detected
            if (silenceStartRef.current === 0) {
              silenceStartRef.current = Date.now();
            } else if (Date.now() - silenceStartRef.current > SILENCE_DURATION && !isPaused) {
              console.log('🔇 VAD: Silence detected, auto-pausing...');
              setVadPaused(true);
              mediaRecorderRef.current?.pause();
              setIsPaused(true);
              if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
              }
              pausedTimeRef.current = Date.now() - startTimeRef.current - pausedTimeRef.current;
            }
          } else {
            // Voice detected
            silenceStartRef.current = 0;
            if (vadPaused && isPaused) {
              console.log('🔊 VAD: Voice detected, auto-resuming...');
              setVadPaused(false);
              mediaRecorderRef.current?.resume();
              setIsPaused(false);
              startTimeRef.current = Date.now() - pausedTimeRef.current;
              timerIntervalRef.current = setInterval(() => {
                const newElapsedTime = Math.floor((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000);
                setElapsedTime(newElapsedTime);
                
                if (maxDurationRef.current && newElapsedTime >= maxDurationRef.current) {
                  console.log('⏱️ Max duration reached, stopping recording...');
                  setMaxDurationReached(true);
                  if (mediaRecorderRef.current) {
                    mediaRecorderRef.current.stop();
                    setIsRecording(false);
                    setIsPaused(false);
                  }
                }
              }, 1000);
            }
          }
        }, 100);
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      console.log('✓ MediaRecorder created, state:', mediaRecorder.state);
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Start timer
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;
      setElapsedTime(0);
      
      timerIntervalRef.current = setInterval(() => {
        const newElapsedTime = Math.floor((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000);
        setElapsedTime(newElapsedTime);
        
        // Auto-stop if max duration reached
        if (maxDurationRef.current && newElapsedTime >= maxDurationRef.current) {
          console.log('⏱️ Max duration reached, stopping recording...');
          setMaxDurationReached(true);
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsPaused(false);
          }
        }
      }, 1000);

      mediaRecorder.ondataavailable = (event) => {
        console.log('📦 Data available, size:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log('✓ Chunk added, total chunks:', chunksRef.current.length);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('⏹️ Recording stopped, chunks collected:', chunksRef.current.length);
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        console.log('✓ Blob created, size:', blob.size, 'bytes');
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
        
        // Clear timer
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        
        // Clear VAD
        if (vadCheckIntervalRef.current) {
          clearInterval(vadCheckIntervalRef.current);
          vadCheckIntervalRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      };

      mediaRecorder.start(1000); // Collect data every 1 second
      console.log('▶️ Recording started');
      setIsRecording(true);
    } catch (error) {
      console.error('❌ Error accessing microphone:', error);
      throw new Error('Failed to access microphone. Please check permissions.');
    }
  }, [vadEnabled, isPaused, vadPaused]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      console.log('⏸️ Pausing recording...');
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      // Pause timer
      pausedTimeRef.current = Date.now() - startTimeRef.current - pausedTimeRef.current;
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  }, [isRecording, isPaused]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      console.log('▶️ Resuming recording...');
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      // Resume timer
      startTimeRef.current = Date.now() - pausedTimeRef.current;
      timerIntervalRef.current = setInterval(() => {
        const newElapsedTime = Math.floor((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000);
        setElapsedTime(newElapsedTime);
        
        // Auto-stop if max duration reached
        if (maxDurationRef.current && newElapsedTime >= maxDurationRef.current) {
          console.log('⏱️ Max duration reached, stopping recording...');
          stopRecording();
        }
      }, 1000);
    }
  }, [isRecording, isPaused]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('🛑 Stopping recording...');
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      setVadPaused(false);
      
      // Stop all tracks in the stream
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
      }
      
      // Clear timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      
      // Clear VAD
      if (vadCheckIntervalRef.current) {
        clearInterval(vadCheckIntervalRef.current);
        vadCheckIntervalRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    }
  }, [isRecording, audioStream]);

  const clearRecording = useCallback(() => {
    setAudioBlob(null);
    chunksRef.current = [];
    setElapsedTime(0);
    setMaxDurationReached(false);
    setVadPaused(false);
    silenceStartRef.current = 0;
  }, []);

  const toggleVAD = useCallback(() => {
    setVadEnabled(prev => !prev);
  }, []);

  return {
    isRecording,
    isPaused,
    audioBlob,
    audioStream,
    elapsedTime,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    clearRecording,
    maxDurationReached,
    vadEnabled,
    toggleVAD,
    vadPaused
  };
};
