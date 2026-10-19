import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  MapPin, 
  X, 
  Sparkles,
  Calendar,
  Layers
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

export default function ChartsSection({
  monthlyData,
  yearlyData,
  records = [],
  metrics = {},
  activeMonth,
  onSelectMonth
}) {
  const [monthlyChartType, setMonthlyChartType] = useState('area'); // 'area' | 'bar'
  const [secondaryTab, setSecondaryTab] = useState('yearly'); // 'yearly' | 'donut' | 'venues'

  const { labels: monthLabels = [], values: monthValues = [], bestIndex = -1 } = monthlyData;
  const { labels: yearLabels = [], values: yearValues = [] } = yearlyData;
  const { receivedAmount = 0, pendingAmount = 0, totalRevenue = 0 } = metrics;

  // 1. Top Venues / Client Hubs
  const topVenues = useMemo(() => {
    const venueMap = {};
    records.forEach(r => {
      const client = r.client || 'Unknown';
      if (!venueMap[client]) {
        venueMap[client] = { name: client, revenue: 0, events: 0 };
      }
      venueMap[client].revenue += r.amount;
      venueMap[client].events += 1;
    });

    const list = Object.values(venueMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const maxRevenue = list[0]?.revenue || 1;
    return list.map(v => ({
      ...v,
      percentage: Math.round((v.revenue / maxRevenue) * 100)
    }));
  }, [records]);

  // 2. Monthly Area / Spline Chart Data
  const monthlyLineData = {
    labels: monthLabels,
    datasets: [
      {
        label: 'Revenue Trend',
        data: monthValues,
        fill: true,
        borderColor: '#818cf8',
        borderWidth: 3,
        tension: 0.4, // Smooth curve
        pointBackgroundColor: monthValues.map((_, i) => i === bestIndex ? '#22c55e' : '#818cf8'),
        pointBorderColor: '#0f172a',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: '#ffffff',
        pointHoverBorderColor: '#6366f1',
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 240);
          gradient.addColorStop(0, 'rgba(99, 102, 241, 0.45)');
          gradient.addColorStop(0.65, 'rgba(99, 102, 241, 0.1)');
          gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');
          return gradient;
        }
      }
    ]
  };

  // 3. Monthly Bar Chart Data
  const monthlyBarData = {
    labels: monthLabels,
    datasets: [
      {
        label: 'Monthly Revenue (₹)',
        data: monthValues,
        backgroundColor: monthValues.map((_, i) => {
          if (activeMonth && monthLabels[i] === activeMonth) {
            return '#d946ef'; // Active filter highlighted in fuchsia
          }
          return i === bestIndex ? '#22c55e' : '#6366f1';
        }),
        borderRadius: 6,
        maxBarThickness: 28,
        hoverBackgroundColor: '#818cf8',
      }
    ]
  };

  const monthlyOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: 'rgba(99,102,241,0.3)',
        borderWidth: 1,
        titleColor: '#f8fafc',
        bodyColor: '#38bdf8',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => ` Revenue: ₹ ${context.raw.toLocaleString('en-IN')}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: {
          color: '#94a3b8',
          font: { family: 'JetBrains Mono', size: 10 },
          callback: (value) => `₹${(value / 1000).toFixed(0)}k`
        }
      }
    },
    onClick: (_, elements) => {
      if (elements && elements.length > 0) {
        const index = elements[0].index;
        const selectedMonth = monthLabels[index];
        onSelectMonth(selectedMonth);
      }
    }
  };

  // 4. Yearly Chart Data
  const yearlyChartData = {
    labels: yearLabels,
    datasets: [
      {
        label: 'Annual Revenue (₹)',
        data: yearValues,
        backgroundColor: '#3b82f6',
        hoverBackgroundColor: '#60a5fa',
        borderRadius: 6,
        maxBarThickness: 36
      }
    ]
  };

  const yearlyOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: 'rgba(59,130,246,0.3)',
        borderWidth: 1,
        titleColor: '#f8fafc',
        bodyColor: '#60a5fa',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => ` Total: ₹ ${context.raw.toLocaleString('en-IN')}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: {
          color: '#94a3b8',
          font: { family: 'JetBrains Mono', size: 10 },
          callback: (value) => `₹${(value / 1000).toFixed(0)}k`
        }
      }
    }
  };

  // 5. Payment Donut Data
  const donutData = {
    labels: ['Received Amount', 'Pending Amount'],
    datasets: [
      {
        data: [receivedAmount, pendingAmount],
        backgroundColor: ['#22c55e', '#f59e0b'],
        hoverBackgroundColor: ['#4ade80', '#fbbf24'],
        borderColor: '#0f172a',
        borderWidth: 3,
        hoverOffset: 6
      }
    ]
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#e2e8f0', font: { size: 11, family: 'Plus Jakarta Sans' }, boxWidth: 12 }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        callbacks: {
          label: (context) => ` ${context.label}: ₹ ${context.raw.toLocaleString('en-IN')}`
        }
      }
    },
    cutout: '70%'
  };

  return (
    <div className="charts-grid">
      {/* ========================================================
          LEFT CARD: Interactive Monthly Revenue Trend
          ======================================================== */}
      <div className="glass-panel chart-card">
        <div className="chart-header">
          <div className="chart-title-wrap">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="#818cf8" />
              <h3>Monthly Performance</h3>
            </div>
            <p className="chart-subtitle">
              {activeMonth ? `Showing records for ${activeMonth}` : 'Click month to filter table'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activeMonth && (
              <button 
                onClick={() => onSelectMonth(null)} 
                className="btn btn-secondary chart-active-chip"
              >
                <span>{activeMonth}</span>
                <X size={12} />
              </button>
            )}

            {/* Area Curve vs Bar Switcher */}
            <div className="chart-type-pill">
              <button
                type="button"
                onClick={() => setMonthlyChartType('area')}
                className={`chart-type-btn ${monthlyChartType === 'area' ? 'active' : ''}`}
                title="Smooth Gradient Trendline"
              >
                <TrendingUp size={13} />
                <span className="btn-text-desktop">Trend</span>
              </button>
              <button
                type="button"
                onClick={() => setMonthlyChartType('bar')}
                className={`chart-type-btn ${monthlyChartType === 'bar' ? 'active' : ''}`}
                title="Bar Chart"
              >
                <BarChart3 size={13} />
                <span className="btn-text-desktop">Bars</span>
              </button>
            </div>
          </div>
        </div>

        <div className="chart-canvas-container">
          {monthValues.length > 0 ? (
            monthlyChartType === 'area' ? (
              <Line data={monthlyLineData} options={monthlyOptions} />
            ) : (
              <Bar data={monthlyBarData} options={monthlyOptions} />
            )
          ) : (
            <div className="chart-empty-state">
              No monthly data for current filter
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          RIGHT CARD: Multi-view (Yearly | Payment Mix | Venues)
          ======================================================== */}
      <div className="glass-panel chart-card">
        <div className="chart-header">
          <div className="chart-title-wrap">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {secondaryTab === 'yearly' && <Calendar size={18} color="#38bdf8" />}
              {secondaryTab === 'donut' && <PieChart size={18} color="#22c55e" />}
              {secondaryTab === 'venues' && <MapPin size={18} color="#fbbf24" />}
              <h3>
                {secondaryTab === 'yearly' && 'Yearly History'}
                {secondaryTab === 'donut' && 'Payment Split'}
                {secondaryTab === 'venues' && 'Top Venues'}
              </h3>
            </div>
            <p className="chart-subtitle">
              {secondaryTab === 'yearly' && 'Annual revenue comparison'}
              {secondaryTab === 'donut' && 'Received vs pending ratio'}
              {secondaryTab === 'venues' && 'Top earning client hubs'}
            </p>
          </div>

          {/* Sub-tab Switcher */}
          <div className="chart-type-pill">
            <button
              type="button"
              onClick={() => setSecondaryTab('yearly')}
              className={`chart-type-btn ${secondaryTab === 'yearly' ? 'active' : ''}`}
              title="Yearly Comparison"
            >
              <BarChart3 size={13} />
              <span className="btn-text-desktop">Yearly</span>
            </button>
            <button
              type="button"
              onClick={() => setSecondaryTab('donut')}
              className={`chart-type-btn ${secondaryTab === 'donut' ? 'active' : ''}`}
              title="Payment Ratio"
            >
              <PieChart size={13} />
              <span className="btn-text-desktop">Split</span>
            </button>
            <button
              type="button"
              onClick={() => setSecondaryTab('venues')}
              className={`chart-type-btn ${secondaryTab === 'venues' ? 'active' : ''}`}
              title="Top Venues & Locations"
            >
              <MapPin size={13} />
              <span className="btn-text-desktop">Venues</span>
            </button>
          </div>
        </div>

        <div className="chart-canvas-container">
          {/* TAB 1: Yearly Bar Chart */}
          {secondaryTab === 'yearly' && (
            yearValues.length > 0 ? (
              <Bar data={yearlyChartData} options={yearlyOptions} />
            ) : (
              <div className="chart-empty-state">No historical data available</div>
            )
          )}

          {/* TAB 2: Payment Donut Chart with Center Metric */}
          {secondaryTab === 'donut' && (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <Doughnut data={donutData} options={donutOptions} />
              <div className="donut-center-badge">
                <span className="donut-center-percent">
                  {totalRevenue > 0 ? Math.round((receivedAmount / totalRevenue) * 100) : 0}%
                </span>
                <span className="donut-center-label">Collected</span>
              </div>
            </div>
          )}

          {/* TAB 3: Top Venues / Location Hubs Feed */}
          {secondaryTab === 'venues' && (
            <div className="venues-list-container">
              {topVenues.map((v, i) => (
                <div key={v.name} className="venue-list-item">
                  <div className="venue-item-top">
                    <div className="venue-name-wrap">
                      <span className="venue-rank-badge">#{i + 1}</span>
                      <span className="venue-name">{v.name}</span>
                    </div>
                    <span className="venue-revenue">₹ {v.revenue.toLocaleString('en-IN')}</span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="venue-bar-track">
                    <div 
                      className="venue-bar-fill" 
                      style={{ width: `${v.percentage}%` }}
                    />
                  </div>
                  <div className="venue-meta">
                    <span>{v.events} events hosted</span>
                    <span>{Math.round((v.revenue / (totalRevenue || 1)) * 100)}% of total</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
