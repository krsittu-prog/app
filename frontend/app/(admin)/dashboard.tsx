import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, TextInput, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { apiCall } from '../../src/api';
import { COLORS } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<any>({});
  const [refreshing, setRefreshing] = useState(false);
  const [cmsModal, setCmsModal] = useState(false);
  const [cms, setCms] = useState<any>({});
  const [editKey, setEditKey] = useState('');
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [analyticsRes, cmsRes] = await Promise.all([
        apiCall('/api/admin/analytics'),
        apiCall('/api/cms'),
      ]);
      setAnalytics(analyticsRes);
      setCms(cmsRes.content || {});
    } catch (e) { /* */ }
  }, []);

  useEffect(() => { fetchData(); }, []);

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  async function saveCms() {
    setSaving(true);
    try {
      await apiCall(`/api/cms/${editKey}`, { method: 'PUT', body: JSON.stringify({ value: editValue }) });
      setCms((p: any) => ({ ...p, [editKey]: editValue }));
      setEditKey('');
    } catch (e) { /* */ }
    setSaving(false);
  }

  async function handleLogout() {
    await logout();
    router.replace('/(auth)/login');
  }

  const stats = [
    { icon: 'people', label: 'Students', value: analytics.total_students || 0, color: COLORS.primary },
    { icon: 'book', label: 'Courses', value: analytics.total_courses || 0, color: COLORS.secondary },
    { icon: 'card', label: 'Revenue', value: `₹${(analytics.total_revenue || 0).toLocaleString()}`, color: COLORS.success },
    { icon: 'school', label: 'Enrollments', value: analytics.total_enrollments || 0, color: COLORS.accent },
    { icon: 'alert-circle', label: 'Open Tickets', value: analytics.open_tickets || 0, color: COLORS.warning },
    { icon: 'document', label: 'Pending Eval', value: analytics.pending_evaluations || 0, color: COLORS.live },
  ];

  return (
    <SafeAreaView style={styles.safe} testID="admin-dashboard">
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Admin Panel</Text>
            <Text style={styles.subGreeting}>Welcome, {user?.name || 'Admin'}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} testID="admin-logout-btn">
            <Ionicons name="log-out" size={24} color={COLORS.error} />
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map((s, i) => (
            <View key={i} style={styles.statCard} testID={`stat-${s.label}`}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '15' }]}>
                <Ionicons name={s.icon as any} size={20} color={s.color} />
              </View>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* CMS Editor */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Content Management (CMS)</Text>
          <Text style={styles.sectionSub}>Edit any text visible to students</Text>
          {Object.entries(cms).map(([key, value]) => (
            <View key={key} style={styles.cmsRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cmsKey}>{key.replace(/_/g, ' ').toUpperCase()}</Text>
                <Text style={styles.cmsValue} numberOfLines={2}>{value as string}</Text>
              </View>
              <TouchableOpacity onPress={() => { setEditKey(key); setEditValue(value as string); }} testID={`edit-cms-${key}`}>
                <Ionicons name="pencil" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* CMS Edit Inline */}
        {editKey ? (
          <View style={styles.editBox}>
            <Text style={styles.editLabel}>Editing: {editKey.replace(/_/g, ' ')}</Text>
            <TextInput
              testID="cms-edit-input"
              style={styles.editInput}
              value={editValue}
              onChangeText={setEditValue}
              multiline
              placeholder="Enter new value..."
              placeholderTextColor={COLORS.textMuted}
            />
            <View style={styles.editBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditKey('')}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveCms} disabled={saving} testID="save-cms-btn">
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Quick Nav */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            {[
              { icon: 'people', label: 'View Students', nav: '/(admin)/students' },
              { icon: 'add-circle', label: 'Add Course', nav: '/(admin)/manage-courses' },
              { icon: 'chatbubbles', label: 'Support Tickets', nav: '/(admin)/support' },
            ].map((a, i) => (
              <TouchableOpacity key={i} style={styles.actionCard} onPress={() => router.push(a.nav as any)} testID={`action-${a.label}`}>
                <Ionicons name={a.icon as any} size={24} color={COLORS.primary} />
                <Text style={styles.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bgSubtle },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  greeting: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  subGreeting: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8 },
  statCard: { width: '31%', backgroundColor: COLORS.white, borderRadius: 12, padding: 14, alignItems: 'center' },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, fontWeight: '600' },
  section: { marginTop: 20, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  sectionSub: { fontSize: 12, color: COLORS.textMuted, marginBottom: 12 },
  cmsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, padding: 12, borderRadius: 10, marginBottom: 6, gap: 10 },
  cmsKey: { fontSize: 10, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.5 },
  cmsValue: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  editBox: { marginHorizontal: 20, marginTop: 8, backgroundColor: COLORS.white, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.primary },
  editLabel: { fontSize: 12, fontWeight: '700', color: COLORS.primary, marginBottom: 8, textTransform: 'capitalize' },
  editInput: { backgroundColor: COLORS.bgSubtle, borderRadius: 8, padding: 12, fontSize: 14, color: COLORS.textPrimary, minHeight: 60, textAlignVertical: 'top', borderWidth: 1, borderColor: COLORS.border },
  editBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.bgMuted },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.primary },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  actionGrid: { flexDirection: 'row', gap: 10, marginTop: 8 },
  actionCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, padding: 16, alignItems: 'center', gap: 8 },
  actionLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center' },
});
