import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { apiCall, formatPrice, getCourseTypeBadge } from '../../src/api';
import { COLORS } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

const FILTERS = ['All', 'Live', 'Recorded', 'Free'];

export default function CoursesScreen() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchCourses(); }, [filter]);

  async function fetchCourses() {
    try {
      const params = filter !== 'All' ? `?type=${filter.toLowerCase()}` : '';
      const data = await apiCall(`/api/courses${params}`);
      setCourses(data.courses || []);
    } catch (e) { /* */ }
  }

  const filtered = search ? courses.filter(c => c.title.toLowerCase().includes(search.toLowerCase())) : courses;

  return (
    <SafeAreaView style={styles.safe} testID="courses-screen">
      <View style={styles.header}>
        <Text style={styles.title}>Explore Courses</Text>
      </View>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} />
        <TextInput testID="course-search-input" style={styles.searchInput} placeholder="Search courses..." placeholderTextColor={COLORS.textMuted} value={search} onChangeText={setSearch} />
      </View>
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterActive]} onPress={() => setFilter(f)} testID={`filter-${f}`}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const badge = getCourseTypeBadge(item.type);
          return (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/course/${item.id}`)} testID={`course-list-${item.id}`}>
              <View style={[styles.cardIcon, { backgroundColor: badge.bg }]}>
                <Ionicons name={item.type === 'live' ? 'videocam' : item.type === 'free' ? 'gift' : 'play-circle'} size={28} color={badge.color} />
              </View>
              <View style={styles.cardBody}>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                </View>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.cardSub}>{item.instructor} • {item.category}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>
                  <Text style={styles.cardStudents}>{item.students_enrolled || 0} enrolled</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No courses found</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bgSubtle },
  header: { paddingHorizontal: 20, paddingTop: 8 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 12, backgroundColor: COLORS.white, borderRadius: 12, paddingHorizontal: 14, height: 44, gap: 8, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 12, marginBottom: 8, gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  filterActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 14, padding: 14, marginTop: 10, gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  cardIcon: { width: 60, height: 60, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4 },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cardSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  cardPrice: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  cardStudents: { fontSize: 11, color: COLORS.textMuted },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },
});
