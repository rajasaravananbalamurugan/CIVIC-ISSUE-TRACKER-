import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { complaintsApi } from '../utils/api';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, AlertCircle, X, CheckCircle2, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function WorkCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null); // YYYY-MM-DD string

  const fetchCalendarComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const res = await complaintsApi.authorityCalendar();
      setComplaints(res.data || []);
    } catch (err) {
      toast.error('Failed to load work calendar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendarComplaints();
  }, [fetchCalendarComplaints]);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonthDays = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  // Group complaints by deadline date string YYYY-MM-DD
  const complaintsByDate = {};
  complaints.forEach(c => {
    const d = c.deadline_date;
    if (!complaintsByDate[d]) complaintsByDate[d] = [];
    complaintsByDate[d].push(c);
  });

  // Selected date complaints
  const selectedComplaints = selectedDate ? (complaintsByDate[selectedDate] || []) : [];

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CalendarIcon size={24} color="var(--blue-light)" /> SLA Work Calendar
          </h1>
          <p className="page-subtitle">Track your assigned complaints by SLA deadline date</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--navy-card)', padding: '4px 12px', borderRadius: 10, border: '1px solid var(--border)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#ef4444' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} /> Overdue
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--amber)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--amber)' }} /> Due in 2 Days
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--green)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} /> On Track / Resolved
            </span>
          </div>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--white)' }}>
            {MONTH_NAMES[month]} {year}
          </h2>
          <button className="btn btn-secondary btn-sm" onClick={handleToday}>Today</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={handlePrevMonth} title="Previous Month">
            <ChevronLeft size={16} /> Prev
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleNextMonth} title="Next Month">
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedDate ? '1fr 340px' : '1fr', gap: 20, transition: 'all 0.3s' }}>
        {/* Main Calendar Grid */}
        <div className="card" style={{ padding: 16 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 350 }}>
              <div className="spinner" style={{ width: 32, height: 32 }} />
            </div>
          ) : (
            <div>
              {/* Day Headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 8, textAlign: 'center' }}>
                {DAY_NAMES.map(day => (
                  <div key={day} style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', padding: '6px 0', textTransform: 'uppercase' }}>
                    {day}
                  </div>
                ))}
              </div>

              {/* Month Grid Cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                {/* Previous month trailing days */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => {
                  const dayNum = prevMonthDays - firstDayOfMonth + i + 1;
                  return (
                    <div key={`prev-${i}`} style={{
                      minHeight: 80, padding: 8, background: 'rgba(255,255,255,0.01)',
                      borderRadius: 8, border: '1px solid rgba(255,255,255,0.02)', opacity: 0.3
                    }}>
                      <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>{dayNum}</span>
                    </div>
                  );
                })}

                {/* Current month days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateIso = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const dayComplaints = complaintsByDate[dateIso] || [];
                  const isToday = dateIso === todayStr;
                  const isSelected = dateIso === selectedDate;

                  return (
                    <div
                      key={dateIso}
                      onClick={() => setSelectedDate(isSelected ? null : dateIso)}
                      style={{
                        minHeight: 85, padding: 8, borderRadius: 10,
                        background: isSelected
                          ? 'var(--active-tint)'
                          : isToday
                          ? 'rgba(59,130,246,0.1)'
                          : 'var(--navy-mid)',
                        border: isSelected
                          ? '2px solid var(--blue)'
                          : isToday
                          ? '1px solid var(--blue-light)'
                          : '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer', transition: 'all 0.15s ease',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isToday ? 'rgba(59,130,246,0.1)' : 'var(--navy-mid)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{
                          fontSize: 13, fontWeight: isToday || isSelected ? 700 : 500,
                          color: isToday ? 'var(--blue-light)' : 'var(--white)'
                        }}>
                          {dayNum}
                        </span>
                        {dayComplaints.length > 0 && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
                            background: 'rgba(255,255,255,0.1)', color: 'var(--white)'
                          }}>
                            {dayComplaints.length}
                          </span>
                        )}
                      </div>

                      {/* Complaint Dots / Badges */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                        {dayComplaints.slice(0, 3).map(c => {
                          const dotColor = c.urgency_color === 'red' ? '#ef4444' : c.urgency_color === 'amber' ? 'var(--amber)' : 'var(--green)';
                          return (
                            <div key={c.id} style={{
                              fontSize: 11, padding: '2px 6px', borderRadius: 4,
                              background: `${dotColor}20`, borderLeft: `3px solid ${dotColor}`,
                              color: 'var(--white)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                            }}>
                              {c.complaint_id}
                            </div>
                          );
                        })}
                        {dayComplaints.length > 3 && (
                          <span style={{ fontSize: 10, color: 'var(--gray-500)', paddingLeft: 2 }}>
                            +{dayComplaints.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Selected Date Side Drawer Panel */}
        {selectedDate && (
          <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
              <div>
                <h3 style={{ fontSize: 15, margin: 0, color: 'var(--white)' }}>
                  Complaints Due
                </h3>
                <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
                  {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedDate(null)} style={{ padding: 4 }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {selectedComplaints.length === 0 ? (
                <div style={{ padding: '30px 16px', textAlign: 'center', color: 'var(--gray-500)', fontSize: 13 }}>
                  <CalendarIcon size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                  No complaints due on this date.
                </div>
              ) : (
                selectedComplaints.map(c => {
                  const borderCol = c.urgency_color === 'red' ? '#ef4444' : c.urgency_color === 'amber' ? 'var(--amber)' : 'var(--green)';
                  return (
                    <div key={c.id} style={{
                      padding: '12px 14px', background: 'var(--navy-mid)', borderRadius: 10,
                      borderLeft: `4px solid ${borderCol}`, borderTop: '1px solid rgba(255,255,255,0.06)',
                      borderRight: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Link to={`/complaints/${c.complaint_id}`} style={{ color: 'var(--blue-light)', fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>
                          {c.complaint_id}
                        </Link>
                        <span className={`badge ${c.status === 'Resolved' ? 'badge-resolved' : c.status === 'In Progress' ? 'badge-inprogress' : 'badge-pending'}`}>
                          {c.status}
                        </span>
                      </div>

                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)', marginBottom: 6 }}>
                        {c.title}
                      </div>

                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, padding: '2px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: 6, color: 'var(--gray-300)' }}>
                          {c.category}
                        </span>
                        <span style={{ fontSize: 11, padding: '2px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: 6, color: 'var(--gray-300)' }}>
                          Priority: {c.priority}
                        </span>
                      </div>

                      <div style={{ fontSize: 12, color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
                        <MapPin size={12} /> {c.ward || c.address}
                      </div>

                      <Link to={`/complaints/${c.complaint_id}`} className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                        View Details →
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
