import { faPaypal } from '@fortawesome/free-brands-svg-icons'
import { faBuildingColumns, faHandHoldingHeart, faReceipt } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { BTN_PRIMARY, SectionHeading } from '../../components/ui'
import { epcPayload, formatIban, qrSvg } from '../../lib/epcQr'

export type DonateBlock = {
  blockType: 'donate'
  tag?: string | null
  heading?: string | null
  intro?: string | null
  bank?: {
    holder?: string | null
    bankName?: string | null
    iban?: string | null
    bic?: string | null
    reference?: string | null
  } | null
  paypalUrl?: string | null
  betterplaceUrl?: string | null
  receipt?: string | null
}

const CARD = 'flex flex-col gap-4 rounded-[12px] border border-line bg-card p-5'
const BTN = `inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-[8px] px-4 text-[15px] font-bold ${BTN_PRIMARY}`
const H3 = 'm-0 flex items-center gap-2 font-sans text-[18px] font-bold text-ink'

/** A QR code on a white tile (scannable in dark mode too). */
function Qr({ text, label }: { text: string; label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className="w-[148px] shrink-0 rounded-[8px] bg-creme p-1.5 [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG generated on the server from our own CMS fields (lib/epcQr)
      dangerouslySetInnerHTML={{ __html: qrSvg(text) }}
    />
  )
}

function Row({ k, v }: { k: string; v?: string | null }) {
  if (!v) return null
  return (
    <div className="grid gap-0.5 border-b border-line py-1.5 last:border-b-0 sm:grid-cols-[110px_1fr] sm:gap-2">
      <dt className="text-[14px] text-muted">{k}</dt>
      <dd className="m-0 font-mono text-[14px] break-words text-ink">{v}</dd>
    </div>
  )
}

export function DonateComponent({ tag, heading, intro, bank, paypalUrl, betterplaceUrl, receipt }: DonateBlock) {
  const giro =
    bank?.holder && bank.iban
      ? epcPayload({ name: bank.holder, iban: bank.iban, bic: bank.bic, reference: bank.reference })
      : null
  const paypal = paypalUrl?.trim()
  const betterplace = betterplaceUrl?.trim()

  return (
    <section className="pt-11 first:pt-0">
      <SectionHeading tag={tag ?? undefined} heading={heading ?? undefined} className="mb-4" />
      {intro ? <p className="m-0 mb-6 max-w-[62ch] text-[16.5px] leading-[1.7] text-ink">{intro}</p> : null}

      <div className="grid gap-5 md:grid-cols-2">
        {bank?.iban ? (
          <div className={`${CARD} md:col-span-2`}>
            <h3 className={H3}>
              <FontAwesomeIcon icon={faBuildingColumns} className="h-[1em] w-[1em] text-brand-text" aria-hidden />
              Überweisung
            </h3>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              {giro ? (
                <div className="flex flex-col items-start gap-2">
                  <Qr text={giro} label="QR-Code für die Überweisung (GiroCode)" />
                  <p className="m-0 max-w-[148px] text-[14px] leading-[1.4] text-muted">
                    Mit der Banking-App scannen, Betrag eintragen, fertig.
                  </p>
                </div>
              ) : null}
              <dl className="m-0 min-w-0 flex-1">
                <Row k="Empfänger" v={bank.holder} />
                <Row k="IBAN" v={formatIban(bank.iban)} />
                <Row k="BIC" v={bank.bic} />
                <Row k="Bank" v={bank.bankName} />
                <Row k="Verwendung" v={bank.reference} />
              </dl>
            </div>
          </div>
        ) : null}

        {paypal ? (
          <div className={CARD}>
            <h3 className={H3}>
              <FontAwesomeIcon icon={faPaypal} className="h-[1em] w-[1em] text-brand-text" aria-hidden />
              PayPal
            </h3>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <Qr text={paypal} label="QR-Code zur PayPal-Spende" />
              <div className="flex flex-col gap-3">
                <p className="m-0 text-[15px] leading-[1.5] text-ink">
                  Mit PayPal-Konto, Kreditkarte oder Lastschrift, auch vom Handy aus.
                </p>
                <a href={paypal} target="_blank" rel="noopener noreferrer" className={BTN}>
                  Mit PayPal spenden
                </a>
              </div>
            </div>
          </div>
        ) : null}

        {betterplace ? (
          <div className={CARD}>
            <h3 className={H3}>
              <FontAwesomeIcon icon={faHandHoldingHeart} className="h-[1em] w-[1em] text-brand-text" aria-hidden />
              betterplace.org
            </h3>
            <p className="m-0 text-[15px] leading-[1.5] text-ink">
              Über die gemeinnützige Spendenplattform, per Lastschrift, Karte oder PayPal. Den Spendenbeleg schickt
              betterplace dir per E-Mail.
            </p>
            <a href={betterplace} target="_blank" rel="noopener noreferrer" className={BTN}>
              Zu betterplace
            </a>
          </div>
        ) : null}
      </div>

      {receipt ? (
        <div className="mt-5 flex gap-3 rounded-[12px] bg-fond px-5 py-4 text-[15px] leading-[1.6] text-ink">
          <FontAwesomeIcon icon={faReceipt} className="mt-1 h-[1em] w-[1em] shrink-0 text-brand-text" aria-hidden />
          <p className="m-0 whitespace-pre-line">{receipt}</p>
        </div>
      ) : null}
    </section>
  )
}
