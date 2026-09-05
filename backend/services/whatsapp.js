const axios = require('axios');

/**
 * Sends a real WhatsApp Business Cloud API message to the configured admin
 * number. Credentials (WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID) live
 * ONLY in server environment variables — never in frontend code.
 *
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
 *
 * A failure here is caught by the caller and logged — it must never prevent
 * an application from being safely stored in MongoDB.
 */
function buildApiUrl() {
  const version = process.env.WHATSAPP_API_VERSION || 'v20.0';
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  return `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
}

function formatApplicationMessage(application) {
  return (
    `🏍️ CLUB 37 — NEW MEMBERSHIP REQUEST\n\n` +
    `Name: ${application.name}\n` +
    `Age: ${application.age}\n` +
    `City: ${application.city}\n` +
    `Phone: ${application.phone}\n` +
    `Instagram: @${application.instagram || 'N/A'}\n` +
    `Bike: ${application.motorcycle}\n` +
    `Model: ${application.bikeModel}\n` +
    `Experience: ${application.experience}\n\n` +
    `Reason for joining:\n${application.reason}\n\n` +
    `Application ID:\n${application.applicationId}\n\n` +
    `Status: PENDING APPROVAL\n\n` +
    `Review in the admin dashboard to approve or reject.`
  );
}

async function sendWhatsAppTextMessage(bodyText) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;

  if (!token || !phoneNumberId || !adminNumber) {
    throw new Error(
      'WhatsApp is not configured. Set WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, and ADMIN_WHATSAPP_NUMBER in .env'
    );
  }

  const response = await axios.post(
    buildApiUrl(),
    {
      messaging_product: 'whatsapp',
      to: adminNumber,
      type: 'text',
      text: { body: bodyText }
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    }
  );

  return response.data;
}

async function notifyAdminOfNewApplication(application) {
  const message = formatApplicationMessage(application);
  return sendWhatsAppTextMessage(message);
}

async function notifyApplicantOfDecision(application, decision) {
  const line =
    decision === 'APPROVED'
      ? `🏍️ CLUB 37\n\nCongratulations ${application.name}! Your membership application (${application.applicationId}) has been APPROVED. Welcome to the club.`
      : `🏍️ CLUB 37\n\nHi ${application.name}, your membership application (${application.applicationId}) was not approved at this time.`;

  // Note: this sends to the admin-configured business number's messaging
  // pipeline. To message the applicant directly, integrate a template
  // message flow with their opted-in phone number per WhatsApp's policies.
  return sendWhatsAppTextMessage(line);
}

module.exports = {
  notifyAdminOfNewApplication,
  notifyApplicantOfDecision,
  formatApplicationMessage
};
