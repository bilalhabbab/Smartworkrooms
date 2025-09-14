# MongoDB Atlas Setup Guide for WSA Chat Tool

## Prerequisites
1. MongoDB Atlas account (free tier available)
2. Basic understanding of MongoDB

## Step 1: Create MongoDB Atlas Cluster

### 1.1 Sign up for MongoDB Atlas
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account or sign in
3. Create a new project (e.g., "WSA Chat Tool")

### 1.2 Create a Cluster
1. Click "Build a Database"
2. Choose "FREE" shared cluster
3. Select your preferred cloud provider and region
4. Name your cluster (e.g., "wsa-chat-cluster")
5. Click "Create Cluster"

### 1.3 Configure Database Access
1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Create username and strong password
5. Set user privileges to "Read and write to any database"
6. Click "Add User"

### 1.4 Configure Network Access
1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
4. For production: Add your specific IP addresses
5. Click "Confirm"

## Step 2: Get Connection String

### 2.1 Connect to Your Cluster
1. Go to "Database" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select "Node.js" and version "4.1 or later"
5. Copy the connection string

### 2.2 Update Environment Variables
Replace the placeholder in your `.env` file:

```bash
# Replace with your actual MongoDB Atlas connection string
REACT_APP_MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/wsa-chat-tool?retryWrites=true&w=majority
```

**Important**: Replace `username`, `password`, and `cluster` with your actual values.

## Step 3: Database Structure

The application will automatically create these collections:

### Collections Created:
- **users**: User profiles and authentication data
- **organizations**: Multi-tenant organization data
- **chatrooms**: Chat room configurations and file storage
- **messages**: All chat messages with AI responses
- **invites**: Email invitation tokens and validation

### Indexes Automatically Created:
- User email and UID indexes for fast authentication
- Organization member indexes for access control
- Chat room and message indexes for performance
- Invite token indexes for security

## Step 4: Production Configuration

### 4.1 Create Production Cluster
1. Create a separate cluster for production
2. Use a different database name (e.g., "wsa-chat-prod")
3. Configure stricter network access rules
4. Set up monitoring and alerts

### 4.2 Environment Variables
Create `.env.production`:

```bash
# Production MongoDB Atlas
REACT_APP_MONGODB_URI=mongodb+srv://prod-user:prod-password@prod-cluster.mongodb.net/wsa-chat-prod?retryWrites=true&w=majority

# Keep Firebase for authentication only
REACT_APP_FIREBASE_API_KEY=your_firebase_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id

# Other production variables...
```

## Step 5: Security Best Practices

### 5.1 Database Security
- Use strong passwords for database users
- Limit IP access to known addresses
- Enable MongoDB Atlas security features
- Regular security reviews

### 5.2 Connection Security
- Never commit connection strings to version control
- Use environment variables for all credentials
- Rotate passwords regularly
- Monitor database access logs

## Step 6: Monitoring and Maintenance

### 6.1 MongoDB Atlas Monitoring
- Set up alerts for high CPU/memory usage
- Monitor connection counts
- Track query performance
- Set up backup schedules

### 6.2 Application Monitoring
- Monitor connection status in app
- Log database errors appropriately
- Implement retry logic for failed connections
- Track user activity and performance

## Step 7: Migration from Firebase (Optional)

If you have existing Firebase data:

### 7.1 Export Firebase Data
1. Go to Firebase Console
2. Export Firestore data
3. Convert to MongoDB format

### 7.2 Import to MongoDB
1. Use MongoDB Compass or mongoimport
2. Transform data structure as needed
3. Verify data integrity

## Troubleshooting

### Common Issues:

1. **Connection Timeout**
   - Check network access settings
   - Verify IP whitelist
   - Check connection string format

2. **Authentication Failed**
   - Verify username/password
   - Check user permissions
   - Ensure user has database access

3. **Database Not Found**
   - MongoDB creates databases automatically
   - Verify connection string database name
   - Check cluster status

4. **Performance Issues**
   - Review query patterns
   - Check index usage
   - Monitor cluster metrics

## Cost Optimization

### Free Tier Limits:
- 512 MB storage
- Shared RAM and vCPU
- No backup retention
- Community support only

### Scaling Options:
- Upgrade to dedicated clusters for production
- Enable automated backups
- Add read replicas for performance
- Set up sharding for large datasets

Your WSA Chat Tool is now ready to use MongoDB Atlas! 🚀

## Next Steps
1. Update your connection string in `.env`
2. Test the application locally
3. Deploy to production with production MongoDB cluster
4. Monitor usage and performance
