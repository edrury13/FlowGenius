import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import trackingService, { ProductivityMetrics, TrackingSettings } from '../../services/tracking';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ProductivityDashboardProps {
  isVisible: boolean;
  onClose: () => void;
}

const ProductivityDashboard: React.FC<ProductivityDashboardProps> = ({ isVisible, onClose }) => {
  const [metrics, setMetrics] = useState<ProductivityMetrics | null>(null);
  const [settings, setSettings] = useState<TrackingSettings | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 14 | 30>(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isVisible) {
      loadData();
    }
  }, [isVisible, selectedPeriod]);

  const loadData = async () => {
    setLoading(true);
    try {
      const metricsData = trackingService.getProductivityMetrics(selectedPeriod);
      const settingsData = trackingService.getSettings();
      
      setMetrics(metricsData);
      setSettings(settingsData);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    }
    setLoading(false);
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatTime = (hour: number): string => {
    return hour === 0 ? '12 AM' : hour <= 12 ? `${hour} AM` : `${hour - 12} PM`;
  };

  const handleSettingsUpdate = (newSettings: Partial<TrackingSettings>) => {
    trackingService.updateSettings(newSettings);
    setSettings(prev => prev ? { ...prev, ...newSettings } : null);
  };

  const generateMockData = () => {
    trackingService.generateMockData();
    loadData();
  };

  const exportData = () => {
    const data = trackingService.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flowgenius-analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearData = () => {
    if (confirm('Are you sure you want to clear all tracking data? This cannot be undone.')) {
      trackingService.clearData();
      loadData();
    }
  };

  if (!isVisible) return null;

  const styles = {
    container: {
      backgroundColor: 'white',
      height: '100%',
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden',
    },
    header: {
      padding: '16px 20px',
      borderBottom: '1px solid #e0e0e0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#f8f9fa',
      flexShrink: 0,
    },
    title: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#333',
      margin: 0,
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '18px',
      cursor: 'pointer',
      color: '#666',
      padding: '4px',
    },
    content: {
      padding: '16px',
      overflow: 'auto',
      flex: 1,
    },
    controls: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      flexWrap: 'wrap' as const,
      gap: '12px',
    },
    periodSelect: {
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: '6px',
      backgroundColor: 'white',
    },
    actionButtons: {
      display: 'flex',
      gap: '8px',
    },
    button: {
      padding: '8px 16px',
      border: '1px solid #ddd',
      borderRadius: '6px',
      backgroundColor: 'white',
      cursor: 'pointer',
      fontSize: '14px',
    },
    primaryButton: {
      backgroundColor: '#667eea',
      color: 'white',
      border: 'none',
    },
    dangerButton: {
      backgroundColor: '#e53e3e',
      color: 'white',
      border: 'none',
    },
    grid: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '16px',
      marginBottom: '16px',
    },
    card: {
      border: '1px solid #e0e0e0',
      borderRadius: '6px',
      padding: '12px',
      backgroundColor: 'white',
      marginBottom: '8px',
    },
    cardTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '16px',
      color: '#333',
    },
    metric: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px',
      padding: '8px 0',
      borderBottom: '1px solid #f0f0f0',
    },
    metricValue: {
      fontWeight: 'bold',
      color: '#667eea',
    },
    chartContainer: {
      height: '200px',
      width: '100%',
    },
    settingsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '16px',
      marginBottom: '24px',
    },
    checkbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '8px',
    },
    input: {
      padding: '6px 8px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      width: '60px',
    },
    topApps: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '8px',
    },
    appItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 12px',
      backgroundColor: '#f8f9fa',
      borderRadius: '6px',
    },
    appBar: {
      height: '4px',
      backgroundColor: '#667eea',
      borderRadius: '2px',
      marginTop: '4px',
    },
    loadingSpinner: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '200px',
      fontSize: '18px',
      color: '#666',
    },
    productivityScore: {
      textAlign: 'center' as const,
      padding: '20px',
    },
    scoreCircle: {
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 12px',
      fontSize: '18px',
      fontWeight: 'bold',
      color: 'white',
    },
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#ff9800';
    return '#f44336';
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  // Chart data preparations
  const activityChartData = metrics ? {
    labels: metrics.dailyPattern.map(p => formatTime(p.hour)),
    datasets: [
      {
        label: 'Activity (minutes)',
        data: metrics.dailyPattern.map(p => Math.round(p.activity / 60)),
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        fill: true,
      },
    ],
  } : null;

  const categoryChartData = metrics ? {
    labels: ['Productive', 'Distraction'],
    datasets: [
      {
        data: [metrics.productiveTime, metrics.distractionTime],
        backgroundColor: ['#4caf50', '#f44336'],
        borderWidth: 0,
      },
    ],
  } : null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📊 Analytics</h2>
        <button style={styles.closeButton} onClick={onClose}>×</button>
      </div>
      
      <div style={styles.content}>
          {loading ? (
            <div style={styles.loadingSpinner}>Loading analytics...</div>
          ) : (
            <>
              <div style={styles.controls}>
                <div>
                  <label>Time Period: </label>
                  <select
                    style={styles.periodSelect}
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(Number(e.target.value) as 7 | 14 | 30)}
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={14}>Last 14 days</option>
                    <option value={30}>Last 30 days</option>
                  </select>
                </div>
                
                <div style={styles.actionButtons}>
                  <button style={{...styles.button, ...styles.primaryButton}} onClick={generateMockData}>
                    Generate Sample Data
                  </button>
                  <button style={styles.button} onClick={exportData}>
                    Export Data
                  </button>
                  <button style={{...styles.button, ...styles.dangerButton}} onClick={clearData}>
                    Clear Data
                  </button>
                </div>
              </div>

              {/* Settings Section */}
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>⚙️ Tracking Settings</h3>
                <div style={styles.settingsGrid}>
                  <div>
                    <label style={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={settings?.enabled || false}
                        onChange={(e) => handleSettingsUpdate({ enabled: e.target.checked })}
                      />
                      Enable tracking
                    </label>
                    <label style={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={settings?.trackWindowTitles || false}
                        onChange={(e) => handleSettingsUpdate({ trackWindowTitles: e.target.checked })}
                      />
                      Track window titles
                    </label>
                    <label style={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={settings?.trackIdleTime || false}
                        onChange={(e) => handleSettingsUpdate({ trackIdleTime: e.target.checked })}
                      />
                      Track idle time
                    </label>
                  </div>
                  <div>
                    <label style={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={settings?.anonymizeData || false}
                        onChange={(e) => handleSettingsUpdate({ anonymizeData: e.target.checked })}
                      />
                      Anonymize data
                    </label>
                    <div style={{ marginTop: '8px' }}>
                      <label>Idle threshold (minutes): </label>
                      <input
                        style={styles.input}
                        type="number"
                        min="1"
                        max="60"
                        value={settings?.idleThresholdMinutes || 5}
                        onChange={(e) => handleSettingsUpdate({ idleThresholdMinutes: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {metrics && (
                <>
                  {/* Overview Cards */}
                  <div style={styles.grid}>
                    {/* Productivity Score */}
                    <div style={styles.card}>
                      <h3 style={styles.cardTitle}>🎯 Productivity Score</h3>
                      <div style={styles.productivityScore}>
                        <div 
                          style={{
                            ...styles.scoreCircle, 
                            backgroundColor: getScoreColor(metrics.productivityScore)
                          }}
                        >
                          {metrics.productivityScore}%
                        </div>
                        <div>
                          {metrics.productivityScore >= 80 ? '🎉 Excellent!' : 
                           metrics.productivityScore >= 60 ? '👍 Good job!' : 
                           '💪 Room for improvement'}
                        </div>
                      </div>
                    </div>

                    {/* Time Metrics */}
                    <div style={styles.card}>
                      <h3 style={styles.cardTitle}>⏱️ Time Summary</h3>
                      <div style={styles.metric}>
                        <span>Total Active Time:</span>
                        <span style={styles.metricValue}>{formatDuration(metrics.totalActiveTime)}</span>
                      </div>
                      <div style={styles.metric}>
                        <span>Productive Time:</span>
                        <span style={styles.metricValue}>{formatDuration(metrics.productiveTime)}</span>
                      </div>
                      <div style={styles.metric}>
                        <span>Focus Time:</span>
                        <span style={styles.metricValue}>{formatDuration(metrics.focusTime)}</span>
                      </div>
                      <div style={styles.metric}>
                        <span>Distraction Time:</span>
                        <span style={styles.metricValue}>{formatDuration(metrics.distractionTime)}</span>
                      </div>
                    </div>

                    {/* Top Apps */}
                    <div style={styles.card}>
                      <h3 style={styles.cardTitle}>📱 Top Applications</h3>
                      <div style={styles.topApps}>
                        {metrics.topApps.map((app, index) => (
                          <div key={index} style={styles.appItem}>
                            <div>
                              <div>{app.appName}</div>
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                {formatDuration(app.duration)} ({app.percentage}%)
                              </div>
                              <div 
                                style={{
                                  ...styles.appBar, 
                                  width: `${app.percentage}%`
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Charts */}
                  <div style={styles.grid}>
                    {/* Daily Activity Pattern */}
                    <div style={styles.card}>
                      <h3 style={styles.cardTitle}>📈 Daily Activity Pattern</h3>
                      <div style={styles.chartContainer}>
                        {activityChartData && (
                          <Line data={activityChartData} options={chartOptions} />
                        )}
                      </div>
                    </div>

                    {/* Productive vs Distraction Time */}
                    <div style={styles.card}>
                      <h3 style={styles.cardTitle}>🎯 Time Distribution</h3>
                      <div style={styles.chartContainer}>
                        {categoryChartData && (
                          <Doughnut 
                            data={categoryChartData} 
                            options={{
                              ...chartOptions,
                              plugins: {
                                ...chartOptions.plugins,
                                legend: {
                                  position: 'bottom' as const,
                                },
                              },
                            }} 
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {!metrics && !loading && (
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>No Data Available</h3>
                  <p>No tracking data found. Enable tracking or generate sample data to see analytics.</p>
                  <button style={{...styles.button, ...styles.primaryButton}} onClick={generateMockData}>
                    Generate Sample Data
                  </button>
                </div>
              )}
            </>
          )}
        </div>
    </div>
  );
};

export default ProductivityDashboard; 