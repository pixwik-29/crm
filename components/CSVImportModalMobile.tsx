import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Switch } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Upload, X, Check, ArrowRight, AlertTriangle } from 'lucide-react-native';
import { Lead } from '../App';

interface CSVImportModalMobileProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  theme: any;
  supabase: any;
  currentUser: any;
  pipelines: any[];
  leads: any[];
  profiles: any[];
  onImportComplete: () => void;
}

const MAPPABLE_FIELDS = [
  { key: 'name', label: 'Student Name *', required: true },
  { key: 'phone', label: 'Phone Number *', required: true },
  { key: 'email', label: 'Email Address', required: false },
  { key: 'parent_contact', label: 'Parent Contact', required: false },
  { key: 'whatsapp_number', label: 'WhatsApp Number', required: false },
  { key: 'neet_marks', label: 'NEET Marks', required: false },
  { key: 'budget', label: 'Budget (Lakhs, e.g. 50)', required: false },
  { key: 'preferred_destination', label: 'Preferred Destination', required: false },
  { key: 'course', label: 'Course Name', required: false },
  { key: 'lead_source', label: 'Lead Source', required: false },
  { key: 'status', label: 'Lead Status/Stage', required: false },
  { key: 'tags', label: 'Tags (comma split)', required: false },
  { key: 'score', label: 'Score (0-100)', required: false },
];

