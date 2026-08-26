import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { complaintsApi, aiApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Upload, X, AlertCircle, Mic, MicOff, Sparkles, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import MapPicker from '../components/MapPicker';

const CATEGORIES = ['Pothole','Streetlight','Garbage','Water Supply','Drainage','Road Damage','Encroachment','Noise','Other'];
const PRIORITIES = ['Low','Medium','High','Critical'];
const WARDS = ['Ward 1','Ward 2','Ward 3','Ward 4','Ward 5','Ward 6','Ward 7','Ward 8'];

// 📋 Feature 3 — Exact 8 Templates
const COMPLAINT_TEMPLATES = [
  {
    id: 1,
    emoji: '🕳️',
    title: 'Pothole causing road hazard',
    category: 'Pothole',
    priority: 'High',
    description: 'There is a large pothole on the road that is causing danger to vehicles and pedestrians. The pothole has been present for several days and is worsening. Immediate repair is required to prevent accidents.'
  },
  {
    id: 2,
    emoji: '💡',
    title: 'Street light not functioning',
    category: 'Streetlight',
    priority: 'Medium',
    description: 'The street light in this area has not been working for several days, causing poor visibility at night and creating safety concerns for residents and commuters.'
  },
  {
    id: 3,
    emoji: '🗑️',
    title: 'Garbage not collected',
    category: 'Garbage',
    priority: 'High',
    description: 'Garbage has not been collected from this area for multiple days. Waste is piling up on the street causing unhygienic conditions and health hazards for nearby residents.'
  },
  {
    id: 4,
    emoji: '💧',
    title: 'No water supply in area',
    category: 'Water Supply',
    priority: 'Critical',
    description: 'There has been no water supply to this area for more than 24 hours. Residents are facing severe hardship. Immediate restoration of water supply is urgently requested.'
  },
  {
    id: 5,
    emoji: '🌊',
    title: 'Blocked drainage causing waterlogging',
    category: 'Drainage',
    priority: 'High',
    description: 'The drainage in this area is completely blocked causing severe waterlogging on the road. This is making it impossible to walk or drive and is a health hazard.'
  },
  {
    id: 6,
    emoji: '🚧',
    title: 'Damaged road surface needs repair',
    category: 'Road Damage',
    priority: 'Medium',
    description: 'The road surface in this area is severely damaged with multiple cracks and uneven patches. This is causing difficulty for vehicles and needs urgent resurfacing.'
  },
  {
    id: 7,
    emoji: '🔊',
    title: 'Excessive noise disturbance',
    category: 'Noise',
    priority: 'Medium',
    description: 'There is excessive noise disturbance in this area that is affecting the quality of life of residents. The noise continues beyond permissible hours and immediate action is requested.'
  },
  {
    id: 8,
    emoji: '🏗️',
    title: 'Illegal encroachment on public land',
    category: 'Encroachment',
    priority: 'High',
    description: 'There is an illegal encroachment on public land or footpath in this area that is blocking access for pedestrians and residents. Immediate action to remove the encroachment is requested.'
  }
];

export default function NewComplaint() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const formRef = useRef(null);

  const [form, setForm] = useState({
    title: '', description: '', category: '', priority: 'Medium',
    address: '', ward: '', latitude: '', longitude: ''
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [mapPin, setMapPin] = useState(null); // { lat, lng }
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 🎙️ Feature 2 — Voice Recording & Speech Recognition
  const [recording, setRecording] = useState(false);
  const [lang, setLang] = useState('en-IN'); // 'en-IN' or 'ta-IN'
  const [transcript, setTranscript] = useState('');
  const [cleaningText, setCleaningText] = useState(false);
  const [aiCleaned, setAiCleaned] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice input is not supported in this browser. Please use Chrome.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;

      recognition.onstart = () => {
        setRecording(true);
        setTranscript('');
        setAiCleaned(false);
      };

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        stopRecording();
      };

      recognition.onend = () => {
        setRecording(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error(err);
      setRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setRecording(false);
    if (transcript.trim()) {
      handleFinalVoiceText(transcript.trim());
    }
  };

  const handleFinalVoiceText = async (textToClean) => {
    setCleaningText(true);
    try {
      const res = await aiApi.cleanText({ text: textToClean });
      const cleaned = res.data.cleanedText || textToClean;
      setForm(f => ({
        ...f,
        description: f.description ? `${f.description}\n${cleaned}` : cleaned
      }));
      setAiCleaned(true);
      toast.success('✨ Voice transcribed & cleaned with AI!');
    } catch (err) {
      setForm(f => ({
        ...f,
        description: f.description ? `${f.description}\n${textToClean}` : textToClean
      }));
    } finally {
      setCleaningText(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB'); return; }
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // 📋 Select Template
  const handleSelectTemplate = (template) => {
    setSelectedTemplateId(template.id);
    setForm(f => ({
      ...f,
      title: template.title,
      category: template.category,
      priority: template.priority,
      description: template.description
    }));
    toast.success(`Template selected: ${template.category}`);
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleClearTemplate = () => {
    setSelectedTemplateId(null);
    setForm(f => ({
      ...f,
      title: '',
      category: '',
      priority: 'Medium',
      description: ''
    }));
  };

  const handleMapChange = useCallback(({ lat, lng, address }) => {
    setMapPin({ lat, lng });
    setForm(f => ({
      ...f,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
      address: f.address || address,
    }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title || !form.description || !form.category || !form.address) {
      setError('Please fill all required fields.');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (image) fd.append('image', image);
      const res = await complaintsApi.create(fd);
      toast.success(`Complaint ${res.data.complaint.complaint_id} filed successfully!`);
      navigate(`/complaints/${res.data.complaint.complaint_id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to file complaint.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 760 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">File a Complaint</h1>
          <p className="page-subtitle">Report a civic issue with details, voice input, or quick templates</p>
        </div>
      </div>

      {/* 📋 FEATURE 3 — Complaint Templates Section (Citizens only) */}
      {user?.role === 'citizen' && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>📋</span>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Use a Template</h3>
              <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>(Click to auto-fill)</span>
            </div>
            {selectedTemplateId && (
              <button
                type="button"
                onClick={handleClearTemplate}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <RotateCcw size={12} /> Clear Template
              </button>
            )}
          </div>

          {/* Horizontal Scrollable Templates Row */}
          <div style={{
            display: 'flex', gap: 12, overflowX: 'auto',
            paddingBottom: 8, scrollbarWidth: 'thin'
          }}>
            {COMPLAINT_TEMPLATES.map(t => {
              const isSelected = selectedTemplateId === t.id;
              const priorityClass = t.priority === 'Critical' ? 'badge-critical' : t.priority === 'High' ? 'badge-high' : 'badge-medium';
              return (
                <div
                  key={t.id}
                  onClick={() => handleSelectTemplate(t)}
                  style={{
                    minWidth: 190, maxWidth: 210, padding: 14, borderRadius: 12,
                    background: isSelected ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)',
                    border: isSelected ? '2px solid var(--blue)' : '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 4px 16px rgba(59,130,246,0.25)' : 'none'
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 24 }}>{t.emoji}</span>
                    <span className={`badge ${priorityClass}`}>{t.priority}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--white)', marginBottom: 4, lineHeight: 1.3 }}>
                    {t.category}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--gray-300)', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {t.title}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Form */}
      <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: 'var(--red)', fontSize: 14 }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Basic Info */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: 15, marginBottom: 4, color: 'var(--blue-glow)' }}>📋 Issue Details</h3>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input placeholder="e.g. Large pothole on Main Street near bus stop"
              value={form.title} onChange={e => setForm(f=>({...f, title:e.target.value}))} required />
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select value={form.category} onChange={e => setForm(f=>({...f, category:e.target.value}))} required>
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select value={form.priority} onChange={e => setForm(f=>({...f, priority:e.target.value}))}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Description & 🎙️ FEATURE 2 Voice Input */}
          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Description *</label>

              {/* Mic & Language Toggle Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Language Toggle */}
                <div style={{
                  display: 'flex', background: 'rgba(255,255,255,0.06)',
                  borderRadius: 6, padding: 2, border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <button
                    type="button"
                    onClick={() => setLang('en-IN')}
                    style={{
                      padding: '2px 8px', fontSize: 11, fontWeight: 700, borderRadius: 4, border: 'none',
                      background: lang === 'en-IN' ? 'var(--blue)' : 'transparent',
                      color: lang === 'en-IN' ? 'white' : 'var(--gray-300)', cursor: 'pointer'
                    }}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang('ta-IN')}
                    style={{
                      padding: '2px 8px', fontSize: 11, fontWeight: 700, borderRadius: 4, border: 'none',
                      background: lang === 'ta-IN' ? 'var(--blue)' : 'transparent',
                      color: lang === 'ta-IN' ? 'white' : 'var(--gray-300)', cursor: 'pointer'
                    }}
                  >
                    தமிழ்
                  </button>
                </div>

                {/* Mic Button */}
                <button
                  type="button"
                  id="voice-mic-btn"
                  onClick={recording ? stopRecording : startRecording}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 12px', borderRadius: 8,
                    background: recording ? '#ef4444' : 'rgba(59,130,246,0.15)',
                    border: recording ? '1px solid #ef4444' : '1px solid rgba(59,130,246,0.3)',
                    color: recording ? 'white' : 'var(--blue-light)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    animation: recording ? 'pulse 1.5s infinite' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                  title={recording ? 'Click to stop recording' : 'Click to speak complaint'}
                >
                  {recording ? <MicOff size={14} /> : <Mic size={14} />}
                  {recording ? 'Recording...' : 'Voice Input'}
                </button>
              </div>
            </div>

            {/* Speech fallback message if not supported */}
            {!speechSupported && (
              <div style={{ fontSize: 12, color: 'var(--amber)', marginBottom: 6 }}>
                Voice input is not supported in this browser. Please use Chrome.
              </div>
            )}

            {/* Animated CSS Waveform while recording */}
            {recording && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px',
                background: 'rgba(239,68,68,0.1)', borderRadius: 8, marginBottom: 8,
                border: '1px solid rgba(239,68,68,0.2)'
              }}>
                <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, marginRight: 6 }}>Listening:</span>
                <div className="css-waveform" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ width: 3, height: 16, background: '#ef4444', borderRadius: 2, animation: 'wave 0.8s infinite ease-in-out' }} />
                  <span style={{ width: 3, height: 24, background: '#ef4444', borderRadius: 2, animation: 'wave 0.8s infinite 0.2s ease-in-out' }} />
                  <span style={{ width: 3, height: 12, background: '#ef4444', borderRadius: 2, animation: 'wave 0.8s infinite 0.4s ease-in-out' }} />
                  <span style={{ width: 3, height: 20, background: '#ef4444', borderRadius: 2, animation: 'wave 0.8s infinite 0.1s ease-in-out' }} />
                  <span style={{ width: 3, height: 14, background: '#ef4444', borderRadius: 2, animation: 'wave 0.8s infinite 0.3s ease-in-out' }} />
                </div>
              </div>
            )}

            {/* Live Transcript output */}
            {transcript && (
              <div style={{
                fontSize: 12, color: 'var(--gray-300)', background: 'rgba(255,255,255,0.03)',
                padding: '6px 10px', borderRadius: 6, marginBottom: 6, fontStyle: 'italic'
              }}>
                "{transcript}"
              </div>
            )}

            {/* AI Cleaned Indicator */}
            {cleaningText && (
              <div style={{ fontSize: 12, color: 'var(--teal-light)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                <span className="spinner" style={{ width: 12, height: 12 }} /> Cleaning transcription with Claude AI...
              </div>
            )}
            {aiCleaned && (
              <div style={{ fontSize: 12, color: 'var(--teal-light)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                <Sparkles size={13} /> ✨ AI Cleaned transcription
              </div>
            )}

            <textarea rows={4} placeholder="Describe the issue in detail — or click 'Voice Input' above to speak..."
              value={form.description} onChange={e => setForm(f=>({...f, description:e.target.value}))} required
              style={{ resize: 'vertical', minHeight: 100 }} />
          </div>
        </div>

        {/* Location */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: 15, color: 'var(--teal-light)' }}>📍 Location</h3>
            {mapPin && (
              <span style={{
                fontSize: 11, fontFamily: 'monospace',
                padding: '3px 8px', borderRadius: 4,
                background: 'rgba(20,184,166,0.12)',
                border: '1px solid rgba(20,184,166,0.25)',
                color: 'var(--teal-light)',
              }}>
                📌 {parseFloat(form.latitude).toFixed(4)}, {parseFloat(form.longitude).toFixed(4)}
              </span>
            )}
          </div>

          {/* Interactive Map */}
          <MapPicker
            value={mapPin}
            onChange={handleMapChange}
            height="320px"
          />

          <div className="form-group">
            <label className="form-label">Full Address *</label>
            <input
              placeholder="Auto-filled from map, or type manually — e.g. 45, Main Street, Ward 1"
              value={form.address}
              onChange={e => setForm(f=>({...f, address:e.target.value}))}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Ward</label>
            <select value={form.ward} onChange={e => setForm(f=>({...f, ward:e.target.value}))}>
              <option value="">Select ward</option>
              {WARDS.map(w => <option key={w}>{w}</option>)}
            </select>
          </div>
        </div>

        {/* Photo */}
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 14, color: 'var(--amber)' }}>📷 Photo Evidence (optional)</h3>
          {imagePreview ? (
            <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
              <img src={imagePreview} alt="Preview" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 8 }} />
              <button type="button" onClick={() => { setImage(null); setImagePreview(null); }}
                style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32, border: '2px dashed rgba(255,255,255,0.12)', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--blue)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'}>
              <Upload size={24} color="var(--gray-500)" />
              <span style={{ fontSize: 14, color: 'var(--gray-500)' }}>Click to upload or drag & drop</span>
              <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>JPG, PNG, WebP — max 5MB</span>
              <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
            </label>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/complaints')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: 140, justifyContent: 'center' }}>
            {loading ? <><span className="spinner" /> Submitting...</> : '📢 Submit Complaint'}
          </button>
        </div>
      </form>

      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1.2); }
        }
      `}</style>
    </div>
  );
}
