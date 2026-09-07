/**
 * Real-Time Speech-to-Text (STT) Subtitles Service
 * 
 * Leverages native Web Speech API (SpeechRecognition / webkitSpeechRecognition)
 * to transcribe spoken voice from the active call microphone in real time.
 */

// Define SpeechRecognition types for browsers
interface IWindowSpeech extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export class LiveSpeechToTextService {
  private recognition: any = null;
  private isListening = false;
  private shouldRestart = false;
  private onTranscriptCallback: ((text: string, isFinal: boolean) => void) | null = null;
  private language = 'en-US';

  public isSupported(): boolean {
    const win = window as unknown as IWindowSpeech;
    return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  public start(onTranscript: (text: string, isFinal: boolean) => void): void {
    this.onTranscriptCallback = onTranscript;
    this.shouldRestart = true;

    const win = window as unknown as IWindowSpeech;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      console.warn('SpeechRecognition API not natively available in this browser environment.');
      return;
    }

    try {
      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch (_) {}
      }

      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.language;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript.trim() && this.onTranscriptCallback) {
          this.onTranscriptCallback(finalTranscript.trim(), true);
        } else if (interimTranscript.trim() && this.onTranscriptCallback) {
          this.onTranscriptCallback(interimTranscript.trim(), false);
        }
      };

      this.recognition.onerror = (event: any) => {
        // Ignore benign no-speech errors (natural pauses)
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('STT Speech Recognition notice:', event.error);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        // Keep speech recognition live continuously while call is connected
        if (this.shouldRestart) {
          setTimeout(() => {
            if (this.shouldRestart && !this.isListening) {
              try {
                this.recognition?.start();
              } catch (_) {}
            }
          }, 250);
        }
      };

      this.recognition.start();
    } catch (err) {
      console.warn('Failed to start Live Speech Recognition:', err);
    }
  }

  public stop(): void {
    this.shouldRestart = false;
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (_) {}
      this.recognition = null;
    }
    this.onTranscriptCallback = null;
  }
}

export const liveSpeechToText = new LiveSpeechToTextService();
