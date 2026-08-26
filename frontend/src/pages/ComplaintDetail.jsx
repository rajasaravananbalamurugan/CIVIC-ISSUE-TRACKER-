import React, { useEffect, useState, lazy, Suspense, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { complaintsApi, adminApi, aiApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, MapPin, Clock, User, MessageSquare, CheckCircle,
  AlertTriangle, XCircle, Send, ThumbsUp, ThumbsDown, Download,
  Brain, Zap, AlertCircle, TrendingUp, CheckSquare, RotateCcw, Upload, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const MapPicker = lazy(() => import('../components/MapPicker'));

const CATEGORY_EMOJI = { Pothole:'🕳️', Streetlight:'💡', Garbage:'🗑️', 'Water Supply':'💧', Drainage:'🌊', 'Road Damage':'🚧', Encroachment:'🏗️', Noise:'🔊', Other:'📋' };
const SLA_DAYS = { Pothole: 7, Garbage: 3, Streetlight: 5, 'Water Supply': 2 };

function StatusBadge({ status }) {
  const map = { 'Pending':'badge badge-pending', 'In Progress':'badge badge-inprogress', 'Resolved':'badge badge-resolved', 'Rejected':'badge badge-rejected' };
  return <span className={map[status] || 'badge'}>{status}</span>;
}
function PriorityBadge({ priority }) {
  const map = { Critical:'badge-critical', High:'badge-high', Medium:'badge-medium', Low:'badge-low' };
  return <span className={`badge ${map[priority]||'badge-low'}`}>{priority}</span>;
}

const STATUS_ICON = { Pending: Clock, 'In Progress': AlertTriangle, Resolved: CheckCircle, Rejected: XCircle };

// 📸 Feature 4 — Pure React Interactive Before & After Photo Slider
function BeforeAfterSlider({ beforeImg, afterImg }) {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleMove = (clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    let pos = (x / rect.width) * 100;
    if (pos < 0) pos = 0;
    if (pos > 100) pos = 100;
    setSliderPos(pos);
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    handleMove(e.clientX);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e) => {
    setIsDragging(true);
    if (e.touches[0]) handleMove(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    if (e.touches[0]) handleMove(e.touches[0].clientX);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--white)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        📸 Before & After Resolution Comparison
        <span style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 400 }}>(Drag slider to compare)</span>
      </div>

      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
        style={{
          position: 'relative', width: '100%', height: 320, borderRadius: 12,
          overflow: 'hidden', userSelect: 'none', cursor: 'ew-resize',
          border: '1px solid var(--border-strong)', background: '#090d16'
        }}
      >
        {/* After image (Full container background) */}
        <img
          src={afterImg}
          alt="After Repair"
          style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
        />
        <div style={{
          position: 'absolute', top: 12, right: 12,
          background: 'rgba(34,197,94,0.9)', color: 'white',
          padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 800,
          letterSpacing: '0.05em', boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}>
          AFTER REPAIR
        </div>

        {/* Before image (Clipped overlay) */}
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0,
          width: `${sliderPos}%`, overflow: 'hidden',
          borderRight: '2px solid white'
        }}>
          <img
            src={beforeImg}
            alt="Before Repair"
            style={{
              width: containerRef.current ? containerRef.current.offsetWidth : '100%',
              height: '100%', objectFit: 'cover',
              maxWidth: 'none'
            }}
          />
          <div style={{
            position: 'absolute', top: 12, left: 12,
            background: 'rgba(239,68,68,0.9)', color: 'white',
            padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 800,
            letterSpacing: '0.05em', boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}>
            BEFORE REPAIR
          </div>
        </div>

        {/* Draggable Divider Handle ◀▶ */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: `${sliderPos}%`,
          width: 3, background: 'white',
          transform: 'translateX(-50%)', zIndex: 10
        }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--white)', color: 'var(--navy-mid)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            border: '2px solid var(--blue)'
          }}>
            ◀▶
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorities, setAuthorities] = useState([]);
  const [statusForm, setStatusForm] = useState({ status: '', note: '', priority: '', assigned_to: '' });
  const [afterImageFile, setAfterImageFile] = useState(null);
  const [afterImagePreview, setAfterImagePreview] = useState(null);

  const [updating, setUpdating] = useState(false);
  const [comment, setComment] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [upvoting, setUpvoting] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [acceptingAi, setAcceptingAi] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // 🔄 Feature 5 — Reopen Modal State
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopening, setReopening] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await complaintsApi.get(id);
      setData(res.data);
      setStatusForm({
        status: res.data.complaint.status,
        note: res.data.complaint.resolution_note || '',
        priority: res.data.complaint.priority,
        assigned_to: res.data.complaint.assigned_to || ''
      });
    } catch (err) {
      toast.error('Complaint not found');
      navigate('/complaints');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchData();
    if (user?.role !== 'citizen') {
      adminApi.authorities().then(r => setAuthorities(r.data)).catch(() => {});
    }
  }, [id, fetchData, user]);

  const handleUpvote = async () => {
    setUpvoting(true);
    try {
      const res = await complaintsApi.upvote(id);
      toast.success(res.data.upvoted ? '👍 Upvoted!' : 'Upvote removed');
      fetchData();
    } catch (err) {
      toast.error('Failed to upvote');
    } finally {
      setUpvoting(false);
    }
  };

  const handleRating = async (val) => {
    setSubmittingRating(true);
    try {
      await complaintsApi.submitRating(id, { rating: val });
      toast.success(val === 1 ? '👍 Thanks for your feedback!' : '👎 Feedback noted. We\'ll improve!');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleAiPredict = async () => {
    setAiLoading(true);
    try {
      await aiApi.predict(id);
      toast.success('🤖 AI analysis complete!');
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'AI prediction failed';
      toast.error(msg);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiAccept = async () => {
    setAcceptingAi(true);
    try {
      const res = await aiApi.accept(id);
      toast.success(`✅ Priority updated to ${res.data.priority}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to accept AI suggestion');
    } finally {
      setAcceptingAi(false);
    }
  };

  // 🔄 Feature 5 — Reopen Handler
  const handleReopenSubmit = async (e) => {
    e.preventDefault();
    if (!reopenReason.trim()) {
      toast.error('Please provide a reason for reopening');
      return;
    }
    setReopening(true);
    try {
      const res = await complaintsApi.reopen(id, { reason: reopenReason });
      const newId = res.data.newComplaintId;
      toast.success(`Complaint reopened! New ID: ${newId}`);
      setShowReopenModal(false);
      navigate(`/complaints/${newId}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reopen complaint');
    } finally {
      setReopening(false);
    }
  };

  // PDF Export
  const handleExportPDF = async () => {
    if (!data) return;
    setExportLoading(true);
    try {
      const { complaint, history } = data;
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('CivicTracker', 15, 18);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('Civic Issue Report', 15, 26);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}`, 15, 33);

      doc.setFillColor(30, 41, 59);
      doc.roundedRect(140, 10, 60, 22, 3, 3, 'F');
      doc.setTextColor(96, 165, 250);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('COMPLAINT ID', 170, 18, { align: 'center' });
      doc.setFontSize(11);
      doc.text(complaint.complaint_id, 170, 26, { align: 'center' });

      doc.setTextColor(30, 41, 59);
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 40, 210, 50, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(complaint.title, 180);
      doc.text(titleLines, 15, 54);

      const statusColors = { 'Pending': [245,158,11], 'In Progress': [59,130,246], 'Resolved': [34,197,94], 'Rejected': [239,68,68] };
      const sc = statusColors[complaint.status] || [100,116,139];
      doc.setFillColor(sc[0], sc[1], sc[2]);
      doc.roundedRect(15, 64, 35, 8, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(complaint.status, 32, 69, { align: 'center' });

      doc.setFillColor(51, 65, 85);
      doc.roundedRect(55, 64, 30, 8, 2, 2, 'F');
      doc.text(complaint.priority || 'Medium', 70, 69, { align: 'center' });

      autoTable(doc, {
        startY: 96,
        head: [['Field', 'Details']],
        body: [
          ['Category', `${complaint.category}`],
          ['Address', complaint.address || '—'],
          ['Ward', complaint.ward || '—'],
          ['Filed By', complaint.citizen_name || '—'],
          ['Filed On', new Date(complaint.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })],
          ['Assigned To', complaint.assigned_to_name || 'Unassigned'],
          ['SLA (days)', String(complaint.sla_days || 7)],
          ['Upvotes', String(complaint.upvote_count || 0)],
          ...(complaint.resolved_at ? [['Resolved On', new Date(complaint.resolved_at).toLocaleDateString('en-IN', { dateStyle: 'long' })]] : []),
        ],
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
      });

      const afterTable = (doc).lastAutoTable.finalY + 8;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('Description', 15, afterTable);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      const descLines = doc.splitTextToSize(complaint.description || '', 180);
      doc.text(descLines, 15, afterTable + 7);

      if (complaint.resolution_note) {
        const resY = afterTable + 7 + descLines.length * 5 + 8;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(34, 197, 94);
        doc.text('Resolution Note', 15, resY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);
        const resLines = doc.splitTextToSize(complaint.resolution_note, 180);
        doc.text(resLines, 15, resY + 7);
      }

      doc.save(`${complaint.complaint_id}.pdf`);
      toast.success('📄 PDF downloaded!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
    } finally {
      setExportLoading(false);
    }
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const fd = new FormData();
      if (statusForm.status) fd.append('status', statusForm.status);
      if (statusForm.priority) fd.append('priority', statusForm.priority);
      if (statusForm.assigned_to) fd.append('assigned_to', statusForm.assigned_to);
      if (statusForm.note) fd.append('note', statusForm.note);
      if (afterImageFile) fd.append('after_image', afterImageFile);

      await complaintsApi.updateStatus(id, fd);
      toast.success('Complaint updated successfully!');
      setAfterImageFile(null);
      setAfterImagePreview(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setCommenting(true);
    try {
      await complaintsApi.addComment(id, { comment });
      setComment('');
      toast.success('Comment added');
      fetchData();
    } catch (err) {
      toast.error('Failed to add comment');
    } finally {
      setCommenting(false);
    }
  };

  if (loading) return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:300 }}><div className="spinner" style={{ width:36, height:36 }} /></div>;
  if (!data) return null;

  const { complaint, history, comments, userHasUpvoted, rating: existingRating, aiPrediction } = data;
  const isOwner = user?.id === complaint.citizen_id;
  const canRate = isOwner && complaint.status === 'Resolved' && !existingRating;
  const canReopen = isOwner && complaint.status === 'Resolved';

  const fullBeforeImg = complaint.image_url ? `http://localhost:5001${complaint.image_url}` : null;
  const fullAfterImg = complaint.after_image_url ? `http://localhost:5001${complaint.after_image_url}` : null;

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Back & PDF header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm">
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* 🔄 Feature 5 — Reopen Button */}
          {canReopen && (
            <button
              id="reopen-issue-btn"
              onClick={() => setShowReopenModal(true)}
              className="btn btn-secondary btn-sm"
              style={{ borderColor: 'rgba(59,130,246,0.4)', color: 'var(--blue-light)', fontWeight: 600 }}
            >
              <RotateCcw size={14} /> 🔄 Reopen This Issue
            </button>
          )}

          <button
            onClick={handleExportPDF}
            className="btn btn-secondary btn-sm"
            disabled={exportLoading}
            id="pdf-export-btn"
          >
            {exportLoading ? <span className="spinner" /> : <Download size={14} />}
            Export PDF
          </button>
        </div>
      </div>

      {/* 🔄 Feature 5 — Reopened Banners */}
      {complaint.parent_complaint_ref && (
        <div style={{
          background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10, color: 'var(--blue-light)', fontSize: 14
        }}>
          <RotateCcw size={16} />
          <span>
            🔄 This is a reopened complaint. Original issue:{' '}
            <Link to={`/complaints/${complaint.parent_complaint_ref}`} style={{ fontWeight: 700, color: 'white', textDecoration: 'underline' }}>
              {complaint.parent_complaint_ref}
            </Link>
          </span>
        </div>
      )}

      {complaint.child_complaint_ref && (
        <div style={{
          background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10, color: 'var(--amber)', fontSize: 14
        }}>
          <AlertCircle size={16} />
          <span>
            ⚠️ This complaint was reopened. See new complaint:{' '}
            <Link to={`/complaints/${complaint.child_complaint_ref}`} style={{ fontWeight: 700, color: 'white', textDecoration: 'underline' }}>
              {complaint.child_complaint_ref}
            </Link>
          </span>
        </div>
      )}

      {/* SLA Banner */}
      {complaint.is_overdue ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 16,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 10, color: '#ef4444',
        }}>
          <AlertCircle size={16} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            ⏱️ SLA Breach: This complaint is {complaint.days_overdue} day{complaint.days_overdue !== 1 ? 's' : ''} overdue
            (SLA: {complaint.sla_days} days for {complaint.category})
          </span>
        </div>
      ) : complaint.status !== 'Resolved' && complaint.status !== 'Rejected' ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 16,
          background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: 10, color: 'var(--green)',
        }}>
          <Clock size={14} />
          <span style={{ fontSize: 13 }}>
            SLA: {complaint.sla_days} days for {complaint.category} — within deadline
          </span>
        </div>
      ) : null}

      {/* Header card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 32 }}>{CATEGORY_EMOJI[complaint.category] || '📋'}</span>
            <div>
              <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--blue-light)', marginBottom: 4 }}>{complaint.complaint_id}</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>{complaint.title}</h2>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
            <StatusBadge status={complaint.status} />
            <PriorityBadge priority={complaint.priority} />
          </div>
        </div>

        <p style={{ fontSize: 14, color: 'var(--gray-100)', lineHeight: 1.7, marginBottom: 16 }}>{complaint.description}</p>

        {complaint.resolution_note && (
          <div style={{ padding: '10px 14px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, fontSize: 13, color: 'var(--green)', marginBottom: 14 }}>
            <strong>✅ Resolution Note:</strong> {complaint.resolution_note}
          </div>
        )}

        {/* 📸 Feature 4 — Photos & Before & After Slider Display */}
        {complaint.status === 'Resolved' && fullBeforeImg && fullAfterImg ? (
          <BeforeAfterSlider beforeImg={fullBeforeImg} afterImg={fullAfterImg} />
        ) : fullBeforeImg ? (
          <div style={{ marginBottom: 14 }}>
            <img src={fullBeforeImg} alt="Complaint" style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 8 }} />
          </div>
        ) : fullAfterImg ? (
          <div style={{ marginBottom: 14, position: 'relative' }}>
            <img src={fullAfterImg} alt="After Repair" style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 8 }} />
            <span style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(34,197,94,0.9)', color: 'white', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
              After Repair
            </span>
          </div>
        ) : null}

        {/* Meta grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 12 }}>
          {[
            { label: 'Category', value: `${CATEGORY_EMOJI[complaint.category]} ${complaint.category}` },
            { label: 'Reported By', value: complaint.citizen_name },
            { label: 'Location', value: complaint.ward || '—' },
            { label: 'Filed On', value: new Date(complaint.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) },
            ...(complaint.assigned_to_name ? [{ label: 'Assigned To', value: complaint.assigned_to_name }] : []),
            ...(complaint.resolved_at ? [{ label: 'Resolved On', value: new Date(complaint.resolved_at).toLocaleDateString('en-IN') }] : []),
          ].map(m => (
            <div key={m.label} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--gray-500)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{m.value}</div>
            </div>
          ))}
        </div>

        {complaint.address && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: 13, color: 'var(--gray-300)', display: 'flex', gap: 6, alignItems: 'center' }}>
            <MapPin size={13} color="var(--teal-light)" /> {complaint.address}
          </div>
        )}

        {/* Upvote button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={handleUpvote}
            disabled={upvoting}
            id="upvote-btn"
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
              borderRadius: 8, border: userHasUpvoted ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
              background: userHasUpvoted ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
              color: userHasUpvoted ? 'var(--blue-light)' : 'var(--gray-300)',
              cursor: 'pointer', fontSize: 14, fontWeight: 600, transition: 'all 0.2s',
            }}
          >
            {upvoting ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <ThumbsUp size={15} />}
            {userHasUpvoted ? 'Upvoted' : 'Upvote'}
            <span style={{
              background: userHasUpvoted ? '#3b82f6' : 'rgba(255,255,255,0.1)',
              color: userHasUpvoted ? 'white' : 'var(--gray-300)',
              borderRadius: 20, padding: '1px 8px', fontSize: 12, fontWeight: 700,
            }}>
              {complaint.upvote_count || 0}
            </span>
          </button>
        </div>
      </div>

      {/* Resolution Rating prompt */}
      {canRate && (
        <div className="card" style={{ marginBottom: 16, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.05)' }}>
          <h3 style={{ fontSize: 15, marginBottom: 8, color: 'var(--green)' }}>
            ⭐ Rate the Resolution
          </h3>
          <p style={{ fontSize: 13, color: 'var(--gray-300)', marginBottom: 16 }}>
            Your complaint was resolved! Are you satisfied with how it was handled?
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => handleRating(1)}
              disabled={submittingRating}
              id="rating-thumbs-up-btn"
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px',
                borderRadius: 8, border: '1px solid rgba(34,197,94,0.4)',
                background: 'rgba(34,197,94,0.12)', color: 'var(--green)',
                cursor: 'pointer', fontSize: 15, fontWeight: 600,
              }}
            >
              <ThumbsUp size={18} /> Satisfied
            </button>
            <button
              onClick={() => handleRating(-1)}
              disabled={submittingRating}
              id="rating-thumbs-down-btn"
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px',
                borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)',
                background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                cursor: 'pointer', fontSize: 15, fontWeight: 600,
              }}
            >
              <ThumbsDown size={18} /> Not Satisfied
            </button>
          </div>
        </div>
      )}

      {/* Existing rating display */}
      {existingRating && (
        <div className="card" style={{ marginBottom: 16, border: `1px solid ${existingRating.rating === 1 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: existingRating.rating === 1 ? 'var(--green)' : '#ef4444' }}>
            {existingRating.rating === 1 ? <ThumbsUp size={16} /> : <ThumbsDown size={16} />}
            <span style={{ fontWeight: 600 }}>You rated this resolution as: {existingRating.rating === 1 ? 'Satisfied 👍' : 'Not Satisfied 👎'}</span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: user?.role !== 'citizen' ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 16 }}>
        {/* Status Timeline */}
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 16 }}>📊 Status Timeline</h3>
          {history.length === 0 ? <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>No history yet</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {history.map((h, i) => {
                const HIcon = STATUS_ICON[h.new_status] || Clock;
                const color = h.new_status === 'Resolved' ? 'var(--green)' : h.new_status === 'Pending' ? 'var(--amber)' : 'var(--blue-light)';
                return (
                  <div key={h.id} style={{ display: 'flex', gap: 12, paddingBottom: i < history.length - 1 ? 16 : 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${color}`, flexShrink: 0 }}>
                        <HIcon size={13} color={color} />
                      </div>
                      {i < history.length - 1 && <div style={{ width: 2, flex: 1, background: 'rgba(255,255,255,0.06)', marginTop: 4 }} />}
                    </div>
                    <div style={{ paddingBottom: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color }}>→ {h.new_status}</div>
                      {h.old_status && <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>from {h.old_status}</div>}
                      {h.note && <div style={{ fontSize: 12, color: 'var(--gray-300)', marginTop: 2 }}>{h.note}</div>}
                      <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>
                        {h.changed_by_name} · {new Date(h.created_at).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Authority update panel */}
        {user?.role !== 'citizen' && (
          <div className="card">
            <h3 style={{ fontSize: 15, marginBottom: 16 }}>⚙️ Update Complaint</h3>
            <form onSubmit={handleStatusUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select value={statusForm.status} onChange={e => setStatusForm(f=>({...f, status:e.target.value}))}>
                  {['Pending','In Progress','Resolved','Rejected'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select value={statusForm.priority} onChange={e => setStatusForm(f=>({...f, priority:e.target.value}))}>
                  {['Low','Medium','High','Critical'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              {authorities.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Assign To</label>
                  <select value={statusForm.assigned_to} onChange={e => setStatusForm(f=>({...f, assigned_to:e.target.value}))}>
                    <option value="">Unassigned</option>
                    {authorities.map(a => <option key={a.id} value={a.id}>{a.name} {a.ward ? `(${a.ward})` : ''}</option>)}
                  </select>
                </div>
              )}

              {/* 📸 Feature 4 — Upload After Photo when resolving */}
              {statusForm.status === 'Resolved' && (
                <div className="form-group">
                  <label className="form-label">Upload After Photo (optional)</label>
                  {afterImagePreview ? (
                    <div style={{ position: 'relative' }}>
                      <img src={afterImagePreview} alt="After preview" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8 }} />
                      <button type="button" onClick={() => { setAfterImageFile(null); setAfterImagePreview(null); }}
                        style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: 'var(--gray-300)' }}>
                      <Upload size={16} /> Choose after repair image...
                      <input type="file" accept="image/*" onChange={e => {
                        const file = e.target.files[0];
                        if (file) {
                          setAfterImageFile(file);
                          setAfterImagePreview(URL.createObjectURL(file));
                        }
                      }} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Note / Resolution</label>
                <textarea rows={3} placeholder="Add a note about the action taken..."
                  value={statusForm.note} onChange={e => setStatusForm(f=>({...f, note:e.target.value}))}
                  style={{ resize: 'vertical' }} />
              </div>
              <button type="submit" className="btn btn-success" disabled={updating} style={{ justifyContent: 'center' }}>
                {updating ? <span className="spinner" /> : '✓ Save Update'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="card">
        <h3 style={{ fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageSquare size={16} color="var(--blue-light)" /> Comments ({comments.length})
        </h3>

        {comments.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>No comments yet. Be the first to add one.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            {comments.map(c => (
              <div key={c.id} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, borderLeft: `3px solid ${c.user_role === 'citizen' ? 'var(--blue)' : 'var(--teal)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: c.user_role === 'citizen' ? 'var(--blue-light)' : 'var(--teal-light)' }}>
                    {c.user_role === 'citizen' ? '👤' : c.user_role === 'admin' ? '🛡️' : '⚖️'} {c.user_name}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>{new Date(c.created_at).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</span>
                </div>
                <p style={{ fontSize: 14, color: 'var(--gray-100)', lineHeight: 1.5 }}>{c.comment}</p>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleComment} style={{ display: 'flex', gap: 10 }}>
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
            placeholder="Add a comment..." style={{ flex: 1, resize: 'none' }} />
          <button type="submit" className="btn btn-primary" disabled={commenting || !comment.trim()} style={{ alignSelf: 'flex-end', flexShrink: 0 }}>
            {commenting ? <span className="spinner" /> : <><Send size={14} /> Post</>}
          </button>
        </form>
      </div>

      {/* 🔄 Feature 5 — Reopen Complaint Modal */}
      {showReopenModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(7,13,27,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div style={{
            width: '100%', maxWidth: 480, background: 'var(--navy-card)',
            border: '1px solid var(--border-strong)', borderRadius: 16,
            padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--white)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <RotateCcw size={18} color="var(--blue-light)" /> Reopen Complaint
              </h3>
              <button onClick={() => setShowReopenModal(false)} style={{ background: 'none', border: 'none', color: 'var(--gray-500)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--gray-300)', marginBottom: 16, lineHeight: 1.5 }}>
              If the issue was not properly resolved or has returned, specify the reason below to create a linked reopen ticket.
            </p>

            <form onSubmit={handleReopenSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Reopen Reason *</label>
                <textarea
                  rows={4}
                  placeholder="Explain why this issue needs to be reopened..."
                  value={reopenReason}
                  onChange={e => setReopenReason(e.target.value)}
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowReopenModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={reopening}>
                  {reopening ? <span className="spinner" /> : '🔄 Reopen Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