export const CSVImportModalMobile: React.FC<CSVImportModalMobileProps> = ({
  isOpen,
  onClose,
  darkMode,
  theme,
  supabase,
  currentUser,
  pipelines,
  leads,
  profiles,
  onImportComplete
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [csvFileName, setCsvFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  
  // Mapping: field key -> CSV column index (string)
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [activePickerField, setActivePickerField] = useState<string | null>(null);
  
  // Settings
  const [duplicateStrategy, setDuplicateStrategy] = useState<'update' | 'skip'>('update');
  const [selectedPipelineId, setSelectedPipelineId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCounsellorId, setSelectedCounsellorId] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; updated: number; skipped: number } | null>(null);

  // Custom Picker states
  const [activeCustomPickerType, setActiveCustomPickerType] = useState<'pipeline' | 'status' | 'counsellor' | null>(null);

  if (!isOpen) return null;

  // CSV Parser
  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let col = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          col += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(col.trim());
        col = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(col.trim());
        if (row.length > 0 && (row.length > 1 || row[0] !== '')) {
          lines.push(row);
        }
        row = [];
        col = '';
      } else {
        col += char;
      }
    }

    if (col !== '' || row.length > 0) {
      row.push(col.trim());
      lines.push(row);
    }

    return lines;
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*'
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      if (!asset.name.toLowerCase().endsWith('.csv')) {
        Alert.alert("Invalid File", "Please select a file with a .csv extension.");
        return;
      }

      setCsvFileName(asset.name);
      const content = await FileSystem.readAsStringAsync(asset.uri);
      
      const allRows = parseCSV(content);
      if (allRows.length < 2) {
        Alert.alert("Empty File", "The CSV file must contain a header row and at least one data row.");
        return;
      }

      const fileHeaders = allRows[0];
      const dataRows = allRows.slice(1);

      setHeaders(fileHeaders);
      setCsvRows(dataRows);

      // Intelligent Auto-mapping
      const initialMapping: Record<string, string> = {};
      MAPPABLE_FIELDS.forEach(field => {
        const matchIdx = fileHeaders.findIndex(header => {
          const h = header.toLowerCase().replace(/[^a-z0-9]/g, '');
          const f = field.key.toLowerCase().replace(/[^a-z0-9]/g, '');
          return h === f || 
                 h.includes(f) || 
                 f.includes(h) ||
                 (h.includes('student') && f === 'name') ||
                 (h.includes('phone') && f === 'phone') ||
                 (h.includes('email') && f === 'email');
        });

        initialMapping[field.key] = matchIdx !== -1 ? matchIdx.toString() : '';
      });

      setMapping(initialMapping);

      const defaultPipe = pipelines.find(p => p.is_default) || pipelines[0];
      if (defaultPipe) {
        setSelectedPipelineId(defaultPipe.id);
        setSelectedStatus(defaultPipe.stages[0]?.id || '');
      }

      setStep(2);
    } catch (e: any) {
      Alert.alert("File Read Error", "Failed to parse CSV file: " + e.message);
    }
  };

  const getMappedLead = (row: string[]): Partial<Lead> & { name: string; phone: string } => {
    const lead: any = {};
    MAPPABLE_FIELDS.forEach(field => {
      const colIdxStr = mapping[field.key];
      if (colIdxStr !== '') {
        const colIdx = parseInt(colIdxStr);
        const val = row[colIdx];
        if (val !== undefined && val !== null) {
          if (field.key === 'neet_marks' || field.key === 'score') {
            const num = parseInt(val.replace(/[^0-9]/g, ''));
            lead[field.key] = isNaN(num) ? undefined : num;
          } else if (field.key === 'budget') {
            const num = parseFloat(val.replace(/[^0-9.]/g, ''));
            // If they provided lakhs directly or total, convert to full amount
            lead[field.key] = isNaN(num) ? undefined : (num < 500 ? num * 100000 : num);
          } else if (field.key === 'tags') {
            lead[field.key] = val.split(',').map(t => t.trim()).filter(Boolean);
          } else {
            lead[field.key] = val;
          }
        }
      }
    });

    if (!lead.lead_source) lead.lead_source = 'CSV Import';
    if (selectedPipelineId) lead.pipeline_id = selectedPipelineId;
    if (selectedStatus) lead.status = selectedStatus;
    if (selectedCounsellorId) lead.assigned_counsellor_id = selectedCounsellorId;

    return lead;
  };

  const validateRow = (row: string[]) => {
    const lead = getMappedLead(row);
    const hasName = !!lead.name && lead.name.trim().length > 0;
    const hasPhone = !!lead.phone && lead.phone.trim().length > 0;
    return hasName && hasPhone;
  };

  const handleStartImport = async () => {
    setIsSubmitting(true);
    try {
      const validLeadsToInsert: Omit<Lead, 'id' | 'created_at' | 'updated_at'>[] = [];
      const leadsToUpdate: { id: string; updates: Partial<Lead> }[] = [];
      let skippedCount = 0;
      let updatedCount = 0;

      csvRows.forEach(row => {
        const lead = getMappedLead(row);
        const isValid = validateRow(row);

        if (!isValid) {
          skippedCount++;
          return;
        }

        const existingLead = leads.find(l => l.phone === lead.phone);
        if (existingLead) {
          if (duplicateStrategy === 'update') {
            leadsToUpdate.push({
              id: existingLead.id,
              updates: {
                ...lead,
                tags: Array.from(new Set([...(existingLead.tags || []), ...(lead.tags || [])]))
              }
            });
          } else {
            skippedCount++;
          }
        } else {
          validLeadsToInsert.push(lead as Omit<Lead, 'id' | 'created_at' | 'updated_at'>);
        }
      });

      // 1. Bulk insert
      let insertedCount = 0;
      if (validLeadsToInsert.length > 0) {
        const dbLeads = validLeadsToInsert.map(leadData => ({
          ...leadData,
          tags: leadData.tags || [],
          score: leadData.score || 0
        }));

        const { data, error } = await supabase
          .from('leads')
          .insert(dbLeads)
          .select();

        if (error) throw error;
        insertedCount = data?.length || 0;

        if (data && data.length > 0) {
          const logs = data.map((l: any) => ({
            lead_id: l.id,
            actor_id: currentUser?.id,
            action_type: 'lead_created',
            description: 'Lead imported from CSV file via Mobile CRM'
          }));
          await supabase.from('activity_logs').insert(logs);
        }
      }

      // 2. Updates
      if (leadsToUpdate.length > 0) {
        await Promise.all(
          leadsToUpdate.map(async item => {
            const { error } = await supabase
              .from('leads')
              .update(item.updates)
              .eq('id', item.id);
            if (error) throw error;
            updatedCount++;
          })
        );
      }

      setImportResult({
        imported: insertedCount,
        updated: updatedCount,
        skipped: skippedCount
      });
      setStep(4);
    } catch (e: any) {
      Alert.alert("Import Failed", e.message || "Failed to process CSV import.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId);
  const statusOptions = selectedPipeline ? selectedPipeline.stages : [];

  return (
    <Modal visible={isOpen} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: darkMode ? '#0F172A' : '#FFFFFF', borderColor: theme.border }]}>
          
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>Import CSV Leads</Text>
              <Text style={styles.subtitle}>
                Step {step} of 4: {step === 1 ? 'Upload' : step === 2 ? 'Column Mapping' : step === 3 ? 'Options & Preview' : 'Completed'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: darkMode ? '#1E293B' : '#F1F5F9' }]}>
              <X size={16} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Steps */}
          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 25 }}>
            
            {/* Step 1: Upload */}
            {step === 1 && (
              <View style={styles.stepContainer}>
                <TouchableOpacity 
                  onPress={handlePickDocument}
                  style={[styles.uploadBox, { borderColor: darkMode ? '#334155' : '#E2E8F0', backgroundColor: darkMode ? '#1E293B' : '#F8FAFC' }]}
                >
                  <Upload size={32} color={darkMode ? '#818CF8' : '#4F46E5'} style={{ marginBottom: 12 }} />
                  <Text style={[styles.uploadBoxText, { color: theme.text }]}>Choose CSV File</Text>
                  <Text style={styles.uploadBoxSub}>Select a local leads table .csv file</Text>
                </TouchableOpacity>

                <View style={[styles.tipCard, { backgroundColor: darkMode ? '#1E293B' : '#EFF6FF', borderColor: darkMode ? '#334155' : '#BFDBFE' }]}>
                  <Text style={[styles.tipTitle, { color: darkMode ? '#93C5FD' : '#1E40AF' }]}>Formatting Tip:</Text>
                  <Text style={[styles.tipDesc, { color: darkMode ? '#93C5FD' : '#1E40AF' }]}>
                    Ensure your spreadsheet contains columns for "Student Name" and "Phone Number".
                  </Text>
                </View>
              </View>
            )}

            {/* Step 2: Mapping */}
            {step === 2 && (
              <View style={styles.stepContainer}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Map Headers for: {csvFileName}</Text>
                <Text style={styles.sectionSubtitle}>Tap each field to link a column from your CSV file.</Text>
                
                {MAPPABLE_FIELDS.map(field => {
                  const mappedIdx = mapping[field.key];
                  const mappedHeader = mappedIdx !== '' ? headers[parseInt(mappedIdx)] : null;
                  
                  return (
                    <View key={field.key} style={[styles.mappingRow, { borderBottomColor: theme.border }]}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={[styles.mappingLabel, { color: theme.text }, field.required && { fontWeight: '800' }]}>
                          {field.label}
                        </Text>
                        {field.required && mappedIdx === '' && (
                          <Text style={styles.requiredWarn}>Required mapping missing</Text>
                        )}
                      </View>
                      
                      <TouchableOpacity
                        onPress={() => setActivePickerField(field.key)}
                        style={[styles.dropdownBtn, { backgroundColor: darkMode ? '#1E293B' : '#F1F5F9', borderColor: theme.border }]}
                      >
                        <Text style={{ color: mappedHeader ? theme.text : theme.textMuted, fontSize: 11, fontWeight: '700' }} numberOfLines={1}>
                          {mappedHeader ? `Col: ${mappedHeader}` : '-- Unmapped --'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}

                {/* Actions */}
                <View style={styles.buttonRow}>
                  <TouchableOpacity onPress={() => setStep(1)} style={[styles.btnSec, { borderColor: theme.border }]}>
                    <Text style={{ color: theme.text, fontWeight: '700' }}>Back</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    disabled={MAPPABLE_FIELDS.some(f => f.required && mapping[f.key] === '')}
                    onPress={() => setStep(3)}
                    style={[styles.btnPrim, MAPPABLE_FIELDS.some(f => f.required && mapping[f.key] === '') && { opacity: 0.5 }]}
                  >
                    <Text style={styles.btnPrimText}>Next</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Step 3: Options & Preview */}
            {step === 3 && (
              <View style={styles.stepContainer}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Import Settings</Text>

                <View style={[styles.configCard, { backgroundColor: darkMode ? '#1E293B' : '#F8FAFC', borderColor: theme.border }]}>
                  {/* Duplicates */}
                  <View style={styles.configRow}>
                    <Text style={[styles.configLabel, { color: theme.text }]}>Update matching phone numbers?</Text>
                    <Switch
                      value={duplicateStrategy === 'update'}
                      onValueChange={(val) => setDuplicateStrategy(val ? 'update' : 'skip')}
                      trackColor={{ false: '#767577', true: '#81b0ff' }}
                      thumbColor={duplicateStrategy === 'update' ? '#4F46E5' : '#f4f3f4'}
                    />
                  </View>

                  {/* Target Pipeline */}
                  <View style={[styles.configInputRow, { borderTopWidth: 1, borderTopColor: theme.border }]}>
                    <Text style={[styles.configLabel, { color: theme.text }]}>Target Pipeline</Text>
                    <TouchableOpacity
                      onPress={() => setActiveCustomPickerType('pipeline')}
                      style={[styles.dropdownBtn, { backgroundColor: darkMode ? '#0F172A' : '#FFFFFF', borderColor: theme.border }]}
                    >
                      <Text style={{ color: theme.text, fontSize: 11, fontWeight: 'bold' }}>
                        {pipelines.find(p => p.id === selectedPipelineId)?.name || 'Default Pipeline'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Initial Stage */}
                  <View style={[styles.configInputRow, { borderTopWidth: 1, borderTopColor: theme.border }]}>
                    <Text style={[styles.configLabel, { color: theme.text }]}>Initial Status Stage</Text>
                    <TouchableOpacity
                      onPress={() => setActiveCustomPickerType('status')}
                      style={[styles.dropdownBtn, { backgroundColor: darkMode ? '#0F172A' : '#FFFFFF', borderColor: theme.border }]}
                    >
                      <Text style={{ color: theme.text, fontSize: 11, fontWeight: 'bold' }}>
                        {selectedStatus || 'Choose...'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Default Counsellor */}
                  <View style={[styles.configInputRow, { borderTopWidth: 1, borderTopColor: theme.border }]}>
                    <Text style={[styles.configLabel, { color: theme.text }]}>Default Assignee</Text>
                    <TouchableOpacity
                      onPress={() => setActiveCustomPickerType('counsellor')}
                      style={[styles.dropdownBtn, { backgroundColor: darkMode ? '#0F172A' : '#FFFFFF', borderColor: theme.border }]}
                    >
                      <Text style={{ color: theme.text, fontSize: 11, fontWeight: 'bold' }}>
                        {profiles.find(p => p.id === selectedCounsellorId)?.full_name || 'Unassigned'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Preview */}
                <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 15 }]}>
                  Preview (First 5 records)
                </Text>
                
                {csvRows.slice(0, 5).map((row, idx) => {
                  const lead = getMappedLead(row);
                  const isValid = validateRow(row);
                  return (
                    <View key={idx} style={[styles.previewCard, { backgroundColor: darkMode ? '#1E293B' : '#FFFFFF', borderColor: isValid ? theme.border : '#EF4444' }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={[styles.previewName, { color: lead.name ? theme.text : '#EF4444' }]}>
                          {lead.name || '<Missing Name>'}
                        </Text>
                        {!isValid && <AlertTriangle size={14} color="#EF4444" />}
                      </View>
                      <Text style={{ color: lead.phone ? theme.textMuted : '#EF4444', fontSize: 11 }}>
                        Phone: {lead.phone || '<Missing Phone>'}
                      </Text>
                      {lead.preferred_destination && (
                        <Text style={{ color: theme.textMuted, fontSize: 10, marginTop: 2 }}>
                          Dest: {lead.preferred_destination} • Course: {lead.course || '--'}
                        </Text>
                      )}
                    </View>
                  );
                })}

                {/* Actions */}
                <View style={styles.buttonRow}>
                  <TouchableOpacity onPress={() => setStep(2)} disabled={isSubmitting} style={[styles.btnSec, { borderColor: theme.border }]}>
                    <Text style={{ color: theme.text, fontWeight: '700' }}>Back</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    disabled={isSubmitting}
                    onPress={handleStartImport}
                    style={[styles.btnPrim, { backgroundColor: '#10B981' }]}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.btnPrimText}>Import ({csvRows.length} Leads)</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Step 4: Finished */}
            {step === 4 && importResult && (
              <View style={[styles.stepContainer, { alignItems: 'center', paddingVertical: 20 }]}>
                <View style={[styles.checkCircle, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <Check size={40} color="#10B981" />
                </View>
                
                <Text style={[styles.completeTitle, { color: theme.text }]}>CSV Import Finished!</Text>
                
                <View style={[styles.statsCard, { borderColor: theme.border, backgroundColor: darkMode ? '#1E293B' : '#F8FAFC' }]}>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>CREATED</Text>
                    <Text style={[styles.statVal, { color: '#10B981' }]}>{importResult.imported}</Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>MERGED</Text>
                    <Text style={[styles.statVal, { color: '#4F46E5' }]}>{importResult.updated}</Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>SKIPPED</Text>
                    <Text style={[styles.statVal, { color: theme.textMuted }]}>{importResult.skipped}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onImportComplete();
                    setStep(1);
                    setCsvFileName('');
                    setHeaders([]);
                    setCsvRows([]);
                    setMapping({});
                    setImportResult(null);
                  }}
                  style={[styles.btnPrim, { width: '80%', alignSelf: 'center', marginTop: 15 }]}
                >
                  <Text style={styles.btnPrimText}>Dismiss & Refresh</Text>
                </TouchableOpacity>
              </View>
            )}

          </ScrollView>
        </View>
      </View>

      {/* Field Mapper Header Overlay */}
      {activePickerField !== null && (
        <Modal transparent={true} visible={true} animationType="fade">
          <View style={styles.pickerOverlay}>
            <View style={[styles.pickerContent, { backgroundColor: darkMode ? '#1E293B' : '#FFFFFF' }]}>
              <Text style={[styles.pickerTitle, { color: theme.text }]}>Select CSV Column</Text>
              <ScrollView style={{ maxHeight: 250 }}>
                <TouchableOpacity
                  style={[styles.pickerItem, mapping[activePickerField] === '' && { backgroundColor: 'rgba(79, 70, 229, 0.1)' }]}
                  onPress={() => {
                    setMapping(prev => ({ ...prev, [activePickerField]: '' }));
                    setActivePickerField(null);
                  }}
                >
                  <Text style={{ color: theme.text, fontSize: 12 }}>-- Unmapped / Default --</Text>
                </TouchableOpacity>
                {headers.map((h, index) => {
                  const isSelected = mapping[activePickerField] === index.toString();
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.pickerItem, isSelected && { backgroundColor: 'rgba(79, 70, 229, 0.1)' }]}
                      onPress={() => {
                        setMapping(prev => ({ ...prev, [activePickerField]: index.toString() }));
                        setActivePickerField(null);
                      }}
                    >
                      <Text style={{ color: theme.text, fontSize: 12, fontWeight: isSelected ? 'bold' : 'normal' }}>
                        Col {index + 1}: {h}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity onPress={() => setActivePickerField(null)} style={styles.pickerCloseBtn}>
                <Text style={{ color: '#4F46E5', fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Custom dropdown setting selects */}
      {activeCustomPickerType !== null && (
        <Modal transparent={true} visible={true} animationType="fade">
          <View style={styles.pickerOverlay}>
            <View style={[styles.pickerContent, { backgroundColor: darkMode ? '#1E293B' : '#FFFFFF' }]}>
              <Text style={[styles.pickerTitle, { color: theme.text }]}>
                {activeCustomPickerType === 'pipeline' ? 'Select Target Pipeline' : 
                 activeCustomPickerType === 'status' ? 'Select Default Stage' : 'Select Counsellor'}
              </Text>
              <ScrollView style={{ maxHeight: 250 }}>
                
                {activeCustomPickerType === 'pipeline' && pipelines.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.pickerItem}
                    onPress={() => {
                      setSelectedPipelineId(p.id);
                      setSelectedStatus(p.stages[0]?.id || '');
                      setActiveCustomPickerType(null);
                    }}
                  >
                    <Text style={{ color: theme.text }}>{p.name}</Text>
                  </TouchableOpacity>
                ))}

                {activeCustomPickerType === 'status' && statusOptions.map((s: any) => (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.pickerItem}
                    onPress={() => {
                      setSelectedStatus(s.id);
                      setActiveCustomPickerType(null);
                    }}
                  >
                    <Text style={{ color: theme.text }}>{s.name}</Text>
                  </TouchableOpacity>
                ))}

                {activeCustomPickerType === 'counsellor' && (
                  <>
                    <TouchableOpacity
                      style={styles.pickerItem}
                      onPress={() => {
                        setSelectedCounsellorId('');
                        setActiveCustomPickerType(null);
                      }}
                    >
                      <Text style={{ color: theme.text }}>Unassigned</Text>
                    </TouchableOpacity>
                    {profiles.map(p => (
                      <TouchableOpacity
                        key={p.id}
                        style={styles.pickerItem}
                        onPress={() => {
                          setSelectedCounsellorId(p.id);
                          setActiveCustomPickerType(null);
                        }}
                      >
                        <Text style={{ color: theme.text }}>{p.full_name}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

              </ScrollView>
              <TouchableOpacity onPress={() => setActiveCustomPickerType(null)} style={styles.pickerCloseBtn}>
                <Text style={{ color: '#4F46E5', fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 16
  },
  container: {
    borderRadius: 24,
    borderWidth: 1,
    maxHeight: '80%',
    overflow: 'hidden'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1
  },
  title: {
    fontSize: 15,
    fontWeight: '800'
  },
  subtitle: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  body: {
    padding: 16
  },
  stepContainer: {
    gap: 15
  },
  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  uploadBoxText: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4
  },
  uploadBoxSub: {
    fontSize: 10,
    color: '#64748B'
  },
  tipCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12
  },
  tipTitle: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2
  },
  tipDesc: {
    fontSize: 10,
    lineHeight: 14
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800'
  },
  sectionSubtitle: {
    fontSize: 10,
    color: '#64748B',
    marginTop: -8,
    marginBottom: 10
  },
  mappingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1
  },
  mappingLabel: {
    fontSize: 11,
    fontWeight: '700'
  },
  requiredWarn: {
    fontSize: 8,
    color: '#EF4444',
    fontWeight: 'bold',
    marginTop: 2
  },
  dropdownBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 140,
    alignItems: 'center'
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15
  },
  btnSec: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center'
  },
  btnPrim: {
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100
  },
  btnPrimText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 11
  },
  configCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  configInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10
  },
  configLabel: {
    fontSize: 11,
    fontWeight: '700'
  },
  previewCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8
  },
  previewName: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  completeTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10
  },
  statsCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 10
  },
  statCol: {
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#64748B'
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  pickerContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingBottom: 30
  },
  pickerTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center'
  },
  pickerItem: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 8
  },
  pickerCloseBtn: {
    marginTop: 15,
    alignItems: 'center',
    paddingVertical: 8
  }
});
