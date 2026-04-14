import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiCall, formatPrice } from '../../src/api';
import { COLORS } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

const TYPES = ['live', 'recorded', 'free'];
const CATEGORIES = ['Prelims', 'Mains', 'Current Affairs', 'History', 'CSAT', 'Optional', 'Interview', 'General'];

export default function ManageCoursesScreen() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [form, setForm] = useState({ title: '', description: '', category: 'Prelims', type: 'live', price: '0', instructor: '', features: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchCourses(); }, []);

  async function fetchCourses() {
    try {
      const data = await apiCall('/api/courses');
      setCourses(data.courses || []);
    } catch (e) { /* */ }
    setLoading(false);
  }

  function openNew() {
    setEditingCourse(null);
    setForm({ title: '', description: '', category: 'Prelims', type: 'live', price: '0', instructor: '', features: '', chat_enabled: true });
    setShowModal(true);
  }

  function openEdit(course: any) {
    setEditingCourse(course);
    setForm({
      title: course.title,
      description: course.description,
      category: course.category,
      type: course.type,
      price: String(course.price),
      instructor: course.instructor || '',
      features: (course.features || []).join(', '),
      chat_enabled: course.chat_enabled !== false,
    });
    setShowModal(true);
  }

  async function saveCourse() {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = {
      title: form.title,
      description: form.description,
      category: form.category,
      type: form.type,
      price: parseFloat(form.price) || 0,
      instructor: form.instructor,
      features: form.features.split(',').map(f => f.trim()).filter(Boolean),
      chat_enabled: form.chat_enabled,
    };
    try {
      if (editingCourse) {
        await apiCall(`/api/courses/${editingCourse.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiCall('/api/courses', { method: 'POST', body: JSON.stringify(payload) });
      }
      setShowModal(false);
      fetchCourses();
    } catch (e) { /* */ }
    setSaving(false);
  }

  async function deleteCourse(id: string) {
    try {
      await apiCall(`/api/courses/${id}`, { method: 'DELETE' });
      fetchCourses();
    } catch (e) { /* */ }
  }

  return (
    <SafeAreaView style={styles.safe} testID="admin-courses-screen">
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Course Management</Text>
          <Text style={styles.count}>{courses.length} courses</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openNew} testID="add-course-btn">
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={courses}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card} testID={`admin-course-${item.id}`}>
              <View style={{ flex: 1 }}>
                <View style={styles.cardHeader}>
                  <View style={[styles.typeBadge, { backgroundColor: item.type === 'live' ? COLORS.liveBg : item.type === 'free' ? COLORS.freeBg : COLORS.recordedBg }]}>
                    <Text style={[styles.typeText, { color: item.type === 'live' ? COLORS.live : item.type === 'free' ? COLORS.free : COLORS.recorded }]}>{item.type.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.price}>{formatPrice(item.price)}</Text>
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSub}>{item.instructor} • {item.category} • {item.students_enrolled || 0} students</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => openEdit(item)} testID={`edit-course-${item.id}`}>
                  <Ionicons name="create" size={20} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteCourse(item.id)} testID={`delete-course-${item.id}`}>
                  <Ionicons name="trash" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingCourse ? 'Edit Course' : 'Add New Course'}</Text>
                <TouchableOpacity onPress={() => setShowModal(false)} testID="close-modal">
                  <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Title</Text>
              <TextInput testID="course-title-input" style={styles.input} value={form.title} onChangeText={v => setForm(p => ({ ...p, title: v }))} placeholder="Course title" placeholderTextColor={COLORS.textMuted} />

              <Text style={styles.label}>Description</Text>
              <TextInput testID="course-desc-input" style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={form.description} onChangeText={v => setForm(p => ({ ...p, description: v }))} placeholder="Course description" placeholderTextColor={COLORS.textMuted} multiline />

              <Text style={styles.label}>Type</Text>
              <View style={styles.chipRow}>
                {TYPES.map(t => (
                  <TouchableOpacity key={t} style={[styles.chip, form.type === t && styles.chipActive]} onPress={() => setForm(p => ({ ...p, type: t }))} testID={`type-${t}`}>
                    <Text style={[styles.chipText, form.type === t && { color: '#fff' }]}>{t.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Category</Text>
              <View style={styles.chipRow}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity key={c} style={[styles.chip, form.category === c && styles.chipActive]} onPress={() => setForm(p => ({ ...p, category: c }))} testID={`cat-${c}`}>
                    <Text style={[styles.chipText, form.category === c && { color: '#fff' }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Price (₹)</Text>
              <TextInput testID="course-price-input" style={styles.input} value={form.price} onChangeText={v => setForm(p => ({ ...p, price: v }))} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textMuted} />

              <Text style={styles.label}>Instructor</Text>
              <TextInput testID="course-instructor-input" style={styles.input} value={form.instructor} onChangeText={v => setForm(p => ({ ...p, instructor: v }))} placeholder="Instructor name" placeholderTextColor={COLORS.textMuted} />

              <Text style={styles.label}>Features (comma separated)</Text>
              <TextInput testID="course-features-input" style={styles.input} value={form.features} onChangeText={v => setForm(p => ({ ...p, features: v }))} placeholder="Feature 1, Feature 2..." placeholderTextColor={COLORS.textMuted} />

              {/* Chat Toggle */}
              <View style={styles.chatToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Live Chat</Text>
                  <Text style={{ fontSize: 11, color: COLORS.textMuted }}>Allow students to chat during videos</Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggleBtn, form.chat_enabled ? styles.toggleOn : styles.toggleOff]}
                  onPress={() => setForm(p => ({ ...p, chat_enabled: !p.chat_enabled }))}
                  testID="chat-toggle"
                >
                  <View style={[styles.toggleKnob, form.chat_enabled ? styles.knobOn : styles.knobOff]} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={saveCourse} disabled={saving} testID="save-course-btn">
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editingCourse ? 'Update Course' : 'Create Course'}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bgSubtle },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  count: { fontSize: 13, color: COLORS.textMuted },
  addBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, alignItems: 'center', gap: 4 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 12, padding: 14, marginBottom: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  typeText: { fontSize: 9, fontWeight: '800' },
  price: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cardSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  cardActions: { justifyContent: 'center', gap: 12, paddingLeft: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary, marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: COLORS.bgSubtle, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: 14, color: COLORS.textPrimary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.bgSubtle, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  saveBtn: { backgroundColor: COLORS.primary, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 20, marginBottom: 20 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  chatToggleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 12 },
  toggleBtn: { width: 50, height: 28, borderRadius: 14, padding: 2, justifyContent: 'center' },
  toggleOn: { backgroundColor: COLORS.primary },
  toggleOff: { backgroundColor: COLORS.border },
  toggleKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  knobOn: { alignSelf: 'flex-end' },
  knobOff: { alignSelf: 'flex-start' },
});
