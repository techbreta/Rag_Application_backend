"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMeetingInvitation = exports.sendAccountCreated = exports.sendSuccessfulRegistration = exports.sendVerificationEmail = exports.sendResetPasswordEmail = exports.sendEmail = exports.transport = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = __importDefault(require("../../config/config"));
const logger_1 = __importDefault(require("../logger/logger"));
exports.transport = nodemailer_1.default.createTransport(config_1.default.email.smtp);
/* istanbul ignore next */
if (config_1.default.env !== 'test') {
    exports.transport
        .verify()
        .then(() => logger_1.default.info('Connected to email server'))
        .catch((e) => {
        logger_1.default.warn('Unable to connect to email server. Make sure you have configured the SMTP options in .env');
        logger_1.default.error(e);
    });
}
/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @param {string} html
 * @returns {Promise<void>}
 */
const sendEmail = async (to, subject, text, html) => {
    const msg = {
        from: config_1.default.email.from,
        to,
        subject,
        text,
        html,
    };
    const response = await exports.transport.sendMail(msg);
    console.log('Email sent:', response);
};
exports.sendEmail = sendEmail;
/**
 * Send reset password email
 * @param {string} to
 * @param {string} token
 * @returns {Promise<void>}
 */
const sendResetPasswordEmail = async (to, token) => {
    const subject = 'Reset password';
    // replace this url with the link to the reset password page of your front-end app
    const resetPasswordUrl = `http://${config_1.default.clientUrl}/reset-password?token=${token}`;
    const text = `Hi,
  To reset your password, click on this link: ${resetPasswordUrl}
  If you did not request any password resets, then ignore this email.`;
    const html = `<div style="margin:30px; padding:30px; border:1px solid black; border-radius: 20px 10px;"><h4><strong>Dear user,</strong></h4>
  <p>To reset your password, click on this link: ${resetPasswordUrl}</p>
  <p>If you did not request any password resets, please ignore this email.</p>
  <p>Thanks,</p>
  <p><strong>Team</strong></p></div>`;
    await (0, exports.sendEmail)(to, subject, text, html);
};
exports.sendResetPasswordEmail = sendResetPasswordEmail;
/**
 * Send verification email
 * @param {string} to
 * @param {string} token
 * @param {string} name
 * @returns {Promise<void>}
 */
const sendVerificationEmail = async (to, token, name) => {
    const subject = 'Email Verification';
    // replace this url with the link to the email verification page of your front-end app
    const verificationEmailUrl = `http://${config_1.default.clientUrl}/verify-email?token=${token}`;
    const text = `Hi ${name},
  To verify your email, click on this link: ${verificationEmailUrl}
  If you did not create an account, then ignore this email.`;
    const html = `<div style="margin:30px; padding:30px; border:1px solid black; border-radius: 20px 10px;"><h4><strong>Hi ${name},</strong></h4>
  <p>To verify your email, click on this link: ${verificationEmailUrl}</p>
  <p>If you did not create an account, then ignore this email.</p></div>`;
    await (0, exports.sendEmail)(to, subject, text, html);
};
exports.sendVerificationEmail = sendVerificationEmail;
/**
 * Send email verification after registration
 * @param {string} to
 * @param {string} token
 * @param {string} name
 * @returns {Promise<void>}
 */
const sendSuccessfulRegistration = async (to, token, name) => {
    const subject = 'Email Verification';
    // replace this url with the link to the email verification page of your front-end app
    const verificationEmailUrl = `http://${config_1.default.clientUrl}/verify-email?token=${token}`;
    const text = `Hi ${name},
  Congratulations! Your account has been created. 
  You are almost there. Complete the final step by verifying your email at: ${verificationEmailUrl}
  Don't hesitate to contact us if you face any problems
  Regards,
  Team`;
    const html = `<div style="margin:30px; padding:30px; border:1px solid black; border-radius: 20px 10px;"><h4><strong>Hi ${name},</strong></h4>
  <p>Congratulations! Your account has been created.</p>
  <p>You are almost there. Complete the final step by verifying your email at: ${verificationEmailUrl}</p>
  <p>Don't hesitate to contact us if you face any problems</p>
  <p>Regards,</p>
  <p><strong>Team</strong></p></div>`;
    await (0, exports.sendEmail)(to, subject, text, html);
};
exports.sendSuccessfulRegistration = sendSuccessfulRegistration;
/**
 * Send email verification after registration
 * @param {string} to
 * @param {string} name
 * @returns {Promise<void>}
 */
