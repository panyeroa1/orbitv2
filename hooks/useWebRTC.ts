import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Participant } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

// WebRTC Configuration
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ]
};

interface WebRTCHookProps {
  sessionId: string;
  userId: string;
  userName: string;
  localStream: MediaStream | null;
  isHost: boolean;
}

export const useWebRTC = ({ sessionId, userId, userName, localStream, isHost }: WebRTCHookProps) => {
  const [remoteParticipants, setRemoteParticipants] = useState<Participant[]>([]);
  const [streams, setStreams] = useState<Record<string, MediaStream>>({});
  const [notifications, setNotifications] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const userMapRef = useRef<Record<string, any>>({}); // Map ID to User Info

  // Helper to add notification
  const addNotification = useCallback((msg: string) => {
    setNotifications(prev => [...prev, msg]);
    // Auto-clear after 5s
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n !== msg));
    }, 5000);
  }, []);

  // 1. Initialize Signaling (Supabase)
  useEffect(() => {
    if (!sessionId || !userId) return;

    const channel = supabase.channel(`room:${sessionId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat() as any[];
        
        // Update local map of users
        users.forEach(u => {
          if (u.userId !== userId && !userMapRef.current[u.userId]) {
             // New user detected via presence
             if (isHost) addNotification(`${u.userName || 'Guest'} joined the lobby.`);
          }
          userMapRef.current[u.userId] = u;
        });
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        newPresences.forEach((user: any) => {
           if (user.userId !== userId) {
             console.log('User joined:', user.userId);
             // Initiate connection to the new user
             createPeerConnection(user.userId, true); 
           }
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        leftPresences.forEach((user: any) => {
            if (user.userId !== userId) {
                console.log('User left:', user.userId);
                removePeerConnection(user.userId);
                addNotification(`${user.userName || 'Guest'} left.`);
            }
        });
      })
      .on('broadcast', { event: 'signal' }, async ({ payload }) => {
         if (payload.target === userId) {
             handleSignal(payload);
         }
      })
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
         setChatMessages(prev => {
             // Avoid duplicates if using optimisitc updates locally
             if (prev.find(m => m.id === payload.id)) return prev;
             return [...prev, payload];
         });
         // If sidebar is closed, maybe add notification?
         // addNotification(`New message from ${payload.senderName}`);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId, userName, onlineAt: new Date().toISOString() });
        }
      });

    return () => {
      Object.keys(peersRef.current).forEach(id => removePeerConnection(id));
      channel.unsubscribe();
    };
  }, [sessionId, userId, isHost]);

  // 2. Handle Local Stream Changes
  useEffect(() => {
    // If local stream changes (e.g. camera switch), we need to update tracks in all peer connections
    if (localStream) {
        Object.values(peersRef.current).forEach(pc => {
            const senders = pc.getSenders();
            localStream.getTracks().forEach(track => {
                const sender = senders.find(s => s.track?.kind === track.kind);
                if (sender) {
                    sender.replaceTrack(track);
                } else {
                    pc.addTrack(track, localStream);
                }
            });
        });
    }
  }, [localStream]);

  // Core WebRTC Logic
  const createPeerConnection = async (remotePeerId: string, initiator: boolean) => {
    if (peersRef.current[remotePeerId]) return; // Already connected

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peersRef.current[remotePeerId] = pc;

    // Add local tracks
    if (localStream) {
       localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }

    // Handle ICE Candidates
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            channelRef.current?.send({
                type: 'broadcast',
                event: 'signal',
                payload: {
                    type: 'candidate',
                    candidate: event.candidate,
                    sender: userId,
                    target: remotePeerId
                }
            });
        }
    };

    // Handle Remote Stream
    pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        setStreams(prev => ({ ...prev, [remotePeerId]: remoteStream }));
        
        // Update participant list entry to show they have video
        updateRemoteParticipant(remotePeerId, { isVideoOn: true }); 
    };

    // Connection State
    pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            removePeerConnection(remotePeerId);
        }
    };

    if (initiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        channelRef.current?.send({
            type: 'broadcast',
            event: 'signal',
            payload: {
                type: 'offer',
                sdp: offer,
                sender: userId,
                target: remotePeerId
            }
        });
    }

    // Add to participants list
    setRemoteParticipants(prev => {
        if (prev.find(p => p.id === remotePeerId)) return prev;
        return [...prev, {
            id: remotePeerId,
            name: userMapRef.current[remotePeerId]?.userName || 'Guest',
            role: 'guest',
            isMuted: false, 
            isVideoOn: true,
            isSpeaking: false
        }];
    });
  };

  const handleSignal = async (payload: any) => {
      const { sender, type, sdp, candidate } = payload;
      
      // If we don't have a PC yet (e.g. we are the receiver), create it
      if (!peersRef.current[sender]) {
          await createPeerConnection(sender, false);
      }
      
      const pc = peersRef.current[sender];
      if (!pc) return;

      if (type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          channelRef.current?.send({
              type: 'broadcast',
              event: 'signal',
              payload: {
                  type: 'answer',
                  sdp: answer,
                  sender: userId,
                  target: sender
              }
          });
      } else if (type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } else if (type === 'candidate') {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
  };

  const removePeerConnection = (id: string) => {
      const pc = peersRef.current[id];
      if (pc) {
          pc.close();
          delete peersRef.current[id];
      }
      setStreams(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
      });
      setRemoteParticipants(prev => prev.filter(p => p.id !== id));
  };

  const updateRemoteParticipant = (id: string, updates: Partial<Participant>) => {
      setRemoteParticipants(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const sendMessage = async (text: string) => {
      if (!channelRef.current) return;
      
      const msg = {
          id: Date.now().toString(),
          text,
          senderId: userId,
          senderName: userName,
          timestamp: new Date().toISOString()
      };
      
      // Optimistic update
      setChatMessages(prev => [...prev, msg]);

      await channelRef.current.send({
          type: 'broadcast',
          event: 'chat',
          payload: msg
      });
  };

  return { remoteParticipants, streams, notifications, chatMessages, sendMessage };
};