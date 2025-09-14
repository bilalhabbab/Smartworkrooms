import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

interface AnalyticsEvent {
  id: string;
  userId: string;
  userName: string;
  organizationId: string;
  roomId?: string;
  eventType: 'message_sent' | 'file_uploaded' | 'document_summarized' | 'search_performed' | 'room_created' | 'user_invited' | 'login' | 'logout';
  eventData: any;
  timestamp: Date;
  sessionId: string;
}

interface UsageMetrics {
  totalMessages: number;
  totalFiles: number;
  activeUsers: number;
  topDocuments: { name: string; accessCount: number }[];
  responseTimeAvg: number;
  collaborationScore: number;
}

interface UserActivity {
  userId: string;
  userName: string;
  lastActive: Date;
  messageCount: number;
  fileUploads: number;
  roomsAccessed: string[];
  avgResponseTime: number;
}

class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  private sessionId: string;

  constructor() {
    this.sessionId = uuidv4();
    this.loadEvents();
  }

  private loadEvents() {
    try {
      const saved = localStorage.getItem('analytics_events');
      if (saved) {
        this.events = JSON.parse(saved).map((event: any) => ({
          ...event,
          timestamp: new Date(event.timestamp)
        }));
      }
    } catch (error) {
      console.error('Error loading analytics events:', error);
      this.events = [];
    }
  }

  private saveEvents() {
    try {
      // Keep only last 1000 events to prevent storage bloat
      const eventsToSave = this.events.slice(-1000);
      localStorage.setItem('analytics_events', JSON.stringify(eventsToSave));
    } catch (error) {
      console.error('Error saving analytics events:', error);
    }
  }

  trackEvent(
    userId: string,
    userName: string,
    organizationId: string,
    eventType: AnalyticsEvent['eventType'],
    eventData: any = {},
    roomId?: string
  ) {
    const event: AnalyticsEvent = {
      id: uuidv4(),
      userId,
      userName,
      organizationId,
      roomId,
      eventType,
      eventData,
      timestamp: new Date(),
      sessionId: this.sessionId
    };

    this.events.push(event);
    this.saveEvents();
  }

  getUsageMetrics(organizationId: string, days: number = 30): UsageMetrics {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const relevantEvents = this.events.filter(
      event => event.organizationId === organizationId && event.timestamp >= cutoffDate
    );

    const totalMessages = relevantEvents.filter(e => e.eventType === 'message_sent').length;
    const totalFiles = relevantEvents.filter(e => e.eventType === 'file_uploaded').length;
    
    const uniqueUsers = new Set(relevantEvents.map(e => e.userId));
    const activeUsers = uniqueUsers.size;

    // Calculate top documents
    const documentAccess: { [key: string]: number } = {};
    relevantEvents
      .filter(e => e.eventType === 'file_uploaded' || e.eventType === 'document_summarized')
      .forEach(e => {
        const docName = e.eventData.fileName || e.eventData.documentName;
        if (docName) {
          documentAccess[docName] = (documentAccess[docName] || 0) + 1;
        }
      });

    const topDocuments = Object.entries(documentAccess)
      .map(([name, count]) => ({ name, accessCount: count }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);

    // Calculate average response time (mock data for now)
    const responseTimeAvg = 2.3; // seconds

    // Calculate collaboration score based on user interactions
    const collaborationScore = Math.min(100, (activeUsers * 10) + (totalMessages * 0.1));

    return {
      totalMessages,
      totalFiles,
      activeUsers,
      topDocuments,
      responseTimeAvg,
      collaborationScore
    };
  }

  getUserActivity(organizationId: string, days: number = 30): UserActivity[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const relevantEvents = this.events.filter(
      event => event.organizationId === organizationId && event.timestamp >= cutoffDate
    );

    const userStats: { [userId: string]: UserActivity } = {};

    relevantEvents.forEach(event => {
      if (!userStats[event.userId]) {
        userStats[event.userId] = {
          userId: event.userId,
          userName: event.userName,
          lastActive: event.timestamp,
          messageCount: 0,
          fileUploads: 0,
          roomsAccessed: [],
          avgResponseTime: 0
        };
      }

      const user = userStats[event.userId];
      
      if (event.timestamp > user.lastActive) {
        user.lastActive = event.timestamp;
      }

      if (event.eventType === 'message_sent') {
        user.messageCount++;
      }

      if (event.eventType === 'file_uploaded') {
        user.fileUploads++;
      }

      if (event.roomId && !user.roomsAccessed.includes(event.roomId)) {
        user.roomsAccessed.push(event.roomId);
      }
    });

    return Object.values(userStats).sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());
  }

  getDocumentInsights(organizationId: string): {
    mostReferenced: string[];
    trendingTopics: string[];
    collaborationPatterns: { roomId: string; userCount: number; activityScore: number }[];
  } {
    const relevantEvents = this.events.filter(event => event.organizationId === organizationId);

    // Most referenced documents
    const docReferences: { [key: string]: number } = {};
    relevantEvents
      .filter(e => e.eventData.fileName || e.eventData.documentName)
      .forEach(e => {
        const docName = e.eventData.fileName || e.eventData.documentName;
        docReferences[docName] = (docReferences[docName] || 0) + 1;
      });

    const mostReferenced = Object.entries(docReferences)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name]) => name);

    // Trending topics (mock implementation)
    const trendingTopics = ['AI Integration', 'Document Analysis', 'Team Collaboration', 'Process Automation'];

    // Collaboration patterns by room
    const roomActivity: { [roomId: string]: { users: Set<string>; events: number } } = {};
    
    relevantEvents
      .filter(e => e.roomId)
      .forEach(e => {
        if (!roomActivity[e.roomId!]) {
          roomActivity[e.roomId!] = { users: new Set(), events: 0 };
        }
        roomActivity[e.roomId!].users.add(e.userId);
        roomActivity[e.roomId!].events++;
      });

    const collaborationPatterns = Object.entries(roomActivity)
      .map(([roomId, data]) => ({
        roomId,
        userCount: data.users.size,
        activityScore: data.events
      }))
      .sort((a, b) => b.activityScore - a.activityScore);

    return {
      mostReferenced,
      trendingTopics,
      collaborationPatterns
    };
  }

  exportAnalytics(organizationId: string, format: 'json' | 'csv' = 'json'): string {
    const relevantEvents = this.events.filter(event => event.organizationId === organizationId);

    if (format === 'csv') {
      const headers = ['Timestamp', 'User', 'Event Type', 'Room ID', 'Data'];
      const rows = relevantEvents.map(event => [
        new Date(event.timestamp).toLocaleString(),
        event.userName,
        event.eventType,
        event.roomId || '',
        JSON.stringify(event.eventData)
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify(relevantEvents, null, 2);
  }

  getPerformanceMetrics(): {
    avgLoadTime: number;
    errorRate: number;
    uptime: number;
    apiResponseTime: number;
  } {
    // Mock performance metrics - in production, these would come from monitoring services
    return {
      avgLoadTime: 1.2, // seconds
      errorRate: 0.02, // 2%
      uptime: 99.9, // percentage
      apiResponseTime: 0.8 // seconds
    };
  }

  clearOldEvents(daysToKeep: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    this.events = this.events.filter(event => event.timestamp >= cutoffDate);
    this.saveEvents();
  }
}

export const analyticsService = new AnalyticsService();
export type { AnalyticsEvent, UsageMetrics, UserActivity };
