import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Chip, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { useMongoDBConnection } from '../contexts/MongoDBContext';
import { testMongoDBConnection, checkEnvironmentSetup } from '../utils/testConnection';

const ConnectionStatus: React.FC = () => {
  const { isConnected, connectionError, reconnect } = useMongoDBConnection();
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestDialogOpen(true);
    
    // Check environment first
    const envCheck = checkEnvironmentSetup();
    if (!envCheck.success) {
      setTestResults(envCheck);
      setTesting(false);
      return;
    }
    
    // Test MongoDB connection
    const results = await testMongoDBConnection();
    setTestResults(results);
    setTesting(false);
  };

  const getStatusColor = () => {
    if (connectionError) return 'error';
    if (isConnected) return 'success';
    return 'warning';
  };

  const getStatusText = () => {
    if (connectionError) return 'MongoDB Error';
    if (isConnected) return 'MongoDB Connected';
    return 'Connecting...';
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Chip
        label={getStatusText()}
        color={getStatusColor()}
        size="small"
        variant={isConnected ? 'filled' : 'outlined'}
      />
      
      <Button
        size="small"
        variant="outlined"
        onClick={handleTestConnection}
        disabled={testing}
      >
        {testing ? <CircularProgress size={16} /> : 'Test DB'}
      </Button>

      {connectionError && (
        <Button
          size="small"
          variant="contained"
          color="error"
          onClick={reconnect}
        >
          Reconnect
        </Button>
      )}

      <Dialog 
        open={testDialogOpen} 
        onClose={() => setTestDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>MongoDB Connection Test</DialogTitle>
        <DialogContent>
          {testing ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
              <CircularProgress />
              <Typography>Testing MongoDB operations...</Typography>
            </Box>
          ) : testResults ? (
            <Box sx={{ mt: 1 }}>
              <Alert severity={testResults.success ? 'success' : 'error'}>
                {testResults.message}
              </Alert>
              
              {testResults.details && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Test Details:
                  </Typography>
                  <pre style={{ 
                    background: '#f5f5f5', 
                    padding: '10px', 
                    borderRadius: '4px',
                    fontSize: '12px',
                    overflow: 'auto'
                  }}>
                    {JSON.stringify(testResults.details, null, 2)}
                  </pre>
                </Box>
              )}
              
              {testResults.missingVars && testResults.missingVars.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" color="error" gutterBottom>
                    Missing Environment Variables:
                  </Typography>
                  <ul>
                    {testResults.missingVars.map((varName: string) => (
                      <li key={varName}>
                        <code>{varName}</code>
                      </li>
                    ))}
                  </ul>
                </Box>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>
            Close
          </Button>
          {testResults && !testResults.success && (
            <Button 
              onClick={handleTestConnection}
              variant="contained"
              disabled={testing}
            >
              Retry Test
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConnectionStatus;
