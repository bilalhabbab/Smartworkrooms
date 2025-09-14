import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Avatar,
  Alert,
  Snackbar,
  CircularProgress,
  DialogContentText
} from '@mui/material';
import {
  Add,
  PersonAdd,
  Settings,
  Delete,
  AdminPanelSettings,
  RemoveCircle,
  Group,
  Edit,
  Close,
  Business,
  Email,
  ArrowBack,
  PersonRemove,
  SupervisorAccount,
  Analytics
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useChatRoom } from '../contexts/ChatRoomContext';
import { UserRole } from '../firebase/config';
import { sendInviteEmail, generateInviteLink } from '../services/emailService';
import { auditService } from '../services/auditService';
import { analyticsService } from '../services/analyticsService';
import AnalyticsDashboard from './AnalyticsDashboard';

interface AdminPanelProps {
  onBack: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  const { currentUser } = useAuth();
  const { 
    chatRooms, 
    users, 
    organizations,
    currentOrganization,
    organizationName, 
    createChatRoom, 
    deleteChatRoom, 
    inviteUserToRoom, 
    removeUserFromRoom, 
    promoteToAdmin, 
    demoteFromAdmin,
    promoteToRoomAdmin,
    demoteFromRoomAdmin,
    updateOrganizationName,
    createOrganization,
    setCurrentOrganization,
    isOrgAdmin
  } = useChatRoom();

  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [inviteUserOpen, setInviteUserOpen] = useState(false);
  const [editOrgNameOpen, setEditOrgNameOpen] = useState(false);
  const [manageMembersOpen, setManageMembersOpen] = useState(false);
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [newOrgName, setNewOrgName] = useState(organizationName);
  const [newOrgDescription, setNewOrgDescription] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [deleteRoomDialog, setDeleteRoomDialog] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);

  const isSuperAdmin = currentUser?.email === 'bilalhabbab@gmail.com';
  const canManageCurrentOrg = isOrgAdmin(currentOrganization?.id);

  // Allow access if user can manage current org or if they want to create a new org
  const hasAccess = canManageCurrentOrg || !currentOrganization;

  const handleCreateOrganization = async () => {
    if (!currentUser || !newOrgName.trim()) return;
    
    try {
      console.log('Creating organization...');
      const newOrg = await createOrganization(newOrgName.trim(), newOrgDescription.trim() || 'Organization created by ' + currentUser.displayName);
      setCurrentOrganization(newOrg);
      setSnackbarMessage('Organization created successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setCreateOrgOpen(false);
      setNewOrgName('');
      setNewOrgDescription('');
    } catch (error) {
      console.error('Error creating organization:', error);
      setSnackbarMessage(`Failed to create organization: ${error}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleCreateRoom = async () => {
    console.log('Create room button clicked');
    console.log('Current state:', { 
      roomName: newRoomName, 
      description: newRoomDescription, 
      currentOrganization: currentOrganization,
      organizations: organizations
    });
    
    // If no organization exists, prompt user to create one
    if (!currentOrganization && organizations.length === 0) {
      setSnackbarMessage('Please create an organization first');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setCreateOrgOpen(true);
      return;
    }
    
    if (newRoomName.trim() && newRoomDescription.trim() && currentOrganization) {
      try {
        console.log('Creating room:', { name: newRoomName, description: newRoomDescription, orgId: currentOrganization.id });
        await createChatRoom(newRoomName, newRoomDescription, currentOrganization.id);
        setNewRoomName('');
        setNewRoomDescription('');
        setCreateRoomOpen(false);
        setSnackbarMessage('Chat room created successfully!');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } catch (error) {
        console.error('Error creating room:', error);
        setSnackbarMessage(`Failed to create chat room: ${error}`);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } else {
      let message = 'Please fill in all fields';
      if (!currentOrganization) {
        message = 'No organization selected. Please create or select an organization first.';
      }
      console.log('Validation failed:', { 
        roomName: newRoomName.trim(), 
        description: newRoomDescription.trim(), 
        hasOrg: !!currentOrganization 
      });
      setSnackbarMessage(message);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleInviteUser = async () => {
    if (selectedRoomId && inviteEmail.trim() && currentUser && currentOrganization) {
      // Check for duplicate invite
      const room = chatRooms.find(r => r.id === selectedRoomId);
      if (room && room.members.includes(inviteEmail.trim())) {
        setSnackbarMessage('User is already a member of this room');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }
      
      setEmailSending(true);
      try {
        // Add user to room
        inviteUserToRoom(selectedRoomId, inviteEmail.trim());
        
        // Generate invite link and send email
        const inviteLink = generateInviteLink(selectedRoomId, currentOrganization.id, currentUser.email);
        const room = chatRooms.find(r => r.id === selectedRoomId);
        
        const emailSent = await sendInviteEmail({
          to_email: inviteEmail.trim(),
          to_name: inviteEmail.split('@')[0],
          from_name: currentUser.displayName || currentUser.email || 'Team Member',
          organization_name: currentOrganization.name,
          room_name: room?.name || 'Chat Room',
          invite_link: inviteLink,
          message: `You've been invited to join the ${room?.name} chat room in ${currentOrganization.name}.`
        });
        
        setInviteEmail('');
        setInviteUserOpen(false);
        setSnackbarMessage(emailSent ? 'Invitation sent successfully!' : 'User added to room (email sending failed)');
        setSnackbarOpen(true);
      } catch (error) {
        console.error('Error sending invite:', error);
        setSnackbarMessage('Failed to send invitation');
        setSnackbarOpen(true);
      } finally {
        setEmailSending(false);
      }
    }
  };

  const openInviteDialog = (roomId: string) => {
    setSelectedRoomId(roomId);
    setInviteUserOpen(true);
  };

  const handleDeleteRoom = (roomId: string) => {
    setRoomToDelete(roomId);
    setDeleteRoomDialog(true);
  };

  const confirmDeleteRoom = () => {
    if (roomToDelete) {
      const room = chatRooms.find(r => r.id === roomToDelete);
      if (room && currentUser && currentOrganization) {
        auditService.logRoomDelete(
          currentUser.email,
          currentUser.displayName || currentUser.email,
          currentOrganization.id,
          roomToDelete,
          room.name
        );
      }
      deleteChatRoom(roomToDelete);
    }
    setDeleteRoomDialog(false);
    setRoomToDelete(null);
  };

  const cancelDeleteRoom = () => {
    setDeleteRoomDialog(false);
    setRoomToDelete(null);
  };

  const handleUpdateOrgName = () => {
    updateOrganizationName(newOrgName);
    setEditOrgNameOpen(false);
    setSnackbarMessage('Organization name updated!');
    setSnackbarOpen(true);
  };


  const openManageMembersDialog = (room: any) => {
    setSelectedRoom(room);
    setManageMembersOpen(true);
  };

  const handleRemoveUser = (userEmail: string) => {
    if (selectedRoom && window.confirm(`Are you sure you want to remove ${userEmail} from ${selectedRoom.name}?`)) {
      // Update UI immediately
      const updatedRoom = {
        ...selectedRoom,
        members: selectedRoom.members.filter((email: string) => email !== userEmail),
        admins: selectedRoom.admins.filter((email: string) => email !== userEmail)
      };
      setSelectedRoom(updatedRoom);
      
      // Update backend
      removeUserFromRoom(selectedRoom.id, userEmail);
      setSnackbarMessage(`${userEmail} removed from room`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    }
  };

  const handlePromoteToRoomAdmin = (userEmail: string) => {
    if (selectedRoom) {
      // Update UI immediately
      const updatedRoom = {
        ...selectedRoom,
        admins: [...selectedRoom.admins, userEmail]
      };
      setSelectedRoom(updatedRoom);
      
      // Update backend
      promoteToRoomAdmin(selectedRoom.id, userEmail);
      setSnackbarMessage(`${userEmail} promoted to room admin`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    }
  };

  const handleDemoteFromRoomAdmin = (userEmail: string) => {
    if (selectedRoom) {
      // Update UI immediately
      const updatedRoom = {
        ...selectedRoom,
        admins: selectedRoom.admins.filter((email: string) => email !== userEmail)
      };
      setSelectedRoom(updatedRoom);
      
      // Update backend
      demoteFromRoomAdmin(selectedRoom.id, userEmail);
      setSnackbarMessage(`${userEmail} removed from room admin`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    }
  };

  // Show access denied if user has no organizations and can't create one
  if (!hasAccess && organizations.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Welcome to SmartWorkrooms
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          You don't have any organizations yet. Create your first organization to get started!
        </Typography>
        <Button
          variant="contained"
          startIcon={<Business />}
          onClick={() => setCreateOrgOpen(true)}
        >
          Create Organization
        </Button>
      </Box>
    );
  }

  // Show access denied if user is not admin of current org, but allow creating new organizations
  if (currentOrganization && !canManageCurrentOrg) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          You don't have admin permissions for the organization "{currentOrganization.name}".
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Only organization admins can access the admin panel.
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mt: 3 }}>
          <Button
            variant="contained"
            startIcon={<Business />}
            onClick={() => setCreateOrgOpen(true)}
          >
            Create New Organization
          </Button>
          
          {organizations.some(org => isOrgAdmin(org.id)) && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {organizations.filter(org => isOrgAdmin(org.id)).map(org => (
                <Button
                  key={org.id}
                  variant="outlined"
                  size="small"
                  onClick={() => setCurrentOrganization(org)}
                >
                  {org.name}
                </Button>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  if (showAnalytics) {
    return <AnalyticsDashboard onBack={() => setShowAnalytics(false)} />;
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        {onBack && (
          <IconButton onClick={onBack} sx={{ mr: 1 }}>
            <ArrowBack />
          </IconButton>
        )}
        <Typography variant="h4">
          Admin Panel
        </Typography>
      </Box>

      {/* Organization Management Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ mr: 3 }}>
            Organization: {currentOrganization?.name || organizationName}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Business />}
              onClick={() => setCreateOrgOpen(true)}
            >
              Create Organization
            </Button>
            <Button
              variant="outlined"
              startIcon={<Analytics />}
              onClick={() => setShowAnalytics(true)}
            >
              Analytics Dashboard
            </Button>
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={() => setEditOrgNameOpen(true)}
            >
              Edit Name
            </Button>
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {currentOrganization?.description || 'Manage your organization settings and information.'}
        </Typography>
        {organizations.length > 1 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Available Organizations:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {organizations.map(org => (
                <Chip
                  key={org.id}
                  label={org.name}
                  variant={currentOrganization?.id === org.id ? 'filled' : 'outlined'}
                  onClick={() => setCurrentOrganization(org)}
                  clickable
                />
              ))}
            </Box>
          </Box>
        )}
      </Paper>

      {/* User Management Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          User Management
        </Typography>
        <List>
          {users.map((user) => (
            <ListItem key={user.email}>
              <ListItemText
                primary={user.displayName || user.email}
                secondary={
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Chip 
                      label={user.role}
                      color={user.role === UserRole.SUPER_ADMIN ? 'error' : 
                             user.role === UserRole.ADMIN ? 'warning' : 'default'}
                      size="small"
                    />
                    <Typography variant="caption" color="text.secondary">
                      {user.email}
                    </Typography>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                {user.email !== 'bilalhabbab@gmail.com' && (
                  <>
                    {user.role === UserRole.EMPLOYEE ? (
                      <Button
                        size="small"
                        onClick={() => promoteToAdmin(user.email)}
                        startIcon={<AdminPanelSettings />}
                      >
                        Make Admin
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        color="error"
                        onClick={() => demoteFromAdmin(user.email)}
                        startIcon={<RemoveCircle />}
                      >
                        Remove Admin
                      </Button>
                    )}
                  </>
                )}
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* Chat Room Management Section */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Chat Room Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateRoomOpen(true)}
          >
            Create New Room
          </Button>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          {chatRooms.map((room) => (
            <Box key={room.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {room.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {room.description}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <Chip 
                      icon={<Group />}
                      label={`${room.members.length} members`}
                      size="small"
                    />
                    <Chip 
                      label={`${room.sharedFiles.length} files`}
                      size="small"
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Created: {room.createdAt.toLocaleDateString()}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<PersonAdd />}
                    onClick={() => openInviteDialog(room.id)}
                  >
                    Invite User
                  </Button>
                  <Button
                    size="small"
                    startIcon={<Settings />}
                    onClick={() => openManageMembersDialog(room)}
                  >
                    Manage
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<Delete />}
                    onClick={() => handleDeleteRoom(room.id)}
                  >
                    Delete
                  </Button>
                </CardActions>
              </Card>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Create Room Dialog */}
      <Dialog open={createRoomOpen} onClose={() => setCreateRoomOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Chat Room</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Room Name"
            fullWidth
            variant="outlined"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newRoomDescription}
            onChange={(e) => setNewRoomDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateRoomOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateRoom} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={inviteUserOpen} onClose={() => setInviteUserOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite User to Chat Room</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="User Email"
            type="email"
            fullWidth
            variant="outlined"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            helperText="Enter the email address of the user you want to invite"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteUserOpen(false)} disabled={emailSending}>Cancel</Button>
          <Button 
            onClick={handleInviteUser} 
            variant="contained" 
            disabled={emailSending || !inviteEmail.trim()}
            startIcon={emailSending ? <CircularProgress size={16} /> : <Email />}
          >
            {emailSending ? 'Sending...' : 'Send Invite'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Organization Dialog */}
      <Dialog open={createOrgOpen} onClose={() => setCreateOrgOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Organization</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Organization Name"
            fullWidth
            variant="outlined"
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
            sx={{ mt: 2 }}
          />
          <TextField
            margin="dense"
            label="Organization Description (Optional)"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={newOrgDescription}
            onChange={(e) => setNewOrgDescription(e.target.value)}
            sx={{ mt: 2 }}
            helperText="Describe what your organization does or its purpose"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOrgOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateOrganization} 
            variant="contained"
            disabled={!newOrgName.trim()}
          >
            Create Organization
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Organization Name Dialog */}
      <Dialog open={editOrgNameOpen} onClose={() => setEditOrgNameOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Organization Name</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Organization Name"
            fullWidth
            variant="outlined"
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOrgNameOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateOrgName} variant="contained">
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Members Dialog */}
      <Dialog open={manageMembersOpen} onClose={() => setManageMembersOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Manage Members - {selectedRoom?.name}
        </DialogTitle>
        <DialogContent>
          {selectedRoom && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Room Members ({selectedRoom.members.length})
              </Typography>
              <List>
                {selectedRoom.members.map((memberEmail: string) => {
                  const isRoomAdmin = selectedRoom.admins.includes(memberEmail);
                  const isCreator = memberEmail === selectedRoom.createdBy;
                  
                  return (
                    <ListItem key={memberEmail} divider>
                      <ListItemText
                        primary={memberEmail}
                        secondary={
                          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            {isCreator && (
                              <Chip 
                                label="Creator"
                                color="primary"
                                size="small"
                              />
                            )}
                            {isRoomAdmin && !isCreator && (
                              <Chip 
                                label="Room Admin"
                                color="warning"
                                size="small"
                              />
                            )}
                            {!isRoomAdmin && !isCreator && (
                              <Chip 
                                label="Member"
                                color="default"
                                size="small"
                              />
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {!isCreator && (
                            <>
                              {!isRoomAdmin ? (
                                <Button
                                  size="small"
                                  startIcon={<SupervisorAccount />}
                                  onClick={() => handlePromoteToRoomAdmin(memberEmail)}
                                >
                                  Make Room Admin
                                </Button>
                              ) : (
                                <Button
                                  size="small"
                                  color="warning"
                                  startIcon={<RemoveCircle />}
                                  onClick={() => handleDemoteFromRoomAdmin(memberEmail)}
                                >
                                  Remove Room Admin
                                </Button>
                              )}
                              <Button
                                size="small"
                                color="error"
                                startIcon={<PersonRemove />}
                                onClick={() => handleRemoveUser(memberEmail)}
                              >
                                Remove
                              </Button>
                            </>
                          )}
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageMembersOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Room Confirmation Dialog */}
      <Dialog
        open={deleteRoomDialog}
        onClose={cancelDeleteRoom}
        aria-labelledby="delete-room-dialog-title"
        aria-describedby="delete-room-dialog-description"
      >
        <DialogTitle id="delete-room-dialog-title">
          Delete Chat Room
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-room-dialog-description">
            Are you sure you want to delete this chat room? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteRoom} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmDeleteRoom} color="error" variant="contained">
            Delete Room
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminPanel;
