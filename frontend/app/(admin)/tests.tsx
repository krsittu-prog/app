import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { apiCall, formatDate } from '../../src/api';
import { COLORS } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

export default function AdminTestsScreen() {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<any>({});
  const [loadingSubmissions, setLoadingSubmissions] = useState<string | null>(null);
  const [viewingPdf, setViewingPdf] = useState<{ visible: boolean; submissionId: string; filename: string }>({ visible: false, submissionId: '', filename: '' });
  const [evaluating, setEvaluating] = useState<string | null>(null);
  const [evalScore, setEvalScore] = useState('');
  const [evalFeedback, setEvalFeedback] = useState('');

  useEffect(() => {
    fetchTests();
  }, []);

  async function fetchTests() {
    setLoading(true);
    try {
      const res = await apiCall('/api/tests');
      setTests(res.tests || []);
    } catch (e) {
      console.error('Error fetching tests:', e);
    }
    setLoading(false);
  }

  async function fetchSubmissions(testId: string) {
    if (submissions[testId]) {
      setExpandedTest(expandedTest === testId ? null : testId);
      return;
    }

    setLoadingSubmissions(testId);
    try {
      const res = await apiCall(`/api/tests/${testId}/submissions`);
      setSubmissions((prev: any) => ({ ...prev, [testId]: res.submissions || [] }));
      setExpandedTest(testId);
    } catch (e) {
      Alert.alert('Error', 'Failed to load submissions');
      console.error('Error fetching submissions:', e);
    }
    setLoadingSubmissions(null);
  }

  async function handleEvaluate(submissionId: string) {
    if (!evalScore.trim()) {
      Alert.alert('Error', 'Please enter a score');
      return;
    }

    setEvaluating(submissionId);
    try {
      await apiCall(`/api/tests/submissions/${submissionId}/evaluate`, {
        method: 'PUT',
        body: JSON.stringify({
          score: parseFloat(evalScore),
          feedback: evalFeedback,
          evaluated_url: '',
        }),
      });
      Alert.alert('Success', 'Submission evaluated successfully!');
      setEvalScore('');
      setEvalFeedback('');
      
      // Refresh submissions
      const expanded = expandedTest;
      setExpandedTest(null);
      if (expanded) {
        await fetchSubmissions(expanded);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Evaluation failed');
    }
    setEvaluating(null);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTests();
    setRefreshing(false);
  };

  const getBackendUrl = () => process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  return (
    <SafeAreaView style={styles.safe} testID="admin-tests-screen">
      <View style={styles.header}>
        <Text style={styles.title}>Test Management</Text>
        <Text style={styles.subtitle}>View & Evaluate Student Submissions</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={tests}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          renderItem={({ item }) => (
            <View style={styles.testCard} testID={`admin-test-${item.id}`}>
              <TouchableOpacity
                style={styles.testHeader}
                onPress={() => fetchSubmissions(item.id)}
              >
                <View style={styles.testInfo}>
                  <Text style={styles.testTitle}>{item.title}</Text>
                  <Text style={styles.testMeta}>
                    {item.submissions_count || 0} submissions • Created {formatDate(item.created_at)}
                  </Text>
                </View>
                <Ionicons
                  name={expandedTest === item.id ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={COLORS.primary}
                />
              </TouchableOpacity>

              {loadingSubmissions === item.id ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              ) : expandedTest === item.id && submissions[item.id] ? (
                <View style={styles.submissionsContainer}>
                  {submissions[item.id].length > 0 ? (
                    submissions[item.id].map((sub: any) => (
                      <View key={sub.id} style={styles.submissionItem}>
                        <View style={styles.submissionRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.studentName}>{sub.student_name}</Text>
                            <Text style={styles.studentEmail}>{sub.student_email}</Text>
                            <Text style={styles.submissionDate}>
                              Submitted: {formatDate(sub.submitted_at)}
                            </Text>
                          </View>
                          <View style={[styles.statusBadge, sub.status === 'evaluated' ? styles.evalBadge : styles.pendBadge]}>
                            <Text style={[styles.statusText, { color: sub.status === 'evaluated' ? COLORS.success : COLORS.warning }]}>
                              {sub.status === 'evaluated' ? 'Evaluated' : 'Pending'}
                            </Text>
                          </View>
                        </View>

                        {sub.status === 'evaluated' && (
                          <View style={styles.evaluationResult}>
                            <Text style={styles.scoreLabel}>Score: <Text style={styles.scoreValue}>{sub.score}</Text></Text>
                            {sub.feedback && <Text style={styles.feedbackText}>{sub.feedback}</Text>}
                          </View>
                        )}

                        <View style={styles.actionRow}>
                          <TouchableOpacity
                            style={styles.viewPdfBtn}
                            onPress={() => setViewingPdf({ visible: true, submissionId: sub.id, filename: sub.answer_filename })}
                            testID={`view-pdf-${sub.id}`}
                          >
                            <Ionicons name="document-text" size={14} color="#fff" />
                            <Text style={styles.actionBtnText}>View PDF</Text>
                          </TouchableOpacity>

                          {sub.status !== 'evaluated' && (
                            <TouchableOpacity
                              style={styles.evaluateBtn}
                              onPress={() => setEvaluating(sub.id)}
                              testID={`evaluate-${sub.id}`}
                            >
                              <Ionicons name="checkmark" size={14} color="#fff" />
                              <Text style={styles.actionBtnText}>Evaluate</Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* Evaluate Modal for this submission */}
                        {evaluating === sub.id && (
                          <View style={styles.evaluateForm}>
                            <Text style={styles.formTitle}>Evaluate Submission</Text>
                            <View style={styles.formGroup}>
                              <Text style={styles.label}>Score</Text>
                              <View style={styles.scoreInputRow}>
                                <TextInput
                                  style={[styles.input, { flex: 1 }]}
                                  placeholder="e.g., 95"
                                  placeholderTextColor={COLORS.textMuted}
                                  value={evalScore}
                                  onChangeText={setEvalScore}
                                  keyboardType="decimal-pad"
                                  testID="eval-score-input"
                                />
                                <Text style={styles.scoreMax}>/100</Text>
                              </View>
                            </View>

                            <View style={styles.formGroup}>
                              <Text style={styles.label}>Feedback (optional)</Text>
                              <TextInput
                                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                                placeholder="Enter feedback..."
                                placeholderTextColor={COLORS.textMuted}
                                value={evalFeedback}
                                onChangeText={setEvalFeedback}
                                multiline
                                testID="eval-feedback-input"
                              />
                            </View>

                            <View style={styles.evalButtonRow}>
                              <TouchableOpacity
                                style={[styles.cancelBtn]}
                                onPress={() => {
                                  setEvaluating(null);
                                  setEvalScore('');
                                  setEvalFeedback('');
                                }}
                                testID="cancel-eval-btn"
                              >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.submitEvalBtn]}
                                onPress={() => handleEvaluate(sub.id)}
                                disabled={!evalScore.trim()}
                                testID="submit-eval-btn"
                              >
                                <Text style={styles.submitEvalBtnText}>Submit Evaluation</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>
                    ))
                  ) : (
                    <View style={styles.noSubmissions}>
                      <Ionicons name="document-outline" size={32} color={COLORS.textMuted} />
                      <Text style={styles.noSubmissionsText}>No submissions yet</Text>
                    </View>
                  )}
                </View>
              ) : null}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="book-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No tests available</Text>
            </View>
          }
        />
      )}

      {/* PDF Viewer Modal */}
      <Modal visible={viewingPdf.visible} animationType="slide" testID="pdf-viewer-modal">
        <SafeAreaView style={styles.pdfModalSafe}>
          <View style={styles.pdfHeader}>
            <TouchableOpacity onPress={() => setViewingPdf({ visible: false, submissionId: '', filename: '' })} testID="close-pdf-btn">
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.pdfTitle}>{viewingPdf.filename}</Text>
            <View style={{ width: 24 }} />
          </View>

          {viewingPdf.visible && viewingPdf.submissionId && (
            <WebView
              source={{ uri: `${getBackendUrl()}/api/tests/submissions/${viewingPdf.submissionId}/pdf` }}
              style={{ flex: 1 }}
              javaScriptEnabled
              domStorageEnabled
              testID="pdf-submission-webview"
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

import { TextInput } from 'react-native';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bgSubtle },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  list: { padding: 16 },
  testCard: { backgroundColor: COLORS.white, borderRadius: 12, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  testHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  testInfo: { flex: 1 },
  testTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  testMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  loadingContainer: { padding: 20, alignItems: 'center' },
  submissionsContainer: { padding: 12 },
  submissionItem: { backgroundColor: COLORS.bgSubtle, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  submissionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  studentName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  studentEmail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  submissionDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 3 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  evalBadge: { backgroundColor: COLORS.successBg },
  pendBadge: { backgroundColor: COLORS.warningBg },
  statusText: { fontSize: 11, fontWeight: '600' },
  evaluationResult: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  scoreLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  scoreValue: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  feedbackText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 6, fontStyle: 'italic' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  viewPdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flex: 1, justifyContent: 'center' },
  evaluateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.success, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flex: 1, justifyContent: 'center' },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  evaluateForm: { marginTop: 12, padding: 12, backgroundColor: '#EFF6FF', borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary },
  formTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 },
  formGroup: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6 },
  input: { backgroundColor: COLORS.white, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: COLORS.border, color: COLORS.textPrimary },
  scoreInputRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scoreMax: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  evalButtonRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  cancelBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, alignItems: 'center' },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  submitEvalBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.success, alignItems: 'center' },
  submitEvalBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  noSubmissions: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  noSubmissionsText: { fontSize: 13, color: COLORS.textMuted },
  empty: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.textMuted },
  pdfModalSafe: { flex: 1, backgroundColor: COLORS.white },
  pdfHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pdfTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, flex: 1, textAlign: 'center' },
});
