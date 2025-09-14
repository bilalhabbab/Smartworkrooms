import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Button,
  Chip,
  Divider
} from '@mui/material';
import { 
  ArrowBack, 
  AccountCircle, 
  LogoutOutlined, 
  Settings,
  Business,
  ExitToApp
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useChatRoom } from '../contexts/ChatRoomContext';
import { Organization } from '../firebase/config';
import ChatWindow from './ChatWindow';
import ChatRoomSelector from './ChatRoomSelector';
import AdminPanel from './AdminPanel';

interface OrganizationWorkspaceProps {
  organization: Organization;
  onExitOrganization: () => void;
}

const OrganizationWorkspace: React.FC<OrganizationWorkspaceProps> = ({ 
  organization, 
  onExitOrganization 
}) => {
  const { currentUser, signOut } = useAuth();
  const { 
    chatRooms, 
    currentRoom, 
    selectChatRoom,
    setCurrentOrganization 
  } = useChatRoom();
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // Filter chat rooms for current organization
  const organizationRooms = chatRooms.filter(room => room.organizationId === organization.id);
  
  const isOrgAdmin = organization.admins.includes(currentUser?.email || '');
  const isSuperAdmin = currentUser?.email === 'bilalhabbab@gmail.com';

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

  const handleExitOrganization = () => {
    setCurrentOrganization(null);
    onExitOrganization();
    handleClose();
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Organization Header */}
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={onExitOrganization}
            sx={{ mr: 2 }}
          >
            <ArrowBack />
          </IconButton>

          <Business sx={{ mr: 2 }} />
          
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="div">
              {organization.name}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {organization.description}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip 
              label={`${organizationRooms.length} rooms`}
              size="small"
              variant="outlined"
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
            />
            
            {isOrgAdmin && (
              <Chip 
                label="Admin"
                size="small"
                color="secondary"
              />
            )}

            {(isOrgAdmin || isSuperAdmin) && (
              <Button
                color="inherit"
                startIcon={<Settings />}
                onClick={() => setShowAdminPanel(!showAdminPanel)}
                variant="outlined"
                size="small"
              >
                Admin
              </Button>
            )}

            <IconButton
              size="large"
              onClick={handleMenu}
              color="inherit"
            >
              {currentUser?.photoURL ? (
                <Avatar 
                  src={currentUser.photoURL} 
                  sx={{ width: 32, height: 32 }}
                />
              ) : (
                <AccountCircle />
              )}
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MenuItem disabled>
                <Box>
                  <Typography variant="subtitle2">
                    {currentUser?.displayName || currentUser?.email}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {currentUser?.email}
                  </Typography>
                </Box>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleExitOrganization}>
                <ExitToApp sx={{ mr: 2 }} />
                Exit Organization
              </MenuItem>
              <MenuItem onClick={handleSignOut}>
                <LogoutOutlined sx={{ mr: 2 }} />
                Sign Out
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
        {showAdminPanel ? (
          <AdminPanel onBack={() => setShowAdminPanel(false)} />
        ) : (
          <>
            <ChatRoomSelector 
              onRoomSelect={selectChatRoom}
              onAdminPanelOpen={() => setShowAdminPanel(true)}
              organizationRooms={organizationRooms}
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
                  <Business sx={{ fontSize: 64, color: 'text.secondary' }} />
                  <Typography variant="h5" color="text.secondary">
                    Welcome to {organization.name}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" textAlign="center">
                    Select a chat room from the sidebar to start collaborating with your team
                  </Typography>
                  {organizationRooms.length === 0 && (isOrgAdmin || isSuperAdmin) && (
                    <Button 
                      variant="contained" 
                      onClick={() => setShowAdminPanel(true)}
                      sx={{ mt: 2 }}
                    >
                      Create First Chat Room
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

export default OrganizationWorkspace;
