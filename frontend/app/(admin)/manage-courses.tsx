import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
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
  const [form, setForm] = useState({ title: '', description: '', category: 'Prelims', type: 'live', price: '0', instructor: '', features: '', chat_enabled: true });
  const [saving, setSaving] = useState(false);
  const [contentCourse, setContentCourse] = useState<any>(null);
  const [showContent, setShowContent] = useState(false);
  const [sections, setSections] = useState<any[]>([]);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [addingSec, setAddingSec] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [videoForm, setVideoForm] = useState({ title: '', url: '', duration: '0' });
  const [pdfTitle, setPdfTitle] = useState('');
  const [addingVideo, setAddingVideo] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  useEffect(() => { fetchCourses(); }, []);
  async function fetchCourses() { try { const d = await apiCall('/api/courses'); setCourses(d.courses || []); } catch {} setLoading(false); }

  function openNew() { setEditingCourse(null); setForm({ title: '', description: '', category: 'Prelims', type: 'live', price: '0', instructor: '', features: '', chat_enabled: true }); setShowModal(true); }
  function openEdit(c: any) { setEditingCourse(c); setForm({ title: c.title, description: c.description, category: c.category, type: c.type, price: String(c.price), instructor: c.instructor||'', features: (c.features||[]).join(', '), chat_enabled: c.chat_enabled !== false }); setShowModal(true); }

  async function saveCourse() {
    if (!form.title.trim()) return; setSaving(true);
    const p = { title: form.title, description: form.description, category: form.category, type: form.type, price: parseFloat(form.price)||0, instructor: form.instructor, features: form.features.split(',').map(f=>f.trim()).filter(Boolean), chat_enabled: form.chat_enabled };
    try { if (editingCourse) await apiCall(`/api/courses/${editingCourse.id}`, { method: 'PUT', body: JSON.stringify(p) }); else await apiCall('/api/courses', { method: 'POST', body: JSON.stringify(p) }); setShowModal(false); fetchCourses(); } catch {} setSaving(false);
  }
  async function deleteCourse(id: string) { try { await apiCall(`/api/courses/${id}`, { method: 'DELETE' }); fetchCourses(); } catch {} }

  // Content Management
  async function openContent(c: any) { setContentCourse(c); setShowContent(true); setActiveSectionId(null); await fetchSections(c.id); }
  async function fetchSections(courseId: string) { try { const d = await apiCall(`/api/courses/${courseId}/sections`); setSections(d.sections || []); } catch {} }

  async function addSection() {
    if (!newSectionTitle.trim() || !contentCourse) return; setAddingSec(true);
    try { await apiCall(`/api/courses/${contentCourse.id}/sections`, { method: 'POST', body: JSON.stringify({ title: newSectionTitle, order: sections.length, is_locked: false }) }); setNewSectionTitle(''); await fetchSections(contentCourse.id); } catch {} setAddingSec(false);
  }
  async function toggleLock(sec: any) {
    try { await apiCall(`/api/sections/${sec.id}`, { method: 'PUT', body: JSON.stringify({ is_locked: !sec.is_locked }) }); await fetchSections(contentCourse.id); } catch {}
  }
  async function deleteSection(secId: string) {
    try { await apiCall(`/api/sections/${secId}`, { method: 'DELETE' }); await fetchSections(contentCourse.id); } catch {}
  }
  async function addVideo() {
    if (!videoForm.title.trim() || !videoForm.url.trim() || !activeSectionId) { Alert.alert('Error', 'Enter video title and URL'); return; }
    setAddingVideo(true);
    try { await apiCall(`/api/courses/${contentCourse.id}/videos`, { method: 'POST', body: JSON.stringify({ title: videoForm.title, url: videoForm.url, duration: parseInt(videoForm.duration)||0, order: 0, section_id: activeSectionId }) }); setVideoForm({ title: '', url: '', duration: '0' }); await fetchSections(contentCourse.id); } catch {} setAddingVideo(false);
  }

  async function uploadVideoFile() {
    if (!activeSectionId) { Alert.alert('Error', 'Select a section first'); return; }
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: 'video/*', copyToCacheDirectory: true });
      if (r.canceled || !r.assets?.length) return;
      setAddingVideo(true);
      const f = r.assets[0];
      const formData = new FormData();
      formData.append('file', { uri: f.uri, name: f.name || 'video.mp4', type: f.mimeType || 'video/mp4' } as any);
      formData.append('title', f.name || 'Uploaded Video');
      formData.append('section_id', activeSectionId);
      formData.append('course_id', contentCourse.id);
      const token = await (await import('@react-native-async-storage/async-storage')).default.getItem('token');
      const BURL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
      const resp = await fetch(`${BURL}/api/upload/video`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (!resp.ok) throw new Error('Upload failed');
      await fetchSections(contentCourse.id);
      Alert.alert('Success', 'Video uploaded!');
    } catch (e: any) { Alert.alert('Error', e.message || 'Upload failed'); }
    finally { setAddingVideo(false); }
  }
  async function deleteVideo(vId: string) { try { await apiCall(`/api/videos/${vId}`, { method: 'DELETE' }); await fetchSections(contentCourse.id); } catch {} }
  async function pickPdf() {
    if (!pdfTitle.trim() || !activeSectionId) { Alert.alert('Error', 'Enter PDF title first'); return; }
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
      if (r.canceled || !r.assets?.length) return;
      setUploadingPdf(true);
      const f = r.assets[0]; const res = await fetch(f.uri); const blob = await res.blob();
      const reader = new FileReader();
      const b64 = await new Promise<string>(resolve => { reader.onloadend = () => resolve((reader.result as string).split(',')[1]||''); reader.readAsDataURL(blob); });
      await apiCall(`/api/courses/${contentCourse.id}/materials`, { method: 'POST', body: JSON.stringify({ title: pdfTitle, file_data: b64, filename: f.name||'file.pdf', section_id: activeSectionId }) });
      setPdfTitle(''); await fetchSections(contentCourse.id); Alert.alert('Success', 'PDF uploaded!');
    } catch (e: any) { Alert.alert('Error', e.message||'Upload failed'); } finally { setUploadingPdf(false); }
  }
  async function deleteMaterial(mId: string) { try { await apiCall(`/api/materials/${mId}`, { method: 'DELETE' }); await fetchSections(contentCourse.id); } catch {} }

  return (
    <SafeAreaView style={st.safe} testID="admin-courses-screen">
      <View style={st.header}>
        <View><Text style={st.title}>Course Management</Text><Text style={st.count}>{courses.length} courses</Text></View>
        <TouchableOpacity style={st.addBtn} onPress={openNew} testID="add-course-btn"><Ionicons name="add" size={20} color="#fff" /><Text style={st.addBtnText}>Add</Text></TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} /> : (
        <FlatList data={courses} keyExtractor={i=>i.id} contentContainerStyle={st.list} renderItem={({ item }) => (
          <View style={st.card} testID={`admin-course-${item.id}`}>
            <View style={{ flex: 1 }}>
              <View style={st.cardHead}><View style={[st.typeBadge, { backgroundColor: item.type==='live'?COLORS.liveBg:item.type==='free'?COLORS.freeBg:COLORS.recordedBg }]}><Text style={[st.typeText, { color: item.type==='live'?COLORS.live:item.type==='free'?COLORS.free:COLORS.recorded }]}>{item.type.toUpperCase()}</Text></View><Text style={st.price}>{formatPrice(item.price)}</Text></View>
              <Text style={st.cardTitle}>{item.title}</Text>
              <Text style={st.cardSub}>{item.instructor} • {item.category} • {item.students_enrolled||0} students</Text>
              <TouchableOpacity style={st.contentBtn} onPress={() => openContent(item)} testID={`manage-content-${item.id}`}>
                <Ionicons name="folder-open" size={14} color={COLORS.primary} /><Text style={st.contentBtnText}>Manage Sections & Content</Text>
              </TouchableOpacity>
            </View>
            <View style={st.cardActions}>
              <TouchableOpacity onPress={() => openEdit(item)} testID={`edit-course-${item.id}`}><Ionicons name="create" size={20} color={COLORS.primary} /></TouchableOpacity>
              <TouchableOpacity onPress={() => deleteCourse(item.id)} testID={`delete-course-${item.id}`}><Ionicons name="trash" size={20} color={COLORS.error} /></TouchableOpacity>
            </View>
          </View>
        )} />
      )}

      {/* Course Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={st.mOverlay}><View style={st.mContent}><ScrollView>
          <View style={st.mHeader}><Text style={st.mTitle}>{editingCourse?'Edit Course':'Add New Course'}</Text><TouchableOpacity onPress={() => setShowModal(false)} testID="close-modal"><Ionicons name="close" size={24} color={COLORS.textPrimary} /></TouchableOpacity></View>
          <Text style={st.label}>Title</Text><TextInput testID="course-title-input" style={st.input} value={form.title} onChangeText={v=>setForm(p=>({...p,title:v}))} placeholder="Course title" placeholderTextColor={COLORS.textMuted} />
          <Text style={st.label}>Description</Text><TextInput style={[st.input,{height:70,textAlignVertical:'top'}]} value={form.description} onChangeText={v=>setForm(p=>({...p,description:v}))} placeholder="Description" placeholderTextColor={COLORS.textMuted} multiline />
          <Text style={st.label}>Type</Text><View style={st.chipRow}>{TYPES.map(t=>(<TouchableOpacity key={t} style={[st.chip,form.type===t&&st.chipAct]} onPress={()=>setForm(p=>({...p,type:t}))}><Text style={[st.chipTxt,form.type===t&&{color:'#fff'}]}>{t.toUpperCase()}</Text></TouchableOpacity>))}</View>
          <Text style={st.label}>Category</Text><View style={st.chipRow}>{CATEGORIES.map(c=>(<TouchableOpacity key={c} style={[st.chip,form.category===c&&st.chipAct]} onPress={()=>setForm(p=>({...p,category:c}))}><Text style={[st.chipTxt,form.category===c&&{color:'#fff'}]}>{c}</Text></TouchableOpacity>))}</View>
          <Text style={st.label}>Price (₹)</Text><TextInput style={st.input} value={form.price} onChangeText={v=>setForm(p=>({...p,price:v}))} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textMuted} />
          <Text style={st.label}>Instructor</Text><TextInput style={st.input} value={form.instructor} onChangeText={v=>setForm(p=>({...p,instructor:v}))} placeholder="Instructor" placeholderTextColor={COLORS.textMuted} />
          <Text style={st.label}>Features (comma separated)</Text><TextInput style={st.input} value={form.features} onChangeText={v=>setForm(p=>({...p,features:v}))} placeholder="Feature 1, Feature 2" placeholderTextColor={COLORS.textMuted} />
          <View style={st.toggleRow}><View style={{flex:1}}><Text style={st.label}>Live Chat</Text></View><TouchableOpacity style={[st.toggle,form.chat_enabled?st.toggleOn:st.toggleOff]} onPress={()=>setForm(p=>({...p,chat_enabled:!p.chat_enabled}))} testID="chat-toggle"><View style={[st.knob,form.chat_enabled?st.knobOn:st.knobOff]}/></TouchableOpacity></View>
          <TouchableOpacity style={[st.saveBtn,saving&&{opacity:.7}]} onPress={saveCourse} disabled={saving} testID="save-course-btn">{saving?<ActivityIndicator color="#fff"/>:<Text style={st.saveBtnTxt}>{editingCourse?'Update':'Create Course'}</Text>}</TouchableOpacity>
        </ScrollView></View></View>
      </Modal>

      {/* Content Management Modal */}
      <Modal visible={showContent} animationType="slide" transparent>
        <View style={st.mOverlay}><View style={[st.mContent,{maxHeight:'95%'}]}><ScrollView>
          <View style={st.mHeader}>
            <View style={{flex:1}}><Text style={st.mTitle}>Course Sections</Text><Text style={st.subTitle}>{contentCourse?.title}</Text></View>
            <TouchableOpacity onPress={() => setShowContent(false)} testID="close-content"><Ionicons name="close" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
          </View>

          {/* Add Section */}
          <View style={st.addSecRow}>
            <TextInput testID="new-section-input" style={[st.input,{flex:1}]} value={newSectionTitle} onChangeText={setNewSectionTitle} placeholder="New section name (e.g. Week 1)" placeholderTextColor={COLORS.textMuted} />
            <TouchableOpacity style={[st.addSecBtn,addingSec&&{opacity:.7}]} onPress={addSection} disabled={addingSec} testID="add-section-btn">
              {addingSec?<ActivityIndicator color="#fff" size="small"/>:<><Ionicons name="add" size={16} color="#fff"/><Text style={st.addSecBtnTxt}>Add</Text></>}
            </TouchableOpacity>
          </View>

          {/* Sections List */}
          {sections.map((sec, idx) => {
            const isActive = activeSectionId === sec.id;
            const vCount = sec.videos?.length || 0;
            const mCount = sec.materials?.length || 0;
            return (
              <View key={sec.id} style={[st.secCard, isActive && st.secCardActive]} testID={`section-admin-${sec.id}`}>
                <TouchableOpacity style={st.secHeader} onPress={() => setActiveSectionId(isActive ? null : sec.id)}>
                  <View style={[st.secIcon, sec.is_locked ? st.lockedBg : st.unlockedBg]}>
                    <Ionicons name={sec.is_locked ? 'lock-closed' : 'folder-open'} size={16} color={sec.is_locked ? COLORS.error : COLORS.primary} />
                  </View>
                  <View style={{flex:1}}>
                    <Text style={st.secTitle}>{sec.title}</Text>
                    <Text style={st.secMeta}>{vCount} videos • {mCount} files</Text>
                  </View>
                  <TouchableOpacity onPress={() => toggleLock(sec)} style={[st.lockBtn, sec.is_locked ? st.lockBtnLocked : st.lockBtnUnlocked]} testID={`toggle-lock-${sec.id}`}>
                    <Ionicons name={sec.is_locked ? 'lock-closed' : 'lock-open'} size={12} color={sec.is_locked ? COLORS.error : COLORS.success} />
                    <Text style={[st.lockBtnTxt, {color: sec.is_locked ? COLORS.error : COLORS.success}]}>{sec.is_locked ? 'Locked' : 'Open'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteSection(sec.id)} testID={`delete-sec-${sec.id}`}><Ionicons name="trash-outline" size={16} color={COLORS.error} /></TouchableOpacity>
                </TouchableOpacity>

                {isActive && (
                  <View style={st.secBody}>
                    {/* Existing content */}
                    {sec.videos?.map((v: any) => (
                      <View key={v.id} style={st.item}><Ionicons name="play-circle" size={16} color={COLORS.primary} /><Text style={st.itemTitle} numberOfLines={1}>{v.title}</Text><TouchableOpacity onPress={() => deleteVideo(v.id)}><Ionicons name="close-circle" size={16} color={COLORS.error} /></TouchableOpacity></View>
                    ))}
                    {sec.materials?.map((m: any) => (
                      <View key={m.id} style={st.item}><Ionicons name="document-text" size={16} color={COLORS.accent} /><Text style={st.itemTitle} numberOfLines={1}>{m.title}</Text><TouchableOpacity onPress={() => deleteMaterial(m.id)}><Ionicons name="close-circle" size={16} color={COLORS.error} /></TouchableOpacity></View>
                    ))}

                    {/* Add Video */}
                    <View style={st.addBox}>
                      <Text style={st.addLabel}>Add Video (URL)</Text>
                      <TextInput testID="video-title-input" style={st.smInput} value={videoForm.title} onChangeText={v=>setVideoForm(p=>({...p,title:v}))} placeholder="Video title" placeholderTextColor={COLORS.textMuted} />
                      <TextInput testID="video-url-input" style={st.smInput} value={videoForm.url} onChangeText={v=>setVideoForm(p=>({...p,url:v}))} placeholder="YouTube or video URL" placeholderTextColor={COLORS.textMuted} />
                      <View style={{flexDirection:'row',gap:6}}>
                        <TextInput style={[st.smInput,{flex:1}]} value={videoForm.duration} onChangeText={v=>setVideoForm(p=>({...p,duration:v}))} placeholder="Duration (sec)" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
                        <TouchableOpacity style={[st.miniBtn,addingVideo&&{opacity:.7}]} onPress={addVideo} disabled={addingVideo} testID="add-video-btn">
                          {addingVideo?<ActivityIndicator color="#fff" size="small"/>:<><Ionicons name="add" size={14} color="#fff"/><Text style={st.miniBtnTxt}>Add</Text></>}
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Upload Video File */}
                    <View style={st.addBox}>
                      <Text style={st.addLabel}>Upload Video File</Text>
                      <TouchableOpacity style={[st.uploadVidBtn,addingVideo&&{opacity:.7}]} onPress={uploadVideoFile} disabled={addingVideo} testID="upload-video-btn">
                        {addingVideo?<ActivityIndicator color="#fff" size="small"/>:<><Ionicons name="videocam" size={14} color="#fff"/><Text style={st.uploadVidBtnTxt}>Choose & Upload Video</Text></>}
                      </TouchableOpacity>
                    </View>

                    {/* Upload PDF */}
                    <View style={st.addBox}>
                      <Text style={st.addLabel}>Upload PDF</Text>
                      <TextInput testID="pdf-title-input" style={st.smInput} value={pdfTitle} onChangeText={setPdfTitle} placeholder="Material title" placeholderTextColor={COLORS.textMuted} />
                      <TouchableOpacity style={[st.pdfBtn,uploadingPdf&&{opacity:.7}]} onPress={pickPdf} disabled={uploadingPdf} testID="upload-pdf-btn">
                        {uploadingPdf?<ActivityIndicator color="#fff" size="small"/>:<><Ionicons name="cloud-upload" size={14} color="#fff"/><Text style={st.pdfBtnTxt}>Choose & Upload PDF</Text></>}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          {sections.length === 0 && <View style={st.empty}><Ionicons name="folder-open-outline" size={40} color={COLORS.textMuted} /><Text style={st.emptyTxt}>No sections yet</Text><Text style={st.emptyHint}>Add sections above, then add videos and PDFs to each</Text></View>}
          <View style={{height:20}} />
        </ScrollView></View></View>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe:{flex:1,backgroundColor:COLORS.bgSubtle},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingTop:8,paddingBottom:12},
  title:{fontSize:22,fontWeight:'800',color:COLORS.textPrimary},count:{fontSize:13,color:COLORS.textMuted},
  addBtn:{flexDirection:'row',backgroundColor:COLORS.primary,paddingHorizontal:14,paddingVertical:8,borderRadius:8,alignItems:'center',gap:4},addBtnText:{color:'#fff',fontWeight:'700',fontSize:13},
  list:{paddingHorizontal:20,paddingBottom:20},
  card:{flexDirection:'row',backgroundColor:COLORS.white,borderRadius:12,padding:14,marginBottom:8},
  cardHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:4},
  typeBadge:{paddingHorizontal:6,paddingVertical:2,borderRadius:4},typeText:{fontSize:9,fontWeight:'800'},
  price:{fontSize:15,fontWeight:'800',color:COLORS.primary},
  cardTitle:{fontSize:15,fontWeight:'700',color:COLORS.textPrimary},cardSub:{fontSize:11,color:COLORS.textMuted,marginTop:2},
  cardActions:{justifyContent:'center',gap:12,paddingLeft:10},
  contentBtn:{flexDirection:'row',alignItems:'center',gap:4,marginTop:8,backgroundColor:'#EFF6FF',paddingHorizontal:10,paddingVertical:6,borderRadius:6,alignSelf:'flex-start'},
  contentBtnText:{fontSize:11,fontWeight:'700',color:COLORS.primary},
  mOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'flex-end'},
  mContent:{backgroundColor:COLORS.white,borderTopLeftRadius:20,borderTopRightRadius:20,padding:20,maxHeight:'85%'},
  mHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16},
  mTitle:{fontSize:20,fontWeight:'800',color:COLORS.textPrimary},subTitle:{fontSize:12,color:COLORS.textMuted,marginTop:2},
  label:{fontSize:12,fontWeight:'700',color:COLORS.textPrimary,marginTop:12,marginBottom:4},
  input:{backgroundColor:COLORS.bgSubtle,borderWidth:1,borderColor:COLORS.border,borderRadius:10,paddingHorizontal:12,height:44,fontSize:14,color:COLORS.textPrimary},
  chipRow:{flexDirection:'row',flexWrap:'wrap',gap:6},
  chip:{paddingHorizontal:12,paddingVertical:6,borderRadius:8,backgroundColor:COLORS.bgSubtle,borderWidth:1,borderColor:COLORS.border},
  chipAct:{backgroundColor:COLORS.primary,borderColor:COLORS.primary},chipTxt:{fontSize:12,fontWeight:'600',color:COLORS.textSecondary},
  toggleRow:{flexDirection:'row',alignItems:'center',marginTop:16,gap:12},
  toggle:{width:50,height:28,borderRadius:14,padding:2,justifyContent:'center'},toggleOn:{backgroundColor:COLORS.primary},toggleOff:{backgroundColor:COLORS.border},
  knob:{width:24,height:24,borderRadius:12,backgroundColor:'#fff'},knobOn:{alignSelf:'flex-end' as const},knobOff:{alignSelf:'flex-start' as const},
  saveBtn:{backgroundColor:COLORS.primary,height:48,borderRadius:12,alignItems:'center',justifyContent:'center',marginTop:20,marginBottom:20},
  saveBtnTxt:{color:'#fff',fontSize:16,fontWeight:'700'},
  addSecRow:{flexDirection:'row',gap:8,marginBottom:12},
  addSecBtn:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:COLORS.primary,paddingHorizontal:14,paddingVertical:10,borderRadius:8},
  addSecBtnTxt:{color:'#fff',fontSize:12,fontWeight:'700'},
  secCard:{borderRadius:12,borderWidth:1,borderColor:COLORS.border,marginBottom:8,overflow:'hidden',backgroundColor:COLORS.white},
  secCardActive:{borderColor:COLORS.primary},
  secHeader:{flexDirection:'row',alignItems:'center',padding:12,gap:8},
  secIcon:{width:32,height:32,borderRadius:8,alignItems:'center',justifyContent:'center'},
  unlockedBg:{backgroundColor:'#EFF6FF'},lockedBg:{backgroundColor:COLORS.errorBg},
  secTitle:{fontSize:14,fontWeight:'700',color:COLORS.textPrimary},secMeta:{fontSize:10,color:COLORS.textMuted},
  lockBtn:{flexDirection:'row',alignItems:'center',gap:3,paddingHorizontal:8,paddingVertical:3,borderRadius:6,marginRight:6},
  lockBtnLocked:{backgroundColor:COLORS.errorBg},lockBtnUnlocked:{backgroundColor:COLORS.successBg},
  lockBtnTxt:{fontSize:10,fontWeight:'700'},
  secBody:{borderTopWidth:1,borderTopColor:COLORS.border,padding:12},
  item:{flexDirection:'row',alignItems:'center',gap:6,paddingVertical:6,borderBottomWidth:1,borderBottomColor:COLORS.bgSubtle},
  itemTitle:{flex:1,fontSize:12,fontWeight:'600',color:COLORS.textPrimary},
  addBox:{backgroundColor:COLORS.bgSubtle,borderRadius:8,padding:10,marginTop:8},
  addLabel:{fontSize:12,fontWeight:'700',color:COLORS.primary,marginBottom:6},
  smInput:{backgroundColor:COLORS.white,borderWidth:1,borderColor:COLORS.border,borderRadius:8,paddingHorizontal:10,height:36,fontSize:13,color:COLORS.textPrimary,marginBottom:6},
  miniBtn:{flexDirection:'row',alignItems:'center',gap:3,backgroundColor:COLORS.primary,paddingHorizontal:12,paddingVertical:8,borderRadius:6},
  miniBtnTxt:{color:'#fff',fontSize:11,fontWeight:'700'},
  pdfBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,backgroundColor:COLORS.accent,paddingVertical:10,borderRadius:8},
  pdfBtnTxt:{color:'#fff',fontSize:13,fontWeight:'700'},
  uploadVidBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,backgroundColor:COLORS.primary,paddingVertical:10,borderRadius:8},
  uploadVidBtnTxt:{color:'#fff',fontSize:13,fontWeight:'700'},
  empty:{alignItems:'center',paddingVertical:32,gap:8},emptyTxt:{fontSize:16,fontWeight:'600',color:COLORS.textMuted},emptyHint:{fontSize:12,color:COLORS.textMuted,textAlign:'center'},
});
