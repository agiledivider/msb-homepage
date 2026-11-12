import { a, br, doc, h2, p, t, ul } from './lexical'

/* Datenschutzerklärung — a DSGVO baseline. Covers the processing this site
   actually does today (hosting server-logs, e-mail contact, no tracking, local
   fonts). MUST be extended if analytics, a newsletter, embedded third-party
   content or cookies are added. Not legal advice. */

const datenschutzBody = doc([
  h2('Verantwortlicher'),
  p(
    t('Verantwortlich für die Datenverarbeitung auf dieser Website ist:'),
    br(),
    t('MakerSpace Bonn e. V.'),
    br(),
    t('Kennedyallee 18, 53175 Bonn'),
    br(),
    t('E-Mail: '),
    a('office@makerspacebonn.de', 'mailto:office@makerspacebonn.de'),
  ),

  h2('Datenschutzbeauftragter'),
  p(
    t(
      'Wir haben für unseren Verein einen Datenschutzbeauftragten bestellt. Bei Fragen zum Datenschutz erreichen Sie ihn unter:',
    ),
    br(),
    t('Datenschutzbeauftragter des MakerSpace Bonn e. V.'),
    br(),
    t('Kennedyallee 18, 53175 Bonn'),
    br(),
    t('E-Mail: '),
    a('datenschutz@makerspacebonn.de', 'mailto:datenschutz@makerspacebonn.de'),
  ),

  h2('Grundsätzliches'),
  p(
    t(
      'Wir verarbeiten personenbezogene Daten nur im Rahmen der gesetzlichen Bestimmungen (DSGVO, BDSG) und nur, soweit dies für den Betrieb dieser Website und unserer Vereinsarbeit erforderlich ist. Eine Weitergabe an Dritte erfolgt nicht ohne Rechtsgrundlage.',
    ),
  ),

  h2('Hosting'),
  p(
    t(
      'Diese Website wird bei einem externen Dienstleister gehostet. Die im Rahmen der Nutzung erfassten personenbezogenen Daten werden auf dessen Servern gespeichert. Unser Hoster ist:',
    ),
    br(),
    t('Hetzner Online GmbH'),
    br(),
    t('Industriestr. 25, 91710 Gunzenhausen'),
    br(),
    t('Deutschland'),
  ),
  p(
    t(
      'Der Einsatz des Hosters erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer sicheren, stabilen und effizienten Bereitstellung unseres Online-Angebots). Mit dem Hoster haben wir einen Vertrag über Auftragsverarbeitung (AVV) nach Art. 28 DSGVO geschlossen; die Verarbeitung erfolgt weisungsgebunden. Die Server stehen in Deutschland.',
    ),
  ),

  h2('Aufruf der Website / Server-Logfiles'),
  p(
    t(
      'Beim Aufruf dieser Website erhebt der Hosting-Provider automatisch Informationen in sogenannten Server-Logfiles, die Ihr Browser übermittelt:',
    ),
  ),
  ul([
    'IP-Adresse des anfragenden Geräts',
    'Datum und Uhrzeit des Zugriffs',
    'aufgerufene Seite bzw. Datei',
    'übertragene Datenmenge',
    'verwendeter Browsertyp und -version',
    'Betriebssystem und Referrer-URL',
  ]),
  p(
    t(
      'Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem sicheren und stabilen Betrieb der Website). Die Logdaten werden nach kurzer Zeit gelöscht, soweit sie nicht zur Abwehr von Angriffen benötigt werden.',
    ),
  ),

  h2('SSL-/TLS-Verschlüsselung'),
  p(
    t(
      'Diese Seite nutzt aus Sicherheitsgründen eine SSL- bzw. TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie am „https://" in der Adresszeile Ihres Browsers.',
    ),
  ),

  h2('Kontaktaufnahme'),
  p(
    t(
      'Wenn Sie uns per E-Mail oder Telefon kontaktieren, werden Ihre Angaben zur Bearbeitung der Anfrage und für den Fall von Anschlussfragen gespeichert. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Anbahnung/Erfüllung) bzw. lit. f DSGVO (berechtigtes Interesse an der Beantwortung). Die Daten werden gelöscht, sobald sie nicht mehr erforderlich sind.',
    ),
  ),

  h2('Ihre Rechte'),
  p(t('Ihnen stehen im Rahmen der gesetzlichen Vorgaben jederzeit folgende Rechte zu:')),
  ul([
    'Auskunft über die zu Ihnen gespeicherten Daten (Art. 15 DSGVO)',
    'Berichtigung unrichtiger Daten (Art. 16 DSGVO)',
    'Löschung (Art. 17 DSGVO)',
    'Einschränkung der Verarbeitung (Art. 18 DSGVO)',
    'Datenübertragbarkeit (Art. 20 DSGVO)',
    'Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)',
  ]),
  p(
    t(
      'Zudem haben Sie das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Für uns zuständig ist die Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen (LDI NRW), Kavalleriestraße 2–4, 40213 Düsseldorf.',
    ),
  ),

  h2('Cookies, Reichweitenmessung & Schriftarten'),
  p(
    t(
      'Diese Website setzt derzeit keine Cookies zu Analyse- oder Marketingzwecken und keine Drittanbieter-Tracking-Dienste ein. Verwendete Schriftarten werden lokal von unserem Server ausgeliefert; es besteht dabei keine Verbindung zu einem externen Font-Anbieter.',
    ),
  ),
])

/** The Datenschutz page document (pageIntro header + prose body). */
export const datenschutzPage = {
  title: 'Datenschutz',
  slug: 'datenschutz',
  _status: 'published' as const,
  layout: [
    {
      blockType: 'pageIntro' as const,
      tag: 'DATENSCHUTZ',
      tagColor: 'green' as const,
      meta: 'Datenschutzerklärung nach DSGVO',
      headline: 'Datenschutz',
      lede: 'Wie wir mit deinen personenbezogenen Daten umgehen.',
    },
    { blockType: 'prose' as const, body: datenschutzBody as never },
  ],
}
