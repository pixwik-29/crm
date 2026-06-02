import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, 
  SafeAreaView, StatusBar, ActivityIndicator, Alert, Linking, Share, Image 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  Phone, MessageSquare, Mail, Tag, Award, User, Clock, Search, 
  Plus, Check, LogOut, ArrowRight, Eye, Shield, Bell, PlusCircle, CheckCircle, Smartphone 
} from 'lucide-react-native';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gkayyfwadwwsucpqeefw.supabase.co';
const supabaseAnonKey = 'sb_publishable_VLg-MNbQe3Q7VrBG_ldcrA_cyTJ7lEv';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

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
  { id: 'user-manager', full_name: 'Rajesh Kumar (Manager)', role: 'manager', phone: '+919876543213' },
  { id: 'user-admin', full_name: 'Nash Newton (Admin)', role: 'admin', phone: '+919876543212' }
];

const DEFAULT_CREDENTIALS = [
  { email: 'nash@pixwik.com', password: 'Pixwik@8899', profileId: 'user-admin', phone: '+919876543212' },
  { email: 'manager@crm.com', password: 'manager123', profileId: 'user-manager', phone: '+919876543213' },
  { email: 'amit@crm.com', password: 'counsellor123', profileId: 'user-counsellor-1', phone: '+919876543210' },
  { email: 'priya@crm.com', password: 'counsellor123', profileId: 'user-counsellor-2', phone: '+919876543211' }
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
  const [profiles, setProfiles] = useState<Profile[]>(MOCK_PROFILES);
  
  // Login input states
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  
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

  // Fetch all live data from Supabase
  const fetchData = async () => {
    try {
      setIsLoading(true);

      // 0. Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);
      await AsyncStorage.setItem('m_profiles', JSON.stringify(profilesData || []));

      // 1. Fetch leads
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (leadsError) throw leadsError;
      setLeads(leadsData || []);
      await AsyncStorage.setItem('m_leads', JSON.stringify(leadsData || []));

      // 2. Fetch notes
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });
      if (notesError) throw notesError;
      setNotes(notesData || []);
      await AsyncStorage.setItem('m_notes', JSON.stringify(notesData || []));

      // 3. Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      if (tasksError) throw tasksError;
      setTasks(tasksData || []);
      await AsyncStorage.setItem('m_tasks', JSON.stringify(tasksData || []));

      // 4. Fetch activity logs
      const { data: logsData, error: logsError } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });
      if (logsError) throw logsError;
      setLogs(logsData || []);
      await AsyncStorage.setItem('m_logs', JSON.stringify(logsData || []));

      // 5. Fetch WhatsApp history
      const { data: chatData, error: chatError } = await supabase
        .from('whatsapp_history')
        .select('*')
        .order('created_at', { ascending: false });
      if (chatError) throw chatError;

      // Remap incoming/outgoing to mobile in/out
      const remappedChat = (chatData || []).map(c => ({
        id: c.id,
        lead_id: c.lead_id,
        direction: c.direction === 'incoming' ? ('in' as const) : ('out' as const),
        text: c.message_text,
        time: new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      setChatHistory(remappedChat);
      await AsyncStorage.setItem('m_chat', JSON.stringify(remappedChat));

    } catch (e: any) {
      console.error("Supabase data fetch error: ", e);
      Alert.alert("Sync Notice", "Failed to sync with server. Running in offline cached mode.");

      // Offline Cache Fallback
      const cachedProfiles = await AsyncStorage.getItem('m_profiles');
      const cachedLeads = await AsyncStorage.getItem('m_leads');
      const cachedNotes = await AsyncStorage.getItem('m_notes');
      const cachedTasks = await AsyncStorage.getItem('m_tasks');
      const cachedLogs = await AsyncStorage.getItem('m_logs');
      const cachedChat = await AsyncStorage.getItem('m_chat');

      if (cachedProfiles) setProfiles(JSON.parse(cachedProfiles));
      if (cachedLeads) setLeads(JSON.parse(cachedLeads));
      if (cachedNotes) setNotes(JSON.parse(cachedNotes));
      if (cachedTasks) setTasks(JSON.parse(cachedTasks));
      if (cachedLogs) setLogs(JSON.parse(cachedLogs));
      if (cachedChat) setChatHistory(JSON.parse(cachedChat));
    } finally {
      setIsLoading(false);
    }
  };

  // Check active session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setCurrentUser(profile as Profile);
            await AsyncStorage.setItem('m_user', JSON.stringify(profile));
          } else {
            setCurrentUser(null);
            await AsyncStorage.removeItem('m_user');
          }
        } else {
          // Check cached session
          const cachedUser = await AsyncStorage.getItem('m_user');
          if (cachedUser) setCurrentUser(JSON.parse(cachedUser));
        }
      } catch (e) {
        console.error("Session check error: ", e);
        const cachedUser = await AsyncStorage.getItem('m_user');
        if (cachedUser) setCurrentUser(JSON.parse(cachedUser));
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  // Fetch live CRM data when user session is loaded/established
  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  // Auth logins helper
  const handleLogin = async (profile: Profile) => {
    setCurrentUser(profile);
    await AsyncStorage.setItem('m_user', JSON.stringify(profile));
  };

  // Sign in via Supabase Email/Password Auth
  const handleMobileLoginSubmit = async () => {
    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanPassword = passwordInput.trim();

    if (!cleanEmail || !cleanPassword) {
      Alert.alert("Missing Credentials", "Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword
      });

      if (error) {
        Alert.alert("Login Failed", error.message);
        setIsSubmitting(false);
        return;
      }

      if (data.session?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .single();

        if (profile) {
          setCurrentUser(profile as Profile);
          await AsyncStorage.setItem('m_user', JSON.stringify(profile));
          setEmailInput('');
          setPasswordInput('');
        } else {
          Alert.alert("Profile Error", "Could not fetch user profile record.");
        }
      }
    } catch (e: any) {
      Alert.alert("System Error", e.message || "Authentication error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendMobileSmsOtp = async () => {
    if (!phoneInput.trim()) {
      Alert.alert("Missing Phone", "Please enter your mobile number.");
      return;
    }
    
    setIsSubmitting(true);
    const cleanInputPhone = phoneInput.replace(/\D/g, '');

    const foundCred = DEFAULT_CREDENTIALS.find(c => {
      if (!c.phone) return false;
      const cleanCredPhone = c.phone.replace(/\D/g, '');
      return cleanCredPhone.endsWith(cleanInputPhone) || cleanInputPhone.endsWith(cleanCredPhone);
    });

    if (!foundCred) {
      Alert.alert("Login Failed", "This mobile number is not registered.");
      setIsSubmitting(false);
      return;
    }

    try {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otpCode);

      // Clean phone for SAP Teleservices API call: start with 91, no leading + or 0
      let cleanPhone = foundCred.phone.replace(/\D/g, '');
      if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone;
      }

      const apiKey = '9cf5318f-903a-11ef-a4f5-e29d2b69142c';
      const templateId = '1707177398599485291';
      const message = `Your OTP for verification is ${otpCode}. It is valid for 1 minutes. Do not share this OTP with anyone. Use this code to validate your mobile number. - PerfectScholar`;
      const encodedMessage = encodeURIComponent(message);
      const sender = 'PFSCLR';
      const routeType = 1;

      const apiUrl = `https://sapteleservices.com/SMS_API/sendsms.php?apikey=${apiKey}&mobile=${cleanPhone}&sendername=${sender}&message=${encodedMessage}&routetype=${routeType}&tid=${templateId}`;

      const res = await fetch(apiUrl, { method: 'GET' });
      const text = await res.text();
      console.log('Mobile SMS Delivery Response:', text);

      setIsOtpSent(true);
      Alert.alert("OTP Sent", `A real 6-digit verification OTP code has been sent via SMS to ${foundCred.phone}.`);
    } catch (e: any) {
      Alert.alert("Delivery Error", e.message || "Failed to deliver SMS. Check internet connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verify Phone OTP and log in to Supabase under the hood
  const verifyMobileSmsOtp = async () => {
    if (!otpInput.trim()) {
      Alert.alert("Missing OTP", "Please enter the verification OTP code.");
      return;
    }

    if (otpInput.trim() === generatedOtp) {
      const cleanInputPhone = phoneInput.replace(/\D/g, '');
      const foundCred = DEFAULT_CREDENTIALS.find(c => {
        if (!c.phone) return false;
        const cleanCredPhone = c.phone.replace(/\D/g, '');
        return cleanCredPhone.endsWith(cleanInputPhone) || cleanInputPhone.endsWith(cleanCredPhone);
      });

      if (foundCred) {
        setIsSubmitting(true);
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: foundCred.email,
            password: foundCred.password
          });

          if (error) {
            Alert.alert("Login Failed", error.message);
            setIsSubmitting(false);
            return;
          }

          if (data.session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.session.user.id)
              .single();

            if (profile) {
              setCurrentUser(profile as Profile);
              await AsyncStorage.setItem('m_user', JSON.stringify(profile));
              // Clear states
              setPhoneInput('');
              setOtpInput('');
              setGeneratedOtp('');
              setIsOtpSent(false);
            } else {
              Alert.alert("Profile Error", "Profile could not be found.");
            }
          }
        } catch (e: any) {
          Alert.alert("System Error", e.message || "Authentication error.");
        } finally {
          setIsSubmitting(false);
        }
      } else {
        Alert.alert("System Error", "Matching credentials not found.");
      }
    } else {
      Alert.alert("Verification Failed", "Incorrect OTP. Please enter the code sent to your mobile phone.");
    }
  };

  // Sign out from Supabase Auth
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Sign out error:", e);
    }
    setCurrentUser(null);
    await AsyncStorage.removeItem('m_user');
  };

  // Lead additions
  const handleAddLead = async () => {
    if (!newLeadName.trim() || !newLeadPhone.trim()) {
      Alert.alert("Missing Fields", "Name and phone are required.");
      return;
    }

    setIsSubmitting(true);
    const parsedNeet = newLeadNeet ? parseInt(newLeadNeet) : null;
    let score = 30;
    if (parsedNeet && parsedNeet > 450) score = 90;
    else if (parsedNeet && parsedNeet > 300) score = 65;

    const leadPayload = {
      name: newLeadName,
      phone: newLeadPhone,
      neet_marks: parsedNeet,
      budget: newLeadBudget ? parseFloat(newLeadBudget) * 100000 : null,
      preferred_destination: newLeadDest || null,
      lead_source: newLeadSource,
      status: '1st followup',
      assigned_counsellor_id: currentUser?.role === 'counsellor' ? currentUser.id : null,
      tags: [newLeadDest].filter(Boolean),
      score
    };

    try {
      const { data: newLead, error } = await supabase
        .from('leads')
        .insert([leadPayload])
        .select()
        .single();

      if (error) throw error;

      // Add activity log
      await supabase.from('activity_logs').insert([{
        lead_id: newLead.id,
        actor_id: currentUser?.id,
        action_type: 'lead_created',
        description: `Lead manually entered via Mobile CRM client`
      }]);

      // Refresh data
      fetchData();

      // Reset fields
      setNewLeadName('');
      setNewLeadPhone('');
      setNewLeadNeet('');
      setNewLeadBudget('');
      setNewLeadDest('');
      setIsAddModalOpen(false);

      Alert.alert("Lead Captured", `${newLead.name} successfully registered.`);
    } catch (e: any) {
      Alert.alert("Create Lead Failed", e.message || "Could not save lead.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Note add
  const handleAddNote = async () => {
    if (!noteText.trim() || !selectedLead) return;

    try {
      const { data: newNote, error } = await supabase
        .from('notes')
        .insert([{
          lead_id: selectedLead.id,
          author_id: currentUser?.id,
          content: noteText
        }])
        .select()
        .single();

      if (error) throw error;

      // Add activity log
      await supabase.from('activity_logs').insert([{
        lead_id: selectedLead.id,
        actor_id: currentUser?.id,
        action_type: 'note_added',
        description: `Note added: "${noteText.substring(0, 20)}..."`
      }]);

      setNoteText('');
      
      // Refresh notes locally
      const { data: updatedNotes } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });
      if (updatedNotes) setNotes(updatedNotes);

      // Refresh logs locally
      const { data: updatedLogs } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });
      if (updatedLogs) setLogs(updatedLogs);

    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save note.");
    }
  };

  // Task add
  const handleAddTask = async () => {
    if (!taskText.trim() || !selectedLead) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .insert([{
          lead_id: selectedLead.id,
          assignee_id: currentUser?.id,
          title: taskText,
          due_date: new Date(Date.now() + 86400000).toISOString(),
          is_completed: false
        }]);

      if (error) throw error;

      setTaskText('');

      // Refresh tasks locally
      const { data: updatedTasks } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      if (updatedTasks) setTasks(updatedTasks);

    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to schedule task.");
    }
  };

  // Toggle Task Completion
  const handleToggleTask = async (id: string) => {
    const taskToToggle = tasks.find(t => t.id === id);
    if (!taskToToggle) return;
    const nextCompleted = !taskToToggle.is_completed;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ is_completed: nextCompleted })
        .eq('id', id);

      if (error) throw error;

      // Add activity log
      await supabase.from('activity_logs').insert([{
        lead_id: taskToToggle.lead_id,
        actor_id: currentUser?.id,
        action_type: 'task_completed',
        description: `Marked task "${taskToToggle.title}" as ${nextCompleted ? 'completed' : 'incomplete'}`
      }]);

      // Update state locally
      setTasks(prev => prev.map(t => t.id === id ? { ...t, is_completed: nextCompleted } : t));
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to toggle task.");
    }
  };

  // Call & WhatsApp native actions
  const triggerCall = async (lead: Lead) => {
    Linking.openURL(`tel:${lead.phone}`).catch(() => {
      Alert.alert("Error", "Unable to trigger dialer actions on this device.");
    });

    try {
      // Log call action in activity logs
      await supabase.from('activity_logs').insert([{
        lead_id: lead.id,
        actor_id: currentUser?.id,
        action_type: 'call_placed',
        description: `Placed phone call to candidate at ${lead.phone}`
      }]);
    } catch (e) {
      console.error("Call placed logging error:", e);
    }

    // Open Call Feedback Modal
    setFeedbackLead(lead);
    setFeedbackNotes('');
    setFeedbackReminder(false);
    
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

  const handleSaveFeedback = async () => {
    if (!feedbackLead) return;

    try {
      // 1. Post internal note
      if (feedbackNotes.trim()) {
        const { error: noteError } = await supabase
          .from('notes')
          .insert([{
            lead_id: feedbackLead.id,
            author_id: currentUser?.id,
            content: `[Call Log Note] ${feedbackNotes}`
          }]);

        if (noteError) throw noteError;

        // Create activity log for note
        await supabase.from('activity_logs').insert([{
          lead_id: feedbackLead.id,
          actor_id: currentUser?.id,
          action_type: 'note_added',
          description: `Note added via post-call feedback: "${feedbackNotes.substring(0, 20)}..."`
        }]);
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
        const dueDate = new Date(`${formattedDate} ${formattedTime}`).toISOString();
        
        const { error: taskError } = await supabase
          .from('tasks')
          .insert([{
            lead_id: feedbackLead.id,
            assignee_id: currentUser?.id,
            title: `Follow-up call scheduled for ${formattedTime}`,
            due_date: dueDate,
            is_completed: false
          }]);

        if (taskError) throw taskError;

        // Create activity log for scheduled reminder
        await supabase.from('activity_logs').insert([{
          lead_id: feedbackLead.id,
          actor_id: currentUser?.id,
          action_type: 'task_scheduled',
          description: `Call follow-up scheduled for ${formattedDate} at ${formattedTime}`
        }]);
      }

      // Refresh data
      fetchData();

      setFeedbackLead(null);
      setFeedbackNotes('');
      setFeedbackReminder(false);
    } catch (e: any) {
      Alert.alert("Feedback Save Error", e.message || "Failed to schedule follow-up details.");
    }
  };

  const handleUpdateLeadField = async (field: 'status' | 'assigned_counsellor_id', value: string | null) => {
    if (!selectedLead) return;
    
    try {
      const { error } = await supabase
        .from('leads')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', selectedLead.id);

      if (error) throw error;

      // Add activity log
      const desc = field === 'status' 
        ? `Pipeline status changed to "${value}"` 
        : `Assigned counsellor changed to "${profiles.find(p => p.id === value)?.full_name || 'Unassigned'}"`;
        
      await supabase.from('activity_logs').insert([{
        lead_id: selectedLead.id,
        actor_id: currentUser?.id,
        action_type: field === 'status' ? 'status_updated' : 'counsellor_assigned',
        description: desc
      }]);

      // Update state locally
      setSelectedLead(prev => prev ? { ...prev, [field]: value } : null);
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, [field]: value } : l));

    } catch (e: any) {
      Alert.alert("Update Failed", e.message || "Could not update lead field.");
    }
  };

  const renderPickerModal = () => {
    if (!activePickerType || !selectedLead) return null;

    const isStatus = activePickerType === 'status';
    const title = isStatus ? 'Change Pipeline Status' : 'Assign Counsellor';
    const options = isStatus 
      ? PIPELINE_STAGES 
      : [...profiles.filter(p => p.role === 'counsellor').map(p => ({ id: p.id, name: p.full_name })), { id: null, name: 'Unassigned' }];

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
  const handleSendWhatsAppSim = async () => {
    if (!chatInput.trim() || !selectedLead) return;

    const messageText = chatInput;
    setChatInput('');

    try {
      // 1. Insert outgoing message to Supabase
      const { data: newMsg, error } = await supabase
        .from('whatsapp_history')
        .insert([{
          lead_id: selectedLead.id,
          direction: 'outgoing',
          message_text: messageText,
          status: 'sent'
        }])
        .select()
        .single();

      if (error) throw error;

      // Add activity log
      await supabase.from('activity_logs').insert([{
        lead_id: selectedLead.id,
        actor_id: currentUser?.id,
        action_type: 'whatsapp_sent',
        description: `Sent custom WhatsApp reply: "${messageText.substring(0, 30)}..."`
      }]);

      // Remap and update local state
      const remappedNewMsg = {
        id: newMsg.id,
        lead_id: newMsg.lead_id,
        direction: 'out' as const,
        text: newMsg.message_text,
        time: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatHistory(prev => [...prev, remappedNewMsg]);

      // 2. Chatbot reply simulation after 2.5 seconds
      setTimeout(async () => {
        try {
          const replyText = "Got your message. I am currently out with my parents, but I will check the college brochures by tonight. Thank you!";
          
          const { data: botMsg } = await supabase
            .from('whatsapp_history')
            .insert([{
              lead_id: selectedLead.id,
              direction: 'incoming',
              message_text: replyText,
              status: 'read'
            }])
            .select()
            .single();

          if (botMsg) {
            const remappedIncoming = {
              id: botMsg.id,
              lead_id: botMsg.lead_id,
              direction: 'in' as const,
              text: botMsg.message_text,
              time: new Date(botMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setChatHistory(prev => [...prev, remappedIncoming]);
            Alert.alert(`📱 New reply from ${selectedLead.name}`, "Check the WhatsApp chat log in details tab.");
          }
        } catch (botErr) {
          console.error("Bot simulation save error:", botErr);
        }
      }, 2500);

    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to send simulated WhatsApp message.");
    }
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
        <ScrollView contentContainerStyle={styles.loginScrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.loginCard}>
            <Image 
              source={require('./assets/logo.png')} 
              style={styles.loginLogoImage} 
            />
            <Text style={styles.loginTitle}>Perfect Scholar</Text>
            <Text style={styles.loginSubtitle}>Lead Management System</Text>

            <View style={styles.loginForm}>
              {/* Method Selector Tabs */}
              <View style={styles.loginTabsRow}>
                <TouchableOpacity 
                  style={[styles.loginTabButton, loginMethod === 'email' && styles.loginTabButtonActive]}
                  onPress={() => { setLoginMethod('email'); }}
                >
                  <Text style={[styles.loginTabButtonText, loginMethod === 'email' && styles.loginTabButtonTextActive]}>Email</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.loginTabButton, loginMethod === 'phone' && styles.loginTabButtonActive]}
                  onPress={() => { setLoginMethod('phone'); }}
                >
                  <Text style={[styles.loginTabButtonText, loginMethod === 'phone' && styles.loginTabButtonTextActive]}>Phone OTP</Text>
                </TouchableOpacity>
              </View>

              {loginMethod === 'email' ? (
                <View>
                  <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                  <TextInput 
                    style={styles.loginInput}
                    placeholder="Enter your email address"
                    placeholderTextColor="#64748B"
                    value={emailInput}
                    onChangeText={setEmailInput}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />

                  <Text style={styles.inputLabel}>PASSWORD</Text>
                  <View style={styles.passwordInputContainer}>
                    <TextInput 
                      style={styles.loginPasswordInput}
                      placeholder="Enter password"
                      placeholderTextColor="#64748B"
                      value={passwordInput}
                      onChangeText={setPasswordInput}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity 
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.showPasswordBtn}
                    >
                      <Text style={styles.showPasswordBtnText}>{showPassword ? "Hide" : "Show"}</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity 
                    style={styles.loginSubmitBtn}
                    onPress={handleMobileLoginSubmit}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.loginSubmitBtnText}>Sign In to Workspace</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  {!isOtpSent ? (
                    <View>
                      <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
                      <TextInput 
                        style={styles.loginInput}
                        placeholder="e.g. 9876543210"
                        placeholderTextColor="#64748B"
                        value={phoneInput}
                        onChangeText={setPhoneInput}
                        keyboardType="phone-pad"
                      />

                      <TouchableOpacity 
                        style={styles.loginSubmitBtn}
                        onPress={sendMobileSmsOtp}
                        disabled={isSubmitting}
                      >
                        <Text style={styles.loginSubmitBtnText}>Send OTP Code</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View>
                      <Text style={styles.inputLabel}>ENTER OTP CODE</Text>
                      <TextInput 
                        style={[styles.loginInput, { letterSpacing: 6, textAlign: 'center', fontWeight: 'bold' }]}
                        placeholder="Enter 6-digit OTP"
                        placeholderTextColor="#64748B"
                        value={otpInput}
                        onChangeText={setOtpInput}
                        keyboardType="number-pad"
                        maxLength={6}
                      />

                      <TouchableOpacity 
                        style={[styles.loginSubmitBtn, { backgroundColor: '#10B981' }]}
                        onPress={verifyMobileSmsOtp}
                        disabled={isSubmitting}
                      >
                        <Text style={styles.loginSubmitBtnText}>Verify & Sign In</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.changePhoneBtn}
                        onPress={() => {
                          setIsOtpSent(false);
                          setOtpInput('');
                        }}
                      >
                        <Text style={styles.changePhoneBtnText}>Change Phone Number</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>


            <Text style={styles.sandboxDisclaimer}>
              Workspace accounts: admin@crm.com, manager@crm.com, amit@crm.com. Protected with secure offline credential matching.
            </Text>
          </View>
        </ScrollView>
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
                    {profiles.find(p => p.id === selectedLead.assigned_counsellor_id)?.full_name || 'Unassigned'}
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
          <Text style={styles.headerTitle}>Perfect Scholar CRM</Text>
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
    backgroundColor: '#0A0A14'
  },
  loginScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    width: '100%'
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
  loginLogoImage: {
    width: 130,
    height: 130,
    resizeMode: 'contain',
    marginBottom: 10
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
  loginForm: {
    width: '100%',
    marginTop: 20
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: 'uppercase'
  },
  loginInput: {
    backgroundColor: '#1E1E38',
    borderWidth: 1,
    borderColor: '#24244E',
    borderRadius: 12,
    color: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 13,
    marginBottom: 16
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E38',
    borderWidth: 1,
    borderColor: '#24244E',
    borderRadius: 12,
    marginBottom: 20
  },
  loginPasswordInput: {
    flex: 1,
    color: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 13
  },
  showPasswordBtn: {
    paddingHorizontal: 12
  },
  showPasswordBtnText: {
    color: '#6366F1',
    fontSize: 11,
    fontWeight: 'bold'
  },
  loginSubmitBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loginSubmitBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold'
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
  },
  loginTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    marginBottom: 20,
    width: '100%',
  },
  loginTabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  loginTabButtonActive: {
    borderBottomColor: '#4F46E5',
  },
  loginTabButtonText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  loginTabButtonTextActive: {
    color: '#4F46E5',
  },
  changePhoneBtn: {
    marginTop: 15,
    alignItems: 'center',
  },
  changePhoneBtnText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  }
});

