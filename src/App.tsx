import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ChatRoomProvider, useChatRoom } from './contexts/ChatRoomContext';
// import { SharePointProvider } from './contexts/SharePointContext'; // Disabled for client-side
// import { MongoDBProvider } from './contexts/MongoDBContext'; // Disabled for client-side
import { ThemeProvider as CustomThemeProvider, useTheme } from './contexts/ThemeContext';
import ChatInterface from './components/ChatInterface';
import InviteHandler from './components/InviteHandler';
import OrganizationSelector from './components/OrganizationSelector';
import OrganizationWorkspace from './components/OrganizationWorkspace';

const createAppTheme = (isDarkMode: boolean) => createTheme({
  palette: {
    mode: isDarkMode ? 'dark' : 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: isDarkMode ? '#121212' : '#ffffff',
      paper: isDarkMode ? '#1e1e1e' : '#ffffff',
    },
  },
});

const AppContent: React.FC = () => {
  const { currentUser } = useAuth();
  const { currentOrganization, setCurrentOrganization } = useChatRoom();

  if (!currentUser) {
    return <ChatInterface />;
  }

  if (!currentOrganization) {
    return <OrganizationSelector onOrganizationSelect={setCurrentOrganization} />;
  }

  return (
    <OrganizationWorkspace 
      organization={currentOrganization}
      onExitOrganization={() => setCurrentOrganization(null)}
    />
  );
};

const ThemedApp: React.FC = () => {
  const { isDarkMode } = useTheme();
  const appTheme = createAppTheme(isDarkMode);

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <AuthProvider>
        <ChatRoomProvider>
          <Router>
            <Routes>
              <Route path="/" element={<ChatInterface />} />
              <Route path="/invite/:token" element={<InviteHandler />} />
            </Routes>
          </Router>
        </ChatRoomProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

function App() {
  return (
    <CustomThemeProvider>
      <ThemedApp />
    </CustomThemeProvider>
  );
}

export default App;
