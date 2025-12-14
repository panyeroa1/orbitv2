# Orbits Project Status & Roadmap

> **Reference Document**: Use this file to understand the current state of the application before making changes.

## 1. Current Features (Implemented)

### Core Architecture
- **Framework**: React 18 + Vite + TypeScript.
- **Styling**: TailwindCSS with custom "Space/Neon" theme.
- **AI Integration**: Google Gemini API (`@google/genai`) for Translation, TTS, and Meeting Summaries.
- **Backend**: Supabase (configured for `transcriptions` storage).

### Navigation & Flows
- **Landing Page**: 
  - "New Meeting" (Generates ID/Passcode).
  - "Join Meeting" (Input ID/Passcode).
  - "Schedule Meeting" (Form + Email Invite generation).
- **Device Check (Green Room)**:
  - Camera/Microphone selection.
  - Audio level visualizer.
  - Video preview (mirrored).
  - Virtual Background UI (Presets available, logic mocked).

### Active Meeting Interface
- **Main Stage**:
  - **Speaker View**: Spotlight participant + vertical filmstrip.
  - **Grid View**: Equal-sized tiles for all participants.
  - **Screen Sharing**: Toggleable, takes priority in Spotlight.
- **Sidebar**:
  - **Participants**: 
    - List/Grid toggle view.
    - Mute/Video status indicators.
    - Host controls (Mute, Remove).
  - **Chat**: 
    - Text messaging.
    - File upload (mock upload, generates local URL).
  - **AI Secretary**: 
    - Real-time transcript display.
    - "Generate Summary" using Gemini Flash.
- **Controls**:
  - Bottom Dock: Mute, Video, Screen Share, Captions, Layout Toggle, Leave.
  - Movie-style Captions Overlay (Real-time translation display).

### Audio/Video Logic
- **Local Media**: `navigator.mediaDevices` handling.
- **Screen Share**: `getDisplayMedia` integration.
- **Audio Visualization**: Web Audio API (AnalyserNode) for specific "Orbits" visualizer.
- **TTS**: Text-to-Speech playback using Gemini Audio (PCM decoding).

## 2. Mocked / Simulation (Not Yet Real)
- **Multi-User Connectivity**: 
  - **Current**: No WebRTC/WebSocket connection. "Guests" are static mock data (`MOCK_PARTICIPANTS`).
  - **Needed**: PeerJS, LiveKit, or WebRTC implementation to connect real users.
- **Virtual Background Processing**:
  - **Current**: UI buttons change state, but no actual video segmentation (BodyPix/MediaPipe) happens.
- **Database Persistence**:
  - **Current**: Only writes to `transcriptions`.
  - **Needed**: Save `meetings`, `users`, and `chat_messages` to Supabase.

## 3. To-Do / Roadmap

### Phase 1: Real-Time Communication (Priority)
- [ ] Implement a Signaling Server or use Supabase Realtime for signaling.
- [ ] Integrate WebRTC to replace `MOCK_PARTICIPANTS` with real remote streams.
- [ ] Sync "Mute/Video" state across clients.

### Phase 2: Advanced AI Features
- [ ] **Real-Time AI Avatar**: Connect `LiveVoiceAgent` to the main meeting as a participant ("Orbits AI").
- [ ] **Context-Aware Translation**: Send chat history to Gemini for better translation context.
- [ ] **Background Blur**: Implement `@mediapipe/selfie_segmentation` for the video stream.

### Phase 3: Persistence & Auth
- [ ] **Supabase Auth**: Replace random User IDs with real Email/Password or OAuth.
- [ ] **Meeting History**: Save scheduled meetings and allow re-joining.
- [ ] **Chat History**: Store messages in Supabase `messages` table.

### Phase 4: Polish
- [ ] Mobile responsive layout adjustments (Sidebar drawer).
- [ ] Error boundary handling for API failures.
