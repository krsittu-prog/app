import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiCall, formatDate } from '../../src/api';
import { COLORS } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

export default function TestsScreen() {
  const [tab, setTab] = useState<'tests' | 'results'>('tests');
  const [tests, setTests] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [testsRes, subsRes] = await Promise.all([
        apiCall('/api/tests'),
        apiCall('/api/tests/my-submissions'),
      ]);
      setTests(testsRes.tests || []);
      setSubmissions(subsRes.submissions || []);
    } catch (e) { /* */ }
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.safe} testID="tests-screen">
      <Text style={styles.title}>Test Portal</Text>
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, tab === 'tests' && styles.tabActive]} onPress={() => setTab('tests')} testID="tab-tests">
          <Ionicons name="document-text" size={16} color={tab === 'tests' ? COLORS.primary : COLORS.textMuted} />
          <Text style={[styles.tabText, tab === 'tests' && styles.tabTextActive]}>Available Tests</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'results' && styles.tabActive]} onPress={() => setTab('results')} testID="tab-results">
          <Ionicons name="stats-chart" size={16} color={tab === 'results' ? COLORS.primary : COLORS.textMuted} />
          <Text style={[styles.tabText, tab === 'results' && styles.tabTextActive]}>My Results</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : tab === 'tests' ? (
        <FlatList
          data={tests}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card} testID={`test-${item.id}`}>
              <View style={styles.testIcon}><Ionicons name="reader" size={24} color={COLORS.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.testTitle}>{item.title}</Text>
                <Text style={styles.testSub}>{item.submissions_count || 0} submissions • {formatDate(item.created_at)}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No tests available</Text></View>}
        />
      ) : (
        <FlatList
          data={submissions}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card} testID={`submission-${item.id}`}>
              <View style={[styles.testIcon, { backgroundColor: item.status === 'evaluated' ? COLORS.successBg : COLORS.warningBg }]}>
                <Ionicons name={item.status === 'evaluated' ? 'checkmark-circle' : 'time'} size={24} color={item.status === 'evaluated' ? COLORS.success : COLORS.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.testTitle}>Test Submission</Text>
                <Text style={styles.testSub}>
                  {item.status === 'evaluated' ? `Score: ${item.score} • ${item.feedback || ''}` : 'Pending evaluation'}
                </Text>
                <Text style={styles.testDate}>{formatDate(item.submitted_at)}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No submissions yet</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bgSubtle },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, paddingHorizontal: 20, paddingTop: 8 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 16, gap: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, gap: 6 },
  tabActive: { borderColor: COLORS.primary, backgroundColor: '#EFF6FF' },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary },
  list: { padding: 20 },
  card: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 12, padding: 14, marginBottom: 10, gap: 12, alignItems: 'center' },
  testIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  testTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  testSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  testDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },
});
