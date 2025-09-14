import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Fab,
  Avatar,
  Chip
} from '@mui/material';
import { Add, Business, Group, Settings } from '@mui/icons-material';
import { useChatRoom } from '../contexts/ChatRoomContext';
import { useAuth } from '../contexts/AuthContext';
import { Organization } from '../firebase/config';

interface OrganizationSelectorProps {
  onOrganizationSelect: (organization: Organization) => void;
}

const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({ onOrganizationSelect }) => {
  const { currentUser } = useAuth();
  const { organizations, createOrganization } = useChatRoom();
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDescription, setNewOrgDescription] = useState('');

  const handleCreateOrganization = async () => {
    if (newOrgName.trim() && newOrgDescription.trim() && currentUser) {
      try {
        const newOrg = await createOrganization(newOrgName.trim(), newOrgDescription.trim());
        setNewOrgName('');
        setNewOrgDescription('');
        setCreateOrgOpen(false);
        onOrganizationSelect(newOrg);
      } catch (error) {
        console.error('Error creating organization:', error);
      }
    }
  };

  const userOrganizations = organizations.filter(org => 
    org.members.includes(currentUser?.email || '')
  );

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: 'background.default',
      p: 3
    }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Business sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h3" gutterBottom>
            Select Organization
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Choose an organization to access its chat rooms and collaborate with your team
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {userOrganizations.map((org) => (
            <Box key={org.id} sx={{ flex: '1 1 300px', minWidth: 300, maxWidth: 400 }}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
                onClick={() => onOrganizationSelect(org)}
              >
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                      <Business />
                    </Avatar>
                    <Typography variant="h6" component="h2">
                      {org.name}
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {org.description}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <Chip 
                      icon={<Group />}
                      label={`${org.members.length} members`}
                      size="small"
                      variant="outlined"
                    />
                    {org.admins.includes(currentUser?.email || '') && (
                      <Chip 
                        icon={<Settings />}
                        label="Admin"
                        size="small"
                        color="primary"
                      />
                    )}
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                    Created: {org.createdAt.toLocaleDateString()}
                  </Typography>
                </CardContent>

                <CardActions>
                  <Button 
                    fullWidth 
                    variant="contained"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOrganizationSelect(org);
                    }}
                  >
                    Enter Organization
                  </Button>
                </CardActions>
              </Card>
            </Box>
          ))}

          {/* Create New Organization Card */}
          <Box sx={{ flex: '1 1 300px', minWidth: 300, maxWidth: 400 }}>
            <Card 
              sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                border: '2px dashed',
                borderColor: 'primary.main',
                bgcolor: 'action.hover',
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: 'action.selected',
                  transform: 'translateY(-4px)'
                }
              }}
              onClick={() => setCreateOrgOpen(true)}
            >
              <CardContent sx={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }}>
                <Add sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" color="primary.main" gutterBottom>
                  Create New Organization
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Start a new workspace for your team
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {userOrganizations.length === 0 && (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No organizations found
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Create your first organization to get started with team collaboration
            </Typography>
            <Button 
              variant="contained" 
              size="large"
              startIcon={<Add />}
              onClick={() => setCreateOrgOpen(true)}
            >
              Create Organization
            </Button>
          </Box>
        )}
      </Box>

      {/* Floating Action Button for quick create */}
      <Fab
        color="primary"
        aria-label="create organization"
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        onClick={() => setCreateOrgOpen(true)}
      >
        <Add />
      </Fab>

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
            placeholder="e.g., Acme Corporation, Marketing Team"
          />
          <TextField
            margin="dense"
            label="Organization Description"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={newOrgDescription}
            onChange={(e) => setNewOrgDescription(e.target.value)}
            sx={{ mt: 2 }}
            placeholder="Describe what this organization is for..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOrgOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateOrganization} 
            variant="contained"
            disabled={!newOrgName.trim() || !newOrgDescription.trim()}
          >
            Create Organization
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrganizationSelector;
