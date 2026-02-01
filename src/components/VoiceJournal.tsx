import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface VoiceJournalProps {
  onTranscript: (text: string) => void;
  onEmotion?: (emotion: EmotionData) => void;
}

interface EmotionData {
  primary_emotion: string;
  confidence: number;
  summary: string;
  wellbeing_score: number;
  suggestions?: string[];
}

export const VoiceJournal = ({ onTranscript, onEmotion }: VoiceJournalProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        await processRecording();
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Microphone access error:', error);
      toast.error("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const processRecording = async () => {
    setIsProcessing(true);
    try {
      // Refresh session to ensure valid auth token
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      
      if (sessionError || !session) {
        // Try to get existing session as fallback
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (!existingSession) {
          toast.error("Please log in to use voice recording");
          setIsProcessing(false);
          return;
        }
      }

      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      
      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(audioBlob);
      const base64Audio = await base64Promise;

      // Transcribe using existing voice-to-text function
      const { data: transcriptData, error: transcriptError } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: base64Audio }
      });

      if (transcriptError || !transcriptData?.text) {
        throw new Error('Failed to transcribe audio');
      }

      const transcript = transcriptData.text;
      onTranscript(transcript);
      toast.success("Voice recorded and transcribed!");

      // Analyze emotion
      if (onEmotion) {
        const { data: emotionData, error: emotionError } = await supabase.functions.invoke('analyze-emotion', {
          body: { text: transcript }
        });

        if (!emotionError && emotionData) {
          onEmotion(emotionData);
        }
      }
    } catch (error) {
      console.error('Processing error:', error);
      toast.error("Failed to process recording");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3">
      {isRecording && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 rounded-full">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-sm text-destructive font-medium">
            {formatDuration(recordingDuration)}
          </span>
        </div>
      )}
      
      {isProcessing ? (
        <Button disabled variant="outline" size="sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Processing...
        </Button>
      ) : isRecording ? (
        <Button 
          onClick={stopRecording} 
          variant="destructive" 
          size="sm"
        >
          <Square className="w-4 h-4" />
          Stop Recording
        </Button>
      ) : (
        <Button 
          onClick={startRecording} 
          variant="outline" 
          size="sm"
        >
          <Mic className="w-4 h-4" />
          Voice Journal
        </Button>
      )}
    </div>
  );
};
