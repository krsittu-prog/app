import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Dimensions, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { apiCall } from '../src/api';
import { COLORS } from '../src/theme';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const VIDEO_H = width * 0.56;
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5];
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export default function PlayerScreen() {
  const params = useLocalSearchParams<{ courseId: string; videoId: string; videoUrl: string; videoTitle: string; courseName: string; chatEnabled: string }>();
  const { courseId, videoId, videoUrl, videoTitle, courseName, chatEnabled: chatEnabledParam } = params;
  const { user } = useAuth();
  const router = useRouter();

  const chatEnabled = chatEnabledParam !== 'false';
  const [speed, setSpeed] = useState(1);
  const [showSpeeds, setShowSpeeds] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [onlineCount, setOnlineCount] = useState(1);
  const [wsConnected, setWsConnected] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [savedPosition, setSavedPosition] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const webViewRef = useRef<any>(null);
  const progressInterval = useRef<any>(null);
  const currentPosition = useRef(0);
  const videoDuration = useRef(0);

  const isYouTube = videoUrl ? (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) : false;
  const ytId = isYouTube && videoUrl ? getYouTubeId(videoUrl) : null;

  // Load saved progress
  useEffect(() => {
    if (videoId) loadVideoProgress();
    if (chatEnabled) {
      loadChatHistory();
      connectWebSocket();
    }
    // Save progress every 10 seconds
    progressInterval.current = setInterval(() => saveProgress(), 10000);
    return () => {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      if (progressInterval.current) clearInterval(progressInterval.current);
      saveProgress(); // Save on unmount
    };
  }, [courseId, videoId]);

  async function loadVideoProgress() {
    try {
      const data = await apiCall(`/api/videos/${videoId}/progress`);
      if (data.progress && data.progress.position > 0) {
        setSavedPosition(data.progress.position);
        currentPosition.current = data.progress.position;
        videoDuration.current = data.progress.duration || 0;
      }
    } catch (e) { /* */ }
  }

  async function saveProgress() {
    if (!videoId || currentPosition.current <= 0) return;
    try {
      await apiCall(`/api/videos/${videoId}/progress`, {
        method: 'PUT',
        body: JSON.stringify({ position: currentPosition.current, duration: videoDuration.current || 600 }),
      });
    } catch (e) { /* */ }
  }

  async function loadChatHistory() {
    try {
      const data = await apiCall(`/api/courses/${courseId}/chat?limit=50`);
      setMessages(data.messages || []);
    } catch (e) { /* */ }
  }

  function connectWebSocket() {
    if (!courseId) return;
    const wsUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    const fullUrl = `${wsUrl}/api/ws/chat/${courseId}?name=${encodeURIComponent(user?.name || 'Student')}&user_id=${user?.id || ''}&role=${user?.role || 'student'}`;
    try {
      const ws = new WebSocket(fullUrl);
      ws.onopen = () => setWsConnected(true);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.online_count) setOnlineCount(msg.online_count);
          setMessages(prev => [...prev, msg]);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (e) { /* */ }
      };
      ws.onerror = () => setWsConnected(false);
      ws.onclose = () => setWsConnected(false);
      wsRef.current = ws;
    } catch (e) { setWsConnected(false); }
  }

  function sendMessage() {
    if (!chatInput.trim()) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ message: chatInput.trim() }));
    } else {
      setMessages(prev => [...prev, { id: Date.now().toString(), user_name: user?.name || 'You', user_role: user?.role || 'student', message: chatInput.trim(), type: 'chat', created_at: new Date().toISOString() }]);
    }
    setChatInput('');
  }

  function changeSpeed(s: number) {
    setSpeed(s);
    setShowSpeeds(false);
    if (Platform.OS === 'web') {
      try {
        const vid = document.querySelector('video');
        if (vid) (vid as HTMLVideoElement).playbackRate = s;
        const iframe = document.querySelector('iframe');
        if (iframe) iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'setPlaybackRate', args: [s] }), '*');
      } catch (e) { /* */ }
    } else if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`document.querySelector('video').playbackRate = ${s}; true;`);
    }
  }

  // Picture-in-Picture
  function togglePip() {
    if (Platform.OS === 'web') {
      try {
        const vid = document.querySelector('video');
        if (vid) {
          if (document.pictureInPictureElement) {
            (document as any).exitPictureInPicture();
            setIsPip(false);
          } else {
            (vid as any).requestPictureInPicture();
            setIsPip(true);
          }
        }
      } catch (e) { /* PiP not supported */ }
    }
  }

  // Track progress from web video
  useEffect(() => {
    if (Platform.OS === 'web' && !isYouTube) {
      const interval = setInterval(() => {
        try {
          const vid = document.querySelector('video');
          if (vid) {
            currentPosition.current = (vid as HTMLVideoElement).currentTime;
            videoDuration.current = (vid as HTMLVideoElement).duration || 600;
          }
        } catch (e) { /* */ }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isYouTube]);

  // Seek to saved position
  useEffect(() => {
    if (savedPosition > 0 && Platform.OS === 'web' && !isYouTube) {
      const timeout = setTimeout(() => {
        try {
          const vid = document.querySelector('video');
          if (vid) (vid as HTMLVideoElement).currentTime = savedPosition;
        } catch (e) { /* */ }
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [savedPosition, isYouTube]);

  const renderMessage = useCallback(({ item }: { item: any }) => {
    if (item.type === 'system') {
      return <View style={styles.systemMsg}><Text style={styles.systemText}>{item.message}</Text></View>;
    }
    const isMe = item.user_id === user?.id;
    const isTeacher = item.user_role === 'teacher' || item.user_role === 'admin';
    return (
      <View style={[styles.chatMsg, isMe && styles.chatMsgMe]} testID={`chat-msg-${item.id}`}>
        <View style={styles.msgHeader}>
          <Text style={[styles.msgName, isTeacher && styles.teacherName]}>{isTeacher ? '👨‍🏫 ' : ''}{item.user_name || 'Student'}</Text>
          {isTeacher && <View style={styles.teacherBadge}><Text style={styles.teacherBadgeText}>FACULTY</Text></View>}
          <Text style={styles.msgTime}>{formatTime(item.created_at)}</Text>
        </View>
        <Text style={styles.msgText}>{item.message}</Text>
      </View>
    );
  }, [user?.id]);

  return (
    <SafeAreaView style={styles.safe} testID="player-screen">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { saveProgress(); router.back(); }} testID="player-back-btn">
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{videoTitle || 'Video Player'}</Text>
            <Text style={styles.headerSub} numberOfLines={1}>{courseName || ''}</Text>
          </View>
          {chatEnabled && (
            <View style={styles.liveIndicator}>
              <View style={[styles.liveDot, wsConnected && styles.liveDotActive]} />
              <Text style={styles.liveText}>{onlineCount} watching</Text>
            </View>
          )}
        </View>

        {/* Video Player */}
        <View style={styles.videoContainer}>
          {isYouTube && ytId ? (
            Platform.OS === 'web' ? (
              <iframe
                src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1&playsinline=1${savedPosition > 0 ? `&start=${Math.floor(savedPosition)}` : ''}`}
                style={{ width: '100%', height: '100%', border: 'none' } as any}
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
              />
            ) : (
              (() => { const { WebView } = require('react-native-webview'); return (
                <WebView ref={webViewRef} source={{ uri: `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&playsinline=1${savedPosition > 0 ? `&start=${Math.floor(savedPosition)}` : ''}` }} style={styles.video} allowsFullscreenVideo mediaPlaybackRequiresUserAction={false} javaScriptEnabled testID="youtube-player" />
              ); })()
            )
          ) : videoUrl ? (
            Platform.OS === 'web' ? (
              <video
                src={videoUrl as string}
                controls
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', backgroundColor: '#000' } as any}
              />
            ) : (
              (() => { const { WebView } = require('react-native-webview'); return (
                <WebView ref={webViewRef} source={{ html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0}video{width:100%;height:100%;background:#000}</style></head><body><video id="v" src="${videoUrl}" controls autoplay playsinline></video><script>var v=document.getElementById('v');v.playbackRate=${speed};${savedPosition > 0 ? `v.currentTime=${savedPosition};` : ''}setInterval(function(){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({pos:v.currentTime,dur:v.duration}))},5000);</script></body></html>` }} style={styles.video} allowsFullscreenVideo mediaPlaybackRequiresUserAction={false} javaScriptEnabled onMessage={(e: any) => { try { const d = JSON.parse(e.nativeEvent.data); currentPosition.current = d.pos; videoDuration.current = d.dur; } catch {} }} testID="direct-player" />
              ); })()
            )
          ) : (
            <View style={[styles.video, styles.noVideo]}>
              <Ionicons name="videocam-off" size={48} color={COLORS.textMuted} />
              <Text style={styles.noVideoText}>No video available</Text>
            </View>
          )}
        </View>

        {/* Controls Row */}
        <View style={styles.controlsRow}>
          {/* Speed */}
          <TouchableOpacity style={styles.speedBtn} onPress={() => setShowSpeeds(!showSpeeds)} testID="speed-toggle">
            <Ionicons name="speedometer" size={14} color={COLORS.primary} />
            <Text style={styles.speedText}>{speed}x</Text>
          </TouchableOpacity>
          {showSpeeds && (
            <View style={styles.speedOptions}>
              {SPEEDS.map(s => (
                <TouchableOpacity key={s} style={[styles.speedChip, speed === s && styles.speedChipActive]} onPress={() => changeSpeed(s)} testID={`speed-${s}`}>
                  <Text style={[styles.speedChipText, speed === s && { color: '#fff' }]}>{s}x</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {/* PiP button */}
          {Platform.OS === 'web' && !isYouTube && (
            <TouchableOpacity style={[styles.speedBtn, isPip && styles.pipActive]} onPress={togglePip} testID="pip-toggle">
              <Ionicons name="resize" size={14} color={isPip ? '#fff' : COLORS.primary} />
              <Text style={[styles.speedText, isPip && { color: '#fff' }]}>PiP</Text>
            </TouchableOpacity>
          )}
          {/* Resume indicator */}
          {savedPosition > 0 && (
            <View style={styles.resumeBadge}>
              <Ionicons name="play-forward" size={12} color={COLORS.success} />
              <Text style={styles.resumeText}>Resumed from {formatDuration(savedPosition)}</Text>
            </View>
          )}
        </View>

        {/* Live Chat or Chat Disabled */}
        {chatEnabled ? (
          <View style={styles.chatContainer}>
            <View style={styles.chatHeader}>
              <Ionicons name="chatbubbles" size={16} color={COLORS.primary} />
              <Text style={styles.chatTitle}>Live Chat</Text>
              <View style={[styles.connBadge, wsConnected ? styles.connGreen : styles.connRed]}>
                <Text style={[styles.connText, { color: wsConnected ? COLORS.success : COLORS.error }]}>
                  {wsConnected ? 'Connected' : 'Connecting...'}
                </Text>
              </View>
            </View>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item, i) => item.id || String(i)}
              renderItem={renderMessage}
              style={styles.chatList}
              contentContainerStyle={styles.chatListContent}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <View style={styles.emptyChat}>
                  <Ionicons name="chatbubble-outline" size={32} color={COLORS.textMuted} />
                  <Text style={styles.emptyChatText}>No messages yet. Say hello! 👋</Text>
                </View>
              }
            />
            <View style={styles.chatInputRow}>
              <TextInput testID="chat-message-input" style={styles.chatInput} value={chatInput} onChangeText={setChatInput} placeholder="Type a message..." placeholderTextColor={COLORS.textMuted} onSubmitEditing={sendMessage} returnKeyType="send" />
              <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} testID="send-chat-btn">
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.chatDisabled} testID="chat-disabled">
            <Ionicons name="chatbubbles-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.chatDisabledTitle}>Chat is Disabled</Text>
            <Text style={styles.chatDisabledText}>The admin has disabled live chat for this course</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function formatTime(dateStr: string): string {
  try { return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  headerSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.bgSubtle, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.textMuted },
  liveDotActive: { backgroundColor: COLORS.live },
  liveText: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary },
  videoContainer: { width: '100%', height: VIDEO_H, backgroundColor: '#000' },
  video: { flex: 1 },
  noVideo: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  noVideoText: { color: COLORS.textMuted, fontSize: 14 },
  controlsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexWrap: 'wrap', gap: 6 },
  speedBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.bgSubtle, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  speedText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  speedOptions: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  speedChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: COLORS.bgSubtle, borderWidth: 1, borderColor: COLORS.border },
  speedChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  speedChipText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  pipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  resumeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.successBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  resumeText: { fontSize: 10, fontWeight: '600', color: COLORS.success },
  chatContainer: { flex: 1, backgroundColor: COLORS.bgSubtle },
  chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  chatTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  connBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  connGreen: { backgroundColor: COLORS.successBg },
  connRed: { backgroundColor: COLORS.errorBg },
  connText: { fontSize: 10, fontWeight: '700' },
  chatList: { flex: 1 },
  chatListContent: { paddingHorizontal: 12, paddingVertical: 8 },
  systemMsg: { alignItems: 'center', paddingVertical: 4 },
  systemText: { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic' },
  chatMsg: { backgroundColor: COLORS.white, borderRadius: 10, padding: 10, marginBottom: 6, maxWidth: '90%', alignSelf: 'flex-start' },
  chatMsgMe: { alignSelf: 'flex-end', backgroundColor: '#EFF6FF' },
  msgHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  msgName: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  teacherName: { color: COLORS.success },
  teacherBadge: { backgroundColor: COLORS.successBg, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 },
  teacherBadgeText: { fontSize: 8, fontWeight: '800', color: COLORS.success },
  msgTime: { fontSize: 9, color: COLORS.textMuted },
  msgText: { fontSize: 13, color: COLORS.textPrimary, lineHeight: 18 },
  emptyChat: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyChatText: { fontSize: 13, color: COLORS.textMuted },
  chatInputRow: { flexDirection: 'row', padding: 10, gap: 8, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border },
  chatInput: { flex: 1, fontSize: 14, backgroundColor: COLORS.bgSubtle, borderRadius: 20, paddingHorizontal: 16, height: 40, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  chatDisabled: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bgSubtle, gap: 8 },
  chatDisabledTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary },
  chatDisabledText: { fontSize: 13, color: COLORS.textMuted },
});
