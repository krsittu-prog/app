import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiCall, formatDate } from '../../src/api';
import { COLORS } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

export default function StudentsScreen() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStudents(); }, []);

  async function fetchStudents() {
    try {
      const data = await apiCall('/api/admin/students');
      setStudents(data.students || []);
    } catch (e) { /* */ }
    setLoading(false);
  }

  if (loading) return <SafeAreaView style={styles.safe}><ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe} testID="admin-students-screen">
      <View style={styles.header}>
        <Text style={styles.title}>Student Registration List</Text>
        <Text style={styles.count}>{students.length} students</Text>
      </View>
      <FlatList
        data={students}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card} testID={`student-${item.id}`}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name?.charAt(0)?.toUpperCase() || 'S'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.detail}>{item.email}</Text>
              <Text style={styles.detail}>+91 {item.phone}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, item.phone_verified ? styles.verifiedBg : styles.unverifiedBg]}>
                  <Text style={[styles.badgeText, { color: item.phone_verified ? COLORS.success : COLORS.error }]}>
                    Phone {item.phone_verified ? '✓' : '✗'}
                  </Text>
                </View>
                <View style={[styles.badge, item.email_verified ? styles.verifiedBg : styles.unverifiedBg]}>
                  <Text style={[styles.badgeText, { color: item.email_verified ? COLORS.success : COLORS.error }]}>
                    Email {item.email_verified ? '✓' : '✗'}
                  </Text>
                </View>
              </View>
              {item.target_courses?.length > 0 && (
                <Text style={styles.targets}>Target: {item.target_courses.join(', ')}</Text>
              )}
              <Text style={styles.date}>Registered: {formatDate(item.created_at)}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No students registered yet</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bgSubtle },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  count: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 12, padding: 14, marginBottom: 8, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  detail: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  verifiedBg: { backgroundColor: COLORS.successBg },
  unverifiedBg: { backgroundColor: COLORS.errorBg },
  badgeText: { fontSize: 10, fontWeight: '700' },
  targets: { fontSize: 11, color: COLORS.primary, marginTop: 4, fontWeight: '600' },
  date: { fontSize: 10, color: COLORS.textMuted, marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },
});
