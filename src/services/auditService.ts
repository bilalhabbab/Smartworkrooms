import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  organizationId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface ComplianceReport {
  organizationId: string;
  reportDate: Date;
  totalActions: number;
  userActions: { [userId: string]: number };
  riskEvents: AuditLog[];
  complianceScore: number;
  recommendations: string[];
}

class AuditService {
  private logs: AuditLog[] = [];
  private maxLogs = 10000; // Keep last 10k logs

  constructor() {
    this.loadLogs();
  }

  private loadLogs() {
    try {
      const saved = localStorage.getItem('audit_logs');
      if (saved) {
        this.logs = JSON.parse(saved).map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
      this.logs = [];
    }
  }

  private saveLogs() {
    try {
      // Keep only the most recent logs
      const logsToSave = this.logs.slice(-this.maxLogs);
      localStorage.setItem('audit_logs', JSON.stringify(logsToSave));
      this.logs = logsToSave;
    } catch (error) {
      console.error('Error saving audit logs:', error);
    }
  }

  log(
    userId: string,
    userName: string,
    organizationId: string,
    action: string,
    resource: string,
    details: any = {},
    severity: AuditLog['severity'] = 'low',
    resourceId?: string
  ) {
    const auditLog: AuditLog = {
      id: uuidv4(),
      userId,
      userName,
      organizationId,
      action,
      resource,
      resourceId,
      details,
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent,
      timestamp: new Date(),
      severity
    };

    this.logs.push(auditLog);
    this.saveLogs();

    // Log to console for development
    console.log(`[AUDIT] ${userName} ${action} ${resource}`, details);
  }

  private getClientIP(): string {
    // In production, this would be handled by the backend
    return 'client-ip-hidden';
  }

  // Specific audit methods for common actions
  logLogin(userId: string, userName: string, organizationId: string) {
    this.log(userId, userName, organizationId, 'LOGIN', 'authentication', {
      loginMethod: 'google-oauth'
    }, 'low');
  }

  logLogout(userId: string, userName: string, organizationId: string) {
    this.log(userId, userName, organizationId, 'LOGOUT', 'authentication', {}, 'low');
  }

  logFileUpload(userId: string, userName: string, organizationId: string, roomId: string, fileName: string, fileSize: number) {
    this.log(userId, userName, organizationId, 'UPLOAD_FILE', 'document', {
      fileName,
      fileSize,
      roomId
    }, 'medium', fileName);
  }

  logFileDelete(userId: string, userName: string, organizationId: string, roomId: string, fileName: string) {
    this.log(userId, userName, organizationId, 'DELETE_FILE', 'document', {
      fileName,
      roomId
    }, 'high', fileName);
  }

  logRoomCreate(userId: string, userName: string, organizationId: string, roomId: string, roomName: string) {
    this.log(userId, userName, organizationId, 'CREATE_ROOM', 'chatroom', {
      roomName
    }, 'medium', roomId);
  }

  logRoomDelete(userId: string, userName: string, organizationId: string, roomId: string, roomName: string) {
    this.log(userId, userName, organizationId, 'DELETE_ROOM', 'chatroom', {
      roomName
    }, 'high', roomId);
  }

  logUserInvite(userId: string, userName: string, organizationId: string, invitedEmail: string, roomId: string) {
    this.log(userId, userName, organizationId, 'INVITE_USER', 'user_management', {
      invitedEmail,
      roomId
    }, 'medium');
  }

  logPermissionChange(userId: string, userName: string, organizationId: string, targetUserId: string, oldRole: string, newRole: string) {
    this.log(userId, userName, organizationId, 'CHANGE_PERMISSIONS', 'user_management', {
      targetUserId,
      oldRole,
      newRole
    }, 'high');
  }

  logDataExport(userId: string, userName: string, organizationId: string, exportType: string, dataScope: string) {
    this.log(userId, userName, organizationId, 'EXPORT_DATA', 'data_access', {
      exportType,
      dataScope
    }, 'high');
  }

  logSecurityEvent(userId: string, userName: string, organizationId: string, eventType: string, details: any) {
    this.log(userId, userName, organizationId, 'SECURITY_EVENT', 'security', {
      eventType,
      ...details
    }, 'critical');
  }

  // Query methods
  getLogs(organizationId: string, filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    severity?: AuditLog['severity'];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): AuditLog[] {
    let filteredLogs = this.logs.filter(log => log.organizationId === organizationId);

    if (filters) {
      if (filters.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
      }
      if (filters.action) {
        filteredLogs = filteredLogs.filter(log => log.action.includes(filters.action!));
      }
      if (filters.resource) {
        filteredLogs = filteredLogs.filter(log => log.resource === filters.resource);
      }
      if (filters.severity) {
        filteredLogs = filteredLogs.filter(log => log.severity === filters.severity);
      }
      if (filters.startDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endDate!);
      }
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (filters?.limit) {
      filteredLogs = filteredLogs.slice(0, filters.limit);
    }

    return filteredLogs;
  }

  getSecurityEvents(organizationId: string, days: number = 30): AuditLog[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.getLogs(organizationId, {
      severity: 'critical',
      startDate: cutoffDate
    });
  }

  generateComplianceReport(organizationId: string, days: number = 30): ComplianceReport {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const relevantLogs = this.getLogs(organizationId, {
      startDate: cutoffDate
    });

    const userActions: { [userId: string]: number } = {};
    relevantLogs.forEach(log => {
      userActions[log.userId] = (userActions[log.userId] || 0) + 1;
    });

    const riskEvents = relevantLogs.filter(log => 
      log.severity === 'high' || log.severity === 'critical'
    );

    // Calculate compliance score (0-100)
    const totalActions = relevantLogs.length;
    const riskEventCount = riskEvents.length;
    const complianceScore = Math.max(0, 100 - (riskEventCount / Math.max(totalActions, 1)) * 100);

    const recommendations = this.generateRecommendations(relevantLogs, riskEvents);

    return {
      organizationId,
      reportDate: new Date(),
      totalActions,
      userActions,
      riskEvents,
      complianceScore,
      recommendations
    };
  }

  private generateRecommendations(allLogs: AuditLog[], riskEvents: AuditLog[]): string[] {
    const recommendations: string[] = [];

    // Check for excessive file deletions
    const deletions = allLogs.filter(log => log.action === 'DELETE_FILE');
    if (deletions.length > 10) {
      recommendations.push('Consider implementing file deletion approval workflow');
    }

    // Check for permission changes
    const permissionChanges = allLogs.filter(log => log.action === 'CHANGE_PERMISSIONS');
    if (permissionChanges.length > 5) {
      recommendations.push('Review permission change policies and approval processes');
    }

    // Check for data exports
    const dataExports = allLogs.filter(log => log.action === 'EXPORT_DATA');
    if (dataExports.length > 0) {
      recommendations.push('Monitor data export activities and ensure proper authorization');
    }

    // Check for security events
    if (riskEvents.length > 0) {
      recommendations.push('Investigate and address all critical security events');
    }

    // Default recommendations
    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring user activities and maintain security best practices');
    }

    return recommendations;
  }

  exportAuditLogs(organizationId: string, format: 'json' | 'csv' = 'json', filters?: any): string {
    const logs = this.getLogs(organizationId, filters);

    if (format === 'csv') {
      const headers = [
        'Timestamp',
        'User',
        'Action',
        'Resource',
        'Resource ID',
        'Severity',
        'IP Address',
        'Details'
      ];

      const rows = logs.map(log => [
        new Date(log.timestamp).toLocaleString(),
        log.userName,
        log.action,
        log.resource,
        log.resourceId || '',
        log.severity,
        log.ipAddress || '',
        JSON.stringify(log.details)
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify(logs, null, 2);
  }

  clearOldLogs(daysToKeep: number = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    this.logs = this.logs.filter(log => log.timestamp >= cutoffDate);
    this.saveLogs();
  }
}

export const auditService = new AuditService();
export type { AuditLog, ComplianceReport };
