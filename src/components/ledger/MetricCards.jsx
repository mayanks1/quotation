import React from 'react';
import { 
  IndianRupee, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  Clock, 
  Award,
  Layers
} from 'lucide-react';

export default function MetricCards({ metrics, selectedYear }) {
  const {
    totalRevenue = 0,
    totalJobs = 0,
    avgValue = 0,
    receivedAmount = 0,
    pendingAmount = 0,
    bestMonth = '-',
    growth = null,
    growthPeriod = ''
  } = metrics;

  const collectionRate = totalRevenue > 0 ? Math.round((receivedAmount / totalRevenue) * 100) : 0;

  return (
    <div className="kpi-grid">
      {/* 1. Total Revenue */}
      <div className="glass-panel kpi-card" style={{ '--card-accent': '#6366f1' }}>
        <div className="kpi-header">
          <span className="kpi-title">Total Revenue</span>
          <div className="kpi-icon-wrap" style={{ color: '#818cf8', background: 'rgba(99,102,241,0.1)' }}>
            <IndianRupee size={20} />
          </div>
        </div>
        <div className="kpi-value" style={{ color: '#ffffff' }}>
          ₹ {totalRevenue.toLocaleString('en-IN')}
        </div>
        <div className="kpi-subtext">
          <span style={{ color: '#818cf8', fontWeight: '600' }}>{totalJobs} total events</span> recorded
        </div>
      </div>

      {/* 2. Received Revenue */}
      <div className="glass-panel kpi-card" style={{ '--card-accent': '#22c55e' }}>
        <div className="kpi-header">
          <span className="kpi-title">Received Amount</span>
          <div className="kpi-icon-wrap" style={{ color: '#4ade80', background: 'rgba(34,197,94,0.1)' }}>
            <CheckCircle2 size={20} />
          </div>
        </div>
        <div className="kpi-value" style={{ color: '#4ade80' }}>
          ₹ {receivedAmount.toLocaleString('en-IN')}
        </div>
        <div className="kpi-subtext">
          <span style={{ color: '#22c55e', fontWeight: '600' }}>{collectionRate}%</span> collection rate
        </div>
      </div>

      {/* 3. Pending Amount */}
      <div className="glass-panel kpi-card" style={{ '--card-accent': '#f59e0b' }}>
        <div className="kpi-header">
          <span className="kpi-title">Pending Amount</span>
          <div className="kpi-icon-wrap" style={{ color: '#fbbf24', background: 'rgba(245,158,11,0.1)' }}>
            <Clock size={20} />
          </div>
        </div>
        <div className="kpi-value" style={{ color: '#fbbf24' }}>
          ₹ {pendingAmount.toLocaleString('en-IN')}
        </div>
        <div className="kpi-subtext">
          <span style={{ color: '#f59e0b', fontWeight: '600' }}>
            {totalRevenue > 0 ? (100 - collectionRate) : 0}%
          </span> outstanding
        </div>
      </div>

      {/* 4. Average Order */}
      <div className="glass-panel kpi-card" style={{ '--card-accent': '#38bdf8' }}>
        <div className="kpi-header">
          <span className="kpi-title">Average Order</span>
          <div className="kpi-icon-wrap" style={{ color: '#38bdf8', background: 'rgba(56,189,248,0.1)' }}>
            <Layers size={20} />
          </div>
        </div>
        <div className="kpi-value" style={{ color: '#e0f2fe' }}>
          ₹ {avgValue.toLocaleString('en-IN')}
        </div>
        <div className="kpi-subtext">
          Per booked event average
        </div>
      </div>

      {/* 5. YoY Growth */}
      <div className="glass-panel kpi-card" style={{ '--card-accent': growth >= 0 ? '#10b981' : '#f43f5e' }}>
        <div className="kpi-header">
          <span className="kpi-title">YoY Growth</span>
          <div className="kpi-icon-wrap" style={{ 
            color: growth >= 0 ? '#34d399' : '#fb7185', 
            background: growth >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)' 
          }}>
            {growth === null ? (
              <TrendingUp size={20} />
            ) : growth >= 0 ? (
              <TrendingUp size={20} />
            ) : (
              <TrendingDown size={20} />
            )}
          </div>
        </div>
        <div className="kpi-value" style={{ color: growth === null ? 'var(--text-muted)' : growth >= 0 ? '#34d399' : '#fb7185' }}>
          {growth !== null ? `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%` : '—'}
        </div>
        <div className="kpi-subtext" style={{ fontSize: '11px' }}>
          {growthPeriod || 'Compare across years'}
        </div>
      </div>

      {/* 6. Best Month */}
      <div className="glass-panel kpi-card" style={{ '--card-accent': '#eab308' }}>
        <div className="kpi-header">
          <span className="kpi-title">Peak Month</span>
          <div className="kpi-icon-wrap" style={{ color: '#facc15', background: 'rgba(234,179,8,0.1)' }}>
            <Award size={20} />
          </div>
        </div>
        <div className="kpi-value" style={{ color: '#fef08a', fontSize: '22px' }}>
          {bestMonth}
        </div>
        <div className="kpi-subtext">
          Highest earning cycle
        </div>
      </div>
    </div>
  );
}
