# Email Invite System Setup Guide

## Overview
The WSA Chat Tool now includes a comprehensive email invite system that allows users to:
- Send email invitations to join chat rooms
- Create their own organizations
- Manage multi-organization environments

## EmailJS Setup

### 1. Create EmailJS Account
1. Go to [EmailJS](https://www.emailjs.com/)
2. Sign up for a free account
3. Create a new email service (Gmail, Outlook, etc.)

### 2. Create Email Template
Create a new template with the following variables:
```
Subject: Invitation to join {{organization_name}} - {{room_name}}

Hi {{to_name}},

{{from_name}} has invited you to join the "{{room_name}}" chat room in {{organization_name}}.

{{message}}

Click the link below to accept the invitation:
{{invite_link}}

This invitation will expire in 7 days.

Best regards,
The {{organization_name}} Team
```

### 3. Configure Environment Variables
Update your `.env` file with your EmailJS credentials:

```env
# EmailJS Configuration for sending invite emails
REACT_APP_EMAILJS_SERVICE_ID=your_service_id_here
REACT_APP_EMAILJS_TEMPLATE_ID=your_template_id_here
REACT_APP_EMAILJS_PUBLIC_KEY=your_public_key_here
```

### 4. Get Your Credentials
- **Service ID**: Found in your EmailJS dashboard under "Email Services"
- **Template ID**: Found under "Email Templates" 
- **Public Key**: Found in "Account" > "General" > "Public Key"

## Features

### Email Invitations
- **Automatic Email Sending**: When inviting users to chat rooms, emails are automatically sent
- **Invite Links**: Secure, time-limited invite links (7-day expiration)
- **Professional Templates**: Clean, branded email templates
- **Error Handling**: Graceful fallback if email sending fails

### Organization Management
- **Multi-Organization Support**: Users can create and manage multiple organizations
- **Organization Switching**: Easy switching between organizations
- **Isolated Chat Rooms**: Each organization has its own set of chat rooms
- **Admin Controls**: Organization creators become admins automatically

### Invite Link Processing
- **Secure Tokens**: Base64-encoded invite tokens with room, organization, and timestamp data
- **Expiration Handling**: Automatic expiration after 7 days
- **User-Friendly Interface**: Clean invite acceptance flow
- **Authentication Integration**: Seamless integration with existing auth system

## Usage

### For Admins (Inviting Users)
1. Navigate to Admin Panel
2. Find the chat room you want to invite users to
3. Click "Invite User" button
4. Enter the user's email address
5. Click "Send Invite" - an email will be sent automatically

### For Invited Users
1. Check your email for the invitation
2. Click the invite link
3. Sign in if not already authenticated
4. Click "Join Chat Room" to accept the invitation
5. You'll be redirected to the chat interface

### Creating Organizations
1. Go to Admin Panel (Super Admin only currently)
2. Click "Create New Org" button
3. Enter organization name and description
4. Click "Create Organization"
5. The new organization becomes your active organization

## Technical Implementation

### Email Service (`src/services/emailService.ts`)
- EmailJS integration for sending emails
- Invite link generation and parsing
- Error handling and fallback mechanisms

### Invite Handler (`src/components/InviteHandler.tsx`)
- Processes invite links from URLs
- Handles authentication flow
- Manages room joining process

### Organization Management
- Multi-organization context in `ChatRoomContext`
- Organization creation and switching
- Room isolation per organization

### Security Features
- Time-limited invite tokens (7 days)
- Secure token encoding
- Authentication required for joining
- Admin-only invite permissions

## Troubleshooting

### Email Not Sending
1. Verify EmailJS credentials in `.env`
2. Check EmailJS service status
3. Ensure email template variables match
4. Check browser console for errors

### Invite Links Not Working
1. Verify invite token format
2. Check if invite has expired (7 days)
3. Ensure user is authenticated
4. Verify room and organization still exist

### Organization Issues
1. Only Super Admins can create organizations currently
2. Ensure user has proper permissions
3. Check if organization context is properly set

## Future Enhancements
- Role-based organization permissions
- Bulk invite functionality
- Custom email templates per organization
- Integration with external email providers
- Advanced invite analytics
