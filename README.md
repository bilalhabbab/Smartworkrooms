# SmartWorkrooms 🚀

A comprehensive AI-powered collaboration platform designed for professional teams, featuring multi-organization support, real-time chat, document management, and advanced analytics.

![SmartWorkrooms](https://img.shields.io/badge/React-18.2.0-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-4.9.5-blue) ![Firebase](https://img.shields.io/badge/Firebase-9.0+-orange) ![Material-UI](https://img.shields.io/badge/Material--UI-5.0+-purple)

## 🌟 Features

### Core Functionality
- **Multi-Organization Support**: Create and manage multiple isolated workspaces
- **Real-time Chat**: Instant messaging with AI-powered assistance
- **Document Management**: Upload, process, and share PDFs, Word docs, Excel files, and code
- **AI Integration**: OpenAI GPT-3.5-turbo for intelligent responses and document analysis
- **Role-Based Access Control**: Super Admin, Admin, and Employee roles with appropriate permissions

### Advanced Features
- **E-commerce Analytics Dashboard**: Shopify-inspired analytics with revenue tracking, order management, and product insights
- **Smart Search**: Semantic search across documents and conversations
- **Email Invitations**: Automated invite system with secure time-limited tokens
- **File Processing**: PDF.js integration for document parsing and AI context
- **Real-time Notifications**: Live order notifications and system alerts
- **Theme Support**: Dark/light mode toggle with persistent preferences

### Security & Authentication
- **Firebase Authentication**: Google OAuth integration
- **Domain Restrictions**: @wsa.com email domain enforcement
- **Secure File Handling**: Client-side document processing
- **Data Persistence**: Firebase Firestore for real-time collaboration

## 🛠️ Technology Stack

### Frontend
- **React 18.2.0** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Material-UI 5** - Professional UI components
- **React Router** - Client-side routing

### Backend Services
- **Firebase Auth** - User authentication and management
- **Firebase Firestore** - Real-time database
- **OpenAI API** - AI-powered chat responses
- **EmailJS** - Email invitation system

### Development Tools
- **Create React App** - Build toolchain
- **ESLint** - Code linting
- **PDF.js** - Document processing

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Firebase project with Authentication and Firestore enabled
- OpenAI API key
- EmailJS account (optional, for invitations)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd smartworkrooms
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   # Firebase Configuration
   REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id

   # OpenAI Configuration
   REACT_APP_OPENAI_API_KEY=your_openai_api_key

   # EmailJS Configuration (Optional)
   REACT_APP_EMAILJS_SERVICE_ID=your_service_id
   REACT_APP_EMAILJS_TEMPLATE_ID=your_template_id
   REACT_APP_EMAILJS_PUBLIC_KEY=your_public_key
   ```

4. **Firebase Setup**
   - Enable Authentication with Google provider
   - Enable Firestore database
   - Configure security rules for your domain

5. **Start the development server**
   ```bash
   npm start
   ```

   The app will open at [http://localhost:3001](http://localhost:3001)

## 📱 Usage

### Getting Started
1. **Sign In**: Use your @wsa.com Google account to authenticate
2. **Create Organization**: Set up your first organization workspace
3. **Create Chat Rooms**: Add rooms for different projects or teams
4. **Invite Members**: Send email invitations to team members
5. **Upload Documents**: Share PDFs, Word docs, and other files
6. **Chat with AI**: Get intelligent responses based on your documents

### Key Features Guide

#### Multi-Organization Management
- Switch between organizations using the header dropdown
- Each organization has isolated chat rooms and members
- Admins can create new organizations and manage permissions

#### Document Processing
- Drag & drop files into chat rooms
- AI automatically processes and summarizes documents
- Search across all uploaded content
- Room-specific file isolation

#### E-commerce Analytics
- Access the analytics dashboard from the admin panel
- View revenue trends, order management, and product insights
- Real-time order notifications
- Export data for external analysis

#### AI Chat Assistant
- Context-aware responses based on uploaded documents
- Product recommendations and business insights
- Legal document analysis and case management
- Smart search and content discovery

## 🏗️ Architecture

### Component Structure
```
src/
├── components/          # React components
│   ├── ChatInterface.tsx    # Main chat interface
│   ├── ChatWindow.tsx       # Chat messaging component
│   ├── AdminPanel.tsx       # Administration dashboard
│   ├── AnalyticsDashboard.tsx # E-commerce analytics
│   └── ...
├── contexts/           # React contexts
│   ├── AuthContext.tsx     # Authentication state
│   ├── ChatRoomContext.tsx # Chat room management
│   └── ThemeContext.tsx    # Theme management
├── services/          # External service integrations
│   ├── ecommerceService.ts # E-commerce analytics
│   ├── emailService.ts     # Email invitations
│   └── firestoreService.ts # Database operations
├── firebase/          # Firebase configuration
└── utils/            # Utility functions
```

### Data Flow
1. **Authentication**: Firebase Auth manages user sessions
2. **State Management**: React Context for global state
3. **Real-time Updates**: Firestore listeners for live data
4. **AI Processing**: OpenAI API for intelligent responses
5. **File Handling**: Client-side processing with PDF.js

## 🔧 Configuration

### Firebase Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /organizations/{orgId} {
      allow read, write: if request.auth != null;
      
      match /rooms/{roomId} {
        allow read, write: if request.auth != null;
        
        match /messages/{messageId} {
          allow read, write: if request.auth != null;
        }
      }
    }
  }
}
```

### Email Template Setup
For email invitations, configure your EmailJS template with:
- `{{to_name}}` - Recipient name
- `{{from_name}}` - Sender name
- `{{room_name}}` - Chat room name
- `{{invite_link}}` - Generated invite URL

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### Deploy to Netlify
1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `build`
4. Add environment variables in Netlify dashboard

## 📋 Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in development mode at [http://localhost:3001](http://localhost:3001)

### `npm test`

Launches the test runner in interactive watch mode

### `npm run build`

Builds the app for production to the `build` folder

### `npm run eject`

**Note: This is a one-way operation!** Ejects from Create React App for full configuration control

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact: support@smartworkrooms.com
- Documentation: [SmartWorkrooms Docs](docs/)

## 🎯 Roadmap

- [ ] Mobile app development (React Native)
- [ ] Advanced analytics and reporting
- [ ] Integration with more document types
- [ ] Voice and video calling
- [ ] Advanced AI features and custom models
- [ ] Enterprise SSO integration

---

**Built with ❤️ by the SmartWorkrooms Team**
