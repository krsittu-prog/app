import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Dimensions, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useAuth } from '../src/context/AuthContext';
import { apiCall } from '../src/api';
import { COLORS } from '../src/theme';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const VIDEO_H = width * 0.56;
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5];
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function isUploadedVideo(url: string): boolean {
  return url.startsWith('/api/uploads/') || url.includes('/api/uploads/');
}

export default function PlayerScreen() {
  const params = useLocalSearchParams<{ courseId: string; videoId: string; videoUrl: string; videoTitle: string; courseName: string; chatEnabled: string }>();
  const { courseId, videoId, videoUrl: rawUrl, videoTitle, courseName, chatEnabled: chatEnabledParam } = params;
  const { user } = useAuth();
  const router = useRouter();

  // Resolve uploaded video URLs to full path
  const videoUrl = rawUrl && isUploadedVideo(rawUrl) ? `${BACKEND_URL}${rawUrl}` : rawUrl;
  const chatEnabled = chatEnabledParam !== 'false';
  const [speed, setSpeed] = useState(1);
  const [showSpeeds, setShowSpeeds] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [onlineCount, setOnlineCount] = useState(1);
  const [wsConnected, setWsConnected] = useState(false);
  const [savedPosition, setSavedPosition] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const progressInterval = useRef<any>(null);
  const currentPosition = useRef(0);
  const videoDuration = useRef(0);

  const isYouTube = videoUrl ? (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) : false;
  const ytId = isYouTube && videoUrl ? getYouTubeId(videoUrl) : null;

  useEffect(() => {
    if (videoId) loadVideoProgress();
    if (chatEnabled) { loadChatHistory(); connectWebSocket(); }
    progressInterval.current = setInterval(() => saveProgress(), 10000);
    return () => { if (wsRef.current) { wsRef.current.close(); wsRef.current = null; } if (progressInterval.current) clearInterval(progressInterval.current); saveProgress(); };
  }, [courseId, videoId]);

  async function loadVideoProgress() { try { const d = await apiCall(`/api/videos/${videoId}/progress`); if (d.progress?.position > 0) { setSavedPosition(d.progress.position); currentPosition.current = d.progress.position; videoDuration.current = d.progress.duration || 0; } } catch {} }
  async function saveProgress() { if (!videoId || currentPosition.current <= 0) return; try { await apiCall(`/api/videos/${videoId}/progress`, { method: 'PUT', body: JSON.stringify({ position: currentPosition.current, duration: videoDuration.current || 600 }) }); } catch {} }
  async function loadChatHistory() { try { const d = await apiCall(`/api/courses/${courseId}/chat?limit=50`); setMessages(d.messages || []); } catch {} }

  function connectWebSocket() {
    if (!courseId) return;
    const wsUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    try {
      const ws = new WebSocket(`${wsUrl}/api/ws/chat/${courseId}?name=${encodeURIComponent(user?.name || 'Student')}&user_id=${user?.id || ''}&role=${user?.role || 'student'}`);
      ws.onopen = () => setWsConnected(true);
      ws.onmessage = (e) => { try { const msg = JSON.parse(e.data); if (msg.online_count) setOnlineCount(msg.online_count); setMessages(p => [...p, msg]); setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100); } catch {} };
      ws.onerror = () => setWsConnected(false);
      ws.onclose = () => setWsConnected(false);
      wsRef.current = ws;
    } catch { setWsConnected(false); }
  }

  function sendMessage() {
    if (!chatInput.trim()) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ message: chatInput.trim() }));
    else setMessages(p => [...p, { id: Date.now().toString(), user_name: user?.name || 'You', user_role: user?.role, message: chatInput.trim(), type: 'chat', created_at: new Date().toISOString() }]);
    setChatInput('');
  }

  function changeSpeed(s: number) { setSpeed(s); setShowSpeeds(false); }

  // Build video HTML for WebView (works on native)
  function getVideoHtml(): string {
    if (isYouTube && ytId) {
      // Use optimized YouTube embed parameters for in-app playback
      const params = [
        'autoplay=1',
        'rel=0',
        'modestbranding=1',
        'playsinline=1',
        'fs=1',
        'iv_load_policy=3',
        'controls=1',
        'disablekb=0'
      ].join('&');
      
      const startParam = savedPosition > 0 ? `&start=${Math.floor(savedPosition)}` : '';
      
      return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;background:#000}iframe{width:100%;height:100%;border:none;display:block}</style></head>
<body><iframe src="https://www.youtube.com/embed/${ytId}?${params}${startParam}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write" allowfullscreen></iframe></body></html>`;
    }
    return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0}video{width:100%;height:100vh;background:#000}</style></head>
<body><video id="v" src="${videoUrl}" controls autoplay playsinline></video>
<script>var v=document.getElementById('v');v.playbackRate=${speed};${savedPosition > 0 ? `v.currentTime=${savedPosition};` : ''}
setInterval(function(){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({pos:v.currentTime,dur:v.duration}))},5000);</script></body></html>`;
  }

  const renderMessage = useCallback(({ item }: { item: any }) => {
    if (item.type === 'system') return <View style={st.sysMsg}><Text style={st.sysTxt}>{item.message}</Text></View>;
    const isMe = item.user_id === user?.id;
    const isTeacher = item.user_role === 'teacher' || item.user_role === 'admin';
    return (
      <View style={[st.chatMsg, isMe && st.chatMsgMe]}>
        <View style={st.msgHead}><Text style={[st.msgName, isTeacher && st.teacherName]}>{isTeacher ? '👨‍🏫 ' : ''}{item.user_name}</Text>{isTeacher && <View style={st.teacherBadge}><Text style={st.teacherBadgeTxt}>FACULTY</Text></View>}<Text style={st.msgTime}>{formatTime(item.created_at)}</Text></View>
        <Text style={st.msgTxt}>{item.message}</Text>
      </View>
    );
  }, [user?.id]);

  return (
    <SafeAreaView style={st.safe} testID="player-screen">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => { saveProgress(); router.back(); }} testID="player-back-btn"><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 12 }}><Text style={st.headerTitle} numberOfLines={1}>{videoTitle || 'Video'}</Text><Text style={st.headerSub} numberOfLines={1}>{courseName}</Text></View>
          {chatEnabled && <View style={st.liveInd}><View style={[st.liveDot, wsConnected && st.liveDotOn]} /><Text style={st.liveTxt}>{onlineCount} watching</Text></View>}
        </View>

        <View style={st.videoBox}>
          <WebView
            source={{ html: getVideoHtml() }}
            style={{ flex: 1 }}
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            allowsFullscreenVideo
            userAgent={MOBILE_UA}
            scalesPageToFit
            scrollEnabled={false}
            originWhitelist={['*']}
            mixedContentMode="always"
            onMessage={(e) => { try { const d = JSON.parse(e.nativeEvent.data); currentPosition.current = d.pos; videoDuration.current = d.dur; } catch {} }}
            testID="video-webview"
          />
        </View>

        <View style={st.controls}>
          <TouchableOpacity style={st.speedBtn} onPress={() => setShowSpeeds(!showSpeeds)} testID="speed-toggle"><Ionicons name="speedometer" size={14} color={COLORS.primary} /><Text style={st.speedTxt}>{speed}x</Text></TouchableOpacity>
          {showSpeeds && <View style={st.speedOpts}>{SPEEDS.map(s => (<TouchableOpacity key={s} style={[st.speedChip, speed === s && st.speedChipAct]} onPress={() => changeSpeed(s)} testID={`speed-${s}`}><Text style={[st.speedChipTxt, speed === s && { color: '#fff' }]}>{s}x</Text></TouchableOpacity>))}</View>}
          {savedPosition > 0 && <View style={st.resumeBadge}><Ionicons name="play-forward" size={12} color={COLORS.success} /><Text style={st.resumeTxt}>Resumed from {Math.floor(savedPosition / 60)}:{String(Math.floor(savedPosition % 60)).padStart(2, '0')}</Text></View>}
        </View>

        {chatEnabled ? (
          <View style={st.chatBox}>
            <View style={st.chatHead}><Ionicons name="chatbubbles" size={16} color={COLORS.primary} /><Text style={st.chatTitle}>Live Chat</Text><View style={[st.connBadge, wsConnected ? st.connG : st.connR]}><Text style={[st.connTxt, { color: wsConnected ? COLORS.success : COLORS.error }]}>{wsConnected ? 'Connected' : 'Connecting...'}</Text></View></View>
            <FlatList ref={flatListRef} data={messages} keyExtractor={(item, i) => item.id || String(i)} renderItem={renderMessage} style={st.chatList} contentContainerStyle={st.chatListC} onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })} ListEmptyComponent={<View style={st.emptyChat}><Text style={st.emptyChatTxt}>No messages yet. Say hello! 👋</Text></View>} />
            <View style={st.chatInputRow}><TextInput testID="chat-message-input" style={st.chatInput} value={chatInput} onChangeText={setChatInput} placeholder="Type a message..." placeholderTextColor={COLORS.textMuted} onSubmitEditing={sendMessage} returnKeyType="send" /><TouchableOpacity style={st.sendBtn} onPress={sendMessage} testID="send-chat-btn"><Ionicons name="send" size={18} color="#fff" /></TouchableOpacity></View>
          </View>
        ) : <View style={st.chatOff}><Ionicons name="chatbubbles-outline" size={40} color={COLORS.textMuted} /><Text style={st.chatOffTitle}>Chat Disabled</Text></View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function formatTime(d: string) { try { return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } }

const st = StyleSheet.create({
  safe:{flex:1,backgroundColor:COLORS.white},
  header:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:10,borderBottomWidth:1,borderBottomColor:COLORS.border},
  headerTitle:{fontSize:15,fontWeight:'700',color:COLORS.textPrimary},headerSub:{fontSize:11,color:COLORS.textMuted,marginTop:1},
  liveInd:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:COLORS.bgSubtle,paddingHorizontal:8,paddingVertical:4,borderRadius:12},
  liveDot:{width:6,height:6,borderRadius:3,backgroundColor:COLORS.textMuted},liveDotOn:{backgroundColor:COLORS.live},
  liveTxt:{fontSize:10,fontWeight:'600',color:COLORS.textSecondary},
  videoBox:{width:'100%',height:VIDEO_H,backgroundColor:'#000'},
  controls:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:8,borderBottomWidth:1,borderBottomColor:COLORS.border,flexWrap:'wrap',gap:6},
  speedBtn:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:COLORS.bgSubtle,paddingHorizontal:10,paddingVertical:6,borderRadius:8,borderWidth:1,borderColor:COLORS.border},
  speedTxt:{fontSize:12,fontWeight:'700',color:COLORS.primary},
  speedOpts:{flexDirection:'row',gap:4,flexWrap:'wrap'},
  speedChip:{paddingHorizontal:10,paddingVertical:5,borderRadius:6,backgroundColor:COLORS.bgSubtle,borderWidth:1,borderColor:COLORS.border},
  speedChipAct:{backgroundColor:COLORS.primary,borderColor:COLORS.primary},speedChipTxt:{fontSize:11,fontWeight:'600',color:COLORS.textSecondary},
  resumeBadge:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:COLORS.successBg,paddingHorizontal:8,paddingVertical:4,borderRadius:8},
  resumeTxt:{fontSize:10,fontWeight:'600',color:COLORS.success},
  chatBox:{flex:1,backgroundColor:COLORS.bgSubtle},
  chatHead:{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:16,paddingVertical:10,backgroundColor:COLORS.white,borderBottomWidth:1,borderBottomColor:COLORS.border},
  chatTitle:{fontSize:14,fontWeight:'700',color:COLORS.textPrimary,flex:1},
  connBadge:{paddingHorizontal:8,paddingVertical:2,borderRadius:8},connG:{backgroundColor:COLORS.successBg},connR:{backgroundColor:COLORS.errorBg},
  connTxt:{fontSize:10,fontWeight:'700'},
  chatList:{flex:1},chatListC:{paddingHorizontal:12,paddingVertical:8},
  sysMsg:{alignItems:'center',paddingVertical:4},sysTxt:{fontSize:11,color:COLORS.textMuted,fontStyle:'italic'},
  chatMsg:{backgroundColor:COLORS.white,borderRadius:10,padding:10,marginBottom:6,maxWidth:'90%',alignSelf:'flex-start'},
  chatMsgMe:{alignSelf:'flex-end',backgroundColor:'#EFF6FF'},
  msgHead:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:3},
  msgName:{fontSize:11,fontWeight:'700',color:COLORS.primary},teacherName:{color:COLORS.success},
  teacherBadge:{backgroundColor:COLORS.successBg,paddingHorizontal:4,paddingVertical:1,borderRadius:3},teacherBadgeTxt:{fontSize:8,fontWeight:'800',color:COLORS.success},
  msgTime:{fontSize:9,color:COLORS.textMuted},msgTxt:{fontSize:13,color:COLORS.textPrimary,lineHeight:18},
  emptyChat:{alignItems:'center',paddingTop:40},emptyChatTxt:{fontSize:13,color:COLORS.textMuted},
  chatInputRow:{flexDirection:'row',padding:10,gap:8,backgroundColor:COLORS.white,borderTopWidth:1,borderTopColor:COLORS.border},
  chatInput:{flex:1,fontSize:14,backgroundColor:COLORS.bgSubtle,borderRadius:20,paddingHorizontal:16,height:40,color:COLORS.textPrimary,borderWidth:1,borderColor:COLORS.border},
  sendBtn:{width:40,height:40,borderRadius:20,backgroundColor:COLORS.primary,alignItems:'center',justifyContent:'center'},
  chatOff:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:COLORS.bgSubtle,gap:8},chatOffTitle:{fontSize:16,fontWeight:'700',color:COLORS.textSecondary},
});