const sendAccountCreated = async (to, name) => {
    const subject = 'Account Created Successfully';
    // replace this url with the link to the email verification page of your front-end app
    const loginUrl = `http://${config_1.default.clientUrl}/auth/login`;
    const text = `Hi ${name},
  Congratulations! Your account has been created successfully. 
  You can now login at: ${loginUrl}
  Don't hesitate to contact us if you face any problems
  Regards,
  Team`;
    const html = `<div style="margin:30px; padding:30px; border:1px solid black; border-radius: 20px 10px;"><h4><strong>Hi ${name},</strong></h4>
  <p>Congratulations! Your account has been created successfully.</p>
  <p>You can now login at: ${loginUrl}</p>
  <p>Don't hesitate to contact us if you face any problems</p>
  <p>Regards,</p>
  <p><strong>Team</strong></p></div>`;
    await (0, exports.sendEmail)(to, subject, text, html);
};
exports.sendAccountCreated = sendAccountCreated;
/**
 * Send meeting invitation email
 * @param {string} to
 * @param {string} memberName
 * @param {object} meetingDetails
 * @returns {Promise<void>}
 */
const sendMeetingInvitation = async (to, memberName, meetingDetails) => {
    const subject = `Meeting Invitation: ${meetingDetails.name}`;
    const fileSection = meetingDetails.fileUrl
        ? `<p><strong>File:</strong> <a href="${meetingDetails.fileUrl}" style="color: #007bff;">${meetingDetails.fileUrl}</a></p>`
        : '<p><strong>File:</strong> Will be shared soon</p>';
    const meetingLinkSection = meetingDetails.meetingLink
        ? `<p><strong>Meeting Link:</strong> <a href="${meetingDetails.meetingLink}" style="color: #007bff;">${meetingDetails.meetingLink}</a></p>`
        : '<p><strong>Meeting Link:</strong> Will be shared soon</p>';
    const text = `Hi ${memberName},

You have been invited to a meeting.

Meeting Details:
- Name: ${meetingDetails.name}
- Type: ${meetingDetails.type}
- Date: ${meetingDetails.date}
- Time: ${meetingDetails.startTime} - ${meetingDetails.endTime} (${meetingDetails.timezone})
- Meeting Link: ${meetingDetails.meetingLink || 'Will be shared soon'}
- Organized by: ${meetingDetails.createdByName}

Please make sure to join the meeting on time.

Regards,
Team`;
    const html = `<div style="margin:30px; padding:30px; border:1px solid #e0e0e0; border-radius: 10px; font-family: Arial, sans-serif;">
  <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">Meeting Invitation</h2>
  <h4><strong>Hi ${memberName},</strong></h4>
  <p>You have been invited to a meeting.</p>
  
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
    <h3 style="color: #007bff; margin-top: 0;">Meeting Details</h3>
    <p><strong>Meeting Name:</strong> ${meetingDetails.name}</p>
    <p><strong>Type:</strong> ${meetingDetails.type}</p>
    <p><strong>Date:</strong> ${meetingDetails.date}</p>
    <p><strong>Time:</strong> ${meetingDetails.startTime} - ${meetingDetails.endTime}</p>
    <p><strong>Timezone:</strong> ${meetingDetails.timezone}</p>
    ${meetingLinkSection}
    <p><strong>Organized by:</strong> ${meetingDetails.createdByName}</p>
    ${fileSection}
  </div>
  <p style="color: #666;">Please make sure to join the meeting on time.</p>
  <p style="margin-top: 30px;">Regards,</p>
  <p><strong>Team</strong></p>

</div>`;
    await (0, exports.sendEmail)(to, subject, text, html);
};
exports.sendMeetingInvitation = sendMeetingInvitation;
