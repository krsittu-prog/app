import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { apiCall, formatDate } from '../../src/api';
import { COLORS } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

export default function TestsScreen() {
  const [tab, setTab] = useState<'tests' | 'results'>('tests');
  const [tests, setTests] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

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

  async function pickAndUploadPdf(testId: string) {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      setUploading(testId);

      // Read file as base64
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1] || '';
          resolve(base64);
        };
        reader.readAsDataURL(blob);
      });
      const base64Data = await base64Promise;

      await apiCall(`/api/tests/${testId}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          answer_url: '',
          answer_pdf_base64: base64Data,
          answer_filename: file.name || 'answer.pdf',
        }),
      });

      Alert.alert('Success', 'Answer sheet uploaded successfully!');
      fetchData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Upload failed');
    } finally {
      setUploading(null);
    }
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
              <TouchableOpacity
                style={[styles.uploadBtn, uploading === item.id && styles.uploadBtnDisabled]}
                onPress={() => pickAndUploadPdf(item.id)}
                disabled={uploading === item.id}
                testID={`upload-btn-${item.id}`}
              >
                {uploading === item.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={14} color="#fff" />
                    <Text style={styles.uploadBtnText}>Upload PDF</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>No tests available</Text></View>}
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
                <View style={styles.submissionHeader}>
                  <Text style={styles.testTitle}>{item.answer_filename || 'Answer Sheet'}</Text>
                  <View style={[styles.statusBadge, item.status === 'evaluated' ? styles.evalBadge : styles.pendBadge]}>
                    <Text style={[styles.statusText, { color: item.status === 'evaluated' ? COLORS.success : COLORS.warning }]}>
                      {item.status === 'evaluated' ? 'Evaluated' : 'Pending'}
                    </Text>
                  </View>
                </View>
                {item.status === 'evaluated' ? (
                  <View style={styles.scoreRow}>
                    <View style={styles.scoreBadge}>
                      <Text style={styles.scoreNum}>{item.score}</Text>
                      <Text style={styles.scoreLabel}>Score</Text>
                    </View>
                    {item.feedback ? <Text style={styles.feedback} numberOfLines={2}>{item.feedback}</Text> : null}
                    {item.evaluator_name ? <Text style={styles.evaluator}>Evaluated by: {item.evaluator_name}</Text> : null}
                  </View>
                ) : (
                  <Text style={styles.pendingText}>Your answer sheet is being reviewed</Text>
                )}
                <Text style={styles.testDate}>{formatDate(item.submitted_at)}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="clipboard-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>No submissions yet</Text><Text style={styles.emptyHint}>Go to Available Tests and upload your answer sheet</Text></View>}
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
  card: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 12, padding: 14, marginBottom: 10, gap: 12, alignItems: 'flex-start' },
  testIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  testTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  testSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  testDate: { fontSize: 10, color: COLORS.textMuted, marginTop: 4 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  uploadBtnDisabled: { opacity: 0.7 },
  uploadBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  submissionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  evalBadge: { backgroundColor: COLORS.successBg },
  pendBadge: { backgroundColor: COLORS.warningBg },
  statusText: { fontSize: 10, fontWeight: '700' },
  scoreRow: { marginTop: 8 },
  scoreBadge: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  scoreNum: { fontSize: 24, fontWeight: '800', color: COLORS.primary },
  scoreLabel: { fontSize: 12, color: COLORS.textMuted },
  feedback: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, fontStyle: 'italic' },
  evaluator: { fontSize: 10, color: COLORS.textMuted, marginTop: 4 },
  pendingText: { fontSize: 12, color: COLORS.warning, marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.textMuted },
  emptyHint: { fontSize: 12, color: COLORS.textMuted },
});
