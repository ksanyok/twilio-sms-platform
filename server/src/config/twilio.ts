import Twilio from 'twilio';
import { config } from './index';

let _client: ReturnType<typeof Twilio> | null = null;

function getTwilioClient() {
  if (!_client) {
    const sid = config.twilio.accountSid;
    const token = config.twilio.authToken;
    if (!sid || !sid.startsWith('AC') || !token) {
      console.warn('⚠️  Twilio credentials not configured – SMS sending disabled');
      return null;
    }
    _client = Twilio(sid, token);
  }
  return _client;
}

export default getTwilioClient;
