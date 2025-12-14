import { decodeAudioData } from "./audioUtils";

type QueueItem = {
  pcmData: Uint8Array;
  onStart?: () => void;
  onEnd?: () => void;
};

export class AudioQueue {
  private queue: QueueItem[] = [];
  private isPlaying = false;
  private audioContext: AudioContext;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }

  public enqueue(item: QueueItem) {
    this.queue.push(item);
    this.process();
  }

  private async process() {
    if (this.isPlaying || this.queue.length === 0) return;

    this.isPlaying = true;
    const item = this.queue.shift();

    if (!item) {
      this.isPlaying = false;
      return;
    }

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const audioBuffer = await decodeAudioData(item.pcmData, this.audioContext);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);

      if (item.onStart) item.onStart();

      source.onended = () => {
        if (item.onEnd) item.onEnd();
        // 500ms gap as per spec
        setTimeout(() => {
          this.isPlaying = false;
          this.process();
        }, 500);
      };

      source.start();

    } catch (err) {
      console.error("Audio playback error:", err);
      this.isPlaying = false;
      this.process();
    }
  }

  public clear() {
    this.queue = [];
    this.isPlaying = false;
    // Note: cannot easily stop currently playing buffer without keeping track of source
  }
}
