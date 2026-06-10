import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Mic, MicOff, Upload, Pause, Play, Square, FileText, Loader2 } from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useRef } from "react";
import { AudioWaveform } from "./AudioWaveform";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";
import { persistAudioForLaterSync } from "@/lib/offline/audioStore";

interface Patient {
  id: string;
  patient_identifier: string;
}

interface InputZoneProps {
  value: string;
  onChange: (value: string) => void;
  onProcess?: () => void;
  isProcessing: boolean;
  processingTokens?: number;
  selectedPatientId: string | null;
  onPatientSelect: (patientId: string | null) => void;
}

export const InputZone = ({ value, onChange, onProcess, isProcessing, processingTokens = 0, selectedPatientId, onPatientSelect }: InputZoneProps) => {
  const { user, userRole } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { isRecording, isPaused, audioBlob, audioStream, elapsedTime, startRecording, pauseRecording, resumeRecording, stopRecording, clearRecording, maxDurationReached, vadEnabled, toggleVAD, vadPaused } = useAudioRecorder(50); // 50 second limit for Google STT
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en-ZW");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [accumulatedTranscript, setAccumulatedTranscript] = useState<string>("");
  const accumulatedTranscriptRef = useRef<string>("");
  const [isAutoChunking, setIsAutoChunking] = useState(false);
  const [isManualStop, setIsManualStop] = useState(false);
  const [isParsingDoc, setIsParsingDoc] = useState(false);
  const [isAutoTranscribingFinal, setIsAutoTranscribingFinal] = useState(false);
  const pendingChunkRef = useRef<Blob | null>(null);
  const allChunksRef = useRef<Blob[]>([]);
  const isManualStopRef = useRef(false);

  useEffect(() => {
    fetchPatients();
  }, [user, userRole]);

  // Handle automatic chunking when max duration is reached
  useEffect(() => {
    const handleAutoChunk = async () => {
      if (maxDurationReached && audioBlob && !isTranscribing && !isManualStopRef.current) {
        setIsAutoChunking(true);
        console.log('🔄 Auto-chunking: Max duration reached, saving chunk and restarting...');
        
        // Save the chunk blob before clearing
        const chunkBlob = audioBlob;
        allChunksRef.current.push(chunkBlob);
        
        // Clear recording state and restart IMMEDIATELY to minimize audio loss
        clearRecording();
        
        try {
          await startRecording();
          console.log('✅ Recording restarted, now transcribing previous chunk in background...');
          
          toast({
            title: "Recording Continues",
            description: "Previous segment is being transcribed in the background...",
          });
        } catch (error) {
          console.error('❌ Failed to restart recording:', error);
        }

        // Transcribe the saved chunk in background (recording is already running)
        try {
          await transcribeChunkInBackground(chunkBlob);
        } catch (error) {
          console.error('❌ Background chunk transcription error:', error);
          toast({
            title: "Chunk Transcription Failed",
            description: "Some audio may not have been transcribed",
            variant: "destructive",
          });
        } finally {
          setIsAutoChunking(false);
        }
      }
    };

    handleAutoChunk();
  }, [maxDurationReached, audioBlob]);

  // Auto-transcribe the final chunk when manual stop produces a blob
  useEffect(() => {
    const handleFinalChunk = async () => {
      if (isManualStopRef.current && audioBlob && !isRecording && !isTranscribing) {
        console.log('🎯 Manual stop detected, auto-transcribing final chunk...');
        setIsAutoTranscribingFinal(true);
        isManualStopRef.current = false;
        setIsManualStop(false);

        // Add final chunk to allChunksRef for combined playback
        allChunksRef.current.push(audioBlob);

        try {
          await transcribeChunkInBackground(audioBlob);
          // After final transcription, set the full transcript from ref
          const fullTranscript = accumulatedTranscriptRef.current;
          onChange(fullTranscript);
          
          toast({
            title: "Transcription Complete",
            description: "All audio segments transcribed successfully. Ready to Process Narrative.",
          });
        } catch (error) {
          console.error('❌ Final chunk transcription error:', error);
          toast({
            title: "Final Transcription Failed",
            description: "You can retry transcription using the Transcribe button.",
            variant: "destructive",
          });
        } finally {
          setIsAutoTranscribingFinal(false);
        }
      }
    };

    handleFinalChunk();
  }, [audioBlob, isRecording]);

  // Set up audio element - use combined blob from all chunks if available
  useEffect(() => {
    if (audioRef.current) {
      const combinedBlob = allChunksRef.current.length > 0
        ? new Blob(allChunksRef.current, { type: 'audio/webm' })
        : audioBlob;
      if (combinedBlob) {
        const url = URL.createObjectURL(combinedBlob);
        audioRef.current.src = url;
        return () => URL.revokeObjectURL(url);
      }
    }
  }, [audioBlob, isAutoTranscribingFinal]);

  const fetchPatients = async () => {
    try {
      let query = supabase
        .from('patients')
        .select('id, patient_identifier')
        .order('patient_identifier', { ascending: true });

      if (userRole !== 'admin') {
        query = query.eq('user_id', user!.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const handleRecordToggle = async () => {
    if (!isRecording) {
      try {
        isManualStopRef.current = false;
        setIsManualStop(false);
        allChunksRef.current = []; // Reset chunks for new session
        await startRecording();
        toast({
          title: "Recording Started",
          description: "Speak clearly to capture the patient narrative",
        });
      } catch (error) {
        toast({
          title: "Recording Error",
          description: error instanceof Error ? error.message : "Failed to start recording",
          variant: "destructive",
        });
      }
    } else {
      isManualStopRef.current = true;
      setIsManualStop(true);
      stopRecording();
    }
  };

  const handlePauseToggle = () => {
    if (isPaused) {
      resumeRecording();
      toast({
        title: "Recording Resumed",
        description: "Continue speaking to add to the narrative",
      });
    } else {
      pauseRecording();
      toast({
        title: "Recording Paused",
        description: "Click Resume to continue recording",
      });
    }
  };

  // Background chunk transcription - uses ref to avoid stale closures
  const transcribeChunkInBackground = async (chunkBlob: Blob) => {
    try {
      console.log('🎯 Background transcribing chunk, size:', chunkBlob.size, 'bytes');
      
      if (chunkBlob.size === 0) return;

      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(chunkBlob);
      });

      const { data, error } = await supabase.functions.invoke("transcribe-audio", {
        body: { audio: base64Audio, languageCode: selectedLanguage },
      });

      if (error) throw new Error(`Backend error: ${error.message || 'Unknown error'}`);
      if (data?.error) throw new Error(data.error);

      // Use ref to get current accumulated transcript (avoids stale closure)
      const current = accumulatedTranscriptRef.current;
      const newTranscript = current ? `${current} ${data.text}` : data.text;
      accumulatedTranscriptRef.current = newTranscript;
      setAccumulatedTranscript(newTranscript);
      onChange(newTranscript);
      
      console.log('✅ Chunk transcribed successfully, accumulated length:', newTranscript.length);
    } catch (error) {
      console.error('❌ Chunk transcription error:', error);
      throw error;
    }
  };

  const queueAudioForOfflineSync = async (audioData: Blob, reason: string) => {
    if (!selectedPatientId) {
      toast({
        title: "Cannot queue offline",
        description: "Select a patient before recording so we can attach the audio to their record.",
        variant: "destructive",
      });
      return;
    }
    try {
      const result = await persistAudioForLaterSync(audioData, {
        patientId: selectedPatientId,
        language: selectedLanguage,
        narrative: value || undefined,
      });
      clearRecording();
      toast({
        title: "Saved offline",
        description: `${reason} Audio (${(result.totalBytes / 1024).toFixed(0)} KB) is stored on this device and will transcribe when you're back online.`,
      });
    } catch (e) {
      console.error("Failed to persist audio offline:", e);
      toast({
        title: "Could not save offline",
        description: e instanceof Error ? e.message : "Unknown error storing audio.",
        variant: "destructive",
      });
    }
  };

  const transcribeAudio = async (audioData: Blob, isChunk = false) => {
    setIsTranscribing(true);
    try {
      console.log('🎯 Starting transcription for blob, size:', audioData.size, 'bytes', isChunk ? '(chunk)' : '');

      if (audioData.size === 0) {
        throw new Error('No audio data captured. Please try recording again.');
      }

      // Offline short-circuit — persist to IndexedDB and let the sync engine
      // ship it later.
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        await queueAudioForOfflineSync(audioData, "You are offline.");
        return;
      }

      if (!isChunk) {
        toast({
          title: "Transcribing Audio",
          description: "Converting speech to text...",
        });
      }

      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(audioData);
      });

      const { data, error } = await supabase.functions.invoke("transcribe-audio", {
        body: { audio: base64Audio, languageCode: selectedLanguage },
      });

      if (error) throw new Error(`Backend error: ${error.message || 'Unknown error'}`);
      if (data?.error) throw new Error(data.error);

      console.log('✓ Transcription successful:', data);

      // Combine with accumulated transcript from previous chunks
      const accumulated = accumulatedTranscriptRef.current;
      const finalTranscript = accumulated
        ? `${accumulated} ${data.text}`
        : data.text;
      onChange(finalTranscript);

      // Reset accumulated transcript
      accumulatedTranscriptRef.current = "";
      setAccumulatedTranscript("");
      clearRecording();

      toast({
        title: "Transcription Complete",
        description: accumulated
          ? "All audio segments combined and transcribed successfully"
          : "Audio converted to text successfully",
      });
    } catch (error) {
      console.error("❌ Transcription error:", error);
      // Network error → save offline rather than losing the recording.
      const msg = error instanceof Error ? error.message : String(error);
      const looksOffline = /network|failed to fetch|load failed|networkerror/i.test(msg);
      if (looksOffline) {
        await queueAudioForOfflineSync(audioData, "Transcription server unreachable.");
      } else {
        toast({
          title: "Transcription Failed",
          description: msg || "Failed to transcribe audio. Click Retry to try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleRetryTranscription = async () => {
    if (audioBlob) {
      await transcribeAudio(audioBlob);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast({
        title: "Invalid File",
        description: "Please upload an audio file",
        variant: "destructive",
      });
      return;
    }

    await transcribeAudio(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDocUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf',
      'text/rtf',
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|txt|rtf)$/i)) {
      toast({
        title: "Invalid File",
        description: "Please upload a PDF, Word, TXT, or RTF document",
        variant: "destructive",
      });
      return;
    }

    setIsParsingDoc(true);
    try {
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const text = await file.text();
        const combined = value ? `${value}\n\n--- Document: ${file.name} ---\n${text}` : text;
        onChange(combined);
        toast({
          title: "Document Loaded",
          description: `"${file.name}" content added to narrative`,
        });
      } else {
        // For PDF/DOC/DOCX, read as base64 and send to edge function for extraction
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });

        const { data, error } = await supabase.functions.invoke("process-document", {
          body: { document: base64, fileName: file.name, mimeType: file.type },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const extractedText = data.text || '';
        const combined = value ? `${value}\n\n--- Document: ${file.name} ---\n${extractedText}` : extractedText;
        onChange(combined);
        toast({
          title: "Document Processed",
          description: `"${file.name}" content extracted and added to narrative`,
        });
      }
    } catch (error) {
      console.error("Document upload error:", error);
      toast({
        title: "Document Processing Failed",
        description: error instanceof Error ? error.message : "Failed to process document",
        variant: "destructive",
      });
    } finally {
      setIsParsingDoc(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  const handleClearTranscript = () => {
    onChange("");
    clearRecording();
    accumulatedTranscriptRef.current = "";
    setAccumulatedTranscript("");
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsAutoChunking(false);
    setIsManualStop(false);
    isManualStopRef.current = false;
    allChunksRef.current = [];
    setIsAutoTranscribingFinal(false);
    toast({
      title: "Session Cleared",
      description: "Transcript has been cleared. Ready for new session.",
    });
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const exportAudioAsWebM = () => {
    if (!audioBlob) return;
    
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: "Recording saved as WebM file",
    });
  };

  const exportAudioAsWAV = async () => {
    if (!audioBlob) return;
    
    try {
      toast({
        title: "Converting to WAV",
        description: "Processing audio...",
      });
      
      const audioContext = new AudioContext();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Convert to WAV
      const wavBuffer = audioBufferToWav(audioBuffer);
      const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
      
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download Started",
        description: "Recording saved as WAV file",
      });
    } catch (error) {
      console.error('Error converting to WAV:', error);
      toast({
        title: "Export Failed",
        description: "Could not convert to WAV format",
        variant: "destructive",
      });
    }
  };

  // Helper function to convert AudioBuffer to WAV format
  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    
    const data = [];
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      data.push(buffer.getChannelData(i));
    }
    
    const interleaved = interleave(data);
    const dataLength = interleaved.length * bytesPerSample;
    const headerLength = 44;
    const totalLength = headerLength + dataLength;
    
    const wavBuffer = new ArrayBuffer(totalLength);
    const view = new DataView(wavBuffer);
    
    // Write WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, totalLength - 8, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);
    
    // Write audio data
    let offset = 44;
    for (let i = 0; i < interleaved.length; i++) {
      const sample = Math.max(-1, Math.min(1, interleaved[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
    
    return wavBuffer;
  };

  const interleave = (channelData: Float32Array[]): Float32Array => {
    const length = channelData[0].length;
    const numChannels = channelData.length;
    const result = new Float32Array(length * numChannels);
    
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        result[i * numChannels + channel] = channelData[channel][i];
      }
    }
    
    return result;
  };

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-foreground">Patient Narrative / Transcript</h2>
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleVAD}
            disabled={isRecording}
            className="text-xs"
          >
            {vadEnabled ? "VAD: ON" : "VAD: OFF"}
          </Button>
          {isRecording ? (
            <>
              <Button 
                variant={isPaused ? "outline" : "secondary"} 
                size="sm"
                onClick={handlePauseToggle}
                disabled={isProcessing || isTranscribing}
              >
                {isPaused ? (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                )}
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleRecordToggle}
                disabled={isProcessing || isTranscribing}
              >
                <Square className="h-4 w-4 mr-2" />
                Stop Recording
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRecordToggle}
                disabled={isProcessing || isTranscribing}
              >
                <Mic className="h-4 w-4 mr-2" />
                Record Session
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Audio
              </Button>
              <input
                ref={docInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.rtf"
                onChange={handleDocUpload}
                className="hidden"
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => docInputRef.current?.click()}
                disabled={isProcessing || isParsingDoc}
              >
                {isParsingDoc ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Upload Document
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="language-select">Transcription Language</Label>
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage} disabled={isRecording || isProcessing}>
            <SelectTrigger id="language-select">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES
                .filter(l => l.code !== 'mixed')
                .map(l => (
                  <SelectItem key={l.code} value={l.transcriptionCode}>
                    {l.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button 
            variant="outline" 
            onClick={handleClearTranscript}
            disabled={!value.trim() && !audioBlob || isRecording || isProcessing}
            className="w-full"
          >
            Clear Transcript / New Session
          </Button>
        </div>
      </div>
      
      <AudioWaveform 
        audioStream={audioStream} 
        isRecording={isRecording} 
        isPaused={isPaused || vadPaused} 
        elapsedTime={elapsedTime}
        maxDuration={50}
      />
      
      {vadPaused && (
        <div className="p-3 bg-muted border border-border rounded-lg flex items-center gap-2">
          <div className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse" />
          <span className="text-sm text-muted-foreground">Auto-paused due to silence - speak to resume...</span>
        </div>
      )}
      
      {isAutoChunking && (
        <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-2">
          <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
          <span className="text-sm text-foreground">Auto-chunking in progress - transcribing segment...</span>
        </div>
      )}

      {isAutoTranscribingFinal && (
        <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
          <span className="text-sm text-foreground">Transcribing final segment... Process Narrative will be available once complete.</span>
        </div>
      )}
      
      {audioBlob && !isRecording && !isAutoTranscribingFinal && (
        <div className="space-y-3">
          <div className="p-4 bg-muted rounded-lg border border-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-foreground">Review Recording</span>
              <span className="text-sm font-mono text-muted-foreground">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            
            <audio
              ref={audioRef}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleAudioEnded}
              className="hidden"
            />
            
            <AudioWaveform 
              audioStream={null}
              audioElement={audioRef.current}
              isRecording={false}
              isPlaying={isPlaying}
              mode="playback"
            />
            
            <div className="flex items-center gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlayPause}
                disabled={isTranscribing}
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Play
                  </>
                )}
              </Button>
              
              <div className="flex-1">
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-100"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => transcribeAudio(audioBlob)}
                disabled={isTranscribing}
                title="Re-transcribe this audio segment"
              >
                {isTranscribing ? "Transcribing..." : "Re-transcribe"}
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={exportAudioAsWebM}
                disabled={isTranscribing}
              >
                Export WebM
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={exportAudioAsWAV}
                disabled={isTranscribing}
              >
                Export WAV
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={clearRecording}
                disabled={isTranscribing}
              >
                Discard
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <div>
        <Label htmlFor="patient-select">
          Select Patient <span className="text-destructive">*</span>
        </Label>
        {patients.length === 0 ? (
          <div className="flex items-center gap-2 p-3 border border-border rounded-md bg-muted text-sm text-muted-foreground">
            No patients found — go to the <strong>Patients</strong> tab to create a patient record first.
          </div>
        ) : (
          <Select value={selectedPatientId || ""} onValueChange={(value) => onPatientSelect(value || null)}>
            <SelectTrigger id="patient-select">
              <SelectValue placeholder="Select a patient to link this assessment" />
            </SelectTrigger>
            <SelectContent>
              {patients.map((patient) => (
                <SelectItem key={patient.id} value={patient.id}>
                  {patient.patient_identifier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter or paste patient narrative here. Supports: English, Shona, Ndebele, Xhosa, Zulu, Sotho, French, Portuguese..."
        className="min-h-[300px] text-base bg-background border-border focus:border-primary"
      />
      {onProcess && (
        <div className="flex justify-end">
          <Button
            onClick={onProcess}
            disabled={!value.trim() || isProcessing || !selectedPatientId || isTranscribing || isAutoTranscribingFinal}
            title={!selectedPatientId ? "Select a patient before processing" : (isAutoTranscribingFinal || isTranscribing) ? "Wait for transcription to complete" : undefined}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isProcessing
              ? processingTokens > 0
                ? `Analysing... (${processingTokens} tokens)`
                : "Connecting to AI..."
              : "Process Narrative"}
          </Button>
        </div>
      )}
    </div>
  );
};