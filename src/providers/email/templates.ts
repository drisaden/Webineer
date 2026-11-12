import type { EmailTemplate, EmailTemplateType } from "@/types";

export const standardEmailTemplates: EmailTemplate[] = [
  {
    id: "tmpl_reg_confirm",
    workspaceId: "ws_001",
    type: "registration_confirmation",
    name: "Registration Confirmation",
    subject: "Confirmed: Your seat for {{webinar_title}} is reserved",
    bodyHtml: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #E4E9F1; border-radius: 12px; background: #ffffff;">
  <div style="background: #101B35; color: #ffffff; padding: 18px 24px; border-radius: 8px; margin-bottom: 24px;">
    <h2 style="margin: 0; font-size: 20px;">Webineer Registration</h2>
  </div>
  <p>Hi <strong>{{first_name}}</strong>,</p>
  <p>You're confirmed for <strong>{{webinar_title}}</strong>!</p>
  <div style="background: #F7F9FC; border: 1px solid #E4E9F1; padding: 16px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 4px 0;"><strong>Date:</strong> {{webinar_date}}</p>
    <p style="margin: 4px 0;"><strong>Time:</strong> {{webinar_time}} ({{webinar_timezone}})</p>
    <p style="margin: 4px 0;"><strong>Host:</strong> {{host_name}}</p>
  </div>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{webinar_link}}" style="background: #16D6B2; color: #101B35; padding: 12px 28px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">Access Webinar Room</a>
  </p>
  <p style="color: #64748B; font-size: 13px;">Save this email to access your room link on the event day.</p>
</div>`,
    bodyText: "Hi {{first_name}},\n\nYou're confirmed for {{webinar_title}} on {{webinar_date}} at {{webinar_time}}.\n\nJoin link: {{webinar_link}}\n\nSee you there!",
    variables: ["first_name", "webinar_title", "webinar_date", "webinar_time", "webinar_timezone", "host_name", "webinar_link"],
    isSystemDefault: true,
    updatedAt: "2026-11-10T12:00:00Z",
  },
  {
    id: "tmpl_remind_24h",
    workspaceId: "ws_001",
    type: "reminder_24h",
    name: "24-Hour Reminder",
    subject: "Tomorrow: {{webinar_title}} goes live",
    bodyHtml: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #E4E9F1; border-radius: 12px; background: #ffffff;">
  <p>Hi {{first_name}},</p>
  <p>Quick reminder that <strong>{{webinar_title}}</strong> starts in 24 hours.</p>
  <p style="text-align: center; margin: 24px 0;">
    <a href="{{webinar_link}}" style="background: #101B35; color: #ffffff; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">View Webinar Room</a>
  </p>
</div>`,
    bodyText: "Hi {{first_name}},\n\n{{webinar_title}} is starting in 24 hours.\n\nLink: {{webinar_link}}",
    variables: ["first_name", "webinar_title", "webinar_date", "webinar_link"],
    isSystemDefault: true,
    updatedAt: "2026-11-10T12:00:00Z",
  },
  {
    id: "tmpl_remind_1h",
    workspaceId: "ws_001",
    type: "reminder_1h",
    name: "1-Hour Reminder",
    subject: "Starting in 1 hour: {{webinar_title}}",
    bodyHtml: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #E4E9F1; border-radius: 12px; background: #ffffff;">
  <p>Hi {{first_name}},</p>
  <p>We are opening the room in 1 hour for <strong>{{webinar_title}}</strong>.</p>
  <p style="text-align: center; margin: 24px 0;">
    <a href="{{webinar_link}}" style="background: #16D6B2; color: #101B35; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">Enter Room Early</a>
  </p>
</div>`,
    bodyText: "Hi {{first_name}},\n\nWe start in 1 hour!\n\nLink: {{webinar_link}}",
    variables: ["first_name", "webinar_title", "webinar_link"],
    isSystemDefault: true,
    updatedAt: "2026-11-10T12:00:00Z",
  },
  {
    id: "tmpl_remind_15m",
    workspaceId: "ws_001",
    type: "reminder_15m",
    name: "15-Minute Countdown",
    subject: "Doors are open! {{webinar_title}} in 15 mins",
    bodyHtml: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #E4E9F1; border-radius: 12px; background: #ffffff;">
  <p>Hi {{first_name}},</p>
  <p>Take your seat! The session begins in 15 minutes.</p>
  <p style="text-align: center; margin: 24px 0;">
    <a href="{{webinar_link}}" style="background: #16D6B2; color: #101B35; padding: 14px 28px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">Join Now</a>
  </p>
</div>`,
    bodyText: "Hi {{first_name}},\n\nJoin now: {{webinar_link}}",
    variables: ["first_name", "webinar_title", "webinar_link"],
    isSystemDefault: true,
    updatedAt: "2026-11-10T12:00:00Z",
  },
  {
    id: "tmpl_start_now",
    workspaceId: "ws_001",
    type: "starting_now",
    name: "Webinar Starting Now",
    subject: "LIVE NOW: {{webinar_title}}",
    bodyHtml: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #E4E9F1; border-radius: 12px; background: #ffffff;">
  <p>Hi {{first_name}},</p>
  <p>We are live right now! Jump in and participate in the live polls and Q&A.</p>
  <p style="text-align: center; margin: 24px 0;">
    <a href="{{webinar_link}}" style="background: #0FC7A6; color: #101B35; padding: 14px 28px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">Join Live Session</a>
  </p>
</div>`,
    bodyText: "We are live now! {{webinar_link}}",
    variables: ["first_name", "webinar_title", "webinar_link"],
    isSystemDefault: true,
    updatedAt: "2026-11-10T12:00:00Z",
  },
  {
    id: "tmpl_missed",
    workspaceId: "ws_001",
    type: "missed_webinar",
    name: "Missed Session Follow-up",
    subject: "Sorry we missed you at {{webinar_title}}",
    bodyHtml: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #E4E9F1; border-radius: 12px; background: #ffffff;">
  <p>Hi {{first_name}},</p>
  <p>We missed you at today's session. Don't worry, the full recording and resources have been saved for you.</p>
  <p style="text-align: center; margin: 24px 0;">
    <a href="{{replay_link}}" style="background: #101B35; color: #ffffff; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">Watch Replay</a>
  </p>
</div>`,
    bodyText: "Hi {{first_name}},\n\nHere is your recording link: {{replay_link}}",
    variables: ["first_name", "webinar_title", "replay_link"],
    isSystemDefault: true,
    updatedAt: "2026-11-10T12:00:00Z",
  },
  {
    id: "tmpl_replay",
    workspaceId: "ws_001",
    type: "replay_available",
    name: "Replay Available",
    subject: "Replay is ready: {{webinar_title}}",
    bodyHtml: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #E4E9F1; border-radius: 12px; background: #ffffff;">
  <p>Hi {{first_name}},</p>
  <p>The on-demand replay for <strong>{{webinar_title}}</strong> is now available.</p>
  <p style="text-align: center; margin: 24px 0;">
    <a href="{{replay_link}}" style="background: #16D6B2; color: #101B35; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">Access Replay Room</a>
  </p>
</div>`,
    bodyText: "Watch replay here: {{replay_link}}",
    variables: ["first_name", "webinar_title", "replay_link"],
    isSystemDefault: true,
    updatedAt: "2026-11-10T12:00:00Z",
  },
  {
    id: "tmpl_thank_you",
    workspaceId: "ws_001",
    type: "thank_you",
    name: "Thank You for Attending",
    subject: "Thanks for joining us at {{webinar_title}}!",
    bodyHtml: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #E4E9F1; border-radius: 12px; background: #ffffff;">
  <p>Hi {{first_name}},</p>
  <p>Thank you for attending <strong>{{webinar_title}}</strong>. We hope you found the insights immediately actionable.</p>
</div>`,
    bodyText: "Thank you for attending {{webinar_title}}!",
    variables: ["first_name", "webinar_title"],
    isSystemDefault: true,
    updatedAt: "2026-11-10T12:00:00Z",
  },
  {
    id: "tmpl_post_followup",
    workspaceId: "ws_001",
    type: "post_webinar_followup",
    name: "Post-Webinar Offer / Next Steps",
    subject: "Next steps & special offer from {{webinar_title}}",
    bodyHtml: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #E4E9F1; border-radius: 12px; background: #ffffff;">
  <p>Hi {{first_name}},</p>
  <p>As discussed during the session, here are the links and resources mentioned by {{host_name}}.</p>
</div>`,
    bodyText: "Hi {{first_name}},\n\nHere are the next steps from {{webinar_title}}.",
    variables: ["first_name", "webinar_title", "host_name"],
    isSystemDefault: true,
    updatedAt: "2026-11-10T12:00:00Z",
  },
  {
    id: "tmpl_purchase_confirm",
    workspaceId: "ws_001",
    type: "purchase_confirmation",
    name: "Ticket Purchase Receipt",
    subject: "Receipt: Ticket confirmed for {{webinar_title}}",
    bodyHtml: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #E4E9F1; border-radius: 12px; background: #ffffff;">
  <div style="background: #16D6B2; color: #101B35; padding: 18px 24px; border-radius: 8px; margin-bottom: 24px;">
    <h2 style="margin: 0; font-size: 20px;">Payment Received</h2>
  </div>
  <p>Hi {{first_name}},</p>
  <p>Your ticket purchase for <strong>{{webinar_title}}</strong> was successful. Here is your access pass:</p>
  <p style="text-align: center; margin: 24px 0;">
    <a href="{{webinar_link}}" style="background: #101B35; color: #ffffff; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">Your Ticket & Room Link</a>
  </p>
</div>`,
    bodyText: "Your ticket purchase for {{webinar_title}} is confirmed. Access pass: {{webinar_link}}",
    variables: ["first_name", "webinar_title", "webinar_link"],
    isSystemDefault: true,
    updatedAt: "2026-11-10T12:00:00Z",
  },
];
