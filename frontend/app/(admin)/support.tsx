import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiCall, formatDate } from '../../src/api';
import { COLORS } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

export default function SupportScreen() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyId, setReplyId] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { fetchTickets(); }, []);

  async function fetchTickets() {
    try {
      const data = await apiCall('/api/tickets');
      setTickets(data.tickets || []);
    } catch (e) { /* */ }
    setLoading(false);
  }

  async function sendReply(ticketId: string, status: string) {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await apiCall(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        body: JSON.stringify({ response: replyText, status }),
      });
      setReplyId('');
      setReplyText('');
      fetchTickets();
    } catch (e) { /* */ }
    setSending(false);
  }

  return (
    <SafeAreaView style={styles.safe} testID="admin-support-screen">
      <View style={styles.header}>
        <Text style={styles.title}>Support & Grievances</Text>
        <Text style={styles.count}>{tickets.filter(t => t.status === 'open').length} open tickets</Text>
      </View>

      {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={tickets}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card} testID={`ticket-${item.id}`}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ticketSubject}>{item.subject}</Text>
                  <Text style={styles.ticketMeta}>{item.user_name} • {item.user_email} • {item.category}</Text>
                </View>
                <View style={[styles.statusBadge, item.status === 'open' ? styles.openBg : styles.closedBg]}>
                  <Text style={[styles.statusText, { color: item.status === 'open' ? COLORS.warning : COLORS.success }]}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.ticketMsg}>{item.message}</Text>
              <Text style={styles.ticketDate}>{formatDate(item.created_at)}</Text>

              {item.responses?.map((r: any, i: number) => (
                <View key={i} style={styles.replyBox}>
                  <Text style={styles.replyFrom}>Admin replied:</Text>
                  <Text style={styles.replyText}>{r.message}</Text>
                </View>
              ))}

              {replyId === item.id ? (
                <View style={styles.replyInputBox}>
                  <TextInput
                    testID="reply-input"
                    style={styles.replyInput}
                    value={replyText}
                    onChangeText={setReplyText}
                    placeholder="Type your response..."
                    placeholderTextColor={COLORS.textMuted}
                    multiline
                  />
                  <View style={styles.replyActions}>
                    <TouchableOpacity style={styles.closeTicketBtn} onPress={() => sendReply(item.id, 'closed')} testID="close-ticket-btn">
                      <Text style={styles.closeTicketText}>Reply & Close</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.replyBtn} onPress={() => sendReply(item.id, 'open')} disabled={sending} testID="reply-ticket-btn">
                      {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.replyBtnText}>Reply</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.respondBtn} onPress={() => { setReplyId(item.id); setReplyText(''); }} testID={`respond-${item.id}`}>
                  <Ionicons name="chatbubble" size={14} color={COLORS.primary} />
                  <Text style={styles.respondText}>Respond</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No tickets</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bgSubtle },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  count: { fontSize: 13, color: COLORS.textMuted },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  ticketSubject: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  ticketMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  openBg: { backgroundColor: COLORS.warningBg },
  closedBg: { backgroundColor: COLORS.successBg },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  ticketMsg: { fontSize: 13, color: COLORS.textSecondary, marginTop: 8, lineHeight: 18 },
  ticketDate: { fontSize: 10, color: COLORS.textMuted, marginTop: 6 },
  replyBox: { backgroundColor: COLORS.bgSubtle, padding: 10, borderRadius: 8, marginTop: 8, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  replyFrom: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
  replyText: { fontSize: 12, color: COLORS.textPrimary, marginTop: 2 },
  respondBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  respondText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  replyInputBox: { marginTop: 8, backgroundColor: COLORS.bgSubtle, borderRadius: 8, padding: 10 },
  replyInput: { fontSize: 13, color: COLORS.textPrimary, minHeight: 60, textAlignVertical: 'top' },
  replyActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  closeTicketBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: COLORS.successBg },
  closeTicketText: { fontSize: 12, fontWeight: '600', color: COLORS.success },
  replyBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6, backgroundColor: COLORS.primary },
  replyBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },
});
