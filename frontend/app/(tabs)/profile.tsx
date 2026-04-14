import { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { apiCall, formatDate } from '../../src/api';
import { COLORS } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  async function handleLogout() {
    await logout();
    router.replace('/(auth)/login');
  }

  return (
    <SafeAreaView style={styles.safe} testID="profile-screen">
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || 'S'}</Text>
          </View>
          <Text style={styles.name}>{user?.name || 'Student'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.verifyRow}>
            <View style={[styles.verifyBadge, user?.phone_verified ? styles.verifiedBg : styles.unverifiedBg]}>
              <Ionicons name={user?.phone_verified ? 'checkmark-circle' : 'close-circle'} size={12} color={user?.phone_verified ? COLORS.success : COLORS.error} />
              <Text style={[styles.verifyText, { color: user?.phone_verified ? COLORS.success : COLORS.error }]}>Phone</Text>
            </View>
            <View style={[styles.verifyBadge, user?.email_verified ? styles.verifiedBg : styles.unverifiedBg]}>
              <Ionicons name={user?.email_verified ? 'checkmark-circle' : 'close-circle'} size={12} color={user?.email_verified ? COLORS.success : COLORS.error} />
              <Text style={[styles.verifyText, { color: user?.email_verified ? COLORS.success : COLORS.error }]}>Email</Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <MenuItem icon="bag-handle" label="My Purchases" onPress={() => setActiveSection(activeSection === 'purchases' ? null : 'purchases')} testID="menu-purchases" />
        {activeSection === 'purchases' && <PurchasesSection />}

        <MenuItem icon="chatbubble-ellipses" label="AI Enquiry Bot" onPress={() => setActiveSection(activeSection === 'chat' ? null : 'chat')} testID="menu-chat" />
        {activeSection === 'chat' && <ChatSection />}

        <MenuItem icon="help-buoy" label="Raise Grievance" onPress={() => setActiveSection(activeSection === 'ticket' ? null : 'ticket')} testID="menu-grievance" />
        {activeSection === 'ticket' && <TicketSection />}

        <MenuItem icon="ticket" label="My Tickets" onPress={() => setActiveSection(activeSection === 'tickets' ? null : 'tickets')} testID="menu-tickets" />
        {activeSection === 'tickets' && <MyTicketsSection />}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} testID="logout-button">
          <Ionicons name="log-out" size={20} color={COLORS.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({ icon, label, onPress, testID }: any) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} testID={testID}>
      <Ionicons name={icon} size={20} color={COLORS.primary} />
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

function PurchasesSection() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useState(() => { apiCall('/api/payments/my').then(d => { setPayments(d.payments || []); setLoading(false); }).catch(() => setLoading(false)); });
  if (loading) return <ActivityIndicator style={{ padding: 20 }} color={COLORS.primary} />;
  if (!payments.length) return <Text style={styles.emptySection}>No purchases yet</Text>;
  return (
    <View style={styles.subSection}>
      {payments.map(p => (
        <View key={p.id} style={styles.purchaseCard}>
          <Text style={styles.purchaseAmount}>₹{(p.amount / 100).toLocaleString()}</Text>
          <Text style={styles.purchaseStatus}>{p.status}</Text>
          <Text style={styles.purchaseDate}>{formatDate(p.created_at)}</Text>
        </View>
      ))}
    </View>
  );
}

