import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";
import { APP_NAME } from "@/lib/constants/site";
import { companyInfo } from "@/lib/compliance";

export const metadata: Metadata = { title: `Privacy Policy · ${APP_NAME}` };

export default function PrivacyPage() {
  const company = companyInfo();
  return (
    <LegalPage title="Privacy Policy" updated="19 November 2026">
      <p>This policy explains what {company.name} collects through {APP_NAME}, why, and the choices you have. It covers two groups of people: hosts who create webinars, and attendees who register for them.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Hosts:</strong> name, email, workspace details, billing and payout details you provide, and activity in your account.</li>
        <li><strong>Attendees:</strong> the details a host asks for on a registration page (such as name and email), when and how you registered, and your attendance in the live room or replay.</li>
        <li><strong>Technical data:</strong> IP address, browser and device information used to keep the service secure, prevent abuse and apply rate limits.</li>
      </ul>

      <h2>Who controls attendee data</h2>
      <p>The host of a webinar decides why attendee information is collected and how it is used. {APP_NAME} processes it on the host&apos;s behalf to run the webinar, send the emails the host has set up, and report results to them. To ask about your data as an attendee, contact the host first; we will help the host respond.</p>

      <h2>How we use information</h2>
      <ul>
        <li>To provide, secure and improve the service.</li>
        <li>To send registration confirmations, reminders and follow-ups the host has configured. Reminders and follow-ups include an unsubscribe link.</li>
        <li>To process payments and record earnings.</li>
        <li>To answer support requests and meet legal obligations.</li>
      </ul>

      <h2>Cookies, analytics and tracking</h2>
      <p>{APP_NAME} uses the cookies needed to sign you in and keep the service secure. We do not run session replay or screen-recording tools. A host may add Google Analytics or a Meta Pixel to their registration page; those load only after a visitor chooses &quot;Accept&quot; in the notice shown on that page, and a visitor who declines is not tracked by them. Fonts are served from our own domain rather than loaded from a third-party font service.</p>

      <h2>Who we share it with</h2>
      <p>We use service providers to run {APP_NAME}: hosting (Vercel), database and sign-in (Supabase), payments (Flutterwave), email delivery, and file and image hosting. They process data only to provide those services. We share attendee information with the host of the webinar they registered for. We do not sell personal information.</p>

      <h2>Retention and your choices</h2>
      <p>We keep information while an account is active and as long as needed for the purposes above, legal and accounting obligations, and security. You can unsubscribe from reminders and follow-ups using the link in any such email. You may ask to access, correct or delete your information, or object to its use, subject to applicable law.</p>

      <h2>Children</h2>
      <p>{APP_NAME} is not for anyone under 18, and we do not knowingly collect their personal information. If you believe a child has given us information, tell us and we will delete it.</p>

      <h2>Contact</h2>
      <p>{company.contactEmail ? <>Privacy questions or requests: <a href={`mailto:${company.contactEmail}`}>{company.contactEmail}</a>.</> : <>Privacy questions or requests: use the contact form in the <Link href="/help">help centre</Link>.</>}{company.postalAddress ? ` Our address: ${company.postalAddress}.` : ""}</p>
    </LegalPage>
  );
}
