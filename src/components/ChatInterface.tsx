import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  AppBar,
  Toolbar,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  Switch,
  FormControlLabel
} from '@mui/material';
import { LogoutOutlined, AccountCircle, DarkMode, LightMode, Business } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useChatRoom } from '../contexts/ChatRoomContext';
import ChatWindow from './ChatWindow';
import LoginScreen from './LoginScreen';
import ChatRoomSelector from './ChatRoomSelector';
import AdminPanel from './AdminPanel';
// import ConnectionStatus from './ConnectionStatus'; // Disabled for client-side

const ChatInterface: React.FC = () => {
  const { currentUser, loading, signOut, isAdmin, isSuperAdmin } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { selectChatRoom, currentRoom, organizationName } = useChatRoom();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showCreateOrgFromMenu, setShowCreateOrgFromMenu] = useState(false);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      handleClose();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleCreateOrganization = () => {
    setShowCreateOrgFromMenu(true);
    setShowAdminPanel(true);
    handleClose();
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, textAlign: 'left' }}>
            {organizationName}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              onClick={toggleDarkMode}
              color="inherit"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <LightMode /> : <DarkMode />}
            </IconButton>
            
            {/* <ConnectionStatus /> */}
            
            <Typography variant="body2" sx={{ mr: 1 }}>
              {currentUser.displayName}
            </Typography>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              {currentUser.photoURL ? (
                <Avatar
                  src={currentUser.photoURL}
                  alt={currentUser.displayName}
                  sx={{ width: 32, height: 32 }}
                />
              ) : (
                <AccountCircle />
              )}
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={handleCreateOrganization}>
                <Business sx={{ mr: 1 }} />
                Create Organization
              </MenuItem>
              <MenuItem onClick={handleSignOut}>
                <LogoutOutlined sx={{ mr: 1 }} />
                Sign Out
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
        {showAdminPanel ? (
          <AdminPanel onBack={() => setShowAdminPanel(false)} />
        ) : (
          <>
            <ChatRoomSelector 
              onRoomSelect={selectChatRoom}
              onAdminPanelOpen={() => setShowAdminPanel(true)}
            />
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {currentRoom ? (
                <ChatWindow />
              ) : (
                <Box sx={{ 
                  flex: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 2,
                  bgcolor: 'background.default'
                }}>
                  <Typography variant="h5" color="text.secondary">
                    Welcome, {currentUser?.displayName}!
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Select a chat room to start chatting with AI assistance
                  </Typography>
                </Box>
              )}
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

export default ChatInterface;
