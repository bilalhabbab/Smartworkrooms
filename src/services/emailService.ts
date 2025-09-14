// Web3Forms configuration - get your free access key from https://web3forms.com
const WEB3FORMS_ACCESS_KEY = process.env.REACT_APP_WEB3FORMS_ACCESS_KEY || 'YOUR_ACCESS_KEY';

export interface InviteEmailData {
  to_email: string;
  to_name: string;
  from_name: string;
  organization_name: string;
  room_name: string;
  invite_link: string;
  message?: string;
}

export const sendInviteEmail = async (data: InviteEmailData): Promise<boolean> => {
  try {
    console.log('Web3Forms Configuration:', {
      accessKey: WEB3FORMS_ACCESS_KEY ? 'Set' : 'Missing'
    });

    if (!WEB3FORMS_ACCESS_KEY || WEB3FORMS_ACCESS_KEY === 'YOUR_ACCESS_KEY') {
      console.error('Web3Forms access key missing. Get one at https://web3forms.com');
      return false;
    }

    const formData = new FormData();
    formData.append('access_key', WEB3FORMS_ACCESS_KEY);
    formData.append('to', 'bilalhabbab@gmail.com'); // Fixed recipient for now
    formData.append('subject', `Invitation to join ${data.room_name} - ${data.organization_name}`);
    formData.append('message', `
Hi ${data.to_name},

${data.from_name} has invited you to join "${data.room_name}" in ${data.organization_name}.

${data.message || `You've been invited to join the ${data.room_name} chat room.`}

Click here to join: ${data.invite_link}

Best regards,
SmartWorkrooms Team
    `);
    formData.append('from_name', 'SmartWorkrooms');
    formData.append('from_email', 'noreply@wsa.com');

    console.log('Sending email via Web3Forms to bilalhabbab@gmail.com');
    console.log('Original recipient would be:', data.to_email);

    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Email sent successfully via Web3Forms');
      return true;
    } else {
      console.error('Web3Forms error:', result);
      return false;
    }
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
};

export const generateInviteLink = (roomId: string, organizationId: string, inviterEmail: string): string => {
  const baseUrl = window.location.origin;
  const inviteToken = btoa(`${roomId}:${organizationId}:${inviterEmail}:${Date.now()}`);
  return `${baseUrl}/invite/${inviteToken}`;
};

export const parseInviteLink = (inviteToken: string): { roomId: string; organizationId: string; inviterEmail: string; timestamp: number } | null => {
  try {
    const decoded = atob(inviteToken);
    const [roomId, organizationId, inviterEmail, timestamp] = decoded.split(':');
    return {
      roomId,
      organizationId,
      inviterEmail,
      timestamp: parseInt(timestamp)
    };
  } catch (error) {
    console.error('Failed to parse invite link:', error);
    return null;
  }
};
