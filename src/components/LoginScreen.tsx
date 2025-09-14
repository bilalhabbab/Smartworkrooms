import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Container,
  Alert,
  CircularProgress
} from '@mui/material';
import { Google, Microsoft } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const LoginScreen: React.FC = () => {
  const { signInWithGoogle, signInWithMicrosoft } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<'google' | 'microsoft' | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setAuthMethod('google');
      setError(null);
      await signInWithGoogle();
    } catch (error: any) {
      console.error('Sign in error:', error);
      setError(error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
      setAuthMethod(null);
    }
  };

  const handleMicrosoftSignIn = async () => {
    try {
      setLoading(true);
      setAuthMethod('microsoft');
      setError(null);
      await signInWithMicrosoft();
    } catch (error: any) {
      console.error('Sign in error:', error);
      setError(error.message || 'Failed to sign in with Microsoft');
    } finally {
      setLoading(false);
      setAuthMethod(null);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.50'
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center'
          }}
        >
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            SmartWorkrooms
          </Typography>
          <Typography variant="h6" color="text.secondary" paragraph>
            Welcome to SmartWorkrooms AI-powered collaboration platform
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: 400 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={loading && authMethod === 'microsoft' ? <CircularProgress size={20} /> : <Microsoft />}
              onClick={handleMicrosoftSignIn}
              disabled={loading}
              sx={{
                py: 1.5,
                px: 4,
                fontSize: '1.1rem',
                bgcolor: '#0078d4',
                '&:hover': {
                  bgcolor: '#106ebe'
                }
              }}
            >
              {loading && authMethod === 'microsoft' ? 'Signing in...' : 'Sign in with Microsoft (SmartWorkrooms)'}
            </Button>

            <Button
              variant="outlined"
              size="large"
              startIcon={loading && authMethod === 'google' ? <CircularProgress size={20} /> : <Google />}
              onClick={handleGoogleSignIn}
              disabled={loading}
              sx={{
                py: 1.5,
                px: 4,
                fontSize: '1.1rem'
              }}
            >
              {loading && authMethod === 'google' ? 'Signing in...' : 'Sign in with Google'}
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
            Use Microsoft for SmartWorkrooms domain access and SharePoint integration
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginScreen;
