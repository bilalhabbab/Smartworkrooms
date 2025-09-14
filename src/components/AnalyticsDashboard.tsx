import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  Button,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  People,
  Description,
  Speed,
  Download,
  Refresh,
  Security,
  Analytics
} from '@mui/icons-material';
import { analyticsService, UsageMetrics, UserActivity } from '../services/analyticsService';
import { auditService, ComplianceReport } from '../services/auditService';
import { useAuth } from '../contexts/AuthContext';
import { useChatRoom } from '../contexts/ChatRoomContext';
import { format } from 'date-fns';

const AnalyticsDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { currentUser } = useAuth();
  const { currentOrganization } = useChatRoom();
  const [timeRange, setTimeRange] = useState(30);
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentOrganization) {
      loadAnalytics();
    }
  }, [currentOrganization, timeRange]);

  const loadAnalytics = async () => {
    if (!currentOrganization) return;

    setLoading(true);
    try {
      const usageMetrics = analyticsService.getUsageMetrics(currentOrganization.id, timeRange);
      const userActivityData = analyticsService.getUserActivity(currentOrganization.id, timeRange);
      const compliance = auditService.generateComplianceReport(currentOrganization.id, timeRange);

      setMetrics(usageMetrics);
      setUserActivity(userActivityData);
      setComplianceReport(compliance);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportAnalytics = () => {
    if (!currentOrganization) return;

    const data = analyticsService.exportAnalytics(currentOrganization.id, 'csv');
    const blob = new Blob([data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${currentOrganization.name}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAuditLogs = () => {
    if (!currentOrganization) return;

    const data = auditService.exportAuditLogs(currentOrganization.id, 'csv');
    const blob = new Blob([data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${currentOrganization.name}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!currentOrganization) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6">No organization selected</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Analytics Dashboard
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {currentOrganization.name} - Insights & Performance
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(Number(e.target.value))}
            >
              <MenuItem value={7}>Last 7 days</MenuItem>
              <MenuItem value={30}>Last 30 days</MenuItem>
              <MenuItem value={90}>Last 90 days</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh Data">
            <IconButton onClick={loadAnalytics}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button variant="outlined" startIcon={<Download />} onClick={handleExportAnalytics}>
            Export Analytics
          </Button>
          <Button variant="outlined" startIcon={<Security />} onClick={handleExportAuditLogs}>
            Export Audit Logs
          </Button>
          <Button variant="contained" onClick={onBack}>
            Back
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Key Metrics Cards */}
      {metrics && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
          <Box>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Total Messages
                    </Typography>
                    <Typography variant="h4">
                      {metrics.totalMessages.toLocaleString()}
                    </Typography>
                  </Box>
                  <TrendingUp color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Active Users
                    </Typography>
                    <Typography variant="h4">
                      {metrics.activeUsers}
                    </Typography>
                  </Box>
                  <People color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Documents
                    </Typography>
                    <Typography variant="h4">
                      {metrics.totalFiles}
                    </Typography>
                  </Box>
                  <Description color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Avg Response Time
                    </Typography>
                    <Typography variant="h4">
                      {metrics.responseTimeAvg}s
                    </Typography>
                  </Box>
                  <Speed color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
        {/* Collaboration Score */}
        {metrics && (
          <Box>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Collaboration Score
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={metrics.collaborationScore}
                  sx={{ flex: 1, height: 10, borderRadius: 5 }}
                />
                <Typography variant="h6">
                  {Math.round(metrics.collaborationScore)}%
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Based on user engagement, message frequency, and document sharing
              </Typography>
            </Paper>
          </Box>
        )}

        {/* Compliance Score */}
        {complianceReport && (
          <Box>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Compliance Score
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={complianceReport.complianceScore}
                  sx={{ flex: 1, height: 10, borderRadius: 5 }}
                  color={complianceReport.complianceScore > 80 ? 'success' : 'warning'}
                />
                <Typography variant="h6">
                  {Math.round(complianceReport.complianceScore)}%
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {complianceReport.riskEvents.length} risk events detected
              </Typography>
            </Paper>
          </Box>
        )}

        {/* Top Documents */}
        {metrics && metrics.topDocuments.length > 0 && (
          <Box>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Most Referenced Documents
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {metrics.topDocuments.slice(0, 5).map((doc, index) => (
                  <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {doc.name}
                    </Typography>
                    <Chip size="small" label={`${doc.accessCount} refs`} />
                  </Box>
                ))}
              </Box>
            </Paper>
          </Box>
        )}

        {/* User Activity Table */}
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              User Activity
            </Typography>
            <TableContainer sx={{ maxHeight: 300 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell align="right">Messages</TableCell>
                    <TableCell align="right">Files</TableCell>
                    <TableCell align="right">Last Active</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {userActivity.slice(0, 10).map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell>{user.userName}</TableCell>
                      <TableCell align="right">{user.messageCount}</TableCell>
                      <TableCell align="right">{user.fileUploads}</TableCell>
                      <TableCell align="right">
                        {format(user.lastActive, 'MMM dd')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>

        {/* Compliance Recommendations */}
        {complianceReport && complianceReport.recommendations.length > 0 && (
          <Box sx={{ gridColumn: '1 / -1' }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Security & Compliance Recommendations
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {complianceReport.recommendations.map((recommendation, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Security color="warning" fontSize="small" />
                    <Typography variant="body2">{recommendation}</Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default AnalyticsDashboard;
