// Simple wrapper around Web Speech API to simulate streaming STT
export class STTService {
  private recognition: any = null;
  private isListening = false;
  private onResultCallback: (text: string, isFinal: boolean) => void = () => {};
  private onErrorCallback: (err: any) => void = () => {};

  constructor(lang?: string) {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      if (this.recognition) {
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        // Default to browser language if not provided
        this.recognition.lang = lang || navigator.language || 'en-US';

        this.recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          if (finalTranscript) {
             this.onResultCallback(finalTranscript, true);
          } else if (interimTranscript) {
             this.onResultCallback(interimTranscript, false);
          }
        };

        this.recognition.onerror = (event: any) => {
          this.onErrorCallback(event.error);
        };
      }
    } else {
      console.error("Web Speech API not supported");
    }
  }

  public setLanguage(lang: string) {
    if (this.recognition) this.recognition.lang = lang;
  }

  public start(onResult: (text: string, isFinal: boolean) => void, onError?: (err: any) => void) {
    this.onResultCallback = onResult;
    if (onError) this.onErrorCallback = onError;

    try {
      if (this.recognition && !this.isListening) {
        this.recognition.start();
        this.isListening = true;
      }
    } catch (e) {
      console.error(e);
    }
  }

  public stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
}