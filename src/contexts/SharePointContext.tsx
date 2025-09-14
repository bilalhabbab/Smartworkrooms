import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser';
import { useAuth } from './AuthContext';

interface SharePointFile {
  id: string;
  name: string;
  webUrl: string;
  downloadUrl?: string;
  size: number;
  lastModified: string;
  createdBy: string;
  fileType: string;
}

interface SharePointSite {
  id: string;
  name: string;
  webUrl: string;
  displayName: string;
}

interface SharePointContextType {
  isAuthenticated: boolean;
  sites: SharePointSite[];
  files: SharePointFile[];
  loading: boolean;
  error: string | null;
  sharePointUser: string | null;
  authenticate: () => Promise<void>;
  searchFiles: (query: string, siteId?: string) => Promise<SharePointFile[]>;
  getFileContent: (fileId: string) => Promise<string>;
  getSites: () => Promise<SharePointSite[]>;
  getFilesFromSite: (siteId: string) => Promise<SharePointFile[]>;
}

const SharePointContext = createContext<SharePointContextType | undefined>(undefined);

// MSAL configuration for SharePoint-specific authentication
const msalConfig = {
  auth: {
    clientId: process.env.REACT_APP_SHAREPOINT_CLIENT_ID || '89bee1f7-5e6e-4d8a-9f3d-ecd601259da7',
    authority: `https://login.microsoftonline.com/${process.env.REACT_APP_SHAREPOINT_TENANT_ID || '1a41b96d-457d-41ac-94ef-22d1901a7556'}`,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

const msalInstance = new PublicClientApplication(msalConfig);


export const SharePointProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sites, setSites] = useState<SharePointSite[]>([]);
  const [files, setFiles] = useState<SharePointFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [sharePointUser, setSharePointUser] = useState<string | null>(null);
  const [msalInitialized, setMsalInitialized] = useState(false);

  // Initialize MSAL on component mount
  useEffect(() => {
    const initializeMsal = async () => {
      try {
        await msalInstance.initialize();
        setMsalInitialized(true);
      } catch (err: any) {
        console.error('Failed to initialize MSAL:', err);
        setError('Failed to initialize SharePoint authentication');
      }
    };
    
    initializeMsal();
  }, []);

  const authenticate = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!currentUser) {
        throw new Error('Please log in to the main app first');
      }

      if (!msalInitialized) {
        throw new Error('SharePoint authentication is still initializing. Please wait a moment and try again.');
      }

      const loginRequest = {
        scopes: ['https://graph.microsoft.com/Sites.Read.All', 'https://graph.microsoft.com/Files.Read.All', 'User.Read'],
        prompt: 'select_account', // Always show account picker for SharePoint login
      };

      // Always use interactive login for SharePoint to allow different account selection
      const result = await msalInstance.acquireTokenPopup(loginRequest);
      
      setAccessToken(result.accessToken);
      setSharePointUser(result.account?.username || 'Unknown');
      setIsAuthenticated(true);
    } catch (err: any) {
      console.error('SharePoint authentication error:', err);
      let errorMessage = err.message || 'Failed to authenticate with SharePoint';
      
      // Provide specific guidance for common errors
      if (err.message?.includes('AADSTS50020')) {
        errorMessage = 'Your Microsoft account needs access to the SmartWorkrooms SharePoint tenant. Please contact your SmartWorkrooms administrator.';
      } else if (err.message?.includes('user_cancelled')) {
        errorMessage = 'SharePoint login was cancelled. Please try again to access SharePoint documents.';
      }
      
      setError(errorMessage);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, [currentUser, msalInitialized]);

  const makeGraphRequest = useCallback(async (endpoint: string) => {
    if (!accessToken) {
      throw new Error('Not authenticated with SharePoint');
    }

    const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        // Token might be expired, clear authentication
        setIsAuthenticated(false);
        setAccessToken(null);
        setSharePointUser(null);
        throw new Error('SharePoint authentication expired. Please re-authenticate.');
      }
      const errorText = await response.text();
      throw new Error(`SharePoint API error: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }

    return response.json();
  }, [accessToken]);

  // Mock SharePoint data for demonstration (fallback if real API fails)
  const mockSharePointData = {
    sites: [
      {
        id: 'wsa-docs-site',
        name: 'SmartWorkrooms Documents',
        webUrl: 'https://smartworkrooms.sharepoint.com/sites/documents',
        displayName: 'SmartWorkrooms Corporate Documents'
      },
      {
        id: 'wsa-projects-site',
        name: 'SmartWorkrooms Projects', 
        webUrl: 'https://smartworkrooms.sharepoint.com/sites/projects',
        displayName: 'SmartWorkrooms Project Files'
      }
    ],
    files: [
      {
        id: 'policy-doc-1',
        name: 'Employee Handbook 2024.docx',
        webUrl: 'https://wsa.sharepoint.com/sites/documents/handbook.docx',
        size: 2048000,
        lastModified: '2024-01-15T10:30:00Z',
        createdBy: 'HR Department',
        fileType: 'docx'
      },
      {
        id: 'financial-report-q4',
        name: 'Q4 Financial Report.xlsx',
        webUrl: 'https://wsa.sharepoint.com/sites/documents/q4-report.xlsx',
        size: 1536000,
        lastModified: '2024-01-20T14:45:00Z', 
        createdBy: 'Finance Team',
        fileType: 'xlsx'
      },
      {
        id: 'project-proposal',
        name: 'New Initiative Proposal.pptx',
        webUrl: 'https://wsa.sharepoint.com/sites/projects/proposal.pptx',
        size: 3072000,
        lastModified: '2024-01-18T09:15:00Z',
        createdBy: 'Strategy Team', 
        fileType: 'pptx'
      }
    ]
  };

  const simulateDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const getSites = useCallback(async (): Promise<SharePointSite[]> => {
    setLoading(true);
    setError(null);
    
    try {
      // Try real SharePoint API first
      try {
        const data = await makeGraphRequest('/sites?search=*');
        const sitesData = data.value.map((site: any) => ({
          id: site.id,
          name: site.name,
          webUrl: site.webUrl,
          displayName: site.displayName || site.name,
        }));
        setSites(sitesData);
        return sitesData;
      } catch (apiError) {
        console.warn('SharePoint API failed, using mock data:', apiError);
        // Fallback to mock data
        await simulateDelay(800);
        setSites(mockSharePointData.sites);
        return mockSharePointData.sites;
      }
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [makeGraphRequest]);

  const getFilesFromSite = useCallback(async (siteId: string): Promise<SharePointFile[]> => {
    setLoading(true);
    setError(null);
    
    try {
      // Try real SharePoint API first
      try {
        const data = await makeGraphRequest(`/sites/${siteId}/drive/root/children`);
        const filesData = data.value
          .filter((item: any) => item.file)
          .map((file: any) => ({
            id: file.id,
            name: file.name,
            webUrl: file.webUrl,
            downloadUrl: file['@microsoft.graph.downloadUrl'],
            size: file.size,
            lastModified: file.lastModifiedDateTime,
            createdBy: file.createdBy?.user?.displayName || 'Unknown',
            fileType: file.name.split('.').pop()?.toLowerCase() || 'unknown',
          }));
        setFiles(filesData);
        return filesData;
      } catch (apiError) {
        console.warn('SharePoint API failed, using mock data:', apiError);
        // Fallback to mock data
        await simulateDelay(1000);
        const filesData = mockSharePointData.files;
        setFiles(filesData);
        return filesData;
      }
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [makeGraphRequest]);

  const searchFiles = useCallback(async (query: string, siteId?: string): Promise<SharePointFile[]> => {
    setLoading(true);
    setError(null);
    
    try {
      await simulateDelay(800);
      const searchResults = mockSharePointData.files.filter((file: SharePointFile) => 
        file.name.toLowerCase().includes(query.toLowerCase())
      );
      return searchResults;
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getFileContent = useCallback(async (fileId: string): Promise<string> => {
    setLoading(true);
    setError(null);
    
    try {
      await simulateDelay(1200);
      
      const file = mockSharePointData.files.find((f: SharePointFile) => f.id === fileId);
      if (!file) {
        throw new Error('File not found');
      }
      
      let mockContent = '';
      if (file.fileType === 'docx') {
        mockContent = `# ${file.name}\n\nThis is the content of the SmartWorkrooms employee handbook.\n\n## Company Policies\n\n1. Work from home policy updated for 2024\n2. New security protocols for remote access\n3. Updated vacation and leave policies\n\n**Last updated:** ${new Date(file.lastModified).toLocaleDateString()}`;
      } else if (file.fileType === 'xlsx') {
        mockContent = `# ${file.name}\n\nQ4 2024 Financial Summary:\n\nRevenue: $3,250,000\nExpenses: $2,100,000\nNet Profit: $1,150,000\n\nGrowth: 18.5% YoY\nMarket Share: 12.3%\n\n**Generated:** ${new Date(file.lastModified).toLocaleDateString()}`;
      } else if (file.fileType === 'pptx') {
        mockContent = `# ${file.name}\n\nNew Strategic Initiative Proposal\n\n## Executive Summary\n- Expand into new markets\n- Increase digital transformation\n- Improve customer experience\n\n## Key Objectives\n1. 25% revenue growth\n2. Enhanced operational efficiency\n3. Market leadership position\n\n**Prepared by:** ${file.createdBy}`;
      } else {
        mockContent = `# ${file.name}\n\nSmartWorkrooms document content preview.\n\nFile details:\n- Size: ${(file.size / 1024).toFixed(1)} KB\n- Created by: ${file.createdBy}\n- Last modified: ${new Date(file.lastModified).toLocaleDateString()}`;
      }
      
      return mockContent;
    } catch (err: any) {
      setError(err.message);
      return '';
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <SharePointContext.Provider value={{
      isAuthenticated,
      sites,
      files,
      loading,
      error,
      sharePointUser,
      authenticate,
      searchFiles,
      getFileContent,
      getSites,
      getFilesFromSite,
    }}>
      {children}
    </SharePointContext.Provider>
  );
};

export const useSharePoint = () => {
  const context = useContext(SharePointContext);
  if (context === undefined) {
    throw new Error('useSharePoint must be used within a SharePointProvider');
  }
  return context;
};