function ChatSection() {
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const data = await apiCall('/api/chat', { method: 'POST', body: JSON.stringify({ message: msg, session_id: sessionId }) });
      setMessages(prev => [...prev, { role: 'bot', text: data.response }]);
      setSessionId(data.session_id);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'bot', text: 'Sorry, something went wrong.' }]);
    }
    setLoading(false);
  }

  return (
    <View style={styles.chatSection}>
      <View style={styles.chatMessages}>
        {messages.length === 0 && <Text style={styles.chatHint}>Ask me anything about UPSC preparation, courses, admissions...</Text>}
        {messages.map((m, i) => (
          <View key={i} style={[styles.chatBubble, m.role === 'user' ? styles.userBubble : styles.botBubble]}>
            <Text style={[styles.chatText, m.role === 'user' && { color: '#fff' }]}>{m.text}</Text>
          </View>
        ))}
        {loading && <ActivityIndicator color={COLORS.primary} style={{ margin: 8 }} />}
      </View>
      <View style={styles.chatInputRow}>
        <TextInput testID="chat-input" style={styles.chatInput} placeholder="Type your question..." placeholderTextColor={COLORS.textMuted} value={input} onChangeText={setInput} onSubmitEditing={sendMessage} />
        <TouchableOpacity style={styles.chatSend} onPress={sendMessage} testID="chat-send-btn">
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TicketSection() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('tech');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function submitTicket() {
    if (!subject.trim() || !message.trim()) return;
    setLoading(true);
    try {
      await apiCall('/api/tickets', { method: 'POST', body: JSON.stringify({ subject, message, category }) });
      setSuccess(true);
      setSubject('');
      setMessage('');
    } catch (e) { /* */ }
    setLoading(false);
  }

  if (success) return (
    <View style={styles.subSection}>
      <View style={styles.successBox}>
        <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
        <Text style={styles.successText}>Ticket submitted successfully!</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.subSection}>
      <View style={styles.catRow}>
        {['tech', 'academic'].map(c => (
          <TouchableOpacity key={c} style={[styles.catChip, category === c && styles.catActive]} onPress={() => setCategory(c)} testID={`cat-${c}`}>
            <Text style={[styles.catText, category === c && { color: '#fff' }]}>{c === 'tech' ? 'Technical' : 'Academic'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput testID="ticket-subject" style={styles.ticketInput} placeholder="Subject" placeholderTextColor={COLORS.textMuted} value={subject} onChangeText={setSubject} />
      <TextInput testID="ticket-message" style={[styles.ticketInput, { height: 80, textAlignVertical: 'top' }]} placeholder="Describe your issue..." placeholderTextColor={COLORS.textMuted} value={message} onChangeText={setMessage} multiline />
      <TouchableOpacity style={styles.submitBtn} onPress={submitTicket} disabled={loading} testID="submit-ticket-btn">
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Ticket</Text>}
      </TouchableOpacity>
    </View>
  );
}

function MyTicketsSection() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useState(() => { apiCall('/api/tickets').then(d => { setTickets(d.tickets || []); setLoading(false); }).catch(() => setLoading(false)); });
  if (loading) return <ActivityIndicator style={{ padding: 20 }} color={COLORS.primary} />;
  if (!tickets.length) return <Text style={styles.emptySection}>No tickets raised</Text>;
  return (
    <View style={styles.subSection}>
      {tickets.map(t => (
        <View key={t.id} style={styles.ticketCard}>
          <View style={styles.ticketHeader}>
            <Text style={styles.ticketTitle}>{t.subject}</Text>
            <View style={[styles.statusBadge, t.status === 'open' ? styles.openBadge : styles.closedBadge]}>
              <Text style={[styles.statusText, { color: t.status === 'open' ? COLORS.warning : COLORS.success }]}>{t.status}</Text>
            </View>
          </View>
          <Text style={styles.ticketMsg}>{t.message}</Text>
          {t.responses?.map((r: any, i: number) => (
            <View key={i} style={styles.responseBox}>
              <Text style={styles.responseFrom}>Admin Response:</Text>
              <Text style={styles.responseText}>{r.message}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bgSubtle },
  scroll: { paddingBottom: 40 },
  profileCard: { backgroundColor: COLORS.white, marginHorizontal: 20, marginTop: 16, borderRadius: 16, padding: 24, alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  name: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginTop: 12 },
  email: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  verifyRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  verifyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  verifiedBg: { backgroundColor: COLORS.successBg },
  unverifiedBg: { backgroundColor: COLORS.errorBg },
  verifyText: { fontSize: 11, fontWeight: '600' },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, marginHorizontal: 20, marginTop: 8, padding: 16, borderRadius: 12, gap: 12 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, marginTop: 24, padding: 16, borderRadius: 12, backgroundColor: COLORS.errorBg, gap: 8 },
  logoutText: { fontSize: 15, fontWeight: '700', color: COLORS.error },
  subSection: { marginHorizontal: 20, marginTop: 4, marginBottom: 8 },
  emptySection: { textAlign: 'center', color: COLORS.textMuted, fontSize: 13, padding: 16 },
  purchaseCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.bgSubtle, padding: 12, borderRadius: 8, marginBottom: 6 },
  purchaseAmount: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  purchaseStatus: { fontSize: 12, fontWeight: '600', color: COLORS.success, textTransform: 'capitalize' },
  purchaseDate: { fontSize: 11, color: COLORS.textMuted },
  chatSection: { marginHorizontal: 20, marginTop: 4, marginBottom: 8, backgroundColor: COLORS.white, borderRadius: 12, overflow: 'hidden' },
  chatMessages: { padding: 12, minHeight: 150, maxHeight: 300 },
  chatHint: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', fontStyle: 'italic' },
  chatBubble: { maxWidth: '80%', padding: 10, borderRadius: 12, marginBottom: 6 },
  userBubble: { backgroundColor: COLORS.primary, alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  botBubble: { backgroundColor: COLORS.bgMuted, alignSelf: 'flex-start', borderBottomLeftRadius: 2 },
  chatText: { fontSize: 13, color: COLORS.textPrimary, lineHeight: 18 },
  chatInputRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border, padding: 8, gap: 8 },
  chatInput: { flex: 1, fontSize: 14, backgroundColor: COLORS.bgSubtle, borderRadius: 20, paddingHorizontal: 14, height: 38, color: COLORS.textPrimary },
  chatSend: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  catRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  catChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.bgSubtle, borderWidth: 1, borderColor: COLORS.border },
  catActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  ticketInput: { backgroundColor: COLORS.bgSubtle, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: 14, color: COLORS.textPrimary, marginBottom: 8 },
  submitBtn: { backgroundColor: COLORS.primary, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  successBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.successBg, padding: 14, borderRadius: 10 },
  successText: { fontSize: 14, fontWeight: '600', color: COLORS.success },
  ticketCard: { backgroundColor: COLORS.bgSubtle, borderRadius: 10, padding: 12, marginBottom: 8 },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  openBadge: { backgroundColor: COLORS.warningBg },
  closedBadge: { backgroundColor: COLORS.successBg },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  ticketMsg: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  responseBox: { backgroundColor: COLORS.white, padding: 8, borderRadius: 6, marginTop: 6 },
  responseFrom: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
  responseText: { fontSize: 12, color: COLORS.textPrimary, marginTop: 2 },
});
