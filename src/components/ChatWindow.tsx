import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Paper,
  Avatar,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Popover,
  Button,
  ButtonGroup,
  Tooltip,
  Divider,
  Chip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { Send, AttachFile, Description, Close, PictureAsPdf, SmartToy, Person, ClearAll, CloudSync, CloudUpload, Code, InsertDriveFile, Html, Javascript, DataObject, Search, FilterList, CheckBox, CheckBoxOutlineBlank } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useChatRoom } from '../contexts/ChatRoomContext';
import { useSharePoint } from '../contexts/SharePointContext';
import { UploadedPDF } from '../firebase/config';
import SharePointBrowser from './SharePointBrowser';
import { aiService } from '../services/aiService';
import { analyticsService } from '../services/analyticsService';
import { auditService } from '../services/auditService';
import { websocketService } from '../services/websocketService';
import SmartSearch from './SmartSearch';
import RealTimeIndicators from './RealTimeIndicators';
import * as pdfjsLib from 'pdfjs-dist';

interface UploadedFile extends Omit<UploadedPDF, 'name'> {
  name: string;
  type: string;
  extension: string;
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  attachments?: File[];
}


// Configure PDF.js worker - use local worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

const ChatWindow: React.FC = () => {
  const { currentUser: user } = useAuth();
  const { currentRoom, addMessageToRoom, addRoomFile, removeRoomFile, getRoomFiles, getRoomMessages, addRoomMessage, clearRoomMessages } = useChatRoom();
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSharePointBrowser, setShowSharePointBrowser] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadAbortController, setUploadAbortController] = useState<AbortController | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showDropZone, setShowDropZone] = useState(false);
  const [filesPopoverAnchor, setFilesPopoverAnchor] = useState<HTMLElement | null>(null);
  const [fileSearchTerm, setFileSearchTerm] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [fileFilter, setFileFilter] = useState<'all' | 'selected' | 'code' | 'docs'>('all');
  const [showSmartSearch, setShowSmartSearch] = useState(false);
  const [documentSummaries, setDocumentSummaries] = useState<Map<string, string>>(new Map());
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get room-specific data (now user-specific)
  const [messages, setMessages] = useState<any[]>([]);
  const uploadedFiles = currentRoom ? getRoomFiles(currentRoom.id) : [];

  // Load messages when room changes
  useEffect(() => {
    const loadMessages = async () => {
      if (currentRoom) {
        try {
          const roomMessages = await getRoomMessages(currentRoom.id);
          setMessages(roomMessages);
        } catch (error) {
          console.error('Error loading messages:', error);
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
    };
    loadMessages();
  }, [currentRoom, getRoomMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Generate contextual AI suggestions
  const generateAISuggestions = async () => {
    if (!currentRoom || messages.length === 0 || isGeneratingSuggestions) return;
    
    setIsGeneratingSuggestions(true);
    try {
      const recentMessages = messages.slice(-5); // Get last 5 messages
      const documentContext = uploadedFiles.map(file => ({
        name: file.name,
        summary: documentSummaries.get(file.id) || 'No summary available'
      }));
      
      const suggestions = await aiService.generateContextualSuggestions(
        recentMessages,
        documentContext
      );
      
      setAiSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
    // Generate AI suggestions when messages change
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        generateAISuggestions();
      }, 1000); // Debounce suggestions generation
      return () => clearTimeout(timer);
    }
  }, [messages]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (user && currentRoom) {
      websocketService.connect(user.email, user.displayName || user.email);
      websocketService.joinRoom(currentRoom.id, user.email, user.displayName || user.email);

      return () => {
        websocketService.leaveRoom(currentRoom.id, user.email, user.displayName || user.email);
      };
    }
  }, [user, currentRoom]);

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    return fullText.trim();
  };

  const readFileAsText = async (file: File): Promise<string> => {
    const fileReader = new FileReader();
    const textPromise = new Promise<string>((resolve, reject) => {
      fileReader.onload = () => {
        resolve(fileReader.result as string);
      };
      fileReader.onerror = reject;
      fileReader.readAsText(file);
    });
    return textPromise;
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !currentRoom) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    // Add user message to room messages
    addRoomMessage(currentRoom.id, userMessage);
    
    // Track message analytics
    if (user) {
      analyticsService.trackEvent(
        user.email,
        user.displayName || user.email,
        currentRoom.organizationId || 'default',
        'message_sent',
        { messageLength: inputMessage.length },
        currentRoom.id
      );
    }

    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      // Check if API key is configured
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
      console.log('OpenAI API Key:', apiKey ? '***' + apiKey.slice(-4) : 'Not found');
      console.log('API Key length:', apiKey?.length);
      console.log('API Key starts with sk-:', apiKey?.startsWith('sk-'));
      
      if (!apiKey || apiKey.includes('placeholder') || apiKey.includes('your_openai_api_key')) {
        throw new Error('OpenAI API key not properly configured. Please update the .env file with a valid API key.');
      }

      // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
      const estimateTokens = (text: string) => Math.ceil(text.length / 4);
      
      // Smart file selection for large datasets
      const getRelevantFiles = () => {
        let filesToProcess = uploadedFiles;
        
        // If files are selected, use only selected ones
        if (selectedFiles.size > 0) {
          filesToProcess = uploadedFiles.filter(file => selectedFiles.has(file.name));
        }
        
        // If still too many files, use intelligent selection
        if (filesToProcess.length > 20) {
          // Prioritize by relevance to user message
          const messageWords = userMessage.content.toLowerCase().split(/\s+/);
          const scoredFiles = filesToProcess.map(file => {
            let score = 0;
            const fileName = file.name.toLowerCase();
            const fileContent = file.content.toLowerCase();
            
            // Score based on filename matches
            messageWords.forEach(word => {
              if (fileName.includes(word)) score += 10;
              if (fileContent.includes(word)) score += 1;
            });
            
            // Boost score for certain file types
            const ext = file.name.split('.').pop()?.toLowerCase();
            if (['py', 'js', 'ts', 'cs'].includes(ext || '')) score += 5;
            
            return { file, score };
          });
          
          // Take top 20 most relevant files
          filesToProcess = scoredFiles
            .sort((a, b) => b.score - a.score)
            .slice(0, 20)
            .map(item => item.file);
        }
        
        return filesToProcess;
      };
      
      // Build context from uploaded files with token management
      let fileContext = '';
      const maxContextTokens = 12000;
      let currentTokens = 0;
      
      const relevantFiles = getRelevantFiles();
      
      if (relevantFiles.length > 0) {
        const baseSystemMessage = `You are a helpful AI assistant for SmartWorkrooms company in the "${currentRoom?.name}" chat room. The user has uploaded ${uploadedFiles.length} files (showing ${relevantFiles.length} most relevant). Use the information from these files to answer questions when relevant. Always cite which file you're referencing.`;
        
        currentTokens += estimateTokens(baseSystemMessage);
        currentTokens += estimateTokens(userMessage.content);
        
        const availableTokens = maxContextTokens - currentTokens;
        const tokensPerFile = Math.floor(availableTokens / relevantFiles.length);
        
        const processedFiles = relevantFiles.map(file => {
          const maxCharsForFile = Math.max(tokensPerFile * 4, 500); // Minimum 500 chars per file
          let content = file.content;
          
          if (content.length > maxCharsForFile) {
            // Smart truncation: try to keep function definitions, class declarations, etc.
            const lines = content.split('\n');
            const importantLines = lines.filter(line => 
              /^(class|function|def|public|private|interface|type|const|let|var)\s/.test(line.trim()) ||
              line.trim().startsWith('//') ||
              line.trim().startsWith('#')
            );
            
            if (importantLines.length > 0 && importantLines.join('\n').length < maxCharsForFile) {
              content = importantLines.join('\n') + '\n\n[Showing key definitions only]';
            } else {
              content = content.substring(0, maxCharsForFile) + '\n\n[Content truncated...]';
            }
          }
          
          return `--- ${file.name} ---\n${content}`;
        });
        
        fileContext = `\n\nContext from files (${relevantFiles.length}/${uploadedFiles.length} shown):\n${processedFiles.join('\n\n')}`;
      }

    const systemMessage = uploadedFiles.length > 0 
      ? `You are an AI assistant for SmartWorkrooms (a professional services company). You help users with document analysis, answering questions, and providing insights based on uploaded documents. for reference including code files, documents, and other text-based content. Use the information from these files to answer questions when relevant. Always cite which file you're referencing when using information from the files. For code files, you can help explain, debug, review, or suggest improvements.${fileContext}`
      : `You are a helpful AI assistant for SmartWorkrooms company in the "${currentRoom?.name}" chat room. Provide professional, concise, and helpful responses about business operations, projects, and general inquiries.`;

    console.log('Making OpenAI API request with:', {
      model: 'gpt-3.5-turbo',
      messageLength: userMessage.content.length,
      hasFiles: uploadedFiles.length > 0,
      estimatedTokens: estimateTokens(systemMessage + userMessage.content),
      apiKeyPrefix: apiKey.substring(0, 20) + '...'
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: systemMessage
          },
          {
            role: 'user',
            content: userMessage.content
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      })
    });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('OpenAI API Response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          errorData
        });
        const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(`OpenAI API error: ${errorMessage}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        sender: 'ai',
        timestamp: new Date()
      };

      if (currentRoom) {
        addRoomMessage(currentRoom.id, aiMessage);
      }
    } catch (error: any) {
      console.error('OpenAI API error details:', {
        error,
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      let errorMessage = 'Failed to get AI response. Please try again.';
      
      if (error.message?.includes('API key not configured')) {
        errorMessage = 'OpenAI API key not configured. Please contact your administrator to set up the API key.';
      } else if (error.message?.includes('401')) {
        errorMessage = 'Invalid API key. Please check your OpenAI API key configuration.';
      } else if (error.message?.includes('429')) {
        errorMessage = 'API rate limit exceeded. Please wait a moment and try again.';
      } else if (error.message?.includes('quota')) {
        errorMessage = 'API quota exceeded. Please contact your administrator.';
      } else if (error.message?.includes('insufficient_quota')) {
        errorMessage = 'OpenAI account has insufficient quota. Please check your billing settings.';
      } else if (error.message?.includes('billing')) {
        errorMessage = 'OpenAI billing issue. Please check your account billing status.';
      } else {
        errorMessage = `OpenAI API Error: ${error.message || 'Unknown error occurred'}`;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const handleFileAttach = () => {
    fileInputRef.current?.click();
  };

  const processTextFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const cancelUpload = () => {
    if (uploadAbortController) {
      uploadAbortController.abort();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFiles = async (files: FileList | File[]) => {
    if (!currentRoom) return;

    const fileArray = Array.from(files);
    const supportedFiles = fileArray.filter(file => {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      return file.type === 'application/pdf' || 
             file.type.startsWith('text/') || 
             ['js', 'jsx', 'ts', 'tsx', 'py', 'cs', 'java', 'cpp', 'c', 'h', 'php', 'rb', 'go', 'rs', 'html', 'htm', 'css', 'scss', 'sass', 'json', 'xml', 'yaml', 'yml', 'md', 'txt', 'sql', 'sh', 'bat', 'ps1', 'vb', 'asp', 'aspx', 'razor'].includes(extension);
    });
    
    if (supportedFiles.length === 0) {
      setError('No supported files found. Supported formats: PDF, code files (.py, .cs, .js, .ts, .html, .css, etc.), and text files.');
      return;
    }

    // Create abort controller for cancellation
    const abortController = new AbortController();
    setUploadAbortController(abortController);
    
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const totalFiles = supportedFiles.length;
      let processedFiles = 0;

      for (const file of supportedFiles) {
        // Check if upload was cancelled
        if (abortController.signal.aborted) {
          throw new Error('Upload cancelled by user');
        }
        
        let content = '';
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        
        if (file.type === 'application/pdf') {
          // Handle PDF files
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          
          for (let i = 1; i <= pdf.numPages; i++) {
            // Check for cancellation during PDF processing
            if (abortController.signal.aborted) {
              throw new Error('Upload cancelled by user');
            }
            
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');
            content += pageText + ' ';
          }
        } else {
          // Handle text-based files
          content = await processTextFile(file);
        }

        // Check for cancellation before adding file
        if (abortController.signal.aborted) {
          throw new Error('Upload cancelled by user');
        }

        const uploadedFile: UploadedPDF = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          content: content.trim(),
          uploadedBy: user?.email || 'unknown',
          uploadedAt: new Date(),
          size: file.size
        };

        addRoomFile(currentRoom.id, uploadedFile);
        
        // Auto-generate document summary
        try {
          const summary = await aiService.generateDocumentSummary(uploadedFile);
          setDocumentSummaries(prev => new Map(prev.set(uploadedFile.id, summary.summary)));
          
          // Add a system message about the document summary
          const summaryMessage = {
            id: Date.now().toString() + '_summary',
            content: `📄 **Document Summary for "${uploadedFile.name}":**\n\n${summary.summary}`,
            sender: 'system',
            timestamp: new Date().toISOString(),
            type: 'document_summary'
          };
          
          addRoomMessage(currentRoom.id, summaryMessage);
        } catch (error) {
          console.error('Error generating document summary:', error);
        }

        // Track file upload analytics
        if (user && currentRoom) {
          analyticsService.trackEvent(
            user.email,
            user.displayName || user.email,
            currentRoom.organizationId || 'default',
            'file_uploaded',
            { fileName: file.name, fileSize: file.size },
            currentRoom.id
          );

          auditService.logFileUpload(
            user.email,
            user.displayName || user.email,
            currentRoom.organizationId || 'default',
            currentRoom.id,
            file.name,
            file.size
          );

          // Notify other users via WebSocket
          websocketService.notifyFileUpload(
            currentRoom.id,
            user.email,
            user.displayName || user.email,
            file.name
          );
        }
        
        processedFiles++;
        setUploadProgress(Math.round((processedFiles / totalFiles) * 100));
      }
    } catch (error: any) {
      console.error('Error processing files:', error);
      if (error.message === 'Upload cancelled by user') {
        setError('Upload cancelled');
      } else {
        setError('Failed to process some files');
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      setUploadAbortController(null);
      setShowDropZone(false);
    }
  };

  const handleBulkFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    await processFiles(files);
    
    // Clear the input
    if (bulkFileInputRef.current) {
      bulkFileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const items = e.dataTransfer.items;
    const files: File[] = [];

    // Process dropped items (including folders)
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          await traverseFileTree(entry, files);
        }
      }
    }

    if (files.length > 0) {
      await processFiles(files);
    }
  };

  const traverseFileTree = async (item: any, files: File[]): Promise<void> => {
    return new Promise((resolve) => {
      if (item.isFile) {
        item.file((file: File) => {
          const extension = file.name.split('.').pop()?.toLowerCase() || '';
          if (file.type === 'application/pdf' || 
              file.type.startsWith('text/') || 
              ['js', 'jsx', 'ts', 'tsx', 'py', 'cs', 'java', 'cpp', 'c', 'h', 'php', 'rb', 'go', 'rs', 'html', 'htm', 'css', 'scss', 'sass', 'json', 'xml', 'yaml', 'yml', 'md', 'txt', 'sql', 'sh', 'bat', 'ps1', 'vb', 'asp', 'aspx', 'razor'].includes(extension)) {
            files.push(file);
          }
          resolve();
        });
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        dirReader.readEntries(async (entries: any[]) => {
          for (const entry of entries) {
            await traverseFileTree(entry, files);
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  };

  const handleBulkUploadClick = () => {
    setShowDropZone(true);
  };

  const getTotalDocumentSize = () => {
    const totalSize = uploadedFiles.reduce((sum, file) => sum + (file.size || 0), 0);
    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(1);
    return { count: uploadedFiles.length, size: sizeInMB };
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <PictureAsPdf fontSize="small" color="error" />;
      case 'js':
      case 'jsx':
        return <Javascript fontSize="small" color="warning" />;
      case 'ts':
      case 'tsx':
        return <Code fontSize="small" color="info" />;
      case 'html':
      case 'htm':
        return <Html fontSize="small" color="primary" />;
      case 'css':
      case 'scss':
      case 'sass':
        return <DataObject fontSize="small" color="secondary" />;
      case 'py':
      case 'cs':
      case 'java':
      case 'cpp':
      case 'c':
      case 'php':
      case 'rb':
      case 'go':
      case 'rs':
        return <Code fontSize="small" color="success" />;
      case 'json':
      case 'xml':
      case 'yaml':
      case 'yml':
        return <DataObject fontSize="small" color="info" />;
      default:
        return <Description fontSize="small" color="action" />;
    }
  };

  const removeUploadedFile = (fileName: string) => {
    if (currentRoom) {
      removeRoomFile(currentRoom.id, fileName);
    }
  };

  const clearAllMessages = () => {
    setShowClearDialog(true);
  };

  const handleConfirmClear = () => {
    if (currentRoom) {
      clearRoomMessages(currentRoom.id);
      setError(null);
    }
    setShowClearDialog(false);
  };

  const handleCancelClear = () => {
    setShowClearDialog(false);
  };

  const handleSharePointFileContent = (content: string, fileName: string) => {
    if (currentRoom) {
      // Add SharePoint file content as context for AI
      const sharePointPDF: UploadedPDF = {
        id: `${Date.now()}-${fileName}`,
        name: fileName,
        content: content,
        uploadedBy: user?.email || 'unknown',
        uploadedAt: new Date()
      };
      addRoomFile(currentRoom.id, sharePointPDF);
    }
    setShowSharePointBrowser(false);
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      bgcolor: 'background.default'
    }}>
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              AI Assistant
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ask me anything about your work or projects. Upload PDFs to chat about their content.
            </Typography>
            {uploadedFiles.length > 0 && (
              <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 1 }}>
                📁 {getTotalDocumentSize().count} files ({getTotalDocumentSize().size} MB)
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {messages.length > 0 && (
              <IconButton
                onClick={clearAllMessages}
                size="small"
                color="error"
                title="Clear Chat"
              >
                <ClearAll />
              </IconButton>
            )}
          </Box>
        </Box>
        
        {/* Compact Files Display */}
        {uploadedFiles.length > 0 && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              onClick={(e) => setFilesPopoverAnchor(e.currentTarget)}
              size="small"
              sx={{ 
                border: 1, 
                borderColor: 'primary.main',
                bgcolor: 'primary.light',
                '&:hover': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText'
                }
              }}
            >
              <Badge badgeContent={uploadedFiles.length} color="secondary">
                <InsertDriveFile />
              </Badge>
            </IconButton>
            <Typography variant="body2" color="text.secondary">
              {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} uploaded
              {selectedFiles.size > 0 && ` (${selectedFiles.size} selected)`}
            </Typography>
            {uploadedFiles.length > 10 && (
              <Typography variant="caption" color="warning.main" sx={{ ml: 1 }}>
                Large dataset - AI will auto-select most relevant files
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Messages Area */}
      <Box sx={{ 
        flex: 1, 
        overflow: 'auto', 
        p: 2,
        bgcolor: 'background.default'
      }}>
        {messages.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
              bgcolor: 'background.default'
            }}
          >
            <SmartToy sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Welcome to AI Chat Tool
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Start a conversation with the AI assistant or upload a PDF to analyze
            </Typography>
          </Box>
        ) : (
          <>
            {messages.map((message: any) => (
              <Box key={message.id} sx={{ mb: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                    gap: 1
                  }}
                >
                  <Avatar sx={{ 
                    bgcolor: message.sender === 'user' ? 'primary.main' : 
                             message.sender === 'system' ? 'info.main' : 'secondary.main',
                    width: 32, 
                    height: 32 
                  }}>
                    {message.sender === 'user' ? <Person fontSize="small" /> : 
                     message.sender === 'system' ? <Description fontSize="small" /> : <SmartToy fontSize="small" />}
                  </Avatar>
                  <Paper
                    elevation={1}
                    sx={{
                      p: 2,
                      maxWidth: message.sender === 'system' ? '85%' : '70%',
                      bgcolor: message.sender === 'user' ? 'primary.main' : 
                               message.sender === 'system' ? 'info.light' : 'background.paper',
                      color: message.sender === 'user' ? 'primary.contrastText' : 
                             message.sender === 'system' ? 'info.contrastText' : 'text.primary',
                      border: 1,
                      borderColor: message.sender === 'system' ? 'info.main' : 'divider'
                    }}
                  >
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        whiteSpace: 'pre-wrap',
                        '& strong': {
                          fontWeight: 'bold'
                        }
                      }}
                    >
                      {message.content}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mt: 1,
                        opacity: 0.7,
                        color: message.sender === 'user' ? 'primary.contrastText' : 
                               message.sender === 'system' ? 'info.contrastText' : 'text.secondary'
                      }}
                    >
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </Typography>
                  </Paper>
                </Box>
              </Box>
            ))}
            {isLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                  <SmartToy fontSize="small" />
                </Avatar>
                <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.100' }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" sx={{ ml: 1, display: 'inline' }}>
                    AI is thinking...
                  </Typography>
                </Paper>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </Box>

      {/* AI Suggestions */}
      {showSuggestions && aiSuggestions.length > 0 && (
        <Box sx={{ 
          p: 2, 
          borderTop: 1, 
          borderColor: 'divider',
          bgcolor: 'grey.50'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <SmartToy sx={{ fontSize: 16, mr: 1, color: 'primary.main' }} />
            <Typography variant="caption" color="text.secondary">
              AI Suggestions
            </Typography>
            <IconButton
              size="small"
              onClick={() => setShowSuggestions(false)}
              sx={{ ml: 'auto' }}
            >
              <Close fontSize="small" />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {aiSuggestions.map((suggestion, index) => (
              <Chip
                key={index}
                label={suggestion}
                variant="outlined"
                size="small"
                clickable
                onClick={() => {
                  setInputMessage(suggestion);
                  setShowSuggestions(false);
                }}
                sx={{
                  '&:hover': {
                    bgcolor: 'primary.light',
                    color: 'primary.contrastText'
                  }
                }}
              />
            ))}
          </Box>
          {isGeneratingSuggestions && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <CircularProgress size={12} sx={{ mr: 1 }} />
              <Typography variant="caption" color="text.secondary">
                Generating suggestions...
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Input Area */}
      <Box sx={{ 
        p: 2, 
        borderTop: 1, 
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files) {
                processFiles(e.target.files);
              }
            }}
            accept=".pdf,.txt,.js,.jsx,.ts,.tsx,.py,.cs,.java,.cpp,.c,.h,.php,.rb,.go,.rs,.html,.htm,.css,.scss,.sass,.json,.xml,.yaml,.yml,.md,.sql,.sh,.bat,.ps1,.vb,.asp,.aspx,.razor"
            multiple
          />
          <input
            type="file"
            ref={bulkFileInputRef}
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files) {
                processFiles(e.target.files);
              }
            }}
            accept=".pdf,.txt,.js,.jsx,.ts,.tsx,.py,.cs,.java,.cpp,.c,.h,.php,.rb,.go,.rs,.html,.htm,.css,.scss,.sass,.json,.xml,.yaml,.yml,.md,.sql,.sh,.bat,.ps1,.vb,.asp,.aspx,.razor"
            multiple
          />
          <IconButton
            onClick={handleFileAttach}
            sx={{ mb: 0.5 }}
            disabled={isUploading}
            title="Upload Files"
          >
            {isUploading && <CircularProgress size={20} />}
            {!isUploading && <AttachFile />}
          </IconButton>
          <IconButton
            onClick={handleBulkUploadClick}
            sx={{ mb: 0.5, position: 'relative' }}
            disabled={isUploading}
            title="Drag & Drop Folders/Files"
            color="primary"
          >
            {isUploading ? (
              <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={20} />
                {uploadProgress !== null && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      position: 'absolute', 
                      fontSize: '10px', 
                      fontWeight: 'bold',
                      color: 'primary.main'
                    }}
                  >
                    {uploadProgress}%
                  </Typography>
                )}
              </Box>
            ) : (
              <CloudUpload />
            )}
          </IconButton>
          {isUploading && (
            <IconButton
              onClick={cancelUpload}
              sx={{ mb: 0.5 }}
              color="error"
              title="Cancel Upload"
            >
              <Close />
            </IconButton>
          )}
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="Type your message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            variant="outlined"
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'background.paper'
              }
            }}
          />
          <IconButton
            onClick={() => generateAISuggestions()}
            disabled={isGeneratingSuggestions || messages.length === 0}
            color="secondary"
            sx={{ mb: 0.5 }}
            title="Get AI Suggestions"
          >
            {isGeneratingSuggestions ? <CircularProgress size={20} /> : <SmartToy />}
          </IconButton>
          <IconButton
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading || isProcessing}
            color="primary"
            sx={{ mb: 0.5 }}
          >
            <Send />
          </IconButton>
        </Box>
      </Box>

      {/* Clear Messages Confirmation Dialog */}
      <Dialog
        open={showClearDialog}
        onClose={handleCancelClear}
        aria-labelledby="clear-dialog-title"
        aria-describedby="clear-dialog-description"
      >
        <DialogTitle id="clear-dialog-title">
          Clear All Messages
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="clear-dialog-description">
            Are you sure you want to clear all messages? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelClear} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmClear} color="error" variant="contained">
            Clear All Messages
          </Button>
        </DialogActions>
      </Dialog>

      {/* Drag & Drop Zone */}
      {showDropZone && (
        <Box
          ref={dropZoneRef}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setShowDropZone(false)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Box
            sx={{
              bgcolor: isDragOver ? 'primary.light' : 'background.paper',
              border: `3px dashed ${isDragOver ? 'primary.main' : 'grey.400'}`,
              borderRadius: 4,
              p: 6,
              textAlign: 'center',
              minWidth: 400,
              minHeight: 300,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              transform: isDragOver ? 'scale(1.05)' : 'scale(1)',
              boxShadow: isDragOver ? 8 : 4
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <CloudUpload 
              sx={{ 
                fontSize: 80, 
                color: isDragOver ? 'primary.dark' : 'primary.main',
                mb: 2 
              }} 
            />
            <Typography variant="h5" gutterBottom color={isDragOver ? 'primary.dark' : 'text.primary'}>
              {isDragOver ? 'Drop folders here!' : 'Drag & Drop Folders'}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Drop folders containing code files, documents, and PDFs here to bulk upload
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Supports nested folders • Code files (.py, .cs, .js, .ts, .html, .css), PDFs, and text files
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button
                variant="outlined"
                onClick={() => bulkFileInputRef.current?.click()}
                startIcon={<AttachFile />}
                disabled={isUploading}
              >
                Or Browse Files
              </Button>
              {isUploading && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={cancelUpload}
                  startIcon={<Close />}
                >
                  Cancel Upload
                </Button>
              )}
            </Box>
            {isUploading && uploadProgress !== null && (
              <Box sx={{ mt: 2, width: '100%' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Processing files... {uploadProgress}%
                </Typography>
                <Box sx={{ width: '100%', bgcolor: 'grey.200', borderRadius: 1, height: 8 }}>
                  <Box 
                    sx={{ 
                      width: `${uploadProgress}%`, 
                      bgcolor: 'primary.main', 
                      height: '100%', 
                      borderRadius: 1,
                      transition: 'width 0.3s ease'
                    }} 
                  />
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Files Popover */}
      <Popover
        open={Boolean(filesPopoverAnchor)}
        anchorEl={filesPopoverAnchor}
        onClose={() => setFilesPopoverAnchor(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: { maxHeight: 400, minWidth: 350, maxWidth: 500 }
        }}
      >
        <Box sx={{ p: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Files ({uploadedFiles.length})
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton
                size="small"
                onClick={() => {
                  if (selectedFiles.size === uploadedFiles.length) {
                    setSelectedFiles(new Set());
                  } else {
                    setSelectedFiles(new Set(uploadedFiles.map(f => f.name)));
                  }
                }}
                title={selectedFiles.size === uploadedFiles.length ? 'Deselect All' : 'Select All'}
              >
                {selectedFiles.size === uploadedFiles.length ? <CheckBox fontSize="small" /> : <CheckBoxOutlineBlank fontSize="small" />}
              </IconButton>
              <IconButton
                size="small"
                color={fileFilter !== 'all' ? 'primary' : 'default'}
                onClick={() => {
                  const filters = ['all', 'selected', 'code', 'docs'] as const;
                  const currentIndex = filters.indexOf(fileFilter);
                  setFileFilter(filters[(currentIndex + 1) % filters.length]);
                }}
                title="Filter files"
              >
                <FilterList fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          
          <Box sx={{ px: 2, pb: 1 }}>
            <TextField
              size="small"
              placeholder="Search files..."
              value={fileSearchTerm}
              onChange={(e) => setFileSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              sx={{ width: '100%' }}
            />
          </Box>
          
          <Typography variant="caption" sx={{ px: 2, color: 'text.secondary' }}>
            Filter: {fileFilter} {selectedFiles.size > 0 && `• ${selectedFiles.size} selected`}
          </Typography>
          
          <List dense sx={{ maxHeight: 250, overflow: 'auto' }}>
            {uploadedFiles
              .filter(file => {
                const matchesSearch = file.name.toLowerCase().includes(fileSearchTerm.toLowerCase());
                const matchesFilter = 
                  fileFilter === 'all' ||
                  (fileFilter === 'selected' && selectedFiles.has(file.name)) ||
                  (fileFilter === 'code' && /\.(js|jsx|ts|tsx|py|cs|java|cpp|c|php|rb|go|rs)$/i.test(file.name)) ||
                  (fileFilter === 'docs' && /\.(pdf|md|txt|doc|docx)$/i.test(file.name));
                return matchesSearch && matchesFilter;
              })
              .map((file) => (
                <ListItem 
                  key={file.name} 
                  sx={{ 
                    px: 2,
                    bgcolor: selectedFiles.has(file.name) ? 'action.selected' : 'transparent',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    const newSelected = new Set(selectedFiles);
                    if (selectedFiles.has(file.name)) {
                      newSelected.delete(file.name);
                    } else {
                      newSelected.add(file.name);
                    }
                    setSelectedFiles(newSelected);
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {selectedFiles.has(file.name) ? 
                      <CheckBox fontSize="small" color="primary" /> : 
                      <CheckBoxOutlineBlank fontSize="small" />
                    }
                  </ListItemIcon>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {getFileIcon(file.name)}
                  </ListItemIcon>
                  <ListItemText 
                    primary={file.name}
                    secondary={`${((file.size || 0) / 1024).toFixed(1)} KB`}
                    primaryTypographyProps={{ 
                      variant: 'body2',
                      sx: { 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 180
                      }
                    }}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeUploadedFile(file.name);
                        const newSelected = new Set(selectedFiles);
                        newSelected.delete(file.name);
                        setSelectedFiles(newSelected);
                        if (uploadedFiles.length === 1) {
                          setFilesPopoverAnchor(null);
                        }
                      }}
                      title="Remove file"
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
          </List>
        </Box>
      </Popover>

      {/* SharePoint Browser Dialog */}
      {showSharePointBrowser && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300
          }}
          onClick={() => setShowSharePointBrowser(false)}
        >
          <Box
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 2,
              maxWidth: '80vw',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: 24
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <SharePointBrowser onFileContent={handleSharePointFileContent} />
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', textAlign: 'right' }}>
              <Button onClick={() => setShowSharePointBrowser(false)}>
                Close
              </Button>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ChatWindow;
