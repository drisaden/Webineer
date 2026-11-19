import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";
import { APP_NAME } from "@/lib/constants/site";
import { companyInfo, dmcaAgent } from "@/lib/compliance";

export const metadata: Metadata = { title: `Copyright and DMCA · ${APP_NAME}` };

export default function DmcaPage() {
  const agent = dmcaAgent();
  const company = companyInfo();
  const contact = agent.email || company.contactEmail;
  return (
    <LegalPage title="Copyright and DMCA policy" updated="19 November 2026">
      <p>{APP_NAME} respects the rights of copyright owners. Hosts publish their own webinars, pages and videos here, and we respond to valid notices of alleged infringement.</p>

      <h2>{agent.designated ? "Designated agent" : "Where to send a notice"}</h2>
      {agent.designated ? (
        <p>
          Send notices to our designated copyright agent:<br />
          {agent.name}<br />
          {agent.address}<br />
          Email: <a href={`mailto:${agent.email}`}>{agent.email}</a>
          {agent.phone ? <><br />Phone: {agent.phone}</> : null}
        </p>
      ) : (
        <p>{contact ? <>Send notices by email to <a href={`mailto:${contact}`}>{contact}</a>.</> : <>Send notices through the contact form in the <Link href="/help">help centre</Link>.</>}</p>
      )}

      <h2>What a notice must include</h2>
      <ul>
        <li>Your physical or electronic signature, or that of the person authorised to act for the owner.</li>
        <li>A description of the copyrighted work you say has been infringed.</li>
        <li>The exact address (URL) of the material on {APP_NAME} that you want removed or disabled.</li>
        <li>Your name, postal address, telephone number and email address.</li>
        <li>A statement that you believe in good faith that the use is not authorised by the owner, its agent or the law.</li>
        <li>A statement, under penalty of perjury, that the information in the notice is accurate and that you are the owner or authorised to act for the owner.</li>
      </ul>

      <h2>What we do</h2>
      <p>When we receive a complete notice we promptly remove or disable access to the material and tell the host who published it. Hosts whose content is removed can send a counter-notice, and we may restore the material if the complainant does not start legal action within the period the law allows. We end the accounts of hosts who repeatedly infringe.</p>

      <h2>Counter-notice</h2>
      <p>If you believe material was removed by mistake or misidentification, send a counter-notice to the same address with your signature, a description of the material and where it appeared, a statement under penalty of perjury that you believe it was removed by mistake, and your name, address and phone number, and consent to the jurisdiction of the courts for your address.</p>

      <p>Knowingly misrepresenting that material is infringing can make you liable for damages.</p>
    </LegalPage>
  );
}
