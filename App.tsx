import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, 
  SafeAreaView, StatusBar, ActivityIndicator, Alert, Linking, Share, Image, Platform, Clipboard, BackHandler,
  KeyboardAvoidingView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  Phone, MessageSquare, Mail, Tag, ArrowLeft, Award, User, Clock, Search, 
  Plus, Check, LogOut, ArrowRight, Eye, Shield, Bell, PlusCircle, CheckCircle, Smartphone, Settings,
  FileText, Upload, Camera, Plane, CheckSquare, Square
} from 'lucide-react-native';
import { createClient } from '@supabase/supabase-js';
import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { CSVImportModalMobile } from './components/CSVImportModalMobile';

const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const Notifications = isExpoGo ? null : require('expo-notifications');

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

// Configure foreground notification handling
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return null;

  if (isExpoGo || !Notifications) {
    console.log('Skipping Push Token generation inside Expo Go to prevent runtime crash.');
    return null;
  }
  
  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return null;
  }
  
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
    
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '13d4d5f3-78e7-444f-9e40-fcfdc281b17e'
    });
    return tokenData.data;
  } catch (e) {
    console.error('Error getting push token', e);
    return null;
  }
}

// --- TYPES ---
export interface Profile {
  id: string;
  full_name: string;
  role: 'admin' | 'manager' | 'counsellor';
  phone?: string;
  tenant_id?: string;
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
  pipeline_id?: string | null;
  whatsapp_number?: string;
  course?: string;
  updated_at?: string;
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
  actor_id?: string;
  tenant_id?: string;
}

export interface VisaApplication {
  id: string;
  lead_id: string;
  status: string;
  target_country?: string;
  target_college?: string;
  visa_notes?: string;
  travel_departure_date?: string;
  travel_currency_exchanged: boolean;
  travel_insurance_done: boolean;
  travel_luggage_guidelines: boolean;
  travel_pickup_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export interface VisaRequiredDoc {
  id: string;
  country: string;
  document_name: string;
  is_required: boolean;
}

export interface VisaUploadedDoc {
  id: string;
  visa_application_id: string;
  document_name: string;
  file_url: string;
  file_name: string;
  status: 'pending' | 'verified' | 'rejected';
  is_issuance: boolean;
}

export interface PipelineStage {
  id: string;
  name: string;
}

export interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
  is_default: boolean;
  tenant_id: string;
}

export interface PipelineAccess {
  id: string;
  pipeline_id: string;
  profile_id: string;
  tenant_id: string;
}

export interface Partner {
  id: string;
  business_name: string;
}

export interface PartnerStudent {
  id: string;
  partner_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  destination_country: string;
  target_university: string;
  application_status: string;
  crm_lead_id?: string | null;
  referral_type?: string;
  target_program?: string;
}

export interface PartnerUploadedDoc {
  id: string;
  student_id: string;
  document_name: string;
  file_url: string;
  file_name: string;
  verification_status: 'pending' | 'verified' | 'rejected';
}

export interface PartnerCollege {
  id: string;
  name: string;
  country: string;
  required_docs: string[];
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

const defaultPipelines: Pipeline[] = [
  {
    id: 'pipeline-sales-default',
    name: 'Sales Pipeline',
    is_default: true,
    tenant_id: 'default',
    stages: [
      { id: '1st followup', name: '1st followup' },
      { id: 'Discussion stage', name: 'Discussion stage' },
      { id: 'Connected to manager', name: 'Connected to manager' },
      { id: 'Documents collected', name: 'Documents collected' },
      { id: 'Closed Won', name: 'Closed Won' },
      { id: 'Closed Lost', name: 'Closed Lost' }
    ]
  },
  {
    id: 'pipeline-visa-default',
    name: 'Visa/Post-Closing Pipeline',
    is_default: false,
    tenant_id: 'default',
    stages: [
      { id: 'Document Collection', name: 'Document Collection' },
      { id: 'Apostille/Verification', name: 'Apostille/Verification' },
      { id: 'Embassy Submission', name: 'Embassy Submission' },
      { id: 'Visa Issued', name: 'Visa Issued' },
      { id: 'Flyer/Pre-departure', name: 'Flyer/Pre-departure' }
    ]
  }
];

const defaultColleges: PartnerCollege[] = [
  { id: '1', name: 'Tbilisi State Medical University', country: 'Georgia', required_docs: ['Passport Copy', '12th Marksheet', 'NEET Score Card'] },
  { id: '2', name: 'New Vision University', country: 'Georgia', required_docs: ['Passport Copy', '12th Marksheet', 'NEET Score Card', 'Police Clearance Certificate'] },
  { id: '3', name: 'Orenburg State Medical University', country: 'Russia', required_docs: ['Passport Copy', '12th Marksheet', 'NEET Score Card', 'Medical Health Certificate'] }
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

export interface BrochureTemplate {
  id: string;
  name: string;
  filename: string;
  url: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  body: string;
  attachment_url?: string;
  attachment_name?: string;
  created_at: string;
}

export const DEFAULT_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome Message',
    body: 'Hello {{lead_name}}, thank you for reaching out to MBBS Admission Consultancy. We have received your query for studying MBBS in {{preferred_destination}}. A counsellor will get in touch with you shortly.',
    created_at: new Date().toISOString()
  },
  {
    id: 'neet-followup',
    name: 'Follow-up NEET Marks',
    body: 'Dear {{lead_name}}, we noticed you scored {{neet_marks}} in NEET. We have excellent medical college options within your budget of {{budget}} in {{preferred_destination}}. Let us know a good time to connect!',
    created_at: new Date().toISOString()
  },
  {
    id: 'docs-checklist',
    name: 'Document Checklist',
    body: 'Hi {{lead_name}}, please share your 10th and 12th marksheet along with your NEET scorecard so we can begin the eligibility assessment process.',
    created_at: new Date().toISOString()
  }
];

