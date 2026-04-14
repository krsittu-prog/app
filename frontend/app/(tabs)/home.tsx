import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { apiCall, formatPrice, getCourseTypeBadge } from '../../src/api';
import { COLORS } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CARD_W = width * 0.7;

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [cms, setCms] = useState<any>({});
  const [resumeVideos, setResumeVideos] = useState<any[]>([]);
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [courseRes, cmsRes, resumeRes, liveRes] = await Promise.all([
        apiCall('/api/courses'),
        apiCall('/api/cms'),
        apiCall('/api/videos/resume').catch(() => ({ videos: [] })),
        apiCall('/api/live-classes').catch(() => ({ live_classes: [] })),
      ]);
      setCourses(courseRes.courses || []);
      setCms(cmsRes.content || {});
      setResumeVideos(resumeRes.videos || []);
      setLiveClasses(liveRes.live_classes || []);
    } catch (e) { /* */ }
  }, []);

  useEffect(() => { fetchData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const liveCourses = courses.filter(c => c.type === 'live');
  const recordedCourses = courses.filter(c => c.type === 'recorded');
  const freeCourses = courses.filter(c => c.type === 'free');

  return (
    <SafeAreaView style={styles.safe} testID="student-home-screen">
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'Student'} 👋</Text>
            <Text style={styles.subGreeting}>Continue your UPSC journey</Text>
          </View>
          <Image source={require('../../assets/images/logo.png')} style={styles.headerLogo} resizeMode="contain" />
        </View>

        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>{cms.hero_title || 'GS Pinnacle IAS'}</Text>
            <Text style={styles.bannerDesc}>{cms.hero_subtitle || 'Your Gateway to Civil Services Success'}</Text>
            <TouchableOpacity style={styles.bannerBtn} onPress={() => router.push('/(tabs)/courses')} testID="explore-courses-btn">
              <Text style={styles.bannerBtnText}>Explore Courses</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Classes */}
        {liveClasses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🔴 Upcoming Live Classes</Text>
            </View>
            {liveClasses.filter(lc => lc.status !== 'ended').slice(0, 3).map((lc: any) => (
              <TouchableOpacity key={lc.id} style={styles.liveCard} onPress={() => { if (lc.meeting_url && lc.status === 'live') { const { Linking } = require('react-native'); Linking.openURL(lc.meeting_url); } }} testID={`live-class-${lc.id}`}>
                <View style={[styles.liveIcon, lc.status === 'live' ? styles.liveNow : styles.liveScheduled]}>
                  <Ionicons name={lc.status === 'live' ? 'radio' : 'calendar'} size={20} color={lc.status === 'live' ? '#fff' : COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.liveTitle}>{lc.title}</Text>
                    {lc.status === 'live' && <View style={styles.liveBadge}><Text style={styles.liveBadgeText}>LIVE</Text></View>}
                  </View>
                  <Text style={styles.liveSub}>{lc.course_name}</Text>
                  <Text style={styles.liveTime}>{new Date(lc.scheduled_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
                {lc.status === 'live' && <View style={styles.joinBtn}><Text style={styles.joinBtnText}>Join</Text></View>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Resume Learning */}
        {resumeVideos.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>▶️ Resume Learning</Text>
            </View>
            {resumeVideos.map((rv: any) => (
              <TouchableOpacity
                key={rv.video_id}
                style={styles.resumeCard}
                onPress={() => router.push({ pathname: '/player', params: { courseId: rv.course_id, videoId: rv.video_id, videoUrl: rv.video_url || '', videoTitle: rv.video_title || 'Video', courseName: rv.course_title || '', chatEnabled: 'true' } })}
                testID={`resume-${rv.video_id}`}
              >
                <View style={styles.resumeIcon}>
                  <Ionicons name="play" size={20} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resumeTitle} numberOfLines={1}>{rv.video_title || 'Continue Video'}</Text>
                  <Text style={styles.resumeSub}>{rv.course_title || ''} • {Math.floor(rv.position / 60)}:{String(Math.floor(rv.position % 60)).padStart(2, '0')} watched</Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${Math.min((rv.position / (rv.duration || 1)) * 100, 100)}%` }]} />
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Announcement */}
        {cms.banner_text ? (
          <View style={styles.announce}>
            <Ionicons name="megaphone" size={16} color={COLORS.accent} />
            <Text style={styles.announceText}>{cms.banner_text}</Text>
          </View>
        ) : null}

        {/* Quick Actions */}
        <View style={styles.quickRow}>
          {[
            { icon: 'play-circle', label: 'Live Classes', color: COLORS.live, onPress: () => router.push('/(tabs)/courses') },
            { icon: 'document-text', label: 'Tests', color: COLORS.primary, onPress: () => router.push('/(tabs)/tests') },
            { icon: 'chatbubble-ellipses', label: 'Ask AI', color: COLORS.secondary, onPress: () => router.push('/(tabs)/profile') },
            { icon: 'help-circle', label: 'Support', color: COLORS.warning, onPress: () => router.push('/(tabs)/profile') },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={styles.quickItem} onPress={item.onPress} testID={`quick-action-${item.label}`}>
              <View style={[styles.quickIcon, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={24} color={item.color} />
              </View>
              <Text style={styles.quickLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Live Batches */}
        {liveCourses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🔴 Live Batches</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/courses')} testID="see-all-live">
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {liveCourses.map(course => <CourseCard key={course.id} course={course} onPress={() => router.push(`/course/${course.id}`)} />)}
            </ScrollView>
          </View>
        )}

        {/* Recorded Courses */}
        {recordedCourses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📚 Recorded Courses</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/courses')} testID="see-all-recorded">
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {recordedCourses.map(course => <CourseCard key={course.id} course={course} onPress={() => router.push(`/course/${course.id}`)} />)}
            </ScrollView>
          </View>
        )}

        {/* Free Resources */}
        {freeCourses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🎁 Free Resources</Text>
            </View>
            {freeCourses.map(course => (
              <TouchableOpacity key={course.id} style={styles.freeCard} onPress={() => router.push(`/course/${course.id}`)} testID={`free-course-${course.id}`}>
                <View style={styles.freeIcon}><Ionicons name="gift" size={24} color={COLORS.success} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.freeTitle}>{course.title}</Text>
                  <Text style={styles.freeSub}>{course.students_enrolled || 0} students enrolled</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function CourseCard({ course, onPress }: { course: any; onPress: () => void }) {
  const badge = getCourseTypeBadge(course.type);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85} testID={`course-card-${course.id}`}>
      <View style={[styles.cardThumb, { backgroundColor: course.type === 'live' ? '#FEF2F2' : '#EFF6FF' }]}>
        <Ionicons name={course.type === 'live' ? 'videocam' : 'play-circle'} size={40} color={badge.color} />
      </View>
      <View style={styles.cardBody}>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{course.title}</Text>
        <Text style={styles.cardInstructor}>{course.instructor}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardPrice}>{formatPrice(course.price)}</Text>
          <Text style={styles.cardStudents}>{course.students_enrolled || 0} students</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bgSubtle },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  greeting: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  subGreeting: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  headerLogo: { width: 42, height: 42 },
  banner: { marginHorizontal: 20, borderRadius: 16, overflow: 'hidden', backgroundColor: COLORS.primary, marginBottom: 16 },
  bannerContent: { padding: 20 },
  bannerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  bannerDesc: { fontSize: 13, color: '#E0E7FF', marginTop: 4 },
  bannerBtn: { marginTop: 12, backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, alignSelf: 'flex-start' },
  bannerBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  announce: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: COLORS.warningBg, padding: 12, borderRadius: 10, gap: 8, marginBottom: 16 },
  announceText: { fontSize: 12, color: COLORS.warning, fontWeight: '600', flex: 1 },
  quickRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 12, marginBottom: 20 },
  quickItem: { alignItems: 'center', width: 70 },
  quickIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary, marginTop: 6, textAlign: 'center' },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  seeAll: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  hScroll: { paddingLeft: 20, paddingRight: 10 },
  card: { width: CARD_W, marginRight: 12, borderRadius: 14, backgroundColor: COLORS.white, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardThumb: { height: 100, alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 14 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 6 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 20 },
  cardInstructor: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  cardPrice: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  cardStudents: { fontSize: 11, color: COLORS.textMuted },
  freeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, marginHorizontal: 20, padding: 14, borderRadius: 12, marginBottom: 8, gap: 12 },
  freeIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.freeBg, alignItems: 'center', justifyContent: 'center' },
  freeTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  freeSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  resumeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, marginHorizontal: 20, padding: 14, borderRadius: 12, marginBottom: 8, gap: 12, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  resumeIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  resumeTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  resumeSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  progressBar: { height: 3, backgroundColor: COLORS.border, borderRadius: 2, marginTop: 6, width: '100%' },
  progressFill: { height: 3, backgroundColor: COLORS.primary, borderRadius: 2 },
  liveCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, marginHorizontal: 20, padding: 14, borderRadius: 12, marginBottom: 8, gap: 12, borderLeftWidth: 3, borderLeftColor: COLORS.live },
  liveIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  liveNow: { backgroundColor: COLORS.live },
  liveScheduled: { backgroundColor: '#EFF6FF' },
  liveTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  liveSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  liveTime: { fontSize: 11, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  liveBadge: { backgroundColor: COLORS.live, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  liveBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  joinBtn: { backgroundColor: COLORS.live, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  joinBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
