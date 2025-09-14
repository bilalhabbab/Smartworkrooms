import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  LinearProgress,
  Alert,
  Chip,
  Paper,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  CloudUpload,
  InsertDriveFile,
  Description,
  PictureAsPdf,
  TableChart,
  Delete,
  Visibility,
  CheckCircle,
  Error as ErrorIcon,
  FolderOpen
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content?: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  lastModified: number;
}

interface SharePointBrowserProps {
  onFileSelect?: (fileId: string, fileName: string) => void;
  onFileContent?: (content: string, fileName: string) => void;
}

const SharePointBrowser: React.FC<SharePointBrowserProps> = ({ 
  onFileSelect, 
  onFileContent 
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewDialog, setPreviewDialog] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [previewFileName, setPreviewFileName] = useState('');

  const processFile = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        let mockContent = '';
        const fileName = file.name.toLowerCase();
        
        if (fileName.includes('.pdf')) {
          mockContent = `PDF Document: ${file.name}\n\nExtracted content from PDF document.\nThis would contain the actual text content from the PDF file.\n\nDocument sections:\n- Executive Summary\n- Financial Data\n- Strategic Plans\n- Operational Guidelines\n\nFile size: ${formatFileSize(file.size)}\nLast modified: ${new Date(file.lastModified).toLocaleDateString()}`;
        } else if (fileName.includes('.doc') || fileName.includes('.docx')) {
          mockContent = `Word Document: ${file.name}\n\nExtracted content from Word document.\nThis would contain the actual text content from the Word file.\n\nDocument structure:\n- Headers and paragraphs\n- Tables and lists\n- Images and charts (descriptions)\n- Footnotes and references\n\nFile size: ${formatFileSize(file.size)}\nLast modified: ${new Date(file.lastModified).toLocaleDateString()}`;
        } else if (fileName.includes('.xls') || fileName.includes('.xlsx')) {
          mockContent = `Excel Spreadsheet: ${file.name}\n\nExtracted data from Excel file.\nThis would contain the actual data from all sheets.\n\nWorksheet data:\n- Sheet 1: Financial Summary\n  - Revenue: $1,250,000\n  - Expenses: $890,000\n  - Profit: $360,000\n- Sheet 2: Employee Data\n  - Total Employees: 45\n  - Departments: 8\n- Sheet 3: Project Timeline\n  - Active Projects: 12\n  - Completed: 28\n\nFile size: ${formatFileSize(file.size)}\nLast modified: ${new Date(file.lastModified).toLocaleDateString()}`;
        } else {
          mockContent = `Document: ${file.name}\n\nGeneral document content.\nFile type: ${file.type}\nSize: ${formatFileSize(file.size)}\nLast modified: ${new Date(file.lastModified).toLocaleDateString()}`;
        }
        
        resolve(mockContent);
      };
      
      reader.onerror = () => {
        resolve(`Error reading file: ${file.name}`);
      };
      
      reader.readAsText(file);
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsProcessing(true);
    
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading' as const,
      lastModified: file.lastModified
    }));
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
    
    // Process each file
    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      const fileId = newFiles[i].id;
      
      try {
        // Update status to processing
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, status: 'processing' } : f
        ));
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        
        // Process file content
        const content = await processFile(file);
        
        // Update with completed status and content
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, status: 'completed', content } : f
        ));
        
      } catch (error) {
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId ? { 
            ...f, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Processing failed' 
          } : f
        ));
      }
    }
    
    setIsProcessing(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv']
    },
    multiple: true,
    maxSize: 50 * 1024 * 1024 // 50MB per file
  });

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type.includes('pdf')) return <PictureAsPdf color="error" />;
    if (type.includes('word') || type.includes('document')) return <Description color="primary" />;
    if (type.includes('sheet') || type.includes('excel')) return <TableChart color="success" />;
    return <InsertDriveFile />;
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const previewFile = (file: UploadedFile) => {
    if (file.content) {
      setPreviewContent(file.content);
      setPreviewFileName(file.name);
      setPreviewDialog(true);
    }
  };

  const clearAllFiles = () => {
    setUploadedFiles([]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const completedFiles = uploadedFiles.filter(f => f.status === 'completed');
  const totalSize = uploadedFiles.reduce((sum, file) => sum + file.size, 0);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        SharePoint Document Upload
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Upload your daily SharePoint export folder (Excel, PDF, Word documents)
      </Typography>

      {/* Large Upload Area */}
      <Paper
        {...getRootProps()}
        sx={{
          p: 6,
          mb: 3,
          border: '3px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
          cursor: 'pointer',
          textAlign: 'center',
          transition: 'all 0.3s ease',
          minHeight: 200,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <input {...getInputProps()} />
        <FolderOpen sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          {isDragActive ? 'Drop your SharePoint folder here!' : 'Drag & Drop SharePoint Folder'}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          {isDragActive ? 'Release to upload all files...' : 'or click to select multiple files'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Chip label="PDF" icon={<PictureAsPdf />} variant="outlined" />
          <Chip label="Word" icon={<Description />} variant="outlined" />
          <Chip label="Excel" icon={<TableChart />} variant="outlined" />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
          Max file size: 50MB per file • Supports bulk folder uploads
        </Typography>
      </Paper>

      {/* Upload Statistics */}
      {uploadedFiles.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Chip 
              label={`${uploadedFiles.length} files uploaded`} 
              color="primary" 
              size="medium"
            />
            <Chip 
              label={`${completedFiles.length} processed`} 
              color="success" 
              size="medium"
            />
            <Chip 
              label={formatFileSize(totalSize)} 
              color="info" 
              size="medium"
            />
          </Box>
          
          {isProcessing && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Processing SharePoint documents...
              </Typography>
              <LinearProgress />
            </Box>
          )}
        </Box>
      )}

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <Paper sx={{ mb: 3 }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1">
              Uploaded SharePoint Documents
            </Typography>
            <Button
              size="small"
              color="error"
              onClick={clearAllFiles}
              disabled={isProcessing}
            >
              Clear All
            </Button>
          </Box>
          <Divider />
          <List>
            {uploadedFiles.map((file) => (
              <ListItem key={file.id} divider>
                <ListItemIcon>
                  {getFileIcon(file.type)}
                </ListItemIcon>
                <ListItemText
                  primary={file.name}
                  secondary={
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center' }}>
                      <Chip 
                        label={formatFileSize(file.size)} 
                        size="small" 
                        variant="outlined"
                      />
                      <Chip 
                        label={file.status}
                        size="small"
                        color={
                          file.status === 'completed' ? 'success' :
                          file.status === 'error' ? 'error' :
                          'default'
                        }
                        icon={
                          file.status === 'completed' ? <CheckCircle /> :
                          file.status === 'error' ? <ErrorIcon /> :
                          undefined
                        }
                      />
                      {file.status === 'processing' && (
                        <LinearProgress sx={{ width: 100, ml: 1 }} />
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {file.status === 'completed' && (
                      <IconButton
                        edge="end"
                        onClick={() => previewFile(file)}
                        title="Preview content"
                      >
                        <Visibility />
                      </IconButton>
                    )}
                    <IconButton
                      edge="end"
                      onClick={() => removeFile(file.id)}
                      title="Remove file"
                      disabled={isProcessing}
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {completedFiles.length > 0 && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>{completedFiles.length} SharePoint documents processed successfully!</strong>
            <br />
            These documents are now available for AI chat queries and can be referenced in conversations.
          </Typography>
        </Alert>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={previewDialog}
        onClose={() => setPreviewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Document Preview: {previewFileName}
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              p: 2,
              backgroundColor: 'grey.50',
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap',
              maxHeight: 400,
              overflow: 'auto'
            }}
          >
            {previewContent}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog(false)}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (onFileContent) {
                onFileContent(previewContent, previewFileName);
              }
              setPreviewDialog(false);
            }}
          >
            Use in Chat
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SharePointBrowser;