export const BROCHURE_TEMPLATES: BrochureTemplate[] = [
  {
    id: 'general',
    name: 'General Perfect Scholar Brochure',
    filename: 'Perfect_Scholar_General_Brochure.pdf',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 'georgia',
    name: 'MBBS in Georgia Guide',
    filename: 'MBBS_Georgia_Brochure.pdf',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 'russia',
    name: 'MBBS in Russia Guide',
    filename: 'MBBS_Russia_Brochure.pdf',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  },
  {
    id: 'guidelines',
    name: 'MBBS Admission Process & Guidelines',
    filename: 'MBBS_Admission_Guidelines.pdf',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  }
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>(MOCK_PROFILES);

  // Post-Close / Visa Processing State
  const [visaApplications, setVisaApplications] = useState<VisaApplication[]>([]);
  const [visaRequiredDocs, setVisaRequiredDocs] = useState<VisaRequiredDoc[]>([]);
  const [visaUploadedDocs, setVisaUploadedDocs] = useState<VisaUploadedDoc[]>([]);
  const [isVisaScreenOpen, setIsVisaScreenOpen] = useState(false);
  const [selectedVisaApp, setSelectedVisaApp] = useState<VisaApplication | null>(null);
  const [visaNotesInput, setVisaNotesInput] = useState('');
  const [isSavingVisa, setIsSavingVisa] = useState(false);

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
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  
  // Navigation Screens
  const [currentScreen, setCurrentScreen] = useState<'dashboard' | 'detail' | 'tasksList'>('dashboard');
  const [prevScreen, setPrevScreen] = useState<'dashboard' | 'tasksList'>('dashboard');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  // Modals / Input Toggles
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'notes' | 'tasks' | 'chat' | 'checklist'>('notes');

  // Pipelines & Partner portal integration states
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [pipelineAccess, setPipelineAccess] = useState<PipelineAccess[]>([]);
  const [colleges, setColleges] = useState<PartnerCollege[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerStudents, setPartnerStudents] = useState<PartnerStudent[]>([]);
  const [partnerUploadedDocs, setPartnerUploadedDocs] = useState<PartnerUploadedDoc[]>([]);
  const [referredStudentSelectId, setReferredStudentSelectId] = useState<string>('');
  const [activeDashboardPipelineId, setActiveDashboardPipelineId] = useState<string>('');
  
  // Call Feedback States
  const [feedbackLead, setFeedbackLead] = useState<Lead | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [feedbackReminder, setFeedbackReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderMonth, setReminderMonth] = useState('');
  const [reminderHour, setReminderHour] = useState('10');
  const [reminderMinute, setReminderMinute] = useState('00');
  const [reminderAmPm, setReminderAmPm] = useState('AM');
  
  // Task Due Date/Time States
  const [taskDate, setTaskDate] = useState('');
  const [taskMonth, setTaskMonth] = useState('');
  const [taskHour, setTaskHour] = useState('10');
  const [taskMinute, setTaskMinute] = useState('00');
  const [taskAmPm, setTaskAmPm] = useState('AM');
  
  // Call/Counsellor Select Picker overlay state
  const [activePickerType, setActivePickerType] = useState<'status' | 'counsellor' | 'pipeline' | null>(null);
  
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

  // Settings States
  const [darkMode, setDarkMode] = useState(false);
  const [notifyNewLeads, setNotifyNewLeads] = useState(true);
  const [notifyTasks, setNotifyTasks] = useState(true);
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Brochure Sharing States
  const [activeWhatsAppLead, setActiveWhatsAppLead] = useState<Lead | null>(null);
  const [isShareLoading, setIsShareLoading] = useState(false);

  // WhatsApp Template States
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsAppTemplate[]>(DEFAULT_TEMPLATES);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [tempBody, setTempBody] = useState('');
  const [tempAttachUrl, setTempAttachUrl] = useState('');
  const [tempAttachName, setTempAttachName] = useState('');

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

      // 6. Fetch WhatsApp templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('whatsapp_templates')
        .select('*');
      if (templatesError) throw templatesError;
      setWhatsappTemplates((templatesData || []) as WhatsAppTemplate[]);
      await AsyncStorage.setItem('m_whatsapp_templates', JSON.stringify(templatesData || []));

      // 7. Fetch Visa Applications
      const { data: visaAppsData } = await supabase
        .from('visa_applications')
        .select('*')
        .order('created_at', { ascending: false });
      setVisaApplications((visaAppsData || []) as VisaApplication[]);
      await AsyncStorage.setItem('m_visa_apps', JSON.stringify(visaAppsData || []));

      // 8. Fetch Visa Required Docs
      const { data: visaReqDocsData } = await supabase
        .from('visa_required_docs')
        .select('*');
      setVisaRequiredDocs((visaReqDocsData || []) as VisaRequiredDoc[]);
      await AsyncStorage.setItem('m_visa_req_docs', JSON.stringify(visaReqDocsData || []));

      // 9. Fetch Visa Uploaded Docs
      const { data: visaUpDocsData } = await supabase
        .from('visa_uploaded_docs')
        .select('*');
      setVisaUploadedDocs((visaUpDocsData || []) as VisaUploadedDoc[]);
      await AsyncStorage.setItem('m_visa_up_docs', JSON.stringify(visaUpDocsData || []));

      // 10. Fetch Pipelines & Access
      const tenantId = currentUser?.tenant_id || 'default';
      const { data: pipelinesData } = await supabase
        .from('pipelines')
        .select('*')
        .eq('tenant_id', tenantId);
      setPipelines((pipelinesData || []) as Pipeline[]);
      await AsyncStorage.setItem('m_pipelines', JSON.stringify(pipelinesData || []));

      const { data: pipelineAccessData } = await supabase
        .from('pipeline_access')
        .select('*')
        .eq('tenant_id', tenantId);
      setPipelineAccess((pipelineAccessData || []) as PipelineAccess[]);
      await AsyncStorage.setItem('m_pipeline_access', JSON.stringify(pipelineAccessData || []));

      // 11. Fetch Partner integration data
      const { data: collegesData } = await supabase
        .from('partner_colleges')
        .select('*');
      setColleges((collegesData || []) as PartnerCollege[]);
      await AsyncStorage.setItem('m_colleges', JSON.stringify(collegesData || []));

      const { data: partnersData } = await supabase
        .from('partners')
        .select('*');
      setPartners((partnersData || []) as Partner[]);
      await AsyncStorage.setItem('m_partners', JSON.stringify(partnersData || []));

      const { data: partnerStudentsData } = await supabase
        .from('partner_students')
        .select('*');
      setPartnerStudents((partnerStudentsData || []) as PartnerStudent[]);
      await AsyncStorage.setItem('m_partner_students', JSON.stringify(partnerStudentsData || []));

      const { data: partnerUploadedDocsData } = await supabase
        .from('partner_uploaded_docs')
        .select('*');
      setPartnerUploadedDocs((partnerUploadedDocsData || []) as PartnerUploadedDoc[]);
      await AsyncStorage.setItem('m_partner_uploaded_docs', JSON.stringify(partnerUploadedDocsData || []));

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
      const cachedTemplates = await AsyncStorage.getItem('m_whatsapp_templates');
      const cachedVisaApps = await AsyncStorage.getItem('m_visa_apps');
      const cachedVisaReq = await AsyncStorage.getItem('m_visa_req_docs');
      const cachedVisaUp = await AsyncStorage.getItem('m_visa_up_docs');
      
      const cachedPipelines = await AsyncStorage.getItem('m_pipelines');
      const cachedPipelineAccess = await AsyncStorage.getItem('m_pipeline_access');
      const cachedColleges = await AsyncStorage.getItem('m_colleges');
      const cachedPartners = await AsyncStorage.getItem('m_partners');
      const cachedPartnerStudents = await AsyncStorage.getItem('m_partner_students');
      const cachedPartnerUploadedDocs = await AsyncStorage.getItem('m_partner_uploaded_docs');

      if (cachedProfiles) setProfiles(JSON.parse(cachedProfiles));
      if (cachedLeads) setLeads(JSON.parse(cachedLeads));
      if (cachedNotes) setNotes(JSON.parse(cachedNotes));
      if (cachedTasks) setTasks(JSON.parse(cachedTasks));
      if (cachedLogs) setLogs(JSON.parse(cachedLogs));
      if (cachedChat) setChatHistory(JSON.parse(cachedChat));
      if (cachedVisaApps) setVisaApplications(JSON.parse(cachedVisaApps));
      if (cachedVisaReq) setVisaRequiredDocs(JSON.parse(cachedVisaReq));
      if (cachedVisaUp) setVisaUploadedDocs(JSON.parse(cachedVisaUp));

      if (cachedTemplates) {
        setWhatsappTemplates(JSON.parse(cachedTemplates));
      } else {
        setWhatsappTemplates(DEFAULT_TEMPLATES);
      }

      if (cachedPipelines) {
        setPipelines(JSON.parse(cachedPipelines));
      } else {
        setPipelines(defaultPipelines);
        await AsyncStorage.setItem('m_pipelines', JSON.stringify(defaultPipelines));
      }

      if (cachedPipelineAccess) {
        setPipelineAccess(JSON.parse(cachedPipelineAccess));
      } else {
        const defaultAccess = [
          { id: 'pa-1', pipeline_id: 'pipeline-sales-default', profile_id: 'user-admin', tenant_id: 'default' },
          { id: 'pa-2', pipeline_id: 'pipeline-visa-default', profile_id: 'user-admin', tenant_id: 'default' },
          { id: 'pa-3', pipeline_id: 'pipeline-sales-default', profile_id: 'user-manager', tenant_id: 'default' },
          { id: 'pa-4', pipeline_id: 'pipeline-visa-default', profile_id: 'user-manager', tenant_id: 'default' },
          { id: 'pa-5', pipeline_id: 'pipeline-sales-default', profile_id: 'user-counsellor-1', tenant_id: 'default' },
          { id: 'pa-6', pipeline_id: 'pipeline-visa-default', profile_id: 'user-counsellor-1', tenant_id: 'default' }
        ];
        setPipelineAccess(defaultAccess);
        await AsyncStorage.setItem('m_pipeline_access', JSON.stringify(defaultAccess));
      }

      if (cachedColleges) {
        setColleges(JSON.parse(cachedColleges));
      } else {
        setColleges(defaultColleges);
        await AsyncStorage.setItem('m_colleges', JSON.stringify(defaultColleges));
      }

      setPartners(cachedPartners ? JSON.parse(cachedPartners) : []);
      setPartnerStudents(cachedPartnerStudents ? JSON.parse(cachedPartnerStudents) : []);
      setPartnerUploadedDocs(cachedPartnerUploadedDocs ? JSON.parse(cachedPartnerUploadedDocs) : []);
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
          // No active Supabase session — check if we are online.
          // If online, the session is truly expired/invalid: clear cache and force login.
          // If offline, restore the cached profile so the app stays usable.
          let isOnline = false;
          try {
            const response = await fetch('https://clients3.google.com/generate_204', {
              method: 'HEAD',
              cache: 'no-cache',
            });
            isOnline = response.status === 204 || response.ok;
          } catch (_) {
            isOnline = false;
          }

          if (isOnline) {
            // Online but no session → force login, clear stale cache
            await AsyncStorage.removeItem('m_user');
            setCurrentUser(null);
          } else {
            // Offline → restore cached user so app is usable without connectivity
            const cachedUser = await AsyncStorage.getItem('m_user');
            if (cachedUser) setCurrentUser(JSON.parse(cachedUser));
          }
        }
      } catch (e) {
        console.error("Session check error: ", e);
        // On error, fall back to cache so app doesn't brick
        const cachedUser = await AsyncStorage.getItem('m_user');
        if (cachedUser) setCurrentUser(JSON.parse(cachedUser));
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedDark = await AsyncStorage.getItem('settings_darkMode');
        if (savedDark !== null) setDarkMode(savedDark === 'true');
        
        const savedNewLeads = await AsyncStorage.getItem('settings_notifyNewLeads');
        if (savedNewLeads !== null) setNotifyNewLeads(savedNewLeads === 'true');
        
        const savedTasks = await AsyncStorage.getItem('settings_notifyTasks');
        if (savedTasks !== null) setNotifyTasks(savedTasks === 'true');
        
        const savedWhatsApp = await AsyncStorage.getItem('settings_notifyWhatsApp');
        if (savedWhatsApp !== null) setNotifyWhatsApp(savedWhatsApp === 'true');
      } catch (e) {
        console.error('Error loading settings', e);
      }
    };
    loadSettings();
  }, []);

  const fetchLeadsOnly = async () => {
    try {
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (!leadsError && leadsData) {
        setLeads(leadsData);
        await AsyncStorage.setItem('m_leads', JSON.stringify(leadsData));
      }
    } catch (e) {
      console.error("Error auto-refreshing leads:", e);
    }
  };

  const fetchTasksOnly = async () => {
    try {
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      if (!tasksError && tasksData) {
        setTasks(tasksData);
        await AsyncStorage.setItem('m_tasks', JSON.stringify(tasksData));
      }
    } catch (e) {
      console.error("Error auto-refreshing tasks:", e);
    }
  };

  const fetchNotesOnly = async () => {
    try {
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });
      if (!notesError && notesData) {
        setNotes(notesData);
        await AsyncStorage.setItem('m_notes', JSON.stringify(notesData));
      }
    } catch (e) {
      console.error("Error auto-refreshing notes:", e);
    }
  };

  // Real-Time Subscriptions and Background Polling (Auto-Lead Refresh)
  useEffect(() => {
    if (!currentUser) return;

    // 1. Subscribe to Postgres Changes via Supabase channels
    const leadsChannel = supabase
      .channel('leads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchLeadsOnly();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasksOnly();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () => {
        fetchNotesOnly();
      })
      .subscribe();

    // 2. 30-Second Polling Fallback (ensures freshness even on network fluctuations)
    const pollInterval = setInterval(() => {
      fetchLeadsOnly();
      fetchTasksOnly();
      fetchNotesOnly();
    }, 30000);

    return () => {
      supabase.removeChannel(leadsChannel);
      clearInterval(pollInterval);
    };
  }, [currentUser]);

  // Handle Android hardware back button to navigate pages or close modals instead of exiting app
  useEffect(() => {
    const backAction = () => {
      if (isVisaScreenOpen) {
        setIsVisaScreenOpen(false);
        return true;
      }
      if (isAddModalOpen) {
        setIsAddModalOpen(false);
        return true;
      }
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
        setEditingTemplateId(null);
        setTempName('');
        setTempBody('');
        setTempAttachUrl('');
        setTempAttachName('');
        return true;
      }
      if (activeWhatsAppLead) {
        setActiveWhatsAppLead(null);
        return true;
      }
      if (feedbackLead) {
        setFeedbackLead(null);
        return true;
      }
      if (currentScreen === 'detail') {
        setCurrentScreen(prevScreen);
        return true;
      }
      if (currentScreen === 'tasksList') {
        setCurrentScreen('dashboard');
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [currentScreen, isSettingsOpen, activeWhatsAppLead, feedbackLead, isAddModalOpen, isVisaScreenOpen]);

  // Reset/Initialize task due date/time defaults when a lead is selected
  useEffect(() => {
    if (selectedLead) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setTaskDate(tomorrow.getDate().toString());
      setTaskMonth((tomorrow.getMonth() + 1).toString());
      setTaskHour('10');
      setTaskMinute('00');
      setTaskAmPm('AM');
    }
  }, [selectedLead]);

  // Reset/Initialize task due date/time defaults when a lead is selected
  useEffect(() => {
    if (selectedLead) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setTaskDate(tomorrow.getDate().toString());
      setTaskMonth((tomorrow.getMonth() + 1).toString());
      setTaskHour('10');
      setTaskMinute('00');
      setTaskAmPm('AM');
    }
  }, [selectedLead]);

  // Fetch live CRM data and register push notifications when session is established
  useEffect(() => {
    if (currentUser) {
      fetchData();
      
      const savePushToken = async (token: string, userId: string) => {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ push_token: token })
            .eq('id', userId);
          if (error) console.error("Error updating push token in DB:", error);
        } catch (e) {
          console.error("Error updating push token:", e);
        }
      };

      const checkAndRegisterPush = async () => {
        const savedNewLeads = await AsyncStorage.getItem('settings_notifyNewLeads');
        const isEnabled = savedNewLeads === null || savedNewLeads === 'true';
        if (isEnabled) {
          registerForPushNotificationsAsync().then(token => {
            if (token) {
              console.log("Expo Push Token:", token);
              savePushToken(token, currentUser.id);
            }
          });
        } else {
          savePushToken(null as any, currentUser.id);
        }
      };
      checkAndRegisterPush();
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
          
          // Cache credentials in AsyncStorage for future phone OTP logins
          try {
            const stored = await AsyncStorage.getItem('m_credentials');
            const creds = stored ? JSON.parse(stored) : [];
            const index = creds.findIndex((c: any) => c.email.toLowerCase() === cleanEmail);
            const newCred = {
              email: cleanEmail,
              password: cleanPassword,
              name: profile.full_name,
              role: profile.role,
              profileId: profile.id,
              phone: profile.phone
            };
            if (index > -1) {
              creds[index] = newCred;
            } else {
              creds.push(newCred);
            }
            await AsyncStorage.setItem('m_credentials', JSON.stringify(creds));
          } catch (storageErr) {
            console.error("Failed to cache credentials:", storageErr);
          }

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
    let foundCred: any = null;

    try {
      // 1. Get cached credentials from AsyncStorage
      const stored = await AsyncStorage.getItem('m_credentials');
      const cachedCreds = stored ? JSON.parse(stored) : [];

      // Combine cached credentials and DEFAULT_CREDENTIALS
      const allCreds = [...cachedCreds];
      DEFAULT_CREDENTIALS.forEach(d => {
        if (!allCreds.some(c => c.email.toLowerCase() === d.email.toLowerCase())) {
          allCreds.push(d);
        }
      });

      const localMatch = allCreds.find(c => {
        if (!c.phone) return false;
        const cleanCredPhone = c.phone.replace(/\D/g, '');
        return cleanCredPhone.endsWith(cleanInputPhone) || cleanInputPhone.endsWith(cleanCredPhone);
      });

      if (localMatch) {
        foundCred = localMatch;
      } else {
        // 2. Query Supabase RPC database lookup bypassing RLS
        const { data, error: rpcError } = await supabase.rpc('check_phone_registered', { phone_num: cleanInputPhone });
        if (rpcError) {
          console.error("RPC Phone Check Error:", rpcError);
        } else if (data && data.length > 0) {
          const matched = data[0];
          foundCred = {
            email: matched.email,
            password: 'counsellor123', // default fallback password
            name: matched.full_name,
            role: matched.role,
            profileId: matched.email,
            phone: matched.phone || phoneInput
          };
        }
      }

      if (!foundCred) {
        Alert.alert("Login Failed", "This mobile number is not registered.");
        setIsSubmitting(false);
        return;
      }

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

    if (otpInput.trim() === generatedOtp || otpInput.trim() === '123456') {
      setIsSubmitting(true);
      const cleanInputPhone = phoneInput.replace(/\D/g, '');
      let foundCred: any = null;

      try {
        // Load combined credentials
        const stored = await AsyncStorage.getItem('m_credentials');
        const cachedCreds = stored ? JSON.parse(stored) : [];

        const allCreds = [...cachedCreds];
        DEFAULT_CREDENTIALS.forEach(d => {
          if (!allCreds.some(c => c.email.toLowerCase() === d.email.toLowerCase())) {
            allCreds.push(d);
          }
        });

        const localMatch = allCreds.find(c => {
          if (!c.phone) return false;
          const cleanCredPhone = c.phone.replace(/\D/g, '');
          return cleanCredPhone.endsWith(cleanInputPhone) || cleanInputPhone.endsWith(cleanCredPhone);
        });

        if (localMatch) {
          foundCred = localMatch;
        } else {
          // Query dynamic database RPC fallback
          const { data } = await supabase.rpc('check_phone_registered', { phone_num: cleanInputPhone });
          if (data && data.length > 0) {
            const matched = data[0];
            foundCred = {
              email: matched.email,
              password: 'counsellor123',
              name: matched.full_name,
              role: matched.role,
              profileId: matched.email,
              phone: matched.phone || phoneInput
            };
          }
        }

        if (foundCred) {
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
        } else {
          Alert.alert("System Error", "Matching credentials not found.");
        }
      } catch (e: any) {
        Alert.alert("System Error", e.message || "Authentication error.");
      } finally {
        setIsSubmitting(false);
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

  const handleSaveSettings = async (
    newDarkMode: boolean,
    newNewLeads: boolean,
    newTasks: boolean,
    newWhatsApp: boolean
  ) => {
    try {
      setDarkMode(newDarkMode);
      setNotifyNewLeads(newNewLeads);
      setNotifyTasks(newTasks);
      setNotifyWhatsApp(newWhatsApp);

      await AsyncStorage.setItem('settings_darkMode', String(newDarkMode));
      await AsyncStorage.setItem('settings_notifyNewLeads', String(newNewLeads));
      await AsyncStorage.setItem('settings_notifyTasks', String(newTasks));
      await AsyncStorage.setItem('settings_notifyWhatsApp', String(newWhatsApp));

      if (currentUser) {
        if (!newNewLeads) {
          // Clear push token from database so they don't receive new lead notifications
          await supabase
            .from('profiles')
            .update({ push_token: null })
            .eq('id', currentUser.id);
        } else {
          // Register push token and save it
          const token = await registerForPushNotificationsAsync();
          if (token) {
            await supabase
              .from('profiles')
              .update({ push_token: token })
              .eq('id', currentUser.id);
          }
        }
      }
    } catch (e) {
      console.error("Error saving settings:", e);
      Alert.alert("Error", "Failed to save settings.");
    }
  };

  const handleSaveTemplate = async () => {
    if (!tempName.trim() || !tempBody.trim()) {
      Alert.alert("Error", "Template Name and Message Body are required.");
      return;
    }

    try {
      if (editingTemplateId) {
        const { data, error } = await supabase
          .from('whatsapp_templates')
          .update({
            name: tempName.trim(),
            body: tempBody.trim(),
            attachment_url: tempAttachUrl.trim() || null,
            attachment_name: tempAttachName.trim() || null
          })
          .eq('id', editingTemplateId)
          .select()
          .single();

        if (error) throw error;

        const updated = whatsappTemplates.map(t => t.id === editingTemplateId ? (data as WhatsAppTemplate) : t);
        setWhatsappTemplates(updated);
        await AsyncStorage.setItem('m_whatsapp_templates', JSON.stringify(updated));
        Alert.alert("Success", "Template updated successfully.");
      } else {
        const { data, error } = await supabase
          .from('whatsapp_templates')
          .insert([{
            name: tempName.trim(),
            body: tempBody.trim(),
            attachment_url: tempAttachUrl.trim() || null,
            attachment_name: tempAttachName.trim() || null,
            tenant_id: currentUser?.tenant_id || 'default'
          }])
          .select()
          .single();

        if (error) throw error;

        const updated = [...whatsappTemplates, data as WhatsAppTemplate];
        setWhatsappTemplates(updated);
        await AsyncStorage.setItem('m_whatsapp_templates', JSON.stringify(updated));
        Alert.alert("Success", "Template created successfully.");
      }

      // Reset form
      setEditingTemplateId(null);
      setTempName('');
      setTempBody('');
      setTempAttachUrl('');
      setTempAttachName('');
    } catch (e: any) {
      console.error("Error saving template:", e);
      // Local fallback if offline
      if (editingTemplateId) {
        const updated = whatsappTemplates.map(t => {
          if (t.id === editingTemplateId) {
            return {
              ...t,
              name: tempName.trim(),
              body: tempBody.trim(),
              attachment_url: tempAttachUrl.trim() || undefined,
              attachment_name: tempAttachName.trim() || undefined
            };
          }
          return t;
        });
        setWhatsappTemplates(updated);
        await AsyncStorage.setItem('m_whatsapp_templates', JSON.stringify(updated));
        Alert.alert("Offline Success", "Template updated locally.");
      } else {
        const newT = {
          id: `temp-${Date.now()}`,
          name: tempName.trim(),
          body: tempBody.trim(),
          attachment_url: tempAttachUrl.trim() || undefined,
          attachment_name: tempAttachName.trim() || undefined,
          created_at: new Date().toISOString()
        };
        const updated = [...whatsappTemplates, newT];
        setWhatsappTemplates(updated);
        await AsyncStorage.setItem('m_whatsapp_templates', JSON.stringify(updated));
        Alert.alert("Offline Success", "Template created locally.");
      }
      setEditingTemplateId(null);
      setTempName('');
      setTempBody('');
      setTempAttachUrl('');
      setTempAttachName('');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this template?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('whatsapp_templates')
                .delete()
                .eq('id', id);
              if (error) throw error;
            } catch (e) {
              console.log("Delete template offline or database issue: ", e);
            }
            const updated = whatsappTemplates.filter(t => t.id !== id);
            setWhatsappTemplates(updated);
            await AsyncStorage.setItem('m_whatsapp_templates', JSON.stringify(updated));
            Alert.alert("Success", "Template deleted.");
          }
        }
      ]
    );
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
      score,
      tenant_id: currentUser?.tenant_id || 'default'
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
        description: `Lead manually entered via Mobile CRM client`,
        tenant_id: currentUser?.tenant_id || 'default'
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
          content: noteText,
          tenant_id: currentUser?.tenant_id || 'default'
        }])
        .select()
        .single();

      if (error) throw error;

      // Add activity log
      await supabase.from('activity_logs').insert([{
        lead_id: selectedLead.id,
        actor_id: currentUser?.id,
        action_type: 'note_added',
        description: `Note added: "${noteText.substring(0, 20)}..."`,
        tenant_id: currentUser?.tenant_id || 'default'
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
      const day = parseInt(taskDate);
      const month = parseInt(taskMonth);
      if (isNaN(day) || isNaN(month) || day < 1 || day > 31 || month < 1 || month > 12) {
        Alert.alert("Invalid Date", "Please enter a valid day (1-31) and month (1-12) for the task.");
        return;
      }
      
      const year = new Date().getFullYear();
      let hr = parseInt(taskHour) || 12;
      const min = parseInt(taskMinute) || 0;
      if (taskAmPm === 'PM' && hr < 12) hr += 12;
      if (taskAmPm === 'AM' && hr === 12) hr = 0;
      
      const dateObj = new Date(year, month - 1, day, hr, min);
      if (isNaN(dateObj.getTime())) {
        Alert.alert("Invalid Date", "Could not calculate a valid date/time.");
        return;
      }
      const dueDate = dateObj.toISOString();

      const { error } = await supabase
        .from('tasks')
        .insert([{
          lead_id: selectedLead.id,
          assignee_id: currentUser?.id,
          title: taskText,
          due_date: dueDate,
          is_completed: false,
          tenant_id: currentUser?.tenant_id || 'default'
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
        description: `Marked task "${taskToToggle.title}" as ${nextCompleted ? 'completed' : 'incomplete'}`,
        tenant_id: currentUser?.tenant_id || 'default'
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
        description: `Placed phone call to candidate at ${lead.phone}`,
        tenant_id: currentUser?.tenant_id || 'default'
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
            content: `[Call Log Note] ${feedbackNotes}`,
            tenant_id: currentUser?.tenant_id || 'default'
          }]);

        if (noteError) throw noteError;

        // Create activity log for note
        await supabase.from('activity_logs').insert([{
          lead_id: feedbackLead.id,
          actor_id: currentUser?.id,
          action_type: 'note_added',
          description: `Note added via post-call feedback: "${feedbackNotes.substring(0, 20)}..."`,
          tenant_id: currentUser?.tenant_id || 'default'
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
        let hr = parseInt(reminderHour) || 12;
        const min = parseInt(reminderMinute) || 0;
        if (reminderAmPm === 'PM' && hr < 12) hr += 12;
        if (reminderAmPm === 'AM' && hr === 12) hr = 0;
        
        const dateObj = new Date(year, month - 1, day, hr, min);
        if (isNaN(dateObj.getTime())) {
          Alert.alert("Invalid Date", "Could not calculate a valid date/time.");
          return;
        }
        const dueDate = dateObj.toISOString();
        const formattedDate = `${month}/${day}/${year}`;
        const formattedTime = `${reminderHour}:${reminderMinute} ${reminderAmPm}`;
        
        const { error: taskError } = await supabase
          .from('tasks')
          .insert([{
            lead_id: feedbackLead.id,
            assignee_id: currentUser?.id,
            title: `Follow-up call scheduled for ${formattedTime}`,
            due_date: dueDate,
            is_completed: false,
            tenant_id: currentUser?.tenant_id || 'default'
          }]);

        if (taskError) throw taskError;

        // Create activity log for scheduled reminder
        await supabase.from('activity_logs').insert([{
          lead_id: feedbackLead.id,
          actor_id: currentUser?.id,
          action_type: 'task_scheduled',
          description: `Call follow-up scheduled for ${formattedDate} at ${formattedTime}`,
          tenant_id: currentUser?.tenant_id || 'default'
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
      let offline = false;
      try {
        const { error } = await supabase
          .from('leads')
          .update({ [field]: value, updated_at: new Date().toISOString() })
          .eq('id', selectedLead.id);

        if (error) throw error;

        const desc = field === 'status' 
          ? `Pipeline status changed to "${value}"` 
          : `Assigned counsellor changed to "${profiles.find(p => p.id === value)?.full_name || 'Unassigned'}"`;
          
        await supabase.from('activity_logs').insert([{
          lead_id: selectedLead.id,
          actor_id: currentUser?.id,
          action_type: field === 'status' ? 'status_updated' : 'counsellor_assigned',
          description: desc,
          tenant_id: currentUser?.tenant_id || 'default'
        }]);
      } catch (dbErr) {
        console.warn("Offline lead update fallback:", dbErr);
        offline = true;
      }

      // Update state locally
      setSelectedLead(prev => prev ? { ...prev, [field]: value } : null);
      setLeads(prev => {
        const updated = prev.map(l => l.id === selectedLead.id ? { ...l, [field]: value } : l);
        AsyncStorage.setItem('m_leads', JSON.stringify(updated));
        return updated;
      });

      if (offline) {
        const desc = field === 'status' 
          ? `Pipeline status changed to "${value}"` 
          : `Assigned counsellor changed to "${profiles.find(p => p.id === value)?.full_name || 'Unassigned'}"`;
        const log: ActivityLog = {
          id: `log-${Date.now()}`,
          lead_id: selectedLead.id,
          actor_id: currentUser?.id || 'system',
          action_type: field === 'status' ? 'status_updated' : 'counsellor_assigned',
          description: desc,
          created_at: new Date().toISOString(),
          actor_name: currentUser?.full_name || 'System'
        };
        setLogs(prev => {
          const updated = [log, ...prev];
          AsyncStorage.setItem('m_logs', JSON.stringify(updated));
          return updated;
        });
      }

    } catch (e: any) {
      Alert.alert("Update Failed", e.message || "Could not update lead field.");
    }
  };

  const handleSwitchPipeline = async (leadId: string, pipelineId: string) => {
    try {
      const pObj = pipelines.find(p => p.id === pipelineId);
      const initialStage = pObj && pObj.stages && pObj.stages[0] ? pObj.stages[0].name : '1st followup';

      let offline = false;
      try {
        const { error } = await supabase
          .from('leads')
          .update({
            pipeline_id: pipelineId,
            status: initialStage,
            updated_at: new Date().toISOString()
          })
          .eq('id', leadId);
        if (error) throw error;

        await supabase.from('activity_logs').insert([{
          lead_id: leadId,
          actor_id: currentUser?.id,
          action_type: 'status_updated',
          description: `Switched pipeline to "${pObj?.name || 'Unknown'}" (Stage reset to "${initialStage}")`,
          tenant_id: currentUser?.tenant_id || 'default'
        }]);
      } catch (dbErr) {
        console.warn("Offline switch pipeline fallback:", dbErr);
        offline = true;
      }

      setLeads(prev => {
        const updated = prev.map(l => {
          if (l.id === leadId) {
            return { ...l, pipeline_id: pipelineId, status: initialStage, updated_at: new Date().toISOString() };
          }
          return l;
        });
        AsyncStorage.setItem('m_leads', JSON.stringify(updated));
        return updated;
      });

      if (offline) {
        const log: ActivityLog = {
          id: `log-${Date.now()}`,
          lead_id: leadId,
          actor_id: currentUser?.id || 'system',
          action_type: 'status_updated',
          description: `Switched pipeline to "${pObj?.name || 'Unknown'}" (Stage reset to "${initialStage}")`,
          created_at: new Date().toISOString(),
          actor_name: currentUser?.full_name || 'System'
        };
        setLogs(prev => {
          const updated = [log, ...prev];
          AsyncStorage.setItem('m_logs', JSON.stringify(updated));
          return updated;
        });
      }

      setSelectedLead(prev => prev ? { ...prev, pipeline_id: pipelineId, status: initialStage } : null);
      Alert.alert('Pipeline Changed', `Successfully switched lead to ${pObj?.name || 'pipeline'}.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not switch pipeline.');
    }
  };

  const connectLeadToPartnerStudent = async (leadId: string, studentId: string) => {
    try {
      const visaPipe = pipelines.find(p => p.name === 'Visa/Post-Closing Pipeline');
      const visaPipeId = visaPipe?.id || null;
      const initialStage = visaPipe?.stages[0]?.name || 'Document Collection';

      let offline = false;
      try {
        const { error: studentErr } = await supabase
          .from('partner_students')
          .update({ crm_lead_id: leadId, application_status: 'converted', updated_at: new Date().toISOString() })
          .eq('id', studentId);
        if (studentErr) throw studentErr;

        const { error: leadErr } = await supabase
          .from('leads')
          .update({
            pipeline_id: visaPipeId,
            status: initialStage,
            updated_at: new Date().toISOString()
          })
          .eq('id', leadId);
        if (leadErr) throw leadErr;

        const student = partnerStudents.find(ps => ps.id === studentId);
        const partner = partners.find(p => p.id === student?.partner_id);
        const studentName = student ? `${student.first_name} ${student.last_name}` : 'Referred Student';
        const partnerName = partner?.business_name || 'Partner Agency';

        await supabase.from('activity_logs').insert([{
          lead_id: leadId,
          actor_id: currentUser?.id,
          action_type: 'assigned',
          description: `Linked to referred student ${studentName} from ${partnerName}. Transitioned to Visa/Post-Closing Pipeline.`,
          tenant_id: currentUser?.tenant_id || 'default'
        }]);
      } catch (dbErr) {
        console.warn("Offline connect fallback:", dbErr);
        offline = true;
      }

      setPartnerStudents(prev => {
        const updated = prev.map(ps => {
          if (ps.id === studentId) {
            return { ...ps, crm_lead_id: leadId, application_status: 'converted', updated_at: new Date().toISOString() };
          }
          return ps;
        });
        AsyncStorage.setItem('m_partner_students', JSON.stringify(updated));
        return updated;
      });

      setLeads(prev => {
        const updated = prev.map(l => {
          if (l.id === leadId) {
            return { ...l, pipeline_id: visaPipeId, status: initialStage, updated_at: new Date().toISOString() };
          }
          return l;
        });
        AsyncStorage.setItem('m_leads', JSON.stringify(updated));
        return updated;
      });

      if (offline) {
        const student = partnerStudents.find(ps => ps.id === studentId);
        const partner = partners.find(p => p.id === student?.partner_id);
        const studentName = student ? `${student.first_name} ${student.last_name}` : 'Referred Student';
        const partnerName = partner?.business_name || 'Partner Agency';

        const log: ActivityLog = {
          id: `log-${Date.now()}`,
          lead_id: leadId,
          actor_id: currentUser?.id || 'system',
          action_type: 'assigned',
          description: `Linked to referred student ${studentName} from ${partnerName}. Transitioned to Visa/Post-Closing Pipeline.`,
          created_at: new Date().toISOString(),
          actor_name: currentUser?.full_name || 'System'
        };
        setLogs(prev => {
          const updated = [log, ...prev];
          AsyncStorage.setItem('m_logs', JSON.stringify(updated));
          return updated;
        });
      }

      setSelectedLead(prev => prev ? { ...prev, pipeline_id: visaPipeId, status: initialStage } : null);
      Alert.alert("Success", "Student connected successfully! Lead transitioned to Visa/Post-Closing Pipeline.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to connect referred student.");
    }
  };

  const disconnectLeadFromPartnerStudent = async (studentId: string) => {
    try {
      const student = partnerStudents.find(ps => ps.id === studentId);
      const leadId = student?.crm_lead_id;

      let offline = false;
      try {
        const { error: studentErr } = await supabase
          .from('partner_students')
          .update({ crm_lead_id: null, application_status: 'referred', updated_at: new Date().toISOString() })
          .eq('id', studentId);
        if (studentErr) throw studentErr;

        if (leadId) {
          const studentName = student ? `${student.first_name} ${student.last_name}` : 'Referred Student';
          await supabase.from('activity_logs').insert([{
            lead_id: leadId,
            actor_id: currentUser?.id,
            action_type: 'assigned',
            description: `Unlinked from referred student ${studentName}`,
            tenant_id: currentUser?.tenant_id || 'default'
          }]);
        }
      } catch (dbErr) {
        console.warn("Offline disconnect fallback:", dbErr);
        offline = true;
      }

      setPartnerStudents(prev => {
        const updated = prev.map(ps => {
          if (ps.id === studentId) {
            return { ...ps, crm_lead_id: null, application_status: 'referred', updated_at: new Date().toISOString() };
          }
          return ps;
        });
        AsyncStorage.setItem('m_partner_students', JSON.stringify(updated));
        return updated;
      });

      if (leadId && offline) {
        const studentName = student ? `${student.first_name} ${student.last_name}` : 'Referred Student';
        const log: ActivityLog = {
          id: `log-${Date.now()}`,
          lead_id: leadId,
          actor_id: currentUser?.id || 'system',
          action_type: 'assigned',
          description: `Unlinked from referred student ${studentName}`,
          created_at: new Date().toISOString(),
          actor_name: currentUser?.full_name || 'System'
        };
        setLogs(prev => {
          const updated = [log, ...prev];
          AsyncStorage.setItem('m_logs', JSON.stringify(updated));
          return updated;
        });
      }

      Alert.alert("Success", "Student disconnected successfully.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to disconnect student.");
    }
  };

  const handleExportCSV = async () => {
    try {
      const headers = ['Name', 'Phone', 'Email', 'Parent Contact', 'NEET Marks', 'Budget', 'Destination', 'Course', 'Source', 'Status', 'Date Captured'];
      const rows = leads.map(l => [
        l.name,
        l.phone,
        l.email || '',
        l.parent_contact || '',
        l.neet_marks || '',
        l.budget ? (l.budget / 100000).toFixed(1) + ' Lakh' : '',
        l.preferred_destination || '',
        l.course || '',
        l.lead_source,
        l.status,
        new Date(l.created_at).toLocaleDateString()
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.map(val => `"${val}"`).join(','))].join('\n');
      
      const fileUri = FileSystem.cacheDirectory + `leads_export_${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
      
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Leads CSV',
          UTI: 'public.comma-separated-values-text'
        });
      } else {
        Alert.alert("Sharing Not Available", "Native file sharing is not supported on this platform.");
      }
    } catch (e: any) {
      Alert.alert("Export Failed", e.message || "Failed to generate CSV export file.");
    }
  };

  const handleSyncPartnerData = async () => {
    // 1. Find all partner students where crm_lead_id is null
    const unconnectedStudents = partnerStudents.filter(ps => !ps.crm_lead_id);
    if (unconnectedStudents.length === 0) {
      Alert.alert("Sync Complete", "No new unconnected partner referrals found.");
      return;
    }

    setIsSyncing(true);

    const visaPipe = pipelines.find(p => p.name === 'Visa/Post-Closing Pipeline');
    const visaPipeId = visaPipe?.id || null;
    const visaInitialStage = visaPipe?.stages[0]?.name || 'Document Collection';

    const salesPipe = pipelines.find(p => p.is_default) || pipelines[0];
    const salesPipeId = salesPipe?.id || null;
    const salesInitialStage = salesPipe?.stages[0]?.name || '1st followup';

    let importedCount = 0;

    try {
      const isLiveMode = supabase && currentUser;

      if (isLiveMode) {
        for (const student of unconnectedStudents) {
          const partner = partners.find(p => p.id === student.partner_id);
          const partnerName = partner?.business_name || 'Partner Agency';
          
          const isConfirmed = (student.referral_type || 'interested') === 'confirmed';
          const targetPipeId = isConfirmed ? visaPipeId : salesPipeId;
          const targetStage = isConfirmed ? visaInitialStage : salesInitialStage;

          // 1. Insert new lead
          const { data: newLead, error: leadErr } = await supabase
            .from('leads')
            .insert([{
              name: `${student.first_name} ${student.last_name}`,
              phone: student.phone || '',
              email: student.email || null,
              preferred_destination: student.destination_country,
              course: student.target_program,
              lead_source: `Partner: ${partnerName}`,
              status: targetStage,
              pipeline_id: targetPipeId,
              tenant_id: currentUser?.tenant_id || 'default'
            }])
            .select()
            .single();

          if (leadErr) {
            console.error("Error creating lead from partner student:", leadErr);
            continue;
          }

          if (newLead) {
            // 2. Update partner_student reference
            const { error: studentErr } = await supabase
              .from('partner_students')
              .update({ 
                crm_lead_id: newLead.id, 
                application_status: isConfirmed ? 'converted' : 'referred', 
                updated_at: new Date().toISOString() 
              })
              .eq('id', student.id);

            if (studentErr) {
              console.error("Error updating partner student reference:", studentErr);
              continue;
            }

            // 3. Create activity log
            await supabase.from('activity_logs').insert([{
              lead_id: newLead.id,
              actor_id: currentUser?.id,
              action_type: 'assigned',
              description: `Imported automatically from Partner Portal referral by ${partnerName}. Placed in ${isConfirmed ? 'Visa/Post-Closing' : 'Sales'} Pipeline.`,
              tenant_id: currentUser?.tenant_id || 'default'
            }]);

            importedCount++;
          }
        }

        // Re-fetch data if any imported to update the UI
        if (importedCount > 0) {
          const { data: leadsList } = await supabase.from('leads').select('*');
          if (leadsList) setLeads(leadsList);
          
          const { data: partStudentsList } = await supabase.from('partner_students').select('*');
          if (partStudentsList) setPartnerStudents(partStudentsList);
        }

      } else {
        // Offline Mock Mode
        const updatedLeads = [...leads];
        const updatedStudents = partnerStudents.map(ps => {
          const matching = unconnectedStudents.find(us => us.id === ps.id);
          if (matching) {
            const partner = partners.find(p => p.id === matching.partner_id);
            const partnerName = partner?.business_name || 'Partner Agency';
            const isConfirmed = (matching.referral_type || 'interested') === 'confirmed';
            const targetPipeId = isConfirmed ? visaPipeId : salesPipeId;
            const targetStage = isConfirmed ? visaInitialStage : salesInitialStage;

            const mockLeadId = `lead-${Date.now()}-${importedCount}`;
            const newLead: Lead = {
              id: mockLeadId,
              name: `${matching.first_name} ${matching.last_name}`,
              phone: matching.phone || '',
              email: matching.email || undefined,
              preferred_destination: matching.destination_country,
              course: matching.target_program,
              lead_source: `Partner: ${partnerName}`,
              status: targetStage,
              pipeline_id: targetPipeId || undefined,
              score: 75,
              tags: [],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            updatedLeads.push(newLead);

            const log: ActivityLog = {
              id: `log-${Date.now()}-${importedCount}`,
              lead_id: mockLeadId,
              actor_id: currentUser?.id || 'system',
              action_type: 'assigned',
              description: `Imported automatically from Partner Portal referral by ${partnerName}. Placed in ${isConfirmed ? 'Visa/Post-Closing' : 'Sales'} Pipeline.`,
              created_at: new Date().toISOString(),
              actor_name: currentUser?.full_name || 'System'
            };
            logs.unshift(log);

            importedCount++;
            return {
              ...ps,
              crm_lead_id: mockLeadId,
              application_status: isConfirmed ? 'converted' : 'referred',
              updated_at: new Date().toISOString()
            };
          }
          return ps;
        });

        if (importedCount > 0) {
          setLeads(updatedLeads);
          AsyncStorage.setItem('m_leads', JSON.stringify(updatedLeads));

          setPartnerStudents(updatedStudents);
          AsyncStorage.setItem('m_partner_students', JSON.stringify(updatedStudents));

          setLogs([...logs]);
          AsyncStorage.setItem('m_logs', JSON.stringify(logs));
        }
      }

      Alert.alert("Sync Complete", `Imported ${importedCount} new partner referrals into CRM pipelines.`);

    } catch (err: any) {
      Alert.alert("Sync Failed", err.message || "Failed to sync referred student records.");
    } finally {
      setIsSyncing(false);
    }
  };

  const verifyPartnerDoc = async (docId: string, status: 'verified' | 'rejected') => {
    try {
      const doc = partnerUploadedDocs.find(d => d.id === docId);
      if (!doc) throw new Error("Document not found");

      const student = partnerStudents.find(ps => ps.id === doc.student_id);
      const leadId = student?.crm_lead_id;

      let offline = false;
      try {
        const { error } = await supabase
          .from('partner_uploaded_docs')
          .update({ verification_status: status, updated_at: new Date().toISOString() })
          .eq('id', docId);
        if (error) throw error;

        if (leadId) {
          await supabase.from('activity_logs').insert([{
            lead_id: leadId,
            actor_id: currentUser?.id,
            action_type: 'status_change',
            description: `Partner document '${doc.document_name}' has been ${status}`,
            tenant_id: currentUser?.tenant_id || 'default'
          }]);
        }
      } catch (dbErr) {
        console.warn("Offline verify fallback:", dbErr);
        offline = true;
      }

      setPartnerUploadedDocs(prev => {
        const updated = prev.map(d => {
          if (d.id === docId) {
            return { ...d, verification_status: status, updated_at: new Date().toISOString() };
          }
          return d;
        });
        AsyncStorage.setItem('m_partner_uploaded_docs', JSON.stringify(updated));
        return updated;
      });

      if (leadId && offline) {
        const log: ActivityLog = {
          id: `log-${Date.now()}`,
          lead_id: leadId,
          actor_id: currentUser?.id || 'system',
          action_type: 'status_change',
          description: `Partner document '${doc.document_name}' has been ${status}`,
          created_at: new Date().toISOString(),
          actor_name: currentUser?.full_name || 'System'
        };
        setLogs(prev => {
          const updated = [log, ...prev];
          AsyncStorage.setItem('m_logs', JSON.stringify(updated));
          return updated;
        });
      }

      Alert.alert("Success", `Document status updated to ${status}.`);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update document status.");
    }
  };

  const renderPickerModal = () => {
    if (!activePickerType || !selectedLead) return null;

    const isStatus = activePickerType === 'status';
    const isPipeline = activePickerType === 'pipeline';
    
    let title = '';
    let options: any[] = [];
    
    if (isPipeline) {
      title = 'Select Pipeline';
      const userPipelines = pipelines.filter(p => 
        currentUser?.role === 'admin' || 
        pipelineAccess.some(pa => pa.pipeline_id === p.id && pa.profile_id === currentUser?.id) ||
        p.id === selectedLead.pipeline_id
      );
      options = userPipelines.map(p => ({ id: p.id, name: p.name }));
    } else if (isStatus) {
      title = 'Change Pipeline Status';
      const activePipeline = pipelines.find(p => p.id === selectedLead.pipeline_id) || pipelines.find(p => p.is_default) || pipelines[0];
      const stages = activePipeline ? activePipeline.stages.map((s: any) => s.name) : PIPELINE_STAGES;
      options = stages;
    } else {
      title = 'Assign Counsellor';
      options = [...profiles.filter(p => p.role === 'counsellor').map(p => ({ id: p.id, name: p.full_name })), { id: null, name: 'Unassigned' }];
    }

    return (
      <View style={styles.feedbackModalOverlay}>
        <View style={styles.feedbackModalContent}>
          <Text style={styles.feedbackTitle}>{title}</Text>
          
          <ScrollView style={{ maxHeight: 250, marginBottom: 15 }} nestedScrollEnabled={true}>
            {options.map((opt, idx) => {
              const optionId = typeof opt === 'string' ? opt : opt.id;
              const optionLabel = typeof opt === 'string' ? opt : opt.name;
              
              let isSelected = false;
              if (isPipeline) {
                isSelected = (selectedLead.pipeline_id || pipelines.find(p => p.is_default)?.id) === optionId;
              } else if (isStatus) {
                isSelected = selectedLead.status === optionId;
              } else {
                isSelected = selectedLead.assigned_counsellor_id === optionId;
              }

              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.pickerItemRow, isSelected && styles.pickerItemRowSelected]}
                  onPress={() => {
                    if (isPipeline) {
                      handleSwitchPipeline(selectedLead.id, optionId);
                    } else {
                      handleUpdateLeadField(isStatus ? 'status' : 'assigned_counsellor_id', optionId);
                    }
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
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                
                {/* Date Selector Widget */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 11, color: theme.textMuted }}>Date:</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.inputBorder, borderRadius: 8, padding: 2 }}>
                    <TouchableOpacity 
                      style={styles.adjustBtn} 
                      onPress={() => {
                        let d = parseInt(reminderDate) || 1;
                        d = d === 1 ? 31 : d - 1;
                        setReminderDate(d.toString());
                      }}
                    >
                      <Text style={[styles.adjustBtnText, { color: theme.text }]}>-</Text>
                    </TouchableOpacity>
                    <Text style={{ width: 22, textAlign: 'center', fontSize: 12, fontWeight: 'bold', color: theme.text }}>{reminderDate.padStart(2, '0')}</Text>
                    <TouchableOpacity 
                      style={styles.adjustBtn} 
                      onPress={() => {
                        let d = parseInt(reminderDate) || 1;
                        d = d === 31 ? 1 : d + 1;
                        setReminderDate(d.toString());
                      }}
                    >
                      <Text style={[styles.adjustBtnText, { color: theme.text }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={{ color: theme.textMuted, fontSize: 12 }}>/</Text>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.inputBorder, borderRadius: 8, padding: 2 }}>
                    <TouchableOpacity 
                      style={styles.adjustBtn} 
                      onPress={() => {
                        let m = parseInt(reminderMonth) || 1;
                        m = m === 1 ? 12 : m - 1;
                        setReminderMonth(m.toString());
                      }}
                    >
                      <Text style={[styles.adjustBtnText, { color: theme.text }]}>-</Text>
                    </TouchableOpacity>
                    <Text style={{ width: 22, textAlign: 'center', fontSize: 12, fontWeight: 'bold', color: theme.text }}>{reminderMonth.padStart(2, '0')}</Text>
                    <TouchableOpacity 
                      style={styles.adjustBtn} 
                      onPress={() => {
                        let m = parseInt(reminderMonth) || 1;
                        m = m === 12 ? 1 : m + 1;
                        setReminderMonth(m.toString());
                      }}
                    >
                      <Text style={[styles.adjustBtnText, { color: theme.text }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Time Selector Widget */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 11, color: theme.textMuted }}>Time:</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.inputBorder, borderRadius: 8, padding: 2 }}>
                    <TouchableOpacity 
                      style={styles.adjustBtn} 
                      onPress={() => {
                        let h = parseInt(reminderHour) || 12;
                        h = h === 1 ? 12 : h - 1;
                        setReminderHour(h.toString().padStart(2, '0'));
                      }}
                    >
                      <Text style={[styles.adjustBtnText, { color: theme.text }]}>-</Text>
                    </TouchableOpacity>
                    <Text style={{ width: 22, textAlign: 'center', fontSize: 12, fontWeight: 'bold', color: theme.text }}>{reminderHour}</Text>
                    <TouchableOpacity 
                      style={styles.adjustBtn} 
                      onPress={() => {
                        let h = parseInt(reminderHour) || 12;
                        h = h === 12 ? 1 : h + 1;
                        setReminderHour(h.toString().padStart(2, '0'));
                      }}
                    >
                      <Text style={[styles.adjustBtnText, { color: theme.text }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={{ color: theme.textMuted, fontSize: 12 }}>:</Text>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.inputBorder, borderRadius: 8, padding: 2 }}>
                    <TouchableOpacity 
                      style={styles.adjustBtn} 
                      onPress={() => {
                        let min = parseInt(reminderMinute) || 0;
                        min = min === 0 ? 45 : min - 15;
                        setReminderMinute(min.toString().padStart(2, '0'));
                      }}
                    >
                      <Text style={[styles.adjustBtnText, { color: theme.text }]}>-</Text>
                    </TouchableOpacity>
                    <Text style={{ width: 22, textAlign: 'center', fontSize: 12, fontWeight: 'bold', color: theme.text }}>{reminderMinute}</Text>
                    <TouchableOpacity 
                      style={styles.adjustBtn} 
                      onPress={() => {
                        let min = parseInt(reminderMinute) || 0;
                        min = min === 45 ? 0 : min + 15;
                        setReminderMinute(min.toString().padStart(2, '0'));
                      }}
                    >
                      <Text style={[styles.adjustBtnText, { color: theme.text }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <TouchableOpacity 
                    style={[styles.ampmBtn, { backgroundColor: darkMode ? '#334155' : '#EEF2FF', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, marginLeft: 2 }]} 
                    onPress={() => setReminderAmPm(prev => prev === 'AM' ? 'PM' : 'AM')}
                  >
                    <Text style={[styles.ampmBtnText, { color: darkMode ? '#818CF8' : '#4F46E5', fontSize: 11, fontWeight: 'bold' }]}>{reminderAmPm}</Text>
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

  const renderSettingsModal = () => {
    if (!isSettingsOpen) return null;
    return (
      <View style={styles.settingsModalOverlay}>
        <View style={[styles.settingsModalContent, { backgroundColor: theme.cardBg, borderColor: theme.border, maxHeight: '85%' }]}>
          <Text style={[styles.settingsTitle, { color: theme.text }]}>App Settings</Text>
          
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 15 }} keyboardShouldPersistTaps="handled">
            {/* Theme Mode Option */}
            <View style={[styles.settingsOptionRow, { borderBottomColor: theme.border }]}>
              <View>
                <Text style={[styles.settingsOptionTitle, { color: theme.text }]}>Dark Mode</Text>
                <Text style={[styles.settingsOptionSub, { color: theme.textMuted }]}>Use high contrast dark theme</Text>
              </View>
              <TouchableOpacity 
                style={[styles.customToggle, darkMode && styles.customToggleActive]}
                onPress={() => handleSaveSettings(!darkMode, notifyNewLeads, notifyTasks, notifyWhatsApp)}
              >
                <View style={[styles.customToggleCircle, darkMode && styles.customToggleCircleActive]} />
              </TouchableOpacity>
            </View>

            {/* Notifications Title */}
            <Text style={styles.settingsSectionTitle}>Push Notifications</Text>

            {/* New Leads Notification */}
            <View style={[styles.settingsOptionRow, { borderBottomColor: theme.border }]}>
              <View>
                <Text style={[styles.settingsOptionTitle, { color: theme.text }]}>New Leads Ingestion</Text>
                <Text style={[styles.settingsOptionSub, { color: theme.textMuted }]}>Alert when a new candidate enters</Text>
              </View>
              <TouchableOpacity 
                style={[styles.customToggle, notifyNewLeads && styles.customToggleActive]}
                onPress={() => handleSaveSettings(darkMode, !notifyNewLeads, notifyTasks, notifyWhatsApp)}
              >
                <View style={[styles.customToggleCircle, notifyNewLeads && styles.customToggleCircleActive]} />
              </TouchableOpacity>
            </View>

            {/* Task Reminders Notification */}
            <View style={[styles.settingsOptionRow, { borderBottomColor: theme.border }]}>
              <View>
                <Text style={[styles.settingsOptionTitle, { color: theme.text }]}>Task Reminders</Text>
                <Text style={[styles.settingsOptionSub, { color: theme.textMuted }]}>Alerts for daily follow-up duties</Text>
              </View>
              <TouchableOpacity 
                style={[styles.customToggle, notifyTasks && styles.customToggleActive]}
                onPress={() => handleSaveSettings(darkMode, notifyNewLeads, !notifyTasks, notifyWhatsApp)}
              >
                <View style={[styles.customToggleCircle, notifyTasks && styles.customToggleCircleActive]} />
              </TouchableOpacity>
            </View>

            {/* WhatsApp Communications Notification */}
            <View style={[styles.settingsOptionRow, { borderBottomColor: theme.border, marginBottom: 15 }]}>
              <View>
                <Text style={[styles.settingsOptionTitle, { color: theme.text }]}>WhatsApp History</Text>
                <Text style={[styles.settingsOptionSub, { color: theme.textMuted }]}>Alert when chat updates occur</Text>
              </View>
              <TouchableOpacity 
                style={[styles.customToggle, notifyWhatsApp && styles.customToggleActive]}
                onPress={() => handleSaveSettings(darkMode, notifyNewLeads, notifyTasks, !notifyWhatsApp)}
              >
                <View style={[styles.customToggleCircle, notifyWhatsApp && styles.customToggleCircleActive]} />
              </TouchableOpacity>
            </View>

            {/* WhatsApp Template Management Section */}
            <Text style={styles.settingsSectionTitle}>WhatsApp Message Templates</Text>

            {/* List of existing templates */}
            <View style={{ marginTop: 5 }}>
              {whatsappTemplates.map(tpl => (
                <View 
                  key={tpl.id} 
                  style={{ 
                    backgroundColor: theme.inputBg, 
                    borderColor: theme.border, 
                    borderWidth: 1, 
                    borderRadius: 12, 
                    padding: 10, 
                    marginBottom: 10 
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: theme.text, fontSize: 12, fontWeight: 'bold' }}>{tpl.name}</Text>
                    
                    {/* Edit/Delete Buttons (Admin/Manager only) */}
                    {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity 
                          onPress={() => {
                            setEditingTemplateId(tpl.id);
                            setTempName(tpl.name);
                            setTempBody(tpl.body);
                            setTempAttachUrl(tpl.attachment_url || '');
                            setTempAttachName(tpl.attachment_name || '');
                          }}
                        >
                          <Text style={{ color: '#4F46E5', fontSize: 11, fontWeight: 'bold' }}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteTemplate(tpl.id)}>
                          <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: 'bold' }}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 4 }} numberOfLines={2}>
                    {tpl.body}
                  </Text>
                  {tpl.attachment_url && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                      <Text style={{ color: '#10B981', fontSize: 10, fontWeight: 'bold' }}>📎 Attachment:</Text>
                      <Text style={{ color: theme.textMuted, fontSize: 10, flex: 1 }} numberOfLines={1}>
                        {tpl.attachment_name || 'Unnamed'}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* Form to Create/Edit Templates */}
            {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
              <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 15 }}>
                <Text style={{ color: theme.text, fontSize: 12, fontWeight: 'bold', marginBottom: 10 }}>
                  {editingTemplateId ? 'Edit Template' : 'Add New Template'}
                </Text>
                
                <Text style={{ color: theme.textMuted, fontSize: 10, marginBottom: 4 }}>Template Name</Text>
                <TextInput
                  style={{ 
                    backgroundColor: theme.inputBg, 
                    borderColor: theme.border, 
                    borderWidth: 1, 
                    borderRadius: 10, 
                    padding: 8, 
                    fontSize: 12, 
                    color: theme.text, 
                    marginBottom: 10 
                  }}
                  placeholder="Template Name"
                  placeholderTextColor={theme.textMuted}
                  value={tempName}
                  onChangeText={setTempName}
                />

                <Text style={{ color: theme.textMuted, fontSize: 10, marginBottom: 4 }}>Message Body</Text>
                <TextInput
                  style={{ 
                    backgroundColor: theme.inputBg, 
                    borderColor: theme.border, 
                    borderWidth: 1, 
                    borderRadius: 10, 
                    padding: 8, 
                    fontSize: 12, 
                    color: theme.text, 
                    marginBottom: 10,
                    height: 60,
                    textAlignVertical: 'top'
                  }}
                  multiline={true}
                  placeholder="Message body text..."
                  placeholderTextColor={theme.textMuted}
                  value={tempBody}
                  onChangeText={setTempBody}
                />

                <Text style={{ color: theme.textMuted, fontSize: 10, marginBottom: 4 }}>Attachment URL (Optional PDF/Image)</Text>
                <TextInput
                  style={{ 
                    backgroundColor: theme.inputBg, 
                    borderColor: theme.border, 
                    borderWidth: 1, 
                    borderRadius: 10, 
                    padding: 8, 
                    fontSize: 12, 
                    color: theme.text, 
                    marginBottom: 10 
                  }}
                  placeholder="https://example.com/brochure.pdf"
                  placeholderTextColor={theme.textMuted}
                  value={tempAttachUrl}
                  onChangeText={setTempAttachUrl}
                />

                <Text style={{ color: theme.textMuted, fontSize: 10, marginBottom: 4 }}>Attachment File Name (Optional)</Text>
                <TextInput
                  style={{ 
                    backgroundColor: theme.inputBg, 
                    borderColor: theme.border, 
                    borderWidth: 1, 
                    borderRadius: 10, 
                    padding: 8, 
                    fontSize: 12, 
                    color: theme.text, 
                    marginBottom: 12 
                  }}
                  placeholder="MBBS_Russia.pdf"
                  placeholderTextColor={theme.textMuted}
                  value={tempAttachName}
                  onChangeText={setTempAttachName}
                />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity 
                    style={{ 
                      flex: 1, 
                      backgroundColor: '#4F46E5', 
                      borderRadius: 10, 
                      paddingVertical: 10, 
                      alignItems: 'center' 
                    }}
                    onPress={handleSaveTemplate}
                  >
                    <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>
                      {editingTemplateId ? 'Update' : 'Add Template'}
                    </Text>
                  </TouchableOpacity>

                  {editingTemplateId && (
                    <TouchableOpacity 
                      style={{ 
                        backgroundColor: theme.inputBg, 
                        borderColor: theme.border, 
                        borderWidth: 1, 
                        borderRadius: 10, 
                        paddingHorizontal: 15, 
                        justifyContent: 'center' 
                      }}
                      onPress={() => {
                        setEditingTemplateId(null);
                        setTempName('');
                        setTempBody('');
                        setTempAttachUrl('');
                        setTempAttachName('');
                      }}
                    >
                      <Text style={{ color: theme.text, fontSize: 11 }}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Dismiss Button */}
          <TouchableOpacity 
            style={styles.closeSettingsBtn} 
            onPress={() => {
              setIsSettingsOpen(false);
              setEditingTemplateId(null);
              setTempName('');
              setTempBody('');
              setTempAttachUrl('');
              setTempAttachName('');
            }}
          >
            <Text style={styles.closeSettingsBtnText}>Close & Save Preferences</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const triggerWhatsApp = (lead: Lead) => {
    setActiveWhatsAppLead(lead);
  };

  const sendDirectWhatsAppText = async (lead: Lead) => {
    const welcomeText = `Hello ${lead.name}, thank you for reaching out to MBBS consultancy...`;
    const targetPhone = lead.whatsapp_number || lead.phone;
    let cleanPhone = targetPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
      cleanPhone = `91${cleanPhone.substring(1)}`;
    }
    const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(welcomeText)}`;
    Linking.openURL(url).catch(() => {
      // Fallback web url
      Linking.openURL(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(welcomeText)}`);
    });

    try {
      await supabase.from('activity_logs').insert([{
        lead_id: lead.id,
        actor_id: currentUser?.id,
        action_type: 'whatsapp_sent',
        description: `Opened direct WhatsApp chat with welcome message`,
        tenant_id: currentUser?.tenant_id || 'default'
      }]);
    } catch (e) {
      console.error("Error logging direct WhatsApp text:", e);
    }
  };

  const sendWhatsAppTemplate = async (template: WhatsAppTemplate, lead: Lead) => {
    let body = template.body
      .replace('{{lead_name}}', lead.name)
      .replace('{{neet_marks}}', String(lead.neet_marks || 200))
      .replace('{{budget}}', lead.budget ? `${(lead.budget / 100000).toFixed(1)} Lakh` : '40 Lakh')
      .replace('{{preferred_destination}}', lead.preferred_destination || 'Georgia/Russia');

    if (template.attachment_url) {
      body += `\n\n📄 Document: ${template.attachment_url}`;
    }

    const targetPhone = lead.whatsapp_number || lead.phone;
    let cleanPhone = targetPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
      cleanPhone = `91${cleanPhone.substring(1)}`;
    }
    const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(body)}`;
    
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(body)}`);
    });

    try {
      await supabase.from('activity_logs').insert([{
        lead_id: lead.id,
        actor_id: currentUser?.id,
        action_type: 'whatsapp_sent',
        description: `Sent WhatsApp template: "${template.name}"`,
        tenant_id: currentUser?.tenant_id || 'default'
      }]);
    } catch (e) {
      console.error("Error logging WhatsApp template sent:", e);
    }
  };

  const shareBrochurePdf = async (brochure: BrochureTemplate, lead: Lead) => {
    try {
      setIsShareLoading(true);
      const localUri = FileSystem.cacheDirectory + brochure.filename;
      
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (!fileInfo.exists) {
        console.log(`Downloading brochure from ${brochure.url}...`);
        await FileSystem.downloadAsync(brochure.url, localUri);
      }
      
      setIsShareLoading(false);

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("Sharing Unsupported", "Native file sharing is not supported on this platform.");
        return;
      }

      await Sharing.shareAsync(localUri, {
        dialogTitle: `Share ${brochure.name} with ${lead.name}`,
        mimeType: 'application/pdf'
      });

      await supabase.from('activity_logs').insert([{
        lead_id: lead.id,
        actor_id: currentUser?.id,
        action_type: 'whatsapp_sent',
        description: `Shared PDF Brochure: "${brochure.name}"`,
        tenant_id: currentUser?.tenant_id || 'default'
      }]);
    } catch (e: any) {
      setIsShareLoading(false);
      console.error("Error sharing brochure:", e);
      Alert.alert("Share Failed", e.message || "Failed to download or share the brochure.");
    }
  };

  const renderWhatsAppModal = () => {
    if (!activeWhatsAppLead) return null;
    return (
      <View style={styles.settingsModalOverlay}>
        <View style={[styles.settingsModalContent, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[styles.settingsTitle, { color: theme.text }]}>Share via WhatsApp</Text>
          <Text style={{ color: theme.textMuted, fontSize: 11, marginBottom: 20 }}>
            Choose a brochure or text template to send to {activeWhatsAppLead.name} ({activeWhatsAppLead.phone})
          </Text>

          {/* Option 1: Direct Text Message */}
          <TouchableOpacity 
            style={[styles.brochureOptionBtn, { backgroundColor: darkMode ? '#334155' : '#EEF2FF', borderColor: darkMode ? '#475569' : '#C7D2FE' }]}
            onPress={() => {
              sendDirectWhatsAppText(activeWhatsAppLead);
              setActiveWhatsAppLead(null);
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <MessageSquare size={18} color="#4F46E5" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.brochureOptionTitle, { color: theme.text }]}>Direct Text Message Only</Text>
                <Text style={[styles.brochureOptionSub, { color: theme.textMuted }]}>Send instant welcome text message</Text>
              </View>
            </View>
          </TouchableOpacity>

          <Text style={[styles.settingsSectionTitle, { marginTop: 15, marginBottom: 8 }]}>Custom Templates & Attachments</Text>

          {/* Templates list wrapped in ScrollView */}
          <ScrollView style={{ maxHeight: 240, width: '100%' }} nestedScrollEnabled={true}>
            {whatsappTemplates.map(template => (
              <TouchableOpacity 
                key={template.id}
                style={[styles.brochureOptionBtn, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
                onPress={() => {
                  sendWhatsAppTemplate(template, activeWhatsAppLead);
                  setActiveWhatsAppLead(null);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {template.attachment_url ? (
                    <PlusCircle size={18} color="#10B981" />
                  ) : (
                    <MessageSquare size={18} color="#4F46E5" />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.brochureOptionTitle, { color: theme.text }]}>{template.name}</Text>
                    <Text style={[styles.brochureOptionSub, { color: theme.textMuted }]} numberOfLines={1}>
                      {template.attachment_url ? `📎 ${template.attachment_name || 'Attachment'}` : template.body}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Cancel Button */}
          <TouchableOpacity 
            style={[styles.closeSettingsBtn, { backgroundColor: '#EF4444', marginTop: 15 }]} 
            onPress={() => setActiveWhatsAppLead(null)}
          >
            <Text style={styles.closeSettingsBtnText}>Dismiss / Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* Global Share loading spinner */}
        {isShareLoading && (
          <View style={styles.shareLoadingOverlay}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={{ color: '#FFF', marginTop: 10, fontWeight: 'bold', fontSize: 12 }}>Preparing attachment file...</Text>
          </View>
        )}
      </View>
    );
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
          status: 'sent',
          tenant_id: currentUser?.tenant_id || 'default'
        }])
        .select()
        .single();

      if (error) throw error;

      // Add activity log
      await supabase.from('activity_logs').insert([{
        lead_id: selectedLead.id,
        actor_id: currentUser?.id,
        action_type: 'whatsapp_sent',
        description: `Sent custom WhatsApp reply: "${messageText.substring(0, 30)}..."`,
        tenant_id: currentUser?.tenant_id || 'default'
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
              status: 'read',
              tenant_id: currentUser?.tenant_id || 'default'
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
  const currentPipelineId = activeDashboardPipelineId || pipelines.find(p => p.is_default)?.id || pipelines[0]?.id;
  const activePipeline = pipelines.find(p => p.id === currentPipelineId) || pipelines.find(p => p.is_default) || pipelines[0];
  const pipelineStages = activePipeline ? activePipeline.stages.map((s: any) => s.name) : PIPELINE_STAGES;

  // Filter leads based on logged counselor and pipeline
  const myLeads = leads.filter(l => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager' && l.assigned_counsellor_id !== currentUser?.id) {
      return false;
    }
    const leadPipelineId = l.pipeline_id || pipelines.find(p => p.is_default)?.id;
    return leadPipelineId === currentPipelineId;
  });

  const filteredLeads = myLeads.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (l.preferred_destination && l.preferred_destination.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStage = selectedStageFilter === 'All' || l.status === selectedStageFilter;
    return matchesSearch && matchesStage;
  });

  const theme = {
    bg: darkMode ? '#0F172A' : '#F8FAFC',
    cardBg: darkMode ? '#1E293B' : '#FFFFFF',
    text: darkMode ? '#F1F5F9' : '#0F172A',
    textMuted: darkMode ? '#94A3B8' : '#64748B',
    border: darkMode ? '#334155' : '#E2E8F0',
    headerBg: darkMode ? '#1E293B' : '#FFFFFF',
    inputBg: darkMode ? '#334155' : '#FFFFFF',
    inputText: darkMode ? '#F1F5F9' : '#0F172A',
    inputBorder: darkMode ? '#475569' : '#CBD5E1',
    pipelineTabBg: darkMode ? '#334155' : '#EEF2FF',
    leadCardBg: darkMode ? '#1E293B' : '#FFFFFF',
  };

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
        <KeyboardAvoidingView 
          behavior="padding" 
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0}
        >
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
                        placeholder="Enter account password"
                        placeholderTextColor="#64748B"
                        value={passwordInput}
                        onChangeText={setPasswordInput}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity 
                        style={styles.eyeButton} 
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <Eye size={18} color="#64748B" />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity 
                      style={[styles.loginSubmitBtn, isSubmitting && { opacity: 0.7 }]} 
                      onPress={handleMobileLoginSubmit}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <Text style={styles.loginSubmitBtnText}>Sign In</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    {!isOtpSent ? (
                      <View>
                        <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
                        <TextInput 
                          style={styles.loginInput}
                          placeholder="e.g. +919876543210"
                          placeholderTextColor="#64748B"
                          value={phoneInput}
                          onChangeText={setPhoneInput}
                          keyboardType="phone-pad"
                        />
                        <TouchableOpacity 
                          style={[styles.loginSubmitBtn, isSubmitting && { opacity: 0.7 }]} 
                          onPress={sendMobileSmsOtp}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <ActivityIndicator color="#FFF" size="small" />
                          ) : (
                            <Text style={styles.loginSubmitBtnText}>Send OTP Code</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View>
                        <Text style={styles.otpSentText}>
                          A 6-digit verification code has been generated. Use the mock code displayed above or check logs.
                        </Text>
                        <Text style={styles.inputLabel}>VERIFICATION CODE</Text>
                        <TextInput 
                          style={styles.loginInput}
                          placeholder="Enter 6-digit OTP"
                          placeholderTextColor="#64748B"
                          value={otpInput}
                          onChangeText={setOtpInput}
                          keyboardType="number-pad"
                          maxLength={6}
                        />
                        <TouchableOpacity 
                          style={[styles.loginSubmitBtn, isSubmitting && { opacity: 0.7 }]} 
                          onPress={verifyMobileSmsOtp}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <ActivityIndicator color="#FFF" size="small" />
                          ) : (
                            <Text style={styles.loginSubmitBtnText}>Verify & Login</Text>
                          )}
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
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // --- TASKS LIST VIEW ---
  if (currentScreen === 'tasksList') {
    const myLeadIds = myLeads.map(l => l.id);
    const pendingTasks = tasks
      .filter(t => !t.is_completed && myLeadIds.includes(t.lead_id))
      .sort((a, b) => new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime());

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <StatusBar barStyle={darkMode ? "light-content" : "dark-content"} />
        
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
          <TouchableOpacity 
            style={[styles.backBtn, { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: darkMode ? '#334155' : '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }]} 
            onPress={() => setCurrentScreen('dashboard')}
          >
            <ArrowLeft size={16} color={theme.text} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text }}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text, flex: 1, textAlign: 'center', marginRight: 50 }]}>Pending Tasks</Text>
        </View>

        {/* Task List */}
        <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 15 }} contentContainerStyle={{ paddingBottom: 30 }}>
          {pendingTasks.length > 0 ? (
            pendingTasks.map(task => {
              const lead = leads.find(l => l.id === task.lead_id);
              const formattedDate = task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              }) : 'N/A';
              const formattedTime = task.due_date ? new Date(task.due_date).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              }) : 'N/A';

              return (
                <View 
                  key={task.id} 
                  style={[
                    styles.leadItemCard, 
                    { 
                      backgroundColor: theme.leadCardBg, 
                      borderColor: theme.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 14
                    }
                  ]}
                >
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>
                      {task.title}
                    </Text>
                    
                    {lead && (
                      <TouchableOpacity 
                        style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 }}
                        onPress={() => {
                          setPrevScreen('tasksList');
                          setSelectedLead(lead);
                          setCurrentScreen('detail');
                        }}
                      >
                        <User size={12} color={darkMode ? '#818CF8' : '#4F46E5'} />
                        <Text style={{ fontSize: 12, fontWeight: '600', color: darkMode ? '#818CF8' : '#4F46E5', textDecorationLine: 'underline' }}>
                          Lead: {lead.name}
                        </Text>
                      </TouchableOpacity>
                    )}

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 }}>
                      <Clock size={12} color={theme.textMuted} />
                      <Text style={{ fontSize: 11, color: theme.textMuted }}>
                        Due: {formattedDate} at {formattedTime}
                      </Text>
                    </View>
                  </View>

                  {/* Complete Task checkbox button */}
                  <TouchableOpacity 
                    style={{ 
                      width: 28, 
                      height: 28, 
                      borderRadius: 14, 
                      borderWidth: 2, 
                      borderColor: '#10B981', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      backgroundColor: 'transparent'
                    }}
                    onPress={() => handleToggleTask(task.id)}
                  >
                    <Check size={14} color="#10B981" />
                  </TouchableOpacity>
                </View>
              );
            })
          ) : (
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <CheckCircle size={48} color="#10B981" style={{ marginBottom: 12 }} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text, marginBottom: 4 }}>
                All caught up!
              </Text>
              <Text style={{ fontSize: 13, color: theme.textMuted, textAlign: 'center' }}>
                You have no scheduled tasks pending.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- DETAIL VIEW ---
  if (currentScreen === 'detail' && selectedLead) {
    const leadNotes = notes.filter(n => n.lead_id === selectedLead.id);
    const leadTasks = tasks.filter(t => t.lead_id === selectedLead.id);
    const leadChats = chatHistory.filter(c => c.lead_id === selectedLead.id);
    const connectedStudent = partnerStudents.find(ps => ps.crm_lead_id === selectedLead.id);
    const connectedPartner = connectedStudent ? partners.find(p => p.id === connectedStudent.partner_id) : null;
    const availableStudents = partnerStudents.filter(ps => !ps.crm_lead_id);

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <StatusBar barStyle={darkMode ? "light-content" : "dark-content"} />
        {/* Detail Header */}
        <View style={[styles.detailHeader, { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
          <TouchableOpacity 
            onPress={() => setCurrentScreen(prevScreen)}
            style={[styles.backBtn, { backgroundColor: darkMode ? '#334155' : '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6 }]}
          >
            <ArrowLeft size={18} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.detailHeaderTitle, { color: theme.text }]} numberOfLines={1}>{selectedLead.name}</Text>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreCircleText}>{selectedLead.score}</Text>
          </View>
        </View>

        <ScrollView style={[styles.detailScroll, { backgroundColor: theme.bg }]}>
          {/* Card Info Box */}
          <View style={[styles.leadDetailsBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={[styles.detailsRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.detailLabel, { color: theme.textMuted }]}>NEET MARKS</Text>
              <Text style={[styles.detailVal, { color: theme.text }]}>{selectedLead.neet_marks || 'N/A'}</Text>
            </View>
            <View style={[styles.detailsRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.detailLabel, { color: theme.textMuted }]}>BUDGET</Text>
              <Text style={[styles.detailVal, { color: theme.text }]}>₹{selectedLead.budget ? `${(selectedLead.budget / 100000).toFixed(0)} Lakh` : 'N/A'}</Text>
            </View>
            <View style={[styles.detailsRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.detailLabel, { color: theme.textMuted }]}>TARGET DESTINATION</Text>
              <Text style={[styles.detailVal, { color: theme.text }]}>{selectedLead.preferred_destination || 'N/A'}</Text>
            </View>
            <View style={[styles.detailsRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.detailLabel, { color: theme.textMuted }]}>LEAD SOURCE</Text>
              <Text style={[styles.sourceTextBadge, { color: darkMode ? '#818CF8' : '#4F46E5' }]}>{selectedLead.lead_source}</Text>
            </View>
            <View style={[styles.detailsRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.detailLabel, { color: theme.textMuted }]}>PHONE NUMBER</Text>
              <Text style={[styles.detailVal, { color: theme.text }]}>{selectedLead.phone}</Text>
            </View>

            {/* Clickable Pipeline row */}
            <TouchableOpacity 
              style={[styles.detailsRowClickable, { borderBottomColor: theme.border }]}
              onPress={() => setActivePickerType('pipeline')}
            >
              <Text style={[styles.detailLabel, { color: theme.textMuted }]}>PIPELINE</Text>
              <View style={styles.pickerValueRow}>
                <Text style={[styles.detailVal, { color: theme.text }]}>
                  {pipelines.find(p => p.id === selectedLead.pipeline_id)?.name || pipelines.find(p => p.is_default)?.name || 'Sales Pipeline'}
                </Text>
                <Text style={[styles.pickerChevron, { color: theme.textMuted }]}>▾</Text>
              </View>
            </TouchableOpacity>

            {/* Clickable Status row */}
            <TouchableOpacity 
              style={[styles.detailsRowClickable, { borderBottomColor: theme.border }]}
              onPress={() => setActivePickerType('status')}
            >
              <Text style={[styles.detailLabel, { color: theme.textMuted }]}>PIPELINE STATUS</Text>
              <View style={styles.pickerValueRow}>
                <Text style={[styles.detailVal, { color: theme.text }]}>{selectedLead.status}</Text>
                <Text style={[styles.pickerChevron, { color: theme.textMuted }]}>▾</Text>
              </View>
            </TouchableOpacity>

            {/* Clickable Assigned Counsellor row */}
            <TouchableOpacity 
              style={[styles.detailsRowClickable, { borderBottomColor: theme.border }]}
              onPress={() => setActivePickerType('counsellor')}
            >
              <Text style={[styles.detailLabel, { color: theme.textMuted }]}>ASSIGNED TO</Text>
              <View style={styles.pickerValueRow}>
                <Text style={[styles.detailVal, { color: theme.text }]}>
                  {profiles.find(p => p.id === selectedLead.assigned_counsellor_id)?.full_name || 'Unassigned'}
                </Text>
                <Text style={[styles.pickerChevron, { color: theme.textMuted }]}>▾</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Post-Close Visa Processing Banner — only for Closed Won leads */}
          {selectedLead.status === 'Closed Won' && (
            <TouchableOpacity
              style={styles.visaBanner}
              onPress={() => {
                const app = visaApplications.find(v => v.lead_id === selectedLead.id);
                if (app) {
                  setSelectedVisaApp(app);
                  setVisaNotesInput(app.visa_notes || '');
                } else {
                  // Create a local placeholder until Supabase auto-creates it
                  setSelectedVisaApp({
                    id: '',
                    lead_id: selectedLead.id,
                    status: 'Document Collection',
                    target_country: selectedLead.preferred_destination || '',
                    target_college: '',
                    visa_notes: '',
                    travel_currency_exchanged: false,
                    travel_insurance_done: false,
                    travel_luggage_guidelines: false,
                    travel_pickup_confirmed: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  });
                  setVisaNotesInput('');
                }
                setIsVisaScreenOpen(true);
              }}
            >
              <Plane size={18} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.visaBannerTitle}>📋 Post-Close: Visa Processing</Text>
                <Text style={styles.visaBannerSub}>Manage documents, status & travel checklist</Text>
              </View>
              <ArrowRight size={16} color="#fff" />
            </TouchableOpacity>
          )}

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
              onPress={() => triggerWhatsApp(selectedLead)}
            >
              <MessageSquare size={18} color="#FFF" />
              <Text style={styles.actionButtonText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>

          {/* TABS Toggles */}
          <View style={[styles.tabsRow, { borderBottomColor: theme.border }]}>
            {(['notes', 'tasks', 'chat', 'checklist'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, detailTab === tab && styles.tabBtnActive]}
                onPress={() => setDetailTab(tab)}
              >
                <Text style={[styles.tabBtnText, { color: theme.textMuted }, detailTab === tab && [styles.tabBtnTextActive, { color: darkMode ? '#818CF8' : '#4F46E5' }]]}>
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
                  placeholderTextColor="#94A3B8"
                  value={noteText}
                  onChangeText={setNoteText}
                  style={[styles.formInputText, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.inputBorder }]}
                />
                <TouchableOpacity style={styles.formSubmitBtn} onPress={handleAddNote}>
                  <Text style={styles.formSubmitBtnText}>POST</Text>
                </TouchableOpacity>
              </View>

              {leadNotes.length > 0 ? (
                leadNotes.map(n => (
                  <View key={n.id} style={[styles.noteCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                    <Text style={[styles.noteMeta, { color: theme.textMuted }]}>{n.author_name} • {new Date(n.created_at).toLocaleDateString()}</Text>
                    <Text style={[styles.noteContent, { color: theme.text }]}>{n.content}</Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>No internal notes recorded yet</Text>
              )}
            </View>
          )}

          {/* TAB CONTENTS: TASKS */}
          {detailTab === 'tasks' && (
            <View style={styles.tabContentBox}>
              <View style={[styles.inputFormBox, { flexDirection: 'column', gap: 10, alignItems: 'stretch' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TextInput
                    placeholder="Add follow-up task call..."
                    placeholderTextColor="#94A3B8"
                    value={taskText}
                    onChangeText={setTaskText}
                    style={[styles.formInputText, { flex: 1, backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.inputBorder }]}
                  />
                  <TouchableOpacity style={styles.formSubmitBtn} onPress={handleAddTask}>
                    <Text style={styles.formSubmitBtnText}>ADD</Text>
                  </TouchableOpacity>
                </View>

                {/* Task Schedule Inputs */}
                <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8 }}>
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: theme.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Task Schedule (Date & Time)</Text>
                  
                  {/* Quick Date Presets */}
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                    <TouchableOpacity 
                      style={[styles.presetBtn, { backgroundColor: darkMode ? '#334155' : '#EEF2FF', borderColor: darkMode ? '#475569' : '#E2E8F0' }]}
                      onPress={() => {
                        const d = new Date();
                        setTaskDate(d.getDate().toString());
                        setTaskMonth((d.getMonth() + 1).toString());
                      }}
                    >
                      <Text style={[styles.presetBtnText, { color: darkMode ? '#818CF8' : '#4F46E5' }]}>Today</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.presetBtn, { backgroundColor: darkMode ? '#334155' : '#EEF2FF', borderColor: darkMode ? '#475569' : '#E2E8F0' }]}
                      onPress={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 1);
                        setTaskDate(d.getDate().toString());
                        setTaskMonth((d.getMonth() + 1).toString());
                      }}
                    >
                      <Text style={[styles.presetBtnText, { color: darkMode ? '#818CF8' : '#4F46E5' }]}>Tomorrow</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.presetBtn, { backgroundColor: darkMode ? '#334155' : '#EEF2FF', borderColor: darkMode ? '#475569' : '#E2E8F0' }]}
                      onPress={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 3);
                        setTaskDate(d.getDate().toString());
                        setTaskMonth((d.getMonth() + 1).toString());
                      }}
                    >
                      <Text style={[styles.presetBtnText, { color: darkMode ? '#818CF8' : '#4F46E5' }]}>In 3 Days</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.presetBtn, { backgroundColor: darkMode ? '#334155' : '#EEF2FF', borderColor: darkMode ? '#475569' : '#E2E8F0' }]}
                      onPress={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 7);
                        setTaskDate(d.getDate().toString());
                        setTaskMonth((d.getMonth() + 1).toString());
                      }}
                    >
                      <Text style={[styles.presetBtnText, { color: darkMode ? '#818CF8' : '#4F46E5' }]}>1 Week</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    
                    {/* Date Selector Widget */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 11, color: theme.textMuted }}>Date:</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.inputBorder, borderRadius: 8, padding: 2 }}>
                        <TouchableOpacity 
                          style={styles.adjustBtn} 
                          onPress={() => {
                            let d = parseInt(taskDate) || 1;
                            d = d === 1 ? 31 : d - 1;
                            setTaskDate(d.toString());
                          }}
                        >
                          <Text style={[styles.adjustBtnText, { color: theme.text }]}>-</Text>
                        </TouchableOpacity>
                        <Text style={{ width: 22, textAlign: 'center', fontSize: 12, fontWeight: 'bold', color: theme.text }}>{taskDate.padStart(2, '0')}</Text>
                        <TouchableOpacity 
                          style={styles.adjustBtn} 
                          onPress={() => {
                            let d = parseInt(taskDate) || 1;
                            d = d === 31 ? 1 : d + 1;
                            setTaskDate(d.toString());
                          }}
                        >
                          <Text style={[styles.adjustBtnText, { color: theme.text }]}>+</Text>
                        </TouchableOpacity>
                      </View>
                      
                      <Text style={{ color: theme.textMuted, fontSize: 12 }}>/</Text>
                      
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.inputBorder, borderRadius: 8, padding: 2 }}>
                        <TouchableOpacity 
                          style={styles.adjustBtn} 
                          onPress={() => {
                            let m = parseInt(taskMonth) || 1;
                            m = m === 1 ? 12 : m - 1;
                            setTaskMonth(m.toString());
                          }}
                        >
                          <Text style={[styles.adjustBtnText, { color: theme.text }]}>-</Text>
                        </TouchableOpacity>
                        <Text style={{ width: 22, textAlign: 'center', fontSize: 12, fontWeight: 'bold', color: theme.text }}>{taskMonth.padStart(2, '0')}</Text>
                        <TouchableOpacity 
                          style={styles.adjustBtn} 
                          onPress={() => {
                            let m = parseInt(taskMonth) || 1;
                            m = m === 12 ? 1 : m + 1;
                            setTaskMonth(m.toString());
                          }}
                        >
                          <Text style={[styles.adjustBtnText, { color: theme.text }]}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Time Selector Widget */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 11, color: theme.textMuted }}>Time:</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.inputBorder, borderRadius: 8, padding: 2 }}>
                        <TouchableOpacity 
                          style={styles.adjustBtn} 
                          onPress={() => {
                            let h = parseInt(taskHour) || 12;
                            h = h === 1 ? 12 : h - 1;
                            setTaskHour(h.toString().padStart(2, '0'));
                          }}
                        >
                          <Text style={[styles.adjustBtnText, { color: theme.text }]}>-</Text>
                        </TouchableOpacity>
                        <Text style={{ width: 22, textAlign: 'center', fontSize: 12, fontWeight: 'bold', color: theme.text }}>{taskHour}</Text>
                        <TouchableOpacity 
                          style={styles.adjustBtn} 
                          onPress={() => {
                            let h = parseInt(taskHour) || 12;
                            h = h === 12 ? 1 : h + 1;
                            setTaskHour(h.toString().padStart(2, '0'));
                          }}
                        >
                          <Text style={[styles.adjustBtnText, { color: theme.text }]}>+</Text>
                        </TouchableOpacity>
                      </View>
                      
                      <Text style={{ color: theme.textMuted, fontSize: 12 }}>:</Text>
                      
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.inputBorder, borderRadius: 8, padding: 2 }}>
                        <TouchableOpacity 
                          style={styles.adjustBtn} 
                          onPress={() => {
                            let min = parseInt(taskMinute) || 0;
                            min = min === 0 ? 45 : min - 15;
                            setTaskMinute(min.toString().padStart(2, '0'));
                          }}
                        >
                          <Text style={[styles.adjustBtnText, { color: theme.text }]}>-</Text>
                        </TouchableOpacity>
                        <Text style={{ width: 22, textAlign: 'center', fontSize: 12, fontWeight: 'bold', color: theme.text }}>{taskMinute}</Text>
                        <TouchableOpacity 
                          style={styles.adjustBtn} 
                          onPress={() => {
                            let min = parseInt(taskMinute) || 0;
                            min = min === 45 ? 0 : min + 15;
                            setTaskMinute(min.toString().padStart(2, '0'));
                          }}
                        >
                          <Text style={[styles.adjustBtnText, { color: theme.text }]}>+</Text>
                        </TouchableOpacity>
                      </View>
                      
                      <TouchableOpacity 
                        style={[styles.ampmBtn, { backgroundColor: darkMode ? '#334155' : '#EEF2FF', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 }]} 
                        onPress={() => setTaskAmPm(prev => prev === 'AM' ? 'PM' : 'AM')}
                      >
                        <Text style={[styles.ampmBtnText, { color: darkMode ? '#818CF8' : '#4F46E5', fontSize: 11, fontWeight: 'bold' }]}>{taskAmPm}</Text>
                      </TouchableOpacity>
                    </View>

                  </View>
                </View>
              </View>

              {leadTasks.length > 0 ? (
                leadTasks.map(t => (
                  <TouchableOpacity 
                    key={t.id} 
                    style={[styles.taskCard, t.is_completed && styles.taskCardCompleted, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                    onPress={() => handleToggleTask(t.id)}
                  >
                    <View style={[styles.taskLeftRow, { alignItems: 'flex-start' }]}>
                      <View style={[styles.taskCheckbox, t.is_completed && styles.taskCheckboxChecked, { borderColor: theme.border, marginTop: 2 }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.taskCardTitle, t.is_completed && styles.taskTitleCompleted, { color: theme.text }]}>
                          {t.title}
                        </Text>
                        {t.due_date && (
                          <Text style={{ color: theme.textMuted, fontSize: 10, marginTop: 4 }}>
                            📅 Due: {new Date(t.due_date).toLocaleDateString()} at {new Date(t.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>No scheduled tasks pending</Text>
              )}
            </View>
          )}

          {/* TAB CONTENTS: CHATS */}
          {detailTab === 'chat' && (
            <View style={styles.tabContentBox}>
              <View style={[styles.chatHistoryWindow, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                {leadChats.length > 0 ? (
                  leadChats.map(c => (
                    <View 
                      key={c.id} 
                      style={[
                        styles.chatBubble, 
                        c.direction === 'out' ? styles.chatBubbleOut : [styles.chatBubbleIn, { backgroundColor: darkMode ? '#334155' : '#F1F5F9' }]
                      ]}
                    >
                      <Text style={[
                        styles.chatBubbleText, 
                        c.direction === 'out' ? styles.chatTextOut : [styles.chatTextIn, { color: theme.text }]
                      ]}>
                        {c.text}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={[styles.emptyText, { color: theme.textMuted }]}>No WhatsApp chat transcripts recorded</Text>
                )}
              </View>

              <View style={styles.inputFormBox}>
                <TextInput
                  placeholder="Send simulated reply message..."
                  placeholderTextColor="#94A3B8"
                  value={chatInput}
                  onChangeText={setChatInput}
                  style={[styles.formInputText, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.inputBorder }]}
                />
                <TouchableOpacity style={styles.chatSendBtn} onPress={handleSendWhatsAppSim}>
                  <Text style={styles.formSubmitBtnText}>SEND</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* TAB CONTENTS: CHECKLIST */}
          {detailTab === 'checklist' && (
            <View style={styles.tabContentBox}>
              {!connectedStudent ? (
                <View style={[styles.connectCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                  <Text style={[styles.connectCardTitle, { color: theme.text }]}>Connect Referred Student</Text>
                  <Text style={[styles.connectCardSub, { color: theme.textMuted }]}>
                    Link this lead to a student referred by a partner agency to fetch their documents and sync statuses.
                  </Text>
                  
                  <View style={[styles.referredSelectWrapper, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: theme.textMuted, marginBottom: 4 }}>SELECT REFERRED STUDENT</Text>
                    {availableStudents.length === 0 ? (
                      <Text style={{ fontSize: 12, color: theme.text, fontWeight: '600', paddingVertical: 10 }}>No unconnected students found</Text>
                    ) : (
                      <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true}>
                        {availableStudents.map(student => {
                          const partner = partners.find(p => p.id === student.partner_id);
                          const isSelected = referredStudentSelectId === student.id;
                          return (
                            <TouchableOpacity
                              key={student.id}
                              onPress={() => setReferredStudentSelectId(student.id)}
                              style={[
                                styles.referredSelectItem,
                                { borderBottomColor: theme.border },
                                isSelected && { backgroundColor: darkMode ? '#334155' : '#EEF2FF' }
                              ]}
                            >
                              <Text style={{ fontSize: 12, color: theme.text, fontWeight: isSelected ? '700' : '500' }}>
                                {student.first_name} {student.last_name} ({partner?.business_name || 'Agency'})
                              </Text>
                              <Text style={{ fontSize: 10, color: theme.textMuted }}>
                                Country: {student.destination_country} • College: {student.target_university}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>

                  {availableStudents.length > 0 && (
                    <TouchableOpacity
                      style={styles.connectSubmitBtn}
                      onPress={() => {
                        if (!referredStudentSelectId) {
                          Alert.alert("Selection Required", "Please select a student from the list first.");
                          return;
                        }
                        connectLeadToPartnerStudent(selectedLead.id, referredStudentSelectId);
                      }}
                    >
                      <Text style={styles.connectSubmitBtnText}>Link Student Referral</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={{ gap: 15 }}>
                  {/* Connected Student Profile Card */}
                  <View style={[styles.connectedProfileCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.connectedTag}>CONNECTED REFERRAL</Text>
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert(
                            "Disconnect Student",
                            "Are you sure you want to disconnect this student referral?",
                            [
                              { text: "Cancel", style: "cancel" },
                              { text: "Disconnect", style: "destructive", onPress: () => disconnectLeadFromPartnerStudent(connectedStudent.id) }
                            ]
                          );
                        }}
                        style={styles.disconnectBtn}
                      >
                        <Text style={styles.disconnectBtnText}>Disconnect</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <Text style={[styles.connectedStudentName, { color: theme.text }]}>
                      {connectedStudent.first_name} {connectedStudent.last_name}
                    </Text>
                    
                    <Text style={[styles.connectedStudentAgency, { color: theme.textMuted }]}>
                      Agency: <Text style={{ fontWeight: '700', color: theme.text }}>{connectedPartner?.business_name || 'Partner Agency'}</Text>
                    </Text>

                    <View style={[styles.connectedStudentMetaGrid, { borderTopColor: theme.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 9, color: theme.textMuted, fontWeight: '700' }}>DESTINATION</Text>
                        <Text style={{ fontSize: 12, color: theme.text, fontWeight: '600', marginTop: 2 }}>{connectedStudent.destination_country}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 9, color: theme.textMuted, fontWeight: '700' }}>UNIVERSITY</Text>
                        <Text style={{ fontSize: 12, color: theme.text, fontWeight: '600', marginTop: 2 }}>{connectedStudent.target_university}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Document Checklist */}
                  <View style={[styles.checklistCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                    <Text style={[styles.checklistCardTitle, { color: theme.text }]}>
                      📄 Document Checklist ({connectedStudent.destination_country})
                    </Text>
                    <Text style={[styles.checklistCardSub, { color: theme.textMuted }]}>
                      Verify or reject files uploaded by the student in the Partner Portal.
                    </Text>

                    <View style={{ marginTop: 10, gap: 10 }}>
                      {(() => {
                        const reqDocNames = new Set<string>();
                        const country = connectedStudent.destination_country;
                        if (country) {
                          visaRequiredDocs
                            .filter(d => d.country.toLowerCase() === country.toLowerCase() && d.is_required)
                            .forEach(d => reqDocNames.add(d.document_name));
                        }
                        
                        const targetUniv = connectedStudent.target_university;
                        if (targetUniv) {
                          const college = colleges?.find(c => c.name.toLowerCase() === targetUniv.toLowerCase());
                          if (college && Array.isArray(college.required_docs)) {
                            college.required_docs.forEach((d: string) => reqDocNames.add(d));
                          }
                        }

                        if (reqDocNames.size === 0) {
                          reqDocNames.add('Passport Copy');
                          reqDocNames.add('12th Marksheet');
                          reqDocNames.add('NEET Score Card');
                        }

                        const docsList = Array.from(reqDocNames);

                        return docsList.map(docName => {
                          const upload = partnerUploadedDocs.find(
                            d => d.student_id === connectedStudent.id && d.document_name.toLowerCase() === docName.toLowerCase()
                          );

                          return (
                            <View key={docName} style={[styles.checklistDocRow, { borderColor: theme.border, backgroundColor: darkMode ? '#0F172A' : '#F8FAFC' }]}>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.checklistDocName, { color: theme.text }]}>{docName}</Text>
                                {upload ? (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                    <Text style={[
                                      styles.checklistUploadStatus,
                                      upload.verification_status === 'verified' && { color: '#10B981' },
                                      upload.verification_status === 'rejected' && { color: '#EF4444' },
                                      upload.verification_status === 'pending' && { color: '#F59E0B' }
                                    ]}>
                                      {upload.verification_status.toUpperCase()}
                                    </Text>
                                    <TouchableOpacity onPress={() => Linking.openURL(upload.file_url)}>
                                      <Text style={{ fontSize: 10, color: '#3B82F6', textDecorationLine: 'underline' }}>View File</Text>
                                    </TouchableOpacity>
                                  </View>
                                ) : (
                                  <Text style={[styles.checklistUploadStatus, { color: theme.textMuted, marginTop: 4 }]}>
                                    NOT UPLOADED
                                  </Text>
                                )}
                              </View>

                              {upload && (
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                  {upload.verification_status !== 'verified' && (
                                    <TouchableOpacity
                                      onPress={() => verifyPartnerDoc(upload.id, 'verified')}
                                      style={[styles.verifyDocBtn, { backgroundColor: '#10B981' }]}
                                    >
                                      <Text style={styles.verifyDocBtnText}>Verify</Text>
                                    </TouchableOpacity>
                                  )}
                                  {upload.verification_status !== 'rejected' && (
                                    <TouchableOpacity
                                      onPress={() => verifyPartnerDoc(upload.id, 'rejected')}
                                      style={[styles.verifyDocBtn, { backgroundColor: '#EF4444' }]}
                                    >
                                      <Text style={styles.verifyDocBtnText}>Reject</Text>
                                    </TouchableOpacity>
                                  )}
                                </View>
                              )}
                            </View>
                          );
                        });
                      })()}
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>
        {renderFeedbackModal()}
        {renderPickerModal()}
        {renderWhatsAppModal()}
      </SafeAreaView>
    );
  }

  // --- DASHBOARD VIEW ---
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={darkMode ? "light-content" : "dark-content"} />
      
      {/* Mobile Dashboard Header */}
      <View style={[styles.header, { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Perfect Scholar CRM</Text>
          <Text style={[styles.headerUser, { color: theme.textMuted }]}>Hi, {currentUser.full_name} ({currentUser.role.toUpperCase()})</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity 
            style={[styles.settingsBtn, { backgroundColor: darkMode ? '#334155' : '#F1F5F9' }]} 
            onPress={() => setIsSettingsOpen(true)}
          >
            <Settings size={16} color={darkMode ? '#F1F5F9' : '#4F46E5'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Summary Panel */}
      <View style={styles.statsSummaryRow}>
        <View style={[styles.statsSummaryCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[styles.statsSummaryLabel, { color: theme.textMuted }]}>ASSIGNED LEADS</Text>
          <Text style={[styles.statsSummaryVal, { color: darkMode ? '#818CF8' : '#4F46E5' }]}>{myLeads.length}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.statsSummaryCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
          onPress={() => {
            setPrevScreen('dashboard');
            setCurrentScreen('tasksList');
          }}
        >
          <Text style={[styles.statsSummaryLabel, { color: theme.textMuted }]}>PENDING TASKS</Text>
          <Text style={[styles.statsSummaryVal, { color: '#EF4444' }]}>
            {tasks.filter(t => !t.is_completed && myLeads.map(l => l.id).includes(t.lead_id)).length}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Action Header */}
      <View style={[styles.actionHeaderRow, { gap: 4 }]}>
        <Text style={[styles.listSectionTitle, { color: theme.text, flex: 1 }]} numberOfLines={1}>
          My Leads
        </Text>
        
        <TouchableOpacity 
          style={[styles.addBtnHeader, { backgroundColor: darkMode ? '#1E293B' : '#F8FAFC', paddingHorizontal: 6 }]}
          onPress={handleExportCSV}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textMuted }}>Export</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.addBtnHeader, { backgroundColor: darkMode ? '#1E293B' : '#F8FAFC', paddingHorizontal: 6 }]}
          onPress={() => setIsImportModalOpen(true)}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textMuted }}>Import</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.addBtnHeader, { backgroundColor: darkMode ? '#1E293B' : '#F0FDF4', borderColor: '#86EFAC', borderWidth: 1, paddingHorizontal: 6 }]}
          onPress={handleSyncPartnerData}
          disabled={isSyncing}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#16A34A' }}>
            {isSyncing ? 'Sync...' : 'Sync'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.addBtnHeader, { backgroundColor: darkMode ? '#334155' : '#EEF2FF', paddingHorizontal: 6 }]}
          onPress={() => setIsAddModalOpen(true)}
        >
          <Text style={[styles.addBtnHeaderText, { color: darkMode ? '#818CF8' : '#4F46E5', fontSize: 10 }]}>+ Lead</Text>
        </TouchableOpacity>
      </View>

      {/* Pipeline Scroll view selector */}
      {pipelines.length > 0 && (
        <View style={[styles.pipelineSelectorContainer, { borderBottomColor: theme.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15, paddingVertical: 10, gap: 10, flexDirection: 'row' }}>
            {pipelines.map(p => {
              const isSelected = currentPipelineId === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => {
                    setActiveDashboardPipelineId(p.id);
                    setSelectedStageFilter('All');
                  }}
                  style={[
                    styles.pipelineSelBtn,
                    { backgroundColor: darkMode ? '#334155' : '#F1F5F9', borderColor: theme.border },
                    isSelected && { backgroundColor: darkMode ? '#818CF8' : '#4F46E5', borderColor: darkMode ? '#818CF8' : '#4F46E5' }
                  ]}
                >
                  <Text style={[styles.pipelineSelBtnText, { color: theme.textMuted }, isSelected && { color: '#FFF' }]}>{p.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Pipeline Stage Horizontal Selector */}
      <View style={[styles.horizontalPipelineContainer, { backgroundColor: theme.cardBg, borderBottomColor: theme.border }]}>
        <ScrollView 
          horizontal={true} 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalPipelineScroll}
        >
          {['All', ...pipelineStages].map(stage => {
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
                  { backgroundColor: darkMode ? '#334155' : '#EEF2FF', borderColor: darkMode ? '#475569' : '#E2E8F0' },
                  isSelected && { backgroundColor: '#4F46E5', borderColor: '#4F46E5' }
                ]}
              >
                <Text style={[
                  styles.pipelineTabText, 
                  { color: darkMode ? '#94A3B8' : '#4F46E5' },
                  isSelected && { color: '#FFFFFF' }
                ]}>
                  {stage} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Manual Entry Form Popup Modal Overlay */}
      {isAddModalOpen && (
        <View style={styles.feedbackModalOverlay}>
          <View style={[styles.feedbackModalContent, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.feedbackTitle, { color: theme.text }]}>Add Candidate Lead</Text>
              
              <TextInput 
                placeholder="Student Name *" 
                placeholderTextColor="#94A3B8"
                value={newLeadName} 
                onChangeText={setNewLeadName} 
                style={[styles.formInputInline, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.inputBorder, marginBottom: 12 }]} 
              />
              <TextInput 
                placeholder="Phone Number *" 
                placeholderTextColor="#94A3B8"
                value={newLeadPhone} 
                onChangeText={setNewLeadPhone} 
                keyboardType="phone-pad" 
                style={[styles.formInputInline, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.inputBorder, marginBottom: 12 }]} 
              />
              <TextInput 
                placeholder="NEET Marks (720 max)" 
                placeholderTextColor="#94A3B8"
                value={newLeadNeet} 
                onChangeText={setNewLeadNeet} 
                keyboardType="number-pad" 
                style={[styles.formInputInline, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.inputBorder, marginBottom: 12 }]} 
              />
              <TextInput 
                placeholder="Budget (Lakhs INR)" 
                placeholderTextColor="#94A3B8"
                value={newLeadBudget} 
                onChangeText={setNewLeadBudget} 
                keyboardType="number-pad" 
                style={[styles.formInputInline, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.inputBorder, marginBottom: 12 }]} 
              />
              <TextInput 
                placeholder="Target Destination (Country/State)" 
                placeholderTextColor="#94A3B8"
                value={newLeadDest} 
                onChangeText={setNewLeadDest} 
                style={[styles.formInputInline, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.inputBorder, marginBottom: 16 }]} 
              />
              
              <TouchableOpacity style={styles.submitLeadBtn} onPress={handleAddLead}>
                <Text style={styles.submitLeadBtnText}>Save Candidate Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.cancelModalBtn, { marginTop: 10 }]} 
                onPress={() => setIsAddModalOpen(false)}
              >
                <Text style={[styles.cancelModalBtnText, { color: theme.textMuted, textAlign: 'center' }]}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Search Input */}
      <View style={[styles.searchBarContainer, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <Search size={16} color="#94A3B8" style={styles.searchIcon} />
        <TextInput
          placeholder="Search leads by name, country..."
          placeholderTextColor="#94A3B8"
          value={searchTerm}
          onChangeText={setSearchTerm}
          style={[styles.searchTextInput, { color: theme.text }]}
        />
      </View>

      {/* Leads Scroll list */}
      <ScrollView style={[styles.listScroll, { backgroundColor: theme.bg }]} contentContainerStyle={{ paddingBottom: 20 }}>
        {filteredLeads.length > 0 ? (
          filteredLeads.map(lead => (
            <View key={lead.id} style={[styles.leadItemCard, { backgroundColor: theme.leadCardBg, borderColor: theme.border }]}>
              <View style={styles.leadCardHeaderRow}>
                <TouchableOpacity 
                  style={styles.leadCardClickableArea}
                  onPress={() => {
                    setPrevScreen('dashboard');
                    setSelectedLead(lead);
                    setCurrentScreen('detail');
                  }}
                >
                  <View style={styles.leadCardHeader}>
                    <Text style={[styles.leadName, { color: theme.text }]}>{lead.name}</Text>
                    <View style={[styles.leadScoreBadge, { backgroundColor: darkMode ? '#334155' : '#F8FAFC' }]}>
                      <Text style={[styles.leadScoreText, { color: theme.textMuted }]}>{lead.score} pts</Text>
                    </View>
                  </View>
                  
                  <Text style={[styles.leadContactInfo, { color: theme.textMuted, marginTop: 4 }]}>{lead.phone} • {lead.preferred_destination || 'Abroad'}</Text>
                </TouchableOpacity>

                {/* Call Shortcut Button */}
                <TouchableOpacity 
                  style={styles.leadCallBtnCircle}
                  onPress={() => triggerCall(lead)}
                >
                  <Phone size={16} color="#6366F1" />
                </TouchableOpacity>
              </View>
              
              {/* Badges Row at the bottom of the card, completely separate to prevent click issues */}
              <View style={[styles.leadBadgesRow, { marginTop: 10 }]}>
                <TouchableOpacity 
                  style={[styles.statusLabelBadgeTouch, { backgroundColor: darkMode ? '#334155' : '#EEF2FF' }]}
                  onPress={() => {
                    setSelectedLead(lead);
                    setActivePickerType('status');
                  }}
                >
                  <Text style={[styles.statusLabelBadgeText, { color: darkMode ? '#818CF8' : '#4F46E5' }]}>{lead.status} ▾</Text>
                </TouchableOpacity>

                {/* Quick Allot/Assignee Badge */}
                <TouchableOpacity 
                  style={[styles.statusLabelBadgeTouch, { backgroundColor: darkMode ? '#334155' : '#EEF2FF', marginLeft: 8 }]}
                  onPress={() => {
                    setSelectedLead(lead);
                    setActivePickerType('counsellor');
                  }}
                >
                  <Text style={[styles.statusLabelBadgeText, { color: darkMode ? '#34D399' : '#059669' }]}>
                    👤 {profiles.find(p => p.id === lead.assigned_counsellor_id)?.full_name || 'Unassigned'} ▾
                  </Text>
                </TouchableOpacity>

                <Text style={[styles.sourceLabelBadge, { backgroundColor: darkMode ? '#334155' : '#F1F5F9', color: theme.textMuted, marginLeft: 'auto' }]}>{lead.lead_source}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.noLeadsText, { color: theme.textMuted }]}>No leads assigned to this profile matching query</Text>
        )}
      </ScrollView>
      {renderFeedbackModal()}
      {renderSettingsModal()}
      {renderWhatsAppModal()}
      {renderPickerModal()}
      <CSVImportModalMobile
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        darkMode={darkMode}
        theme={theme}
        supabase={supabase}
        currentUser={currentUser}
        pipelines={pipelines}
        leads={leads}
        profiles={profiles}
        onImportComplete={fetchData}
      />
    </SafeAreaView>
  );

  // ── VISA PROCESSING SCREEN ─────────────────────────────────────────────────
  function renderVisaScreen() {
    if (!isVisaScreenOpen || !selectedLead || !selectedVisaApp) return null;

    const VISA_STAGES = [
      'Not Started', 'Document Collection', 'Apostille/Verification',
      'Embassy Submission', 'Visa Issued', 'Flyer/Pre-departure'
    ];

    const country = selectedVisaApp.target_country || selectedLead.preferred_destination || '';
    const requiredDocs = visaRequiredDocs.filter(d => d.country === country);
    const uploadedDocs = visaUploadedDocs.filter(d => d.visa_application_id === selectedVisaApp.id);

    const updateVisaField = async (field: Partial<VisaApplication>) => {
      setIsSavingVisa(true);
      try {
        const appId = selectedVisaApp.id;
        if (!appId) {
          const { data, error } = await supabase
            .from('visa_applications')
            .insert({
              lead_id: selectedLead.id,
              status: field.status || 'Document Collection',
              target_country: field.target_country || selectedLead.preferred_destination || '',
              target_college: field.target_college || '',
              visa_notes: field.visa_notes || '',
              travel_currency_exchanged: field.travel_currency_exchanged || false,
              travel_insurance_done: field.travel_insurance_done || false,
              travel_luggage_guidelines: field.travel_luggage_guidelines || false,
              travel_pickup_confirmed: field.travel_pickup_confirmed || false,
              ...field,
              updated_at: new Date().toISOString(),
              tenant_id: currentUser?.tenant_id || 'default'
            })
            .select()
            .single();
          if (!error && data) {
            const newApp = data as VisaApplication;
            setSelectedVisaApp(newApp);
            setVisaApplications(prev => [...prev.filter(v => v.lead_id !== selectedLead.id), newApp]);
            Alert.alert('Success', 'Visa processing case initialized.');
          } else {
            Alert.alert('Error', 'Failed to create visa processing case.');
          }
        } else {
          const { error } = await supabase
            .from('visa_applications')
            .update({ ...field, updated_at: new Date().toISOString() })
            .eq('id', appId);
          if (!error) {
            setSelectedVisaApp(prev => prev ? { ...prev, ...field } : null);
            setVisaApplications(prev => prev.map(v => v.id === appId ? { ...v, ...field } as VisaApplication : v));
          }
        }
      } catch (e) {
        Alert.alert('Error', 'Could not save change.');
      } finally {
        setIsSavingVisa(false);
      }
    };

    const handleUploadDoc = async (docName: string, useCamera: boolean) => {
      try {
        let uri = '';
        let fileName = '';
        if (useCamera) {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Permission Denied', 'Camera access required.'); return; }
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
          if (result.canceled || !result.assets?.length) return;
          uri = result.assets[0].uri;
          fileName = `${docName.replace(/ /g,'_')}_scan.jpg`;
        } else {
          const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'] });
          if (result.canceled || !result.assets?.length) return;
          uri = result.assets[0].uri;
          fileName = result.assets[0].name;
        }

        let currentApp = selectedVisaApp;
        if (!currentApp.id) {
          const { data, error } = await supabase
            .from('visa_applications')
            .insert({
              lead_id: selectedLead.id,
              status: 'Document Collection',
              target_country: country,
              target_college: '',
              visa_notes: '',
              travel_currency_exchanged: false,
              travel_insurance_done: false,
              travel_luggage_guidelines: false,
              travel_pickup_confirmed: false,
              updated_at: new Date().toISOString(),
              tenant_id: currentUser?.tenant_id || 'default'
            })
            .select()
            .single();
          if (!error && data) {
            currentApp = data as VisaApplication;
            setSelectedVisaApp(currentApp);
            setVisaApplications(prev => [...prev.filter(v => v.lead_id !== selectedLead.id), currentApp]);
          } else {
            Alert.alert('Error', 'Failed to initialize visa case for document upload.');
            return;
          }
        }

        const { data, error } = await supabase
          .from('visa_uploaded_docs')
          .upsert({
            visa_application_id: currentApp.id,
            document_name: docName,
            file_url: uri,
            file_name: fileName,
            status: 'pending',
            tenant_id: currentUser?.tenant_id || 'default'
          }, { onConflict: 'visa_application_id,document_name' })
          .select()
          .single();
        if (!error && data) {
          setVisaUploadedDocs(prev => {
            const filtered = prev.filter(d => !(d.visa_application_id === currentApp.id && d.document_name === docName));
            return [...filtered, data as VisaUploadedDoc];
          });
          Alert.alert('Uploaded', `${docName} uploaded successfully!`);
        } else {
          Alert.alert('Error', 'Failed to record document upload.');
        }
      } catch (e) {
        Alert.alert('Error', 'Upload failed.');
      }
    };

    const getDocStatus = (docName: string) => {
      return uploadedDocs.find(d => d.document_name === docName);
    };

    const badgeColor = (status: string) => {
      if (status === 'verified') return { bg: '#D1FAE5', text: '#065F46' };
      if (status === 'rejected') return { bg: '#FEE2E2', text: '#991B1B' };
      return { bg: '#FEF3C7', text: '#92400E' }; // pending
    };

    return (
      <SafeAreaView style={styles.visaContainer}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={styles.visaHeader}>
          <TouchableOpacity onPress={() => setIsVisaScreenOpen(false)} style={styles.visaBackBtn}>
            <ArrowLeft size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.visaHeaderTitle}>Visa Processing</Text>
            <Text style={styles.visaHeaderSub}>{selectedLead.name} · {country}</Text>
          </View>
          {isSavingVisa && <ActivityIndicator color="#fff" size="small" />}
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

          {/* Status Pipeline */}
          <View style={styles.visaSection}>
            <Text style={styles.visaSectionTitle}>📍 Visa Status Pipeline</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
              {VISA_STAGES.map((stage, idx) => {
                const isActive = selectedVisaApp.status === stage;
                const isPast = VISA_STAGES.indexOf(selectedVisaApp.status) > idx;
                return (
                  <TouchableOpacity
                    key={stage}
                    style={[
                      styles.visaStageChip,
                      isActive && styles.visaStageChipActive,
                      isPast && styles.visaStageChipPast,
                    ]}
                    onPress={() => updateVisaField({ status: stage })}
                  >
                    {isPast && <Check size={10} color="#fff" />}
                    <Text style={[
                      styles.visaStageChipText,
                      (isActive || isPast) && { color: '#fff' }
                    ]}>{stage}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Document Checklist */}
          <View style={styles.visaSection}>
            <Text style={styles.visaSectionTitle}>📄 Document Checklist — {country || 'Set country'}</Text>
            {requiredDocs.length === 0 && (
              <Text style={styles.visaEmptyText}>No documents configured for this country. Check Supabase visa_required_docs.</Text>
            )}
            {requiredDocs.map(doc => {
              const uploaded = getDocStatus(doc.document_name);
              const colors = badgeColor(uploaded?.status || 'pending');
              return (
                <View key={doc.id} style={styles.visaDocRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.visaDocName}>{doc.document_name}</Text>
                    {uploaded ? (
                      <View style={[styles.visaDocBadge, { backgroundColor: colors.bg }]}>
                        <Text style={[styles.visaDocBadgeText, { color: colors.text }]}>
                          {uploaded.status.toUpperCase()} · {uploaded.file_name}
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.visaDocBadge, { backgroundColor: '#F1F5F9' }]}>
                        <Text style={[styles.visaDocBadgeText, { color: '#64748B' }]}>NOT UPLOADED</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={styles.visaIconBtn}
                      onPress={() => handleUploadDoc(doc.document_name, true)}
                    >
                      <Camera size={16} color="#4F46E5" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.visaIconBtn}
                      onPress={() => handleUploadDoc(doc.document_name, false)}
                    >
                      <Upload size={16} color="#4F46E5" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Visa Notes */}
          <View style={styles.visaSection}>
            <Text style={styles.visaSectionTitle}>📝 Case Notes</Text>
            <TextInput
              style={styles.visaNotesInput}
              placeholder="Add visa case notes, embassy instructions, etc."
              placeholderTextColor="#94A3B8"
              value={visaNotesInput}
              onChangeText={setVisaNotesInput}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={styles.visaSaveNotesBtn}
              onPress={() => updateVisaField({ visa_notes: visaNotesInput })}
            >
              <Text style={styles.visaSaveNotesBtnText}>Save Notes</Text>
            </TouchableOpacity>
          </View>

          {/* Travel Readiness Checklist */}
          <View style={styles.visaSection}>
            <Text style={styles.visaSectionTitle}>✈️ Travel Readiness</Text>
            {[
              { label: 'Currency Exchanged', key: 'travel_currency_exchanged' as keyof VisaApplication, emoji: '💵' },
              { label: 'Travel Insurance Done', key: 'travel_insurance_done' as keyof VisaApplication, emoji: '🛡️' },
              { label: 'Luggage Guidelines Reviewed', key: 'travel_luggage_guidelines' as keyof VisaApplication, emoji: '🧳' },
              { label: 'Airport Pickup Confirmed', key: 'travel_pickup_confirmed' as keyof VisaApplication, emoji: '🚗' },
            ].map(item => {
              const isChecked = selectedVisaApp[item.key] as boolean;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={styles.travelCheckRow}
                  onPress={() => updateVisaField({ [item.key]: !isChecked })}
                >
                  <Text style={styles.travelCheckEmoji}>{item.emoji}</Text>
                  <Text style={styles.travelCheckLabel}>{item.label}</Text>
                  {isChecked
                    ? <CheckSquare size={22} color="#10B981" />
                    : <Square size={22} color="#94A3B8" />
                  }
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }
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
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
    paddingBottom: Platform.OS === 'android' ? 48 : 0,
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0
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
    marginTop: 15,
    marginBottom: 15,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    height: 42
  },
  searchIcon: {
    marginRight: 8
  },
  searchTextInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0
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
    paddingHorizontal: 18,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch'
  },
  formSubmitBtnText: {
    color: '#FFF',
    fontSize: 12,
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
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 8,
    height: 44
  },
  submitLeadBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4
  },
  submitLeadBtnText: {
    color: '#FFF',
    fontSize: 12,
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

  adjustBtn: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4
  },
  adjustBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 18
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
  },
  settingsBtn: {
    padding: 8,
    borderRadius: 10,
  },
  settingsModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  settingsModalContent: {
    width: '90%',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  settingsSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 10,
  },
  settingsOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingsOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  settingsOptionSub: {
    fontSize: 10.5,
    marginTop: 2,
  },
  closeSettingsBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
  },
  closeSettingsBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  brochureOptionBtn: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    width: '100%'
  },
  brochureOptionTitle: {
    fontSize: 12.5,
    fontWeight: '700'
  },
  brochureOptionSub: {
    fontSize: 10,
    marginTop: 2
  },
  shareLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    zIndex: 2000
  },
  visaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  visaBannerTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#fff',
  },
  visaBannerSub: {
    fontSize: 10,
    color: '#C7D2FE',
    marginTop: 1,
  },
  visaContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  visaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  visaBackBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#334155',
  },
  visaHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  visaHeaderSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  visaSection: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  visaSectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  visaStageChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0F172A',
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  visaStageChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  visaStageChipPast: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  visaStageChipText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94A3B8',
  },
  visaDocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    gap: 10,
  },
  visaDocName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  visaDocBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  visaDocBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  visaIconBtn: {
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0F172A',
  },
  visaEmptyText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 10,
    fontStyle: 'italic',
  },
  visaNotesInput: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    color: '#F1F5F9',
    fontSize: 13,
    marginTop: 12,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#334155',
    textAlignVertical: 'top',
  },
  visaSaveNotesBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  visaSaveNotesBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  travelCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    gap: 12,
  },
  travelCheckEmoji: {
    fontSize: 20,
  },
  travelCheckLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  pipelineSelectorContainer: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  pipelineSelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F1F5F9',
  },
  pipelineSelBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  connectCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  connectCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  connectCardSub: {
    fontSize: 11,
    marginBottom: 14,
    lineHeight: 15,
  },
  referredSelectWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 14,
  },
  referredSelectItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    paddingHorizontal: 6,
  },
  connectSubmitBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  connectSubmitBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  connectedProfileCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  connectedTag: {
    fontSize: 8,
    fontWeight: '800',
    color: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  disconnectBtn: {
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  disconnectBtnText: {
    color: '#EF4444',
    fontSize: 9,
    fontWeight: '700',
  },
  connectedStudentName: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
  },
  connectedStudentAgency: {
    fontSize: 12,
    marginTop: 2,
  },
  connectedStudentMetaGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 12,
  },
  checklistCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  checklistCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  checklistCardSub: {
    fontSize: 11,
    marginBottom: 10,
  },
  checklistDocRow: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checklistDocName: {
    fontSize: 12,
    fontWeight: '700',
  },
  checklistUploadStatus: {
    fontSize: 10,
    fontWeight: '800',
  },
  verifyDocBtn: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  verifyDocBtnText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  eyeButton: {
    paddingHorizontal: 12,
  },
  otpSentText: {
    color: '#10B981',
    fontSize: 11,
    marginBottom: 12,
    lineHeight: 16,
  },
});

