import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { APP_NAME, APP_SUPPORTING_MESSAGE } from "@/lib/constants/site";

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/60 bg-white/75 backdrop-blur-xl">
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-10 md:grid-cols-3">
        <div>
          <Logo tone="auto" className="h-9 w-auto" title={APP_NAME} />
          <p className="mt-3 max-w-xs text-sm text-secondaryText">{APP_SUPPORTING_MESSAGE}</p>
        </div>
        <div>
          <h3 className="font-semibold">Product</h3>
          <ul className="mt-3 space-y-2 text-sm text-secondaryText">
            <li>Webinars</li>
            <li>Landing pages</li>
            <li>Analytics</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold">Company</h3>
          <ul className="mt-3 space-y-2 text-sm text-secondaryText">
            <li><Link href="/help" className="tap hover:text-primaryText">Help center</Link></li>
            <li>Privacy</li>
            <li>Terms</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
