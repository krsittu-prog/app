import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiCall, formatPrice, getCourseTypeBadge } from '../../src/api';
import { COLORS } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

function openVideo(router: any, course: any, video: any) {
  router.push({
    pathname: '/player',
    params: {
      courseId: course.id,
      videoId: video.id,
      videoUrl: video.url,
      videoTitle: video.title,
      courseName: course.title,
      chatEnabled: course.chat_enabled !== false ? 'true' : 'false',
    },
  });
}

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);

  useEffect(() => { fetchCourse(); checkEnrollment(); }, [id]);

  async function fetchCourse() {
    try {
      const data = await apiCall(`/api/courses/${id}`);
      setCourse(data);
    } catch (e) { /* */ }
    setLoading(false);
  }

  async function checkEnrollment() {
    try {
      const data = await apiCall('/api/enrollments/my');
      const isEnrolled = (data.enrollments || []).some((e: any) => e.course_id === id);
      setEnrolled(isEnrolled);
    } catch (e) { /* */ }
  }

  async function handleEnroll() {
    if (!course) return;
    if (course.price === 0) {
      // Free course - direct enroll
      setEnrolling(true);
      try {
        await apiCall('/api/payments/verify', {
          method: 'POST',
          body: JSON.stringify({ order_id: 'free', payment_id: 'free', signature: 'free', course_id: course.id }),
        });
        setEnrolled(true);
      } catch (e) {
        // For free courses, just mark as enrolled directly
        setEnrolled(true);
      }
      setEnrolling(false);
      return;
    }
    // Paid course - create Razorpay order
    setEnrolling(true);
    try {
      const orderData = await apiCall('/api/payments/create-order', {
        method: 'POST',
        body: JSON.stringify({ course_id: course.id, amount: course.price * 100 }),
      });
      // In a real app, this would open Razorpay checkout
      // For now, show order created message
      alert(`Razorpay Order Created!\n\nOrder ID: ${orderData.order_id}\nAmount: ₹${course.price}\n\nIn production, this will open Razorpay payment gateway.`);
    } catch (e: any) {
      alert(e.message || 'Payment failed');
    }
    setEnrolling(false);
  }

  if (loading) return <SafeAreaView style={styles.safe}><ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} /></SafeAreaView>;
  if (!course) return <SafeAreaView style={styles.safe}><Text style={styles.errorText}>Course not found</Text></SafeAreaView>;

  const badge = getCourseTypeBadge(course.type);

  return (
    <SafeAreaView style={styles.safe} testID="course-detail-screen">
      <ScrollView>
        {/* Header */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} testID="back-button">
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Course Details</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: badge.bg }]}>
          <View style={[styles.heroBadge, { backgroundColor: badge.color }]}>
            <Text style={styles.heroBadgeText}>{badge.label}</Text>
          </View>
          <Ionicons name={course.type === 'live' ? 'videocam' : course.type === 'free' ? 'gift' : 'play-circle'} size={64} color={badge.color} />
        </View>

        <View style={styles.body}>
          <Text style={styles.courseTitle}>{course.title}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="person" size={14} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{course.instructor}</Text>
            <Ionicons name="folder" size={14} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{course.category}</Text>
            <Ionicons name="people" size={14} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{course.students_enrolled || 0}</Text>
          </View>

          <Text style={styles.description}>{course.description}</Text>

          {/* Features */}
          {course.features?.length > 0 && (
            <View style={styles.featuresBox}>
              <Text style={styles.featuresTitle}>What's Included</Text>
              {course.features.map((f: string, i: number) => (
                <View key={i} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Videos */}
          {course.videos?.length > 0 && (
            <View style={styles.videosBox}>
              <Text style={styles.videosTitle}>Course Content ({course.videos.length} videos)</Text>
              {course.videos.map((v: any, i: number) => (
                <TouchableOpacity key={v.id} style={styles.videoRow} onPress={() => openVideo(router, course, v)} testID={`play-video-${v.id}`}>
                  <View style={styles.videoNum}><Ionicons name="play" size={12} color="#fff" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.videoTitle}>{v.title}</Text>
                    {v.duration > 0 && <Text style={styles.videoDuration}>{Math.floor(v.duration / 60)}:{String(v.duration % 60).padStart(2, '0')} min</Text>}
                  </View>
                  <View style={styles.videoStats}>
                    <Ionicons name="play-circle" size={20} color={COLORS.primary} />
                    <Text style={styles.viewCount}>{v.total_views || 0} views</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.priceLabel}>Price</Text>
          <Text style={styles.priceValue}>{formatPrice(course.price)}</Text>
        </View>
        {enrolled ? (
          <View style={styles.enrolledBadge}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
            <Text style={styles.enrolledText}>Enrolled</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.enrollBtn, enrolling && { opacity: 0.7 }]}
            onPress={handleEnroll}
            disabled={enrolling}
            testID="enroll-button"
          >
            {enrolling ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.enrollBtnText}>{course.price === 0 ? 'Enroll Free' : 'Buy Now'}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  topBarTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  hero: { height: 160, alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, borderRadius: 16, marginBottom: 16 },
  heroBadge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  heroBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  body: { paddingHorizontal: 20, paddingBottom: 100 },
  courseTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, lineHeight: 30 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  metaText: { fontSize: 13, color: COLORS.textMuted, marginRight: 8 },
  description: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22, marginTop: 16 },
  featuresBox: { marginTop: 20, backgroundColor: COLORS.bgSubtle, borderRadius: 12, padding: 16 },
  featuresTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  featureText: { fontSize: 14, color: COLORS.textSecondary },
  videosBox: { marginTop: 20 },
  videosTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 },
  videoRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgSubtle, padding: 12, borderRadius: 10, marginBottom: 6, gap: 10 },
  videoNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  videoNumText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  videoTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  videoDuration: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  videoStats: { alignItems: 'flex-end' },
  viewCount: { fontSize: 10, color: COLORS.textMuted },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.white, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  priceLabel: { fontSize: 11, color: COLORS.textMuted },
  priceValue: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  enrollBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  enrollBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  enrolledBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.successBg, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  enrolledText: { color: COLORS.success, fontSize: 15, fontWeight: '700' },
  errorText: { fontSize: 16, color: COLORS.textMuted, textAlign: 'center', marginTop: 40 },
});
