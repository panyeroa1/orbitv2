import { MediaDevice } from '../types';

export async function getAvailableDevices(): Promise<{ audio: MediaDevice[], video: MediaDevice[] }> {
  // Strategy: Try to get maximum permissions (A+V), then degrade gracefully.
  // This ensures we populate device labels if possible.
  
  try {
    // Attempt 1: Both
    await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  } catch (err) {
    console.warn("Combined permission request failed. Trying individual permissions...", err);
    
    // Attempt 2: Audio Only
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      console.warn("Audio permission denied/failed", e);
    }

    // Attempt 3: Video Only
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
    } catch (e) {
      console.warn("Video permission denied/failed", e);
    }
  }

  try {
    // Even if permissions failed, we can enumerate. Labels might be empty string if denied.
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    const audio = devices
      .filter(d => d.kind === 'audioinput')
      .map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${i + 1} (${d.deviceId.slice(0, 4)}...)`,
        kind: d.kind
      }));
    
    const video = devices
      .filter(d => d.kind === 'videoinput')
      .map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `Camera ${i + 1} (${d.deviceId.slice(0, 4)}...)`,
        kind: d.kind
      }));
    
    return { audio, video };
  } catch (error) {
    console.error("Critical error enumerating devices:", error);
    return { audio: [], video: [] };
  }
}

export async function getStream(audioDeviceId?: string, videoDeviceId?: string): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {};

  // Build constraints based on selection
  if (audioDeviceId) {
    constraints.audio = { deviceId: { exact: audioDeviceId } };
  } else {
    // If no specific ID, verify if we can ask for generic audio
    constraints.audio = true; 
  }

  if (videoDeviceId) {
    constraints.video = { deviceId: { exact: videoDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } };
  } else {
    constraints.video = true;
  }
  
  try {
      return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
      console.error("Error getting stream with exact constraints:", constraints, error);
      
      // Fallback 1: Relax "exact" constraints
      try {
          console.warn("Retrying with loose constraints...");
          const looseConstraints: MediaStreamConstraints = {
             audio: !!constraints.audio,
             video: !!constraints.video
          };
          return await navigator.mediaDevices.getUserMedia(looseConstraints);
      } catch (looseError) {
          // Fallback 2: Try Partial (Audio only or Video only) if the combined failed
          if (constraints.video && constraints.audio) {
              try {
                  console.warn("Retrying video only...");
                  return await navigator.mediaDevices.getUserMedia({ video: true });
              } catch(e) {
                  console.warn("Retrying audio only...");
                  return await navigator.mediaDevices.getUserMedia({ audio: true });
              }
          }
          throw error; // Give up
      }
  }
}
