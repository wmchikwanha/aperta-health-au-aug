import { useEffect, useRef } from "react";

interface AudioWaveformProps {
  audioStream: MediaStream | null;
  isRecording: boolean;
  isPaused?: boolean;
  elapsedTime?: number;
  audioElement?: HTMLAudioElement | null;
  isPlaying?: boolean;
  mode?: 'recording' | 'playback';
  maxDuration?: number;
}

export const AudioWaveform = ({ 
  audioStream, 
  isRecording, 
  isPaused = false, 
  elapsedTime = 0,
  audioElement = null,
  isPlaying = false,
  mode = 'recording',
  maxDuration
}: AudioWaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Cleanup function
    const cleanup = () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };

    // Recording mode
    if (mode === 'recording' && audioStream && isRecording) {
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyzer = audioContext.createAnalyser();
      analyzerRef.current = analyzer;
      analyzer.fftSize = 2048;
      
      const source = audioContext.createMediaStreamSource(audioStream);
      source.connect(analyzer);

      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!isRecording) return;
        
        animationRef.current = requestAnimationFrame(draw);
        analyzer.getByteTimeDomainData(dataArray);

        ctx.fillStyle = "hsl(var(--muted))";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.lineWidth = 2;
        ctx.strokeStyle = isPaused ? "hsl(var(--muted-foreground))" : "hsl(var(--primary))";
        ctx.beginPath();

        const sliceWidth = canvas.width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * canvas.height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      };

      draw();
      return cleanup;
    }

    // Playback mode
    if (mode === 'playback' && audioElement && isPlaying) {
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyzer = audioContext.createAnalyser();
      analyzerRef.current = analyzer;
      analyzer.fftSize = 2048;
      
      const source = audioContext.createMediaElementSource(audioElement);
      source.connect(analyzer);
      analyzer.connect(audioContext.destination);

      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!isPlaying) return;
        
        animationRef.current = requestAnimationFrame(draw);
        analyzer.getByteTimeDomainData(dataArray);

        ctx.fillStyle = "hsl(var(--muted))";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.lineWidth = 2;
        ctx.strokeStyle = "hsl(var(--accent))";
        ctx.beginPath();

        const sliceWidth = canvas.width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * canvas.height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      };

      draw();
      return cleanup;
    }

    // Static state when not recording or playing
    cleanup();
    ctx.fillStyle = "hsl(var(--muted))";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "hsl(var(--muted-foreground))";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

  }, [audioStream, isRecording, isPaused, audioElement, isPlaying, mode]);

  if (mode === 'recording' && !isRecording) return null;
  if (mode === 'playback' && !audioElement) return null;

  // Format elapsed time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (!maxDuration) return 'text-foreground';
    const remaining = maxDuration - elapsedTime;
    if (remaining <= 10) return 'text-destructive';
    if (remaining <= 20) return 'text-orange-500';
    if (remaining <= 30) return 'text-yellow-500';
    return 'text-foreground';
  };

  const getTimerBgColor = () => {
    if (!maxDuration) return 'bg-background/80';
    const remaining = maxDuration - elapsedTime;
    if (remaining <= 10) return 'bg-destructive/20 border-destructive/40';
    if (remaining <= 20) return 'bg-orange-500/20 border-orange-500/40';
    if (remaining <= 30) return 'bg-yellow-500/20 border-yellow-500/40';
    return 'bg-background/80 border-border';
  };

  return (
    <div className="p-3 bg-muted rounded-lg border border-border">
      {mode === 'recording' && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isPaused ? 'bg-muted-foreground' : 'bg-destructive animate-pulse'}`} />
            <span className="text-sm text-muted-foreground font-medium">
              {isPaused ? 'Recording paused...' : 'Recording in progress...'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono font-semibold text-foreground">
              {formatTime(elapsedTime)}
            </span>
            {maxDuration && (
              <div className={`px-2 py-1 rounded border ${getTimerBgColor()}`}>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Time left:</span>
                  <span className={`text-sm font-mono font-bold ${getTimerColor()}`}>
                    {formatTime(Math.max(0, maxDuration - elapsedTime))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {mode === 'playback' && (
        <div className="flex items-center gap-2 mb-2">
          <div className={`h-2 w-2 rounded-full ${isPlaying ? 'bg-accent animate-pulse' : 'bg-muted-foreground'}`} />
          <span className="text-sm text-muted-foreground font-medium">
            {isPlaying ? 'Playing audio...' : 'Audio ready'}
          </span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="w-full h-16 rounded"
      />
    </div>
  );
};
