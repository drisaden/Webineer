import Script from "next/script";

const GA_ID_RE = /^G-[A-Z0-9]{4,20}$/;
const META_PIXEL_RE = /^\d{8,20}$/;

/**
 * Injects GA4 / Meta Pixel for a webinar. IDs are re-validated here so only
 * well-formed identifiers ever reach a script; no custom code is accepted.
 */
export function TrackingScripts({ googleAnalyticsId, metaPixelId }: { googleAnalyticsId: string | null; metaPixelId: string | null }) {
  const ga = googleAnalyticsId && GA_ID_RE.test(googleAnalyticsId) ? googleAnalyticsId : null;
  const pixel = metaPixelId && META_PIXEL_RE.test(metaPixelId) ? metaPixelId : null;
  return (
    <>
      {ga && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="webineer-ga" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga}');`}
          </Script>
        </>
      )}
      {pixel && (
        <Script id="webineer-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}
