import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, 
  SafeAreaView, StatusBar, ActivityIndicator, Alert, Linking, Share 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  Phone, MessageSquare, Mail, Tag, Award, User, Clock, Search, 
  Plus, Check, LogOut, ArrowRight, Eye, Shield, Bell, PlusCircle, CheckCircle, Smartphone 
} from 'lucide-react-native';

// --- TYPES ---
export interface Profile {
  id: string;
  full_name: string;
  role: 'admin' | 'manager' | 'counsellor';
  phone?: string;
}

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone: string;
  parent_contact?: string;
  neet_marks?: number;
  budget?: number;
  preferred_destination?: string;
  lead_source: string;
  campaign_name?: string;
  status: string;
  assigned_counsellor_id?: string | null;
  tags: string[];
  score: number;
  created_at: string;
}

export interface Note {
  id: string;
  lead_id: string;
  content: string;
  created_at: string;
  author_name: string;
}

export interface Task {
  id: string;
  lead_id: string;
  title: string;
  due_date?: string;
  is_completed: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  lead_id: string;
  action_type: string;
  description: string;
  created_at: string;
  actor_name: string;
}

// --- MOCK CONSTANTS ---
const MOCK_PROFILES: Profile[] = [
  { id: 'user-counsellor-1', full_name: 'Amit Verma', role: 'counsellor', phone: '+919876543210' },
  { id: 'user-counsellor-2', full_name: 'Priya Sharma', role: 'counsellor', phone: '+919876543211' },
  { id: 'user-manager', full_name: 'Rajesh Kumar (Manager)', role: 'manager' },
  { id: 'user-admin', full_name: 'Dr. Sarah Kapur (Admin)', role: 'admin' }
];

const PIPELINE_STAGES = [
  '1st followup',
  'Discussion stage',
  'Connected to manager',
  'Documents collected',
  'Closed Won',
  'Closed Lost'
];

const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead-1',
    name: 'Rohan Malhotra',
    email: 'rohan.malhotra@gmail.com',
    phone: '+919988776655',
    parent_contact: '+919988776600',
    neet_marks: 520,
    budget: 6500000,
    preferred_destination: 'Georgia',
    lead_source: 'Facebook Ads',
    campaign_name: 'MBBS Georgia 2026',
    status: '1st followup',
    assigned_counsellor_id: 'user-counsellor-1',
    tags: ['High Score', 'Georgia Preferred'],
    score: 85,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'lead-2',
    name: 'Ananya Iyer',
    email: 'ananya.iyer@yahoo.com',
    phone: '+919812345678',
    parent_contact: '+919812345600',
    neet_marks: 410,
    budget: 4500000,
    preferred_destination: 'Russia',
    lead_source: 'Google Ads',
    campaign_name: 'Affordable MBBS Search',
    status: 'Discussion stage',
    assigned_counsellor_id: 'user-counsellor-1',
    tags: ['Budget Student'],
    score: 60,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    id: 'lead-3',
    name: 'Vikram Singh',
    email: 'vikram.singh@outlook.com',
    phone: '+919555123456',
    parent_contact: '+919555123400',
    neet_marks: 610,
    budget: 12000000,
    preferred_destination: 'India Private',
    lead_source: 'Website Form',
    campaign_name: 'Organic Search',
    status: 'Connected to manager',
    assigned_counsellor_id: 'user-counsellor-2',
    tags: ['High Budget', 'Premium'],
    score: 95,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString()
  }
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  
  // Navigation Screens
  const [currentScreen, setCurrentScreen] = useState<'dashboard' | 'detail'>('dashboard');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  // Modals / Input Toggles
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'notes' | 'tasks' | 'chat'>('notes');
  
  // Call Feedback States
  const [feedbackLead, setFeedbackLead] = useState<Lead | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [feedbackReminder, setFeedbackReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderMonth, setReminderMonth] = useState('');
  const [reminderHour, setReminderHour] = useState('10');
  const [reminderMinute, setReminderMinute] = useState('00');
  const [reminderAmPm, setReminderAmPm] = useState('AM');
  
  // Call/Counsellor Select Picker overlay state
  const [activePickerType, setActivePickerType] = useState<'status' | 'counsellor' | null>(null);
  
  // Lead Form States
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadNeet, setNewLeadNeet] = useState('');
  const [newLeadBudget, setNewLeadBudget] = useState('');
  const [newLeadDest, setNewLeadDest] = useState('');
  const [newLeadSource, setNewLeadSource] = useState('Manual Entry');
  
  // Interaction Forms
  const [noteText, setNoteText] = useState('');
  const [taskText, setTaskText] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ id: string; lead_id: string; direction: 'in' | 'out'; text: string; time: string }[]>([]);

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('All');

  // Load persistent DB
  useEffect(() => {
    const loadCache = async () => {
      try {
        const cachedUser = await AsyncStorage.getItem('m_user');
        const cachedLeads = await AsyncStorage.getItem('m_leads');
        const cachedNotes = await AsyncStorage.getItem('m_notes');
        const cachedTasks = await AsyncStorage.getItem('m_tasks');
        const cachedLogs = await AsyncStorage.getItem('m_logs');
        const cachedChat = await AsyncStorage.getItem('m_chat');

        if (cachedUser) setCurrentUser(JSON.parse(cachedUser));
        setLeads(cachedLeads ? JSON.parse(cachedLeads) : INITIAL_LEADS);
        setNotes(cachedNotes ? JSON.parse(cachedNotes) : []);
        setTasks(cachedTasks ? JSON.parse(cachedTasks) : []);
        setLogs(cachedLogs ? JSON.parse(cachedLogs) : []);
        setChatHistory(cachedChat ? JSON.parse(cachedChat) : []);
      } catch (e) {
        console.error("Storage cache read error: ", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadCache();
  }, []);

  // Save changes to AsyncStorage
  const save = async (key: string, data: any) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error("AsyncStorage write error: ", e);
    }
  };

  // Auth logins
  const handleLogin = (profile: Profile) => {
    setCurrentUser(profile);
    save('m_user', profile);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    AsyncStorage.removeItem('m_user');
  };

  // Lead additions
  const handleAddLead = () => {
    if (!newLeadName.trim() || !newLeadPhone.trim()) {
      Alert.alert("Missing Fields", "Name and phone are required.");
      return;
    }

    const parsedNeet = newLeadNeet ? parseInt(newLeadNeet) : 0;
    let score = 30;
    if (parsedNeet > 450) score = 90;
    else if (parsedNeet > 300) score = 65;

    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      name: newLeadName,
      phone: newLeadPhone,
      neet_marks: newLeadNeet ? parsedNeet : undefined,
      budget: newLeadBudget ? parseFloat(newLeadBudget) * 100000 : undefined,
      preferred_destination: newLeadDest || undefined,
      lead_source: newLeadSource,
      status: '1st followup',
      assigned_counsellor_id: currentUser?.role === 'counsellor' ? currentUser.id : null,
      tags: [newLeadDest].filter(Boolean),
      score,
      created_at: new Date().toISOString()
    };

    const updated = [newLead, ...leads];
    setLeads(updated);
    save('m_leads', updated);

    // Add activity log
    const log: ActivityLog = {
      id: `log-${Date.now()}`,
      lead_id: newLead.id,
      action_type: 'lead_created',
      description: `Lead manually entered via Mobile CRM client`,
      created_at: new Date().toISOString(),
      actor_name: currentUser?.full_name || 'System'
    };
    const updatedLogs = [log, ...logs];
    setLogs(updatedLogs);
    save('m_logs', updatedLogs);

    // Reset fields
    setNewLeadName('');
    setNewLeadPhone('');
    setNewLeadNeet('');
    setNewLeadBudget('');
    setNewLeadDest('');
    setIsAddModalOpen(false);

    Alert.alert("Lead Captured", `${newLead.name} successfully registered. Welcome WhatsApp templates are queued.`);
  };

  // Note add
  const handleAddNote = () => {
    if (!noteText.trim() || !selectedLead) return;
    const newNote: Note = {
      id: `note-${Date.now()}`,
      lead_id: selectedLead.id,
      content: noteText,
      created_at: new Date().toISOString(),
      author_name: currentUser?.full_name || 'Counsellor'
    };
    const updated = [newNote, ...notes];
    setNotes(updated);
    save('m_notes', updated);

    // log
    const log: ActivityLog = {
      id: `log-${Date.now()}`,
      lead_id: selectedLead.id,
      action_type: 'note_added',
      description: `Note added: "${noteText.substring(0, 20)}..."`,
      created_at: new Date().toISOString(),
      actor_name: currentUser?.full_name || 'Counsellor'
    };
    setLogs([log, ...logs]);
    save('m_logs', [log, ...logs]);

    setNoteText('');
  };

  // Task add
  const handleAddTask = () => {
    if (!taskText.trim() || !selectedLead) return;
    const newTask: Task = {
      id: `task-${Date.now()}`,
      lead_id: selectedLead.id,
      title: taskText,
      due_date: new Date(Date.now() + 86400000).toLocaleDateString(),
      is_completed: false,
      created_at: new Date().toISOString()
    };
    const updated = [newTask, ...tasks];
    setTasks(updated);
    save('m_tasks', updated);

    setTaskText('');
  };

  // Toggle Task Completion
  const handleToggleTask = (id: string) => {
    const updated = tasks.map(t => t.id === id ? { ...t, is_completed: !t.is_completed } : t);
    setTasks(updated);
    save('m_tasks', updated);
  };

  // Call & WhatsApp native actions
  const triggerCall = (lead: Lead) => {
    Linking.openURL(`tel:${lead.phone}`).catch(() => {
      Alert.alert("Error", "Unable to trigger dialer actions on this device.");
    });

    // 1. Log call action in activity logs
    const log: ActivityLog = {
      id: `log-${Date.now()}`,
      lead_id: lead.id,
      action_type: 'call_placed',
      description: `Placed phone call to candidate at ${lead.phone}`,
      created_at: new Date().toISOString(),
      actor_name: currentUser?.full_name || 'Counsellor'
    };
    const updatedLogs = [log, ...logs];
    setLogs(updatedLogs);
    save('m_logs', updatedLogs);

    // 2. Open Call Feedback Modal
    setFeedbackLead(lead);
    setFeedbackNotes('');
    setFeedbackReminder(false);
    
    // Set default reminder tomorrow at 10:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setReminderDate(tomorrow.getDate().toString());
    setReminderMonth((tomorrow.getMonth() + 1).toString());
    setReminderHour('10');
    setReminderMinute('00');
    setReminderAmPm('AM');
  };

  const setPresetReminder = (hoursAhead: number, isTomorrowMorning = false, isTomorrowAfternoon = false, isTwoDays = false, isOneWeek = false) => {
    setFeedbackReminder(true);
    const targetDate = new Date();
    
    if (isTomorrowMorning) {
      targetDate.setDate(targetDate.getDate() + 1);
      setReminderHour('10');
      setReminderMinute('00');
      setReminderAmPm('AM');
    } else if (isTomorrowAfternoon) {
      targetDate.setDate(targetDate.getDate() + 1);
      setReminderHour('03');
      setReminderMinute('00');
      setReminderAmPm('PM');
    } else if (isTwoDays) {
      targetDate.setDate(targetDate.getDate() + 2);
      setReminderHour('10');
      setReminderMinute('00');
      setReminderAmPm('AM');
    } else if (isOneWeek) {
      targetDate.setDate(targetDate.getDate() + 7);
      setReminderHour('10');
      setReminderMinute('00');
      setReminderAmPm('AM');
    } else {
      targetDate.setHours(targetDate.getHours() + hoursAhead);
      let hr = targetDate.getHours();
      const ampm = hr >= 12 ? 'PM' : 'AM';
      hr = hr % 12;
      hr = hr ? hr : 12;
      let min = Math.round(targetDate.getMinutes() / 15) * 15;
      if (min === 60) {
        min = 0;
        hr = hr === 12 ? 1 : hr + 1;
      }
      setReminderHour(hr.toString().padStart(2, '0'));
      setReminderMinute(min.toString().padStart(2, '0'));
      setReminderAmPm(ampm);
    }
    
    setReminderDate(targetDate.getDate().toString());
    setReminderMonth((targetDate.getMonth() + 1).toString());
  };

  const handleSaveFeedback = () => {
    if (!feedbackLead) return;

    // 1. Post internal note
    if (feedbackNotes.trim()) {
      const newNote: Note = {
        id: `note-${Date.now()}`,
        lead_id: feedbackLead.id,
        content: `[Call Log Note] ${feedbackNotes}`,
        created_at: new Date().toISOString(),
        author_name: currentUser?.full_name || 'Counsellor'
      };
      const updatedNotes = [newNote, ...notes];
      setNotes(updatedNotes);
      save('m_notes', updatedNotes);

      // Create activity log for note
      const noteLog: ActivityLog = {
        id: `log-${Date.now()}-note`,
        lead_id: feedbackLead.id,
        action_type: 'note_added',
        description: `Note added via post-call feedback: "${feedbackNotes.substring(0, 20)}..."`,
        created_at: new Date().toISOString(),
        actor_name: currentUser?.full_name || 'Counsellor'
      };
      const updatedLogs = [noteLog, ...logs];
      setLogs(updatedLogs);
      save('m_logs', updatedLogs);
    }

    // 2. Set Call Reminder Task
    if (feedbackReminder) {
      const day = parseInt(reminderDate);
      const month = parseInt(reminderMonth);
      if (isNaN(day) || isNaN(month) || day < 1 || day > 31 || month < 1 || month > 12) {
        Alert.alert("Invalid Date", "Please enter a valid day (1-31) and month (1-12).");
        return;
      }
      
      const year = new Date().getFullYear();
      const formattedDate = `${month}/${day}/${year}`;
      const formattedTime = `${reminderHour}:${reminderMinute} ${reminderAmPm}`;
      
      const newTask: Task = {
        id: `task-${Date.now()}`,
        lead_id: feedbackLead.id,
        title: `Follow-up call scheduled for ${formattedTime}`,
        due_date: `${formattedDate} ${formattedTime}`,
        is_completed: false,
        created_at: new Date().toISOString()
      };
      const updatedTasks = [newTask, ...tasks];
      setTasks(updatedTasks);
      save('m_tasks', updatedTasks);

      // Create activity log for scheduled reminder
      const reminderLog: ActivityLog = {
        id: `log-${Date.now()}-reminder`,
        lead_id: feedbackLead.id,
        action_type: 'task_scheduled',
        description: `Call follow-up scheduled for ${formattedDate} at ${formattedTime}`,
        created_at: new Date().toISOString(),
        actor_name: currentUser?.full_name || 'Counsellor'
      };
      const updatedLogs = [reminderLog, ...logs];
      setLogs(updatedLogs);
      save('m_logs', updatedLogs);
    }

    setFeedbackLead(null);
    setFeedbackNotes('');
    setFeedbackReminder(false);
  };

  const handleUpdateLeadField = (field: 'status' | 'assigned_counsellor_id', value: string | null) => {
    if (!selectedLead) return;
    
    const updatedLead = { ...selectedLead, [field]: value };
    setSelectedLead(updatedLead);
    
    const updatedLeads = leads.map(l => l.id === selectedLead.id ? updatedLead : l);
    setLeads(updatedLeads);
    save('m_leads', updatedLeads);

    // Add activity log
    const desc = field === 'status' 
      ? `Pipeline status changed to "${value}"` 
      : `Assigned counsellor changed to "${MOCK_PROFILES.find(p => p.id === value)?.full_name || 'Unassigned'}"`;
      
    const log: ActivityLog = {
      id: `log-${Date.now()}`,
      lead_id: selectedLead.id,
      action_type: field === 'status' ? 'status_updated' : 'counsellor_assigned',
      description: desc,
      created_at: new Date().toISOString(),
      actor_name: currentUser?.full_name || 'Counsellor'
    };
    const updatedLogs = [log, ...logs];
    setLogs(updatedLogs);
    save('m_logs', updatedLogs);
  };

  const renderPickerModal = () => {
    if (!activePickerType || !selectedLead) return null;

    const isStatus = activePickerType === 'status';
    const title = isStatus ? 'Change Pipeline Status' : 'Assign Counsellor';
    const options = isStatus 
      ? PIPELINE_STAGES 
      : [...MOCK_PROFILES.filter(p => p.role === 'counsellor').map(p => ({ id: p.id, name: p.full_name })), { id: null, name: 'Unassigned' }];

    return (
      <View style={styles.feedbackModalOverlay}>
        <View style={styles.feedbackModalContent}>
          <Text style={styles.feedbackTitle}>{title}</Text>
          
          <ScrollView style={{ maxHeight: 250, marginBottom: 15 }} nestedScrollEnabled={true}>
            {options.map((opt, idx) => {
              const optionId = typeof opt === 'string' ? opt : opt.id;
              const optionLabel = typeof opt === 'string' ? opt : opt.name;
              const isSelected = isStatus 
                ? selectedLead.status === optionId 
                : selectedLead.assigned_counsellor_id === optionId;

              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.pickerItemRow, isSelected && styles.pickerItemRowSelected]}
                  onPress={() => {
                    handleUpdateLeadField(isStatus ? 'status' : 'assigned_counsellor_id', optionId);
                    setActivePickerType(null);
                  }}
                >
                  <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}>
                    {optionLabel}
                  </Text>
                  {isSelected && <Check size={16} color="#4F46E5" />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity 
            style={styles.cancelModalBtn} 
            onPress={() => setActivePickerType(null)}
          >
            <Text style={[styles.cancelModalBtnText, { textAlign: 'center' }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFeedbackModal = () => {
    if (!feedbackLead) return null;
    return (
      <View style={styles.feedbackModalOverlay}>
        <View style={styles.feedbackModalContent}>
          <Text style={styles.feedbackTitle}>Call Follow-Up: {feedbackLead.name}</Text>
          
          <Text style={styles.feedbackSectionLabel}>Call Notes</Text>
          <TextInput
            style={styles.feedbackNoteInput}
            placeholder="Type feedback, budget details, or course interest..."
            placeholderTextColor="#94A3B8"
            value={feedbackNotes}
            onChangeText={setFeedbackNotes}
            multiline={true}
            numberOfLines={3}
          />

          <View style={styles.feedbackSwitchRow}>
            <Text style={styles.feedbackSwitchLabel}>Set Follow-up Reminder</Text>
            <TouchableOpacity 
              style={[styles.customToggle, feedbackReminder && styles.customToggleActive]}
              onPress={() => setFeedbackReminder(!feedbackReminder)}
            >
              <View style={[styles.customToggleCircle, feedbackReminder && styles.customToggleCircleActive]} />
            </TouchableOpacity>
          </View>

          {feedbackReminder && (
            <View style={styles.reminderContainer}>
              <Text style={styles.feedbackSubLabel}>Quick Presets</Text>
              <View style={styles.presetsRow}>
                <TouchableOpacity style={styles.presetBtn} onPress={() => setPresetReminder(2)}>
                  <Text style={styles.presetBtnText}>In 2 Hrs</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.presetBtn} onPress={() => setPresetReminder(0, true)}>
                  <Text style={styles.presetBtnText}>Tom. 10am</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.presetBtn} onPress={() => setPresetReminder(0, false, true)}>
                  <Text style={styles.presetBtnText}>Tom. 3pm</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.presetBtn} onPress={() => setPresetReminder(0, false, false, true)}>
                  <Text style={styles.presetBtnText}>In 2 Days</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.feedbackSubLabel}>Custom Schedule</Text>
              <View style={styles.pickerContainer}>
                <View style={styles.pickerRow}>
                  <TextInput 
                    style={styles.pickerInput} 
                    value={reminderDate} 
                    onChangeText={setReminderDate} 
                    keyboardType="number-pad" 
                    maxLength={2} 
                    placeholder="DD"
                    placeholderTextColor="#94A3B8"
                  />
                  <Text style={styles.pickerSeparator}>/</Text>
                  <TextInput 
                    style={styles.pickerInput} 
                    value={reminderMonth} 
                    onChangeText={setReminderMonth} 
                    keyboardType="number-pad" 
                    maxLength={2} 
                    placeholder="MM"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={styles.pickerRow}>
                  <TouchableOpacity 
                    style={styles.selectorBtn} 
                    onPress={() => {
                      let hr = parseInt(reminderHour) || 12;
                      hr = hr === 12 ? 1 : hr + 1;
                      setReminderHour(hr.toString().padStart(2, '0'));
                    }}
                  >
                    <Text style={styles.selectorBtnText}>{reminderHour}</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerColon}>:</Text>
                  <TouchableOpacity 
                    style={styles.selectorBtn} 
                    onPress={() => {
                      let min = parseInt(reminderMinute) || 0;
                      min = min === 45 ? 0 : min + 15;
                      setReminderMinute(min.toString().padStart(2, '0'));
                    }}
                  >
                    <Text style={styles.selectorBtnText}>{reminderMinute}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.ampmBtn} 
                    onPress={() => setReminderAmPm(prev => prev === 'AM' ? 'PM' : 'AM')}
                  >
                    <Text style={styles.ampmBtnText}>{reminderAmPm}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          <View style={styles.modalActionsRow}>
            <TouchableOpacity 
              style={styles.cancelModalBtn} 
              onPress={() => setFeedbackLead(null)}
            >
              <Text style={styles.cancelModalBtnText}>Skip / Dismiss</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.saveFeedbackBtn} 
              onPress={handleSaveFeedback}
            >
              <Text style={styles.saveFeedbackBtnText}>Save Follow-up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const triggerWhatsApp = (phone: string, name: string) => {
    const welcomeText = `Hello ${name}, thank you for reaching out to MBBS consultancy...`;
    const cleanPhone = phone.replace('+', '');
    const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(welcomeText)}`;
    Linking.openURL(url).catch(() => {
      // Fallback web url
      Linking.openURL(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(welcomeText)}`);
    });
  };

  // WhatsApp Simulation chats
  const handleSendWhatsAppSim = () => {
    if (!chatInput.trim() || !selectedLead) return;
    const newMsg = {
      id: `m-${Date.now()}`,
      lead_id: selectedLead.id,
      direction: 'out' as const,
      text: chatInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const updated = [...chatHistory, newMsg];
    setChatHistory(updated);
    save('m_chat', updated);
    setChatInput('');

    // Chatbot response simulation
    setTimeout(() => {
      const incoming = {
        id: `m-${Date.now() + 1}`,
        lead_id: selectedLead.id,
        direction: 'in' as const,
        text: "Got your message. I am currently out with my parents, but I will check the college brochures by tonight. Thank you!",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatHistory(prev => {
        const next = [...prev, incoming];
        save('m_chat', next);
        return next;
      });
      // Trigger notification alert
      Alert.alert(`📱 New reply from ${selectedLead.name}`, "Check the WhatsApp chat log in details tab.");
    }, 2500);
  };

  // Filter leads based on logged counselor
  const myLeads = leads.filter(l => {
    if (currentUser?.role === 'admin' || currentUser?.role === 'manager') return true;
    return l.assigned_counsellor_id === currentUser?.id;
  });

  const filteredLeads = myLeads.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (l.preferred_destination && l.preferred_destination.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStage = selectedStageFilter === 'All' || l.status === selectedStageFilter;
    return matchesSearch && matchesStage;
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>BOOTING MOBILE CRM CLIENT...</Text>
      </View>
    );
  }

  // --- LOGIN VIEW ---
  if (!currentUser) {
    return (
      <SafeAreaView style={styles.loginWrapper}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loginCard}>
          <View style={styles.loginIconContainer}>
            <Smartphone size={40} color="#FFF" />
          </View>
          <Text style={styles.loginTitle}>EduPath MBBS CRM</Text>
          <Text style={styles.loginSubtitle}>Counsellor Native Mobile Client</Text>

          <Text style={styles.impersonateTitle}>Quick Select Accounts</Text>
          {MOCK_PROFILES.map(p => (
            <TouchableOpacity 
              key={p.id} 
              style={styles.profileBtn}
              onPress={() => handleLogin(p)}
            >
              <View>
                <Text style={styles.profileBtnName}>{p.full_name}</Text>
                <Text style={styles.profileBtnRole}>{p.role.toUpperCase()}</Text>
              </View>
              <ArrowRight size={18} color="#6366F1" />
            </TouchableOpacity>
          ))}
          
          <Text style={styles.sandboxDisclaimer}>
            Sync Engine operates in Local Offline mode. Connects dynamically to Supabase databases when variables are present.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- DETAIL VIEW ---
  if (currentScreen === 'detail' && selectedLead) {
    const leadNotes = notes.filter(n => n.lead_id === selectedLead.id);
    const leadTasks = tasks.filter(t => t.lead_id === selectedLead.id);
    const leadChats = chatHistory.filter(c => c.lead_id === selectedLead.id);

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        {/* Detail Header */}
        <View style={styles.detailHeader}>
          <TouchableOpacity 
            onPress={() => setCurrentScreen('dashboard')}
            style={styles.backBtn}
          >
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.detailHeaderTitle} numberOfLines={1}>{selectedLead.name}</Text>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreCircleText}>{selectedLead.score}</Text>
          </View>
        </View>

        <ScrollView style={styles.detailScroll}>
          {/* Card Info Box */}
          <View style={styles.leadDetailsBox}>
            <View style={styles.detailsRow}>
              <Text style={styles.detailLabel}>NEET MARKS</Text>
              <Text style={styles.detailVal}>{selectedLead.neet_marks || 'N/A'}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailLabel}>BUDGET</Text>
              <Text style={styles.detailVal}>₹{selectedLead.budget ? `${(selectedLead.budget / 100000).toFixed(0)} Lakh` : 'N/A'}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailLabel}>TARGET DESTINATION</Text>
              <Text style={styles.detailVal}>{selectedLead.preferred_destination || 'N/A'}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailLabel}>LEAD SOURCE</Text>
              <Text style={styles.sourceTextBadge}>{selectedLead.lead_source}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailLabel}>PHONE NUMBER</Text>
              <Text style={styles.detailVal}>{selectedLead.phone}</Text>
            </View>

            {/* Clickable Status row */}
            <TouchableOpacity 
              style={styles.detailsRowClickable}
              onPress={() => setActivePickerType('status')}
            >
              <Text style={styles.detailLabel}>PIPELINE STATUS</Text>
              <View style={styles.pickerValueRow}>
                <Text style={styles.detailVal}>{selectedLead.status}</Text>
                <Text style={styles.pickerChevron}>▾</Text>
              </View>
            </TouchableOpacity>

            {/* Clickable Assigned Counsellor row (Admin/Manager only) */}
            {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
              <TouchableOpacity 
                style={styles.detailsRowClickable}
                onPress={() => setActivePickerType('counsellor')}
              >
                <Text style={styles.detailLabel}>ASSIGNED TO</Text>
                <View style={styles.pickerValueRow}>
                  <Text style={styles.detailVal}>
                    {MOCK_PROFILES.find(p => p.id === selectedLead.assigned_counsellor_id)?.full_name || 'Unassigned'}
                  </Text>
                  <Text style={styles.pickerChevron}>▾</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Contact Buttons */}
          <View style={styles.actionsBarRow}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
              onPress={() => triggerCall(selectedLead)}
            >
              <Phone size={18} color="#FFF" />
              <Text style={styles.actionButtonText}>Call Candidate</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#10B981' }]}
              onPress={() => triggerWhatsApp(selectedLead.phone, selectedLead.name)}
            >
              <MessageSquare size={18} color="#FFF" />
              <Text style={styles.actionButtonText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>

          {/* TABS Toggles */}
          <View style={styles.tabsRow}>
            {(['notes', 'tasks', 'chat'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, detailTab === tab && styles.tabBtnActive]}
                onPress={() => setDetailTab(tab)}
              >
                <Text style={[styles.tabBtnText, detailTab === tab && styles.tabBtnTextActive]}>
                  {tab.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* TAB CONTENTS: NOTES */}
          {detailTab === 'notes' && (
            <View style={styles.tabContentBox}>
              <View style={styles.inputFormBox}>
                <TextInput
                  placeholder="Add internal counsel note..."
                  value={noteText}
                  onChangeText={setNoteText}
                  style={styles.formInputText}
                />
                <TouchableOpacity style={styles.formSubmitBtn} onPress={handleAddNote}>
                  <Text style={styles.formSubmitBtnText}>POST</Text>
                </TouchableOpacity>
              </View>

              {leadNotes.length > 0 ? (
                leadNotes.map(n => (
                  <View key={n.id} style={styles.noteCard}>
                    <Text style={styles.noteMeta}>{n.author_name} • {new Date(n.created_at).toLocaleDateString()}</Text>
                    <Text style={styles.noteContent}>{n.content}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No internal notes recorded yet</Text>
              )}
            </View>
          )}

          {/* TAB CONTENTS: TASKS */}
          {detailTab === 'tasks' && (
            <View style={styles.tabContentBox}>
              <View style={styles.inputFormBox}>
                <TextInput
                  placeholder="Add follow-up task call..."
                  value={taskText}
                  onChangeText={setTaskText}
                  style={styles.formInputText}
                />
                <TouchableOpacity style={styles.formSubmitBtn} onPress={handleAddTask}>
                  <Text style={styles.formSubmitBtnText}>ADD</Text>
                </TouchableOpacity>
              </View>

              {leadTasks.length > 0 ? (
                leadTasks.map(t => (
                  <TouchableOpacity 
                    key={t.id} 
                    style={[styles.taskCard, t.is_completed && styles.taskCardCompleted]}
                    onPress={() => handleToggleTask(t.id)}
                  >
                    <View style={styles.taskLeftRow}>
                      <View style={[styles.taskCheckbox, t.is_completed && styles.taskCheckboxChecked]} />
                      <Text style={[styles.taskCardTitle, t.is_completed && styles.taskTitleCompleted]}>
                        {t.title}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyText}>No scheduled tasks pending</Text>
              )}
            </View>
          )}

          {/* TAB CONTENTS: CHATS */}
          {detailTab === 'chat' && (
            <View style={styles.tabContentBox}>
              <View style={styles.chatHistoryWindow}>
                {leadChats.length > 0 ? (
                  leadChats.map(c => (
                    <View 
                      key={c.id} 
                      style={[
                        styles.chatBubble, 
                        c.direction === 'out' ? styles.chatBubbleOut : styles.chatBubbleIn
                      ]}
                    >
                      <Text style={[
                        styles.chatBubbleText, 
                        c.direction === 'out' ? styles.chatTextOut : styles.chatTextIn
                      ]}>
                        {c.text}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No WhatsApp chat transcripts recorded</Text>
                )}
              </View>

              <View style={styles.inputFormBox}>
                <TextInput
                  placeholder="Send simulated reply message..."
                  value={chatInput}
                  onChangeText={setChatInput}
                  style={styles.formInputText}
                />
                <TouchableOpacity style={styles.chatSendBtn} onPress={handleSendWhatsAppSim}>
                  <Text style={styles.formSubmitBtnText}>SEND</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
        {renderFeedbackModal()}
        {renderPickerModal()}
      </SafeAreaView>
    );
  }

  // --- DASHBOARD VIEW ---
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Mobile Dashboard Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>MBBS MOBILE CRM</Text>
          <Text style={styles.headerUser}>Hi, {currentUser.full_name} ({currentUser.role.toUpperCase()})</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Stats Summary Panel */}
      <View style={styles.statsSummaryRow}>
        <View style={styles.statsSummaryCard}>
          <Text style={styles.statsSummaryLabel}>ASSIGNED LEADS</Text>
          <Text style={styles.statsSummaryVal}>{myLeads.length}</Text>
        </View>
        <View style={styles.statsSummaryCard}>
          <Text style={styles.statsSummaryLabel}>PENDING TASKS</Text>
          <Text style={[styles.statsSummaryVal, { color: '#EF4444' }]}>
            {tasks.filter(t => !t.is_completed).length}
          </Text>
        </View>
      </View>

      {/* Action Header */}
      <View style={styles.actionHeaderRow}>
        <Text style={styles.listSectionTitle}>My Assigned Leads</Text>
        <TouchableOpacity 
          style={styles.addBtnHeader}
          onPress={() => setIsAddModalOpen(!isAddModalOpen)}
        >
          <Text style={styles.addBtnHeaderText}>{isAddModalOpen ? "Close Form" : "+ Create Lead"}</Text>
        </TouchableOpacity>
      </View>

      {/* Pipeline Stage Horizontal Selector */}
      <View style={styles.horizontalPipelineContainer}>
        <ScrollView 
          horizontal={true} 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalPipelineScroll}
        >
          {['All', ...PIPELINE_STAGES].map(stage => {
            const isSelected = selectedStageFilter === stage;
            const count = stage === 'All' 
              ? myLeads.length 
              : myLeads.filter(l => l.status === stage).length;
            
            return (
              <TouchableOpacity
                key={stage}
                onPress={() => setSelectedStageFilter(stage)}
                style={[
                  styles.pipelineTab, 
                  isSelected && styles.pipelineTabActive
                ]}
              >
                <Text style={[
                  styles.pipelineTabText, 
                  isSelected && styles.pipelineTabTextActive
                ]}>
                  {stage} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Manual Entry Form Toggle inside list */}
      {isAddModalOpen && (
        <ScrollView style={styles.inlineAddForm} nestedScrollEnabled={true}>
          <Text style={styles.formHeaderTitle}>Add Candidate Lead</Text>
          <TextInput 
            placeholder="Student Name *" 
            placeholderTextColor="#94A3B8"
            value={newLeadName} 
            onChangeText={setNewLeadName} 
            style={styles.formInputInline} 
          />
          <TextInput 
            placeholder="Phone Number *" 
            placeholderTextColor="#94A3B8"
            value={newLeadPhone} 
            onChangeText={setNewLeadPhone} 
            keyboardType="phone-pad" 
            style={styles.formInputInline} 
          />
          <TextInput 
            placeholder="NEET Marks (720 max)" 
            placeholderTextColor="#94A3B8"
            value={newLeadNeet} 
            onChangeText={setNewLeadNeet} 
            keyboardType="number-pad" 
            style={styles.formInputInline} 
          />
          <TextInput 
            placeholder="Budget (Lakhs INR)" 
            placeholderTextColor="#94A3B8"
            value={newLeadBudget} 
            onChangeText={setNewLeadBudget} 
            keyboardType="number-pad" 
            style={styles.formInputInline} 
          />
          <TextInput 
            placeholder="Target Destination (Country/State)" 
            placeholderTextColor="#94A3B8"
            value={newLeadDest} 
            onChangeText={setNewLeadDest} 
            style={styles.formInputInline} 
          />
          
          <TouchableOpacity style={styles.submitLeadBtn} onPress={handleAddLead}>
            <Text style={styles.submitLeadBtnText}>Save Candidate Profile</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Search Input */}
      <View style={styles.searchBarContainer}>
        <Search size={16} color="#94A3B8" style={styles.searchIcon} />
        <TextInput
          placeholder="Search leads by name, country..."
          placeholderTextColor="#94A3B8"
          value={searchTerm}
          onChangeText={setSearchTerm}
          style={styles.searchTextInput}
        />
      </View>

      {/* Leads Scroll list */}
      <ScrollView style={styles.listScroll} contentContainerStyle={{ paddingBottom: 20 }}>
        {filteredLeads.length > 0 ? (
          filteredLeads.map(lead => (
            <View key={lead.id} style={styles.leadItemCard}>
              <View style={styles.leadCardHeaderRow}>
                <TouchableOpacity 
                  style={styles.leadCardClickableArea}
                  onPress={() => {
                    setSelectedLead(lead);
                    setCurrentScreen('detail');
                  }}
                >
                  <View style={styles.leadCardHeader}>
                    <Text style={styles.leadName}>{lead.name}</Text>
                    <View style={styles.leadScoreBadge}>
                      <Text style={styles.leadScoreText}>{lead.score} pts</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.leadContactInfo}>{lead.phone} • {lead.preferred_destination || 'Abroad'}</Text>
                  
                  <View style={styles.leadBadgesRow}>
                    <TouchableOpacity 
                      style={styles.statusLabelBadgeTouch}
                      onPress={() => {
                        setSelectedLead(lead);
                        setActivePickerType('status');
                      }}
                    >
                      <Text style={styles.statusLabelBadgeText}>{lead.status} ▾</Text>
                    </TouchableOpacity>
                    <Text style={styles.sourceLabelBadge}>{lead.lead_source}</Text>
                  </View>
                </TouchableOpacity>

                {/* Call Shortcut Button */}
                <TouchableOpacity 
                  style={styles.leadCallBtnCircle}
                  onPress={() => triggerCall(lead)}
                >
                  <Phone size={16} color="#6366F1" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.noLeadsText}>No leads assigned to this profile matching query</Text>
        )}
      </ScrollView>
      {renderFeedbackModal()}
    </SafeAreaView>
  );
}

// --- NATIVE STYLESHEET ---
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 15,
    letterSpacing: 1
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5
  },
  headerUser: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#FEF2F2'
  },
  loginWrapper: {
    flex: 1,
    backgroundColor: '#0A0A14',
    justifyContent: 'center',
    alignItems: 'center'
  },
  loginCard: {
    width: '85%',
    padding: 25,
    borderRadius: 25,
    backgroundColor: '#111122',
    borderWidth: 1,
    borderColor: '#1E1E38',
    alignItems: 'center'
  },
  loginIconContainer: {
    padding: 15,
    backgroundColor: '#4F46E5',
    borderRadius: 18,
    marginBottom: 15
  },
  loginTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800'
  },
  loginSubtitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 25
  },
  impersonateTitle: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    alignSelf: 'flex-start'
  },
  profileBtn: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#171730',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#24244E',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  profileBtnName: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold'
  },
  profileBtnRole: {
    color: '#4F46E5',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2
  },
  sandboxDisclaimer: {
    color: '#475569',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 13
  },
  statsSummaryRow: {
    padding: 20,
    flexDirection: 'row',
    gap: 15
  },
  statsSummaryCard: {
    flex: 1,
    padding: 15,
    backgroundColor: '#FFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 }
  },
  statsSummaryLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5
  },
  statsSummaryVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#4F46E5',
    marginTop: 8
  },
  actionHeaderRow: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  listSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A'
  },
  addBtnHeader: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#EEF2FF'
  },
  addBtnHeaderText: {
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '700'
  },
  searchBarContainer: {
    marginHorizontal: 20,
    marginBottom: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center'
  },
  searchIcon: {
    marginRight: 8
  },
  searchTextInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A'
  },
  listScroll: {
    flex: 1,
    paddingHorizontal: 20
  },
  leadItemCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.01,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1 }
  },
  leadCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  leadName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A'
  },
  leadScoreBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: '#F8FAFC'
  },
  leadScoreText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B'
  },
  leadContactInfo: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4
  },
  leadBadgesRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10
  },
  statusLabelBadge: {
    fontSize: 9,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#EEF2FF',
    color: '#4F46E5'
  },
  sourceLabelBadge: {
    fontSize: 9,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    color: '#64748B'
  },
  noLeadsText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 40
  },
  detailHeader: {
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9'
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F172A'
  },
  detailHeaderTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
    maxWidth: '60%'
  },
  scoreCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center'
  },
  scoreCircleText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold'
  },
  detailScroll: {
    flex: 1,
    padding: 15
  },
  leadDetailsBox: {
    backgroundColor: '#FFF',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8'
  },
  detailVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155'
  },
  sourceTextBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4F46E5'
  },
  actionsBarRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 15
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold'
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
    marginBottom: 15
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center'
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#4F46E5'
  },
  tabBtnText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: 'bold'
  },
  tabBtnTextActive: {
    color: '#4F46E5'
  },
  tabContentBox: {
    paddingBottom: 40
  },
  inputFormBox: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 15
  },
  formInputText: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12
  },
  formSubmitBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 15,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  formSubmitBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold'
  },
  noteCard: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10
  },
  noteMeta: {
    fontSize: 9,
    color: '#94A3B8',
    marginBottom: 4
  },
  noteContent: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 20
  },
  taskCard: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8
  },
  taskCardCompleted: {
    opacity: 0.6
  },
  taskLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  taskCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#CBD5E1'
  },
  taskCheckboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981'
  },
  taskCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155'
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#94A3B8'
  },
  chatHistoryWindow: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 15,
    minHeight: 200,
    gap: 8,
    marginBottom: 10
  },
  chatBubble: {
    padding: 10,
    borderRadius: 12,
    maxWidth: '80%'
  },
  chatBubbleOut: {
    backgroundColor: '#10B981',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 0
  },
  chatBubbleIn: {
    backgroundColor: '#334155',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 0
  },
  chatBubbleText: {
    fontSize: 11,
    lineHeight: 14
  },
  chatTextOut: {
    color: '#FFF'
  },
  chatTextIn: {
    color: '#F8FAFC'
  },
  chatSendBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 15,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  inlineAddForm: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    marginHorizontal: 20,
    padding: 15,
    marginBottom: 15,
    maxHeight: 220
  },
  formHeaderTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 10
  },
  formInputInline: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 11,
    color: '#0F172A',
    marginBottom: 8
  },
  submitLeadBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4
  },
  submitLeadBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold'
  },
  leadCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  leadCardClickableArea: {
    flex: 1,
    paddingRight: 10
  },
  leadCallBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E7FF'
  },
  feedbackModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 20
  },
  feedbackModalContent: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 }
  },
  feedbackTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 16,
    letterSpacing: 0.2
  },
  feedbackSectionLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  feedbackNoteInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 12,
    color: '#0F172A',
    textAlignVertical: 'top',
    marginBottom: 16,
    minHeight: 60
  },
  feedbackSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  feedbackSwitchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B'
  },
  customToggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    padding: 2
  },
  customToggleActive: {
    backgroundColor: '#4F46E5'
  },
  customToggleCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF',
    transform: [{ translateX: 0 }]
  },
  customToggleCircleActive: {
    transform: [{ translateX: 20 }]
  },
  reminderContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16
  },
  feedbackSubLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12
  },
  presetBtn: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 8
  },
  presetBtnText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4F46E5'
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginTop: 4
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4
  },
  pickerInput: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
    width: 24,
    textAlign: 'center',
    padding: 0
  },
  pickerSeparator: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: 'bold'
  },
  pickerColon: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: 'bold',
    marginHorizontal: 2
  },
  selectorBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  selectorBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A'
  },
  ampmBtn: {
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4
  },
  ampmBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4F46E5'
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10
  },
  cancelModalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  cancelModalBtnText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700'
  },
  saveFeedbackBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12
  },
  saveFeedbackBtnText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '700'
  },
  detailsRowClickable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8
  },
  pickerValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  pickerChevron: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: 'bold',
    marginTop: -1
  },
  pickerItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#F8FAFC'
  },
  pickerItemRowSelected: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE'
  },
  pickerItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155'
  },
  pickerItemTextSelected: {
    color: '#4F46E5',
    fontWeight: '700'
  },
  horizontalPipelineContainer: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 10
  },
  horizontalPipelineScroll: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  pipelineTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  pipelineTabActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1'
  },
  pipelineTabText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B'
  },
  pipelineTabTextActive: {
    color: '#4F46E5',
    fontWeight: '700'
  },
  statusLabelBadgeTouch: {
    borderRadius: 4,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE'
  },
  statusLabelBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    color: '#4F46E5'
  }
});
