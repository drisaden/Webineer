import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";
import { APP_NAME } from "@/lib/constants/site";
import { companyInfo } from "@/lib/compliance";

export const metadata: Metadata = { title: `Terms of Service · ${APP_NAME}` };

export default function TermsPage() {
  const company = companyInfo();
  return (
    <LegalPage title="Terms of Service" updated="19 November 2026">
      <p>These terms govern your use of {APP_NAME}, a service operated by {company.name}, for creating, promoting and running webinars. By creating an account or using the service you agree to them.</p>

      <h2>Who can use {APP_NAME}</h2>
      <p>You must be at least 18 years old to create an account. If you use the service for an organisation, you confirm you may bind it to these terms.</p>

      <h2>Your account and workspace</h2>
      <ul>
        <li>Keep your sign-in details private and tell us promptly if you think someone else has used them.</li>
        <li>The workspace owner controls billing, members, payouts and deleting webinars.</li>
        <li>You are responsible for what happens under your account and for the content you publish.</li>
      </ul>

      <h2>Your content and your attendees</h2>
      <p>You keep ownership of the webinars, pages, videos and other content you upload or embed. You give us the permission needed to host, display and deliver it as part of the service. You are responsible for having the rights to everything you publish, and for the way you collect and use your attendees&apos; information, including any consent and notices the law requires where you operate.</p>

      <h2>Acceptable use</h2>
      <p>Do not use {APP_NAME} to publish unlawful, infringing, deceptive or harmful content, to send spam, to harvest personal data, or to disrupt or probe the service. We may remove content or suspend an account that breaks these rules. To report copyright infringement see our <Link href="/dmca">copyright policy</Link>.</p>

      <h2 id="plans-payment-and-renewal">Plans, payment and renewal</h2>
      <ul>
        <li>Paid plans are prepaid for 30 days and are paid for through Flutterwave.</li>
        <li><strong>Paid plans do not renew automatically.</strong> You are never charged again unless you choose to pay again from Billing. When the 30 days end, the workspace returns to the Free plan limits.</li>
        <li>Prices are shown before you pay. Taxes, where they apply, are shown at checkout.</li>
      </ul>

      <h2>Ticket and replay sales</h2>
      <p>When you sell tickets or replays through {APP_NAME}, payments from your customers are processed by Flutterwave. We keep a platform fee of 10% of each sale. Earnings are recorded in your ledger, held for the configured period and paid out to the account you provide. Refunds you issue are deducted from your earnings. You are responsible for the products you sell and for any taxes on your sales.</p>

      <h2>Availability and changes</h2>
      <p>We work to keep the service available but do not promise it will be uninterrupted or error-free. We may change or discontinue features, and we will give reasonable notice of changes that materially affect paid plans.</p>

      <h2>Ending your account</h2>
      <p>You can stop using {APP_NAME} at any time. We may suspend or end accounts that break these terms. Sections that by their nature should survive (for example ownership, payment obligations and limits of liability) continue after the account ends.</p>

      <h2>Liability</h2>
      <p>The service is provided &quot;as is&quot;. To the extent the law allows, we are not liable for indirect or consequential losses, and our total liability for any claim is limited to the amount you paid us in the 12 months before it arose. Nothing here limits liability that cannot be limited by law.</p>

      <h2>Contact</h2>
      <p>{company.contactEmail ? <>Questions about these terms: <a href={`mailto:${company.contactEmail}`}>{company.contactEmail}</a>.</> : <>Questions about these terms: use the contact form in the <Link href="/help">help centre</Link>.</>}{company.postalAddress ? ` Our address: ${company.postalAddress}.` : ""}</p>
    </LegalPage>
  );
}
