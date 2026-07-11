import type { LegacyBlock } from './lexical'

/* -------------------------------------------------------------------------
   Migrated "Aktuelles" articles from the old Joomla site (makerspacebonn.de).
   Each carries its `legacyId` (the old Joomla article id) so the old URLs
   /?view=article&id=<legacyId>:… can 301-redirect to the new /blog|events/{slug}
   (see src/lib/legacyRedirects.ts + src/proxy.ts). Slugs are kept 1:1 with the
   old ones for URL continuity. Bodies are faithful to the originals.
   Images live in uploads/legacy/ (seeded into the media collection).
   ------------------------------------------------------------------------- */

export type LegacyEvent = {
  kind: 'event'
  legacyId: number
  slug: string
  title: string
  image?: string
  date: string // ISO, day-only (time-of-day comes from timeLabel)
  endDate?: string
  timeLabel?: string
  location?: string
  category?: string
  tagColor?: 'green' | 'orange' | 'neutral'
  body: LegacyBlock[]
}

export type LegacyPost = {
  kind: 'blog'
  legacyId: number
  slug: string
  title: string
  image?: string
  publishedAt: string
  body: LegacyBlock[]
}

export type LegacyArticle = LegacyEvent | LegacyPost

const d = (iso: string) => `${iso}T12:00:00.000Z`

export const legacyArticles: LegacyArticle[] = [
  {
    kind: 'event',
    legacyId: 374,
    slug: 'gast-veranstaltung-132-scrumtisch-bonn',
    title: 'Gast-Veranstaltung 132. Scrumtisch Bonn',
    image: 'legacy-374.jpg',
    date: d('2026-05-12'),
    timeLabel: 'ab 19',
    category: 'GAST-EVENT · KOSTENLOS',
    tagColor: 'neutral',
    body: [
      { p: 'Am Dienstag, dem 12. Mai 2026 ist der MakerSpace Gastgeber des 132. Scrumtisch Bonn.' },
      {
        p: 'Der Scrumtisch Bonn ist ein monatlich stattfindender offener Treff zum Austausch rund um die Themen Agile, Scrum, Kanban, XP und Co. Die Organisatoren Felix, Peter und Falk freuen sich auf einen inspirierenden Abend mit spannenden Gesprächen und neuen Impulsen.',
      },
      {
        p: 'Uhrzeit und Ablauf: Get-Together ab 19.00 Uhr, Open-Space zwischen 19:30 Uhr und 22:00 Uhr und anschließende Möglichkeit zum individuellen Austausch.',
      },
      { p: 'Die Teilnahme ist für Interessierte, Gäste und Mitglieder kostenlos.' },
      {
        p: 'Eine vorherige Anmeldung über [Meetup](https://www.meetup.com/scrumtisch-bonn/events/314521258/) oder [LinkedIn](https://www.linkedin.com/events/7454785901043347456/) ist erwünscht.',
      },
      {
        p: 'Für Mitglieder ist währenddessen grundsätzlich geöffnet, die Veranstaltung steht jedoch im Vordergrund, deshalb bitten wir um entsprechende Rücksichtnahme.',
      },
    ],
  },
  {
    kind: 'event',
    legacyId: 373,
    slug: 'schmieden-leicht-gemacht-101-am-29-04-2026',
    title: 'Schmieden leicht gemacht - 101 am 29.04.2026',
    image: 'legacy-373.jpg',
    date: d('2026-04-29'),
    timeLabel: '14–19',
    location: 'MakerSpace Innenhof · Kennedyallee 18',
    category: 'WORKSHOP · TICKET · 10 €',
    tagColor: 'orange',
    body: [
      {
        p: 'Ein herzliches Willkommen an alle die schon immer mal selbst etwas mit den eigenen zwei Händen schmieden wollten!',
      },
      {
        p: 'Im Makerspace es einen Anfängerkurs (ab 18) bei dem ihr die Grundlagen des Schmiedens und wichtige Schutzmaßnahmen kennenlernt. Anschließend werdet ihr mit eurem eigenen kleinen Werkstück eine Kleinigkeit selber schmieden können. Wir werden wahrscheinlich aus alten Nägeln Ringe herstellen. Aber auch Kettenglieder, Broschen, Haarnadeln oder kleiderhaken. Eurer Kreativität sind keine Grenzen gesetzt.',
      },
      { p: 'Wir freuen uns auf euch.' },
      {
        p: 'Termine: Mittwoch, 29.04.2026 – zwei Zeitfenster: 14:00-16:30 Uhr und 16:30-19:00 Uhr. Ort: Makerspace Innenhof. Preis: 10 € pro Ticket (ab 18).',
      },
      { p: 'Tickets: [tickets.makerspacebonn.de](https://tickets.makerspacebonn.de/msb/x4c78-5/)' },
    ],
  },
  {
    kind: 'event',
    legacyId: 372,
    slug: 'teckids-campdays-im-makerspace-25-04-26-04-2026',
    title: 'Teckids Campdays im Makerspace (25.04 - 26.04.2026)',
    image: 'legacy-372.png',
    date: d('2026-04-25'),
    endDate: d('2026-04-26'),
    timeLabel: 'ganztägig',
    category: 'CAMP · EXTERN',
    tagColor: 'neutral',
    body: [
      {
        p: 'Die Campdays im April 2026 finden im MakerSpace Bonn statt. Kommt zum zweitägigen Barcamp oder zum Kennenlernen am Samstagnachmittag!',
      },
      {
        p: 'Die Campdays sind das Aktiven-Barcamp der Teckids-Gemeinschaft. Hier treffen sich alle, die in der Gemeinschaft aktiv sind, regelmäßig für ein Wochenende für gemeinsame Themen-Sessions, Freizeit und mehr. Auch Interessierte, die (noch) nicht regelmäßig dabei sind, können mitmachen.',
      },
      {
        p: 'Einen Eindruck von den Campdays gibt es im [Blog-Post der Sommer-Campdays 2024](https://teckids.org/blog/2024/06/campdays/) oder in dem von den [Campdays in Osnabrück](https://teckids.org/blog/2026/03/campdays/).',
      },
      {
        p: 'Das Wochenende wird primär von und für die etwa 25 aktiven Kinder, Jugendlichen und Erwachsenen organisiert, die sich regelmäßig treffen, um sich mit Themen rund um Teckids und seine Ziele und Werte auseinanderzusetzen. Es kann aber auch jede*r andere teilnehmen – man sollte sich für die Themen der Teckids-Gemeinschaft interessieren und am besten schon ein bisschen Erfahrung mit Barcamps haben.',
      },
      {
        p: 'Wer noch nicht "bereit" für das ganze Barcamp ist, kann auch als Gast beim offenen Nachmittag am Samstag zu Besuch kommen.',
      },
      {
        p: 'Weiteres unter: [teckids.org/blog/2026/04/einladung-campdays](https://teckids.org/blog/2026/04/einladung-campdays/)',
      },
    ],
  },
  {
    kind: 'event',
    legacyId: 371,
    slug: 'freecad-workshop-webinar-fuer-makerspaces-und-erfinder-am-28-04-2026',
    title: 'FreeCAD Workshop (Webinar) für Makerspaces und Erfinder am 28.04.2026',
    image: 'legacy-371.jpg',
    date: d('2026-04-28'),
    timeLabel: '18–19:30',
    location: 'Online (Google Meet)',
    category: 'WEBINAR · ONLINE · KOSTENLOS',
    tagColor: 'orange',
    body: [
      {
        p: 'Aleksander Sadowski gibt am 28.04.2026 von 18:00 - 19:30 Uhr eine Einführung in FreeCAD für den 3D-Druck. Es ist keine Anmeldung erforderlich.',
      },
      {
        p: 'Was ist FreeCAD? FreeCAD ist ein kostenloser, quelloffener 3D-CAD-Modellierer für präzise Konstruktion und technische Kreativität. FreeCAD ist das mächtigste klassische 3D CAD Programm was umsonst und als Open Source verfügbar ist. Es läuft unter Windows / Mac und sogar Linux.',
      },
      {
        p: 'Wer ist Aleksander? Er ist Erfinder und arbeitet als FreeCAD-Berater für Firmen und ist auch als FreeCAD-Advokat unterwegs. Und außerdem hat er vor kurzem ein Einsteigerbuch zu FreeCAD veröffentlicht. Wer also etwas über 3D CAD mit Open Source Software lernen will ist bei Alexander an der richtigen Adresse!',
      },
      {
        p: 'Das Webinar findet online über [Google Meet](https://meet.google.com/rvh-owgi-kvd) statt. Weitere Links: [Website](https://alsado.de/), [FreeCAD Beginners Handbook](https://www.amazon.de/FreeCAD-Beginners-Handbook-Aleksander-Sadowski/dp/B0G9HXYYGX), [Kalender](https://calendar.app.google/vHHjqiaVdiCc9aJA8), [Twitter/X](https://x.com/AleksanderSado1).',
      },
    ],
  },
  {
    kind: 'event',
    legacyId: 370,
    slug: 'workshop-grundlagen-cnc-fraese-einweisung-yeti-2',
    title: 'Workshop Grundlagen CNC-Fräse / Einweisung Yeti (19.03.2026)',
    image: 'legacy-370.jpg',
    date: d('2026-03-19'),
    timeLabel: '19–21',
    category: 'WORKSHOP · NUR FÜR MITGLIEDER',
    tagColor: 'neutral',
    body: [
      {
        p: 'Am 19.03.2026 (Donnerstag) findet von 19:00 – 21:00 Uhr ein Workshop zum CNC-Fräsen statt. Dort erlernt Ihr die Grundlagen, wie die Wahl der richtigen Fräser und der Fräsparameter (Drehzahl, Vorschub usw.), das Erstellen von Fräsprogrammen mit Estl-CAM oder Fusion 360 sowie die Bedienung unserer Yeti-Smartbench CNC-Fräse (für Holz, Acrylglas usw.) im der Praxis inkl. Fräßvorführung an einem kleinen Beispielprojekt. Die Teilnahme am Workshop ist gleichzeitig eine Unterweisung für die Yeti, sodass ihr diese danach selbstständig benutzen könnt und dürft.',
      },
      { p: 'Die Teilnahme ist kostenlos für Mitglieder. Anmeldung bei bernd (at) makerspacebonn.de' },
    ],
  },
  {
    kind: 'event',
    legacyId: 369,
    slug: 'workshop-grundlagen-cnc-fraese-einweisung-yeti',
    title: 'Workshop Grundlagen CNC-Fräse / Einweisung Yeti (29.01.2026)',
    image: 'legacy-369.jpg',
    date: d('2026-01-29'),
    timeLabel: '18–21',
    category: 'WORKSHOP · TICKET · MITGLIEDER',
    tagColor: 'neutral',
    body: [
      {
        p: 'Am 29.01.2026 (Donnerstag) findet von 18:00 – 21:00 Uhr ein Workshop zum CNC-Fräsen statt. Dort erlernt Ihr die Grundlagen, wie die Wahl der richtigen Fräser und der Fräsparameter (Drehzahl, Vorschub usw.), das Erstellen von Fräsprogrammen mit Estl-CAM oder Fusion 360 sowie die Bedienung unserer Yeti-Smartbench CNC-Fräse (für Holz, Acrylglas usw.) im der Praxis inkl. Fräßvorführung an einem kleinen Beispielprojekt. Die Teilnahme am Workshop ist gleichzeitig eine Unterweisung für die Yeti, sodass ihr diese danach selbstständig benutzen könnt und dürft.',
      },
      {
        p: 'Die Teilnahme ist kostenlos und nur mit gültigem Ticket für Mitglieder möglich (max. 8 Teilnehmer). Tickets gibt es hier: [tickets.makerspacebonn.de](https://tickets.makerspacebonn.de/msb/wujua/)',
      },
    ],
  },
  {
    kind: 'event',
    legacyId: 368,
    slug: 'workshop-amugurumi-haekeln-fuer-anfaenger-deutsch-englisch',
    title: 'Workshop Amugurumi-Häkeln für Anfänger (deutsch/englisch)',
    image: 'legacy-368.jpg',
    date: d('2026-02-07'),
    timeLabel: '14–17',
    category: 'WORKSHOP · TICKET',
    tagColor: 'orange',
    body: [
      {
        p: 'Am 07.02.2026 (Samstag) von 14:00 – 17:00 Uhr findet ein Workshop Amugurumi-Häkeln für Anfänger (deutsch/englisch) statt',
      },
      {
        p: 'Wir lernen die Grundlagen des Häkelns und häkeln eine kleine Schnecke! 🐌 Alle für das Amugurumi-Häkeln wichtige Techniken werden vermittelt.',
      },
      {
        p: 'Der Workshop ist auf Englisch und Deutsch, für Materialien ist gesorgt. Es sind keine Vorkenntnisse erforderlich, aber auch Leute mit Vorkenntnissen sind herzlich willkommen.',
      },
      {
        p: 'Die Teilnahme ist kostenpflichtig und nur mit gültigem Ticket, sowohl für Mitglieder als auch für interessierte Gäste, möglich.',
      },
      { p: 'Tickets gibt es hier: [tickets.makerspacebonn.de](https://tickets.makerspacebonn.de/msb/s9as8/)' },
      {
        p: 'Für Mitglieder ist währenddessen grundsätzlich geöffnet, die Veranstaltung steht jedoch im Vordergrund, deshalb bitten wir um entsprechende Rücksichtnahme.',
      },
    ],
  },
  {
    kind: 'event',
    legacyId: 367,
    slug: 'workshop-seifenherstellung-10-01-2026',
    title: 'Workshop Seifenherstellung neuer Termin: 10.01.2026',
    image: 'legacy-367.png',
    date: d('2026-01-10'),
    timeLabel: '15–17',
    category: 'WORKSHOP · TICKET',
    tagColor: 'orange',
    body: [
      {
        p: 'Wolltest Du schon immer wissen, wie Seife hergestellt wird? Dann komm zu unserem hands-on-Worshop in englischer Sprache (Deutsche Übersetzung wenn notwendig) am 10.01.2026 von 15:00 - 17:00 Uhr. In diesem Kurs stellen wir Seife aus Kokosfett und Lauge her, die wir aus Sicherheitsgründen im Voraus vorbereiten. Sie können Ihre eigene Seife in Silikonformen gießen und eine einzigartige Kreation mit nach Hause nehmen! Die Teilnahme ist kostenpflichtig und nur mit gültigem Ticket sowohl für Mitglieder als auch für interessierte Gäste möglich. Tickets gibt es hier: [tickets.makerspacebonn.de](https://tickets.makerspacebonn.de/msb/x3c78-6/)',
      },
      {
        p: 'Für Mitglieder ist währenddessen grundsätzlich geöffnet, die Veranstaltung steht jedoch im Vordergrund, deshalb bitten wir um entsprechende Rücksichtnahme.',
      },
    ],
  },
  {
    kind: 'event',
    legacyId: 366,
    slug: 'workshop-demystifizierung-lebkuchen-backen',
    title: 'Workshop Demystifizierung Lebkuchenhaus bauen',
    image: 'legacy-366.jpg',
    date: d('2025-12-06'),
    timeLabel: '13–20',
    category: 'WORKSHOP · TICKET · 15 €',
    tagColor: 'orange',
    body: [
      {
        p: 'Tauche am Nikolaustag mit Bernd ein in die weihnachtliche Welt des Lebkuchenhausbaus und gestalte dein eigenes kleines Meisterwerk aus süßem Teig, Zuckerguss und Fantasie. In diesem Workshop bauen wir zusammen aus Mehl, Honig, und ein paar Gewürzen Schritt für Schritt, dein weihnachtliches reich verziertes Haus aus Honigkuchen. - ganz gleich, ob du zum ersten Mal in der Backstube stehst oder deine Tülle bereits liebevoll beim Vorname nennst. Alle Materialien werden gestellt, du brauchst nur gute Laune und Lust am Mitmachen. Melde dich jetzt an und gib dem Zauber der Weihnacht ein Zuhause.',
      },
      {
        p: 'Termin: Samstag, 06.12. (Nikolaustag) von 13:00 – 20:00 Uhr, max. 12 Teilnehmer. Preis: 15 € pro Person. Die Teilnahme ist kostenpflichtig und nur mit gültigem Ticket sowohl für Mitglieder als auch für interessierte Gäste möglich. Tickets: [tickets.makerspacebonn.de](https://tickets.makerspacebonn.de/msb/nikolaus25/)',
      },
    ],
  },
  {
    kind: 'event',
    legacyId: 365,
    slug: 'gast-veranstaltung-124-scrumtisch-bonn',
    title: 'Gast-Veranstaltung 124. Scrumtisch Bonn',
    image: 'legacy-365.jpg',
    date: d('2025-09-09'),
    timeLabel: 'ab 19',
    category: 'GAST-EVENT · KOSTENLOS',
    tagColor: 'neutral',
    body: [
      { p: 'Am Dienstag, dem 09.09.25 ist der MakerSpace Gastgeber des 124. Scrumtisch Bonn.' },
      {
        p: 'Der Scrumtisch Bonn ist ein monatlich stattfindender offener Treff zum Austausch rund um die Themen Agile, Scrum, Kanban, XP und Co. Die Organisatoren Felix und Falk freuen sich auf einen inspirierenden Abend mit spannenden Gesprächen und neuen Impulsen. Mehr Informationen über den Scrumtisch findet Ihr auf [scrumtischbonn.wordpress.com](https://scrumtischbonn.wordpress.com/)',
      },
      { p: 'Uhrzeit und Ablauf:' },
      {
        ul: [
          'Get-Together ab 19.00 Uhr',
          'Open-Space zwischen 19:30 Uhr und 22:00 Uhr',
          'Anschließende Möglichkeit zum individuellen Austausch',
        ],
      },
      {
        p: 'Die Teilnahme ist für Interessierte, Gäste und Mitglieder kostenlos. Eine vorherige Anmeldung über [Meetup](https://www.meetup.com/scrumtisch-bonn/events/310662217/) oder [LinkedIn](https://www.linkedin.com/events/7364904721385459712/) ist erwünscht.',
      },
      {
        p: 'Für Mitglieder ist währenddessen grundsätzlich geöffnet, die Veranstaltung steht jedoch im Vordergrund, deshalb bitten wir um entsprechende Rücksichtnahme.',
      },
    ],
  },
  {
    kind: 'event',
    legacyId: 364,
    slug: 'workshop-reihe-naehen',
    title: 'Workshop-Reihe Nähen',
    image: 'legacy-364.jpg',
    date: d('2025-09-04'),
    endDate: d('2025-11-08'),
    timeLabel: 'mehrteilig',
    category: 'WORKSHOP-REIHE',
    tagColor: 'green',
    body: [
      {
        p: 'Über unseren Offenen Handarbeitstreff (dieser ist immer am ersten Sonntag im Monat) hinaus werden demnächst Basic-Workshops zum Thema Nähen angeboten. Ziel ist es, die vorhandenen kürzlich angeschafften Nähmaschinen besser kennenzulernen und Grundlagen des Nähens zu erwerben, die Euch dabei helfen, Eure Projekte umzusetzen. Dies kann sowohl die Reparatur von Textilien sein, Upcycling-Projekte und natürlich auch individuell hergestellte Kleidung und Accessoires. Basis für all dies ist aber ein gewisses Grundlagenwissen, welches in diesen Workshops vermittelt werden soll.',
      },
      { h2: 'Teil 1 - Textile Grundlagen' },
      { p: '04.09.25 (Donnerstag) von 19 Uhr bis 21 Uhr (für Mitglieder)' },
      {
        p: 'Um ein Projekt zu planen ist es schön ein zumindest rudimentäres Grundlagenwissen zu haben. An diesem Abend klären wir was es für Textilfasern gibt und wie man diese erkennt, welche Techniken lassen Stoffbahnen daraus entstehen und: Was für Anforderungen ergeben sich beim weiterverarbeiten daraus. Nähmaschine, Nadelwahl, Fadenwahl, ggf. Verwendung von Vlieseline.',
      },
      { h2: 'Teil 2 - Hardware: Materialwahl, Nähmaschinenkunde' },
      { p: '11.09.25 (Donnerstag) von 19 Uhr bis 21 Uhr (für Mitglieder)' },
      {
        p: 'Genauere Betrachtung der Nadelwahl, Nähmaschinenkunde und das Wichtigste: Fadenspannung an diversen Maschinen einstellen (einschließlich Overlock).',
      },
      { h2: 'Teil 3 - Workshop Nähen für Anfänger und Wiedereinsteiger' },
      { p: '08.11.25 (Samstag) von 10 Uhr bis 16 Uhr (für Gäste und Mitglieder, Ticket erforderlich)' },
      {
        p: 'Nähen an diversen Nähmaschinen für Anfänger und Wiedereinsteiger. Wir schauen die vorhandenen Nähmaschinen an und probieren aus, was die Maschinen können. Ihr könnt erste Nähte nähen und schon ein Miniprojekt angehen. Dazu nutzen wir die Stoffreste, die wir haben. Eigene Stoffe können mitgebracht werden und Materialspenden sind willkommen.',
      },
      { p: 'Ticket für Teil 3: [tickets.makerspacebonn.de](https://tickets.makerspacebonn.de/msb/btmdv/)' },
    ],
  },
  {
    kind: 'event',
    legacyId: 363,
    slug: 'die-telekom-feiert-ihren-30-geburtstag-und-wir-feiern-mit',
    title: 'Die Telekom feiert ihren 30. Geburtstag - und wir feiern mit!',
    image: 'legacy-363.jpg',
    date: d('2025-07-11'),
    endDate: d('2025-07-12'),
    timeLabel: 'ganztägig',
    location: 'Bonn (Telekom-Zentrale & Innenstadt)',
    category: 'EXTERN · MITMACHEN',
    tagColor: 'neutral',
    body: [
      {
        p: 'Die Telekom feiert am 11. und 12. Juli ihren 30. Geburtstag in Bonn und wir sind mit dabei! Am Freitag, dem 11. Juli 2025 ab 10 Uhr lädt die Telekom zum Tag der offenen Tür in ihre Zentrale in der Friedrich-Ebert-Allee 140 in Bad Godesberg. Am Samstag, dem 12. Juli 2025 verwandelt sich die Bonner Innenstadt in einen magentafarbenen Erlebnispfad: Vom Münsterplatz bis nach Beuel. Ihr findet den MakerSpace am Freitag auf dem Innenhof der Zentrale, als Teil des Projekts [digital@school](https://www.digitalatschool.de/) und am Samstag zeigen wir auf dem Remigiusplatz, welche Angebote der MakerSpace für Bonn bereithält und wie unser ehrenamtliches Engagement im Bereich MINT und Bildung nachhaltig die Region stärkt - gefördert durch die Telekom. Eingeladen sind alle – von Klein bis Groß.',
      },
    ],
  },
  {
    kind: 'event',
    legacyId: 362,
    slug: 'handarbeitstreff-am-05-07-2025',
    title: 'Handarbeitstreff am 05.07.2025',
    image: 'legacy-362.jpg',
    date: d('2025-07-05'),
    timeLabel: '10–14',
    category: 'OFFENER TREFF · FÜR ALLE',
    tagColor: 'green',
    body: [
      {
        p: 'In diesem Monat abweichend am Samstag, den 05.07.2025 von 10:00 bis 14:00 Uhr findet im Makerspace der Handarbeitstreff statt. Diese Veranstaltung bietet nicht nur die Möglichkeit, gemeinsam kreativ zu sein, sondern legt auch einen besonderen Fokus auf Nachhaltigkeit und Ressourcenschonung indem Textilien repariert und upgecyclet werden können.',
      },
      { h2: 'Was erwartet Dich?' },
      {
        ul: [
          'Geselliges Beisammensein mit Gleichgesinnten (Makerbrunch: Jeder bringt sein eigenes Brunch-Set mit (also Brötchen, Aufschnitt, Käse, Joghurt, Müsli etc.). Kaffee und Geschirr sind natürlich da.)',
          'Austausch von Tipps und Tricks rund ums Handarbeiten',
          'Fachkundige Unterstützung bei Reparaturen von Textilien',
          'Kreative Ideen für Upcycling-Projekte',
        ],
      },
      {
        p: 'Egal ob Du ein Profi mit der Nähnadel bist oder gerade erst die Freude am Handarbeiten entdeckt haben – hier ist jeder willkommen! Erfahrene Handarbeiterinnen und Handarbeiter stehen Dir mit Rat zur Seite, wenn es darum geht, Kleidungsstücke zu reparieren oder alten Textilien neues Leben einzuhauchen.',
      },
      {
        p: 'Darüber hinaus beraten und unterstützen wir auch bei der Reparatur von anderen Alltagsgegenständen. Du kannst unsere Werkstätten (Holz, Metall), 3D Drucker, Elektronikbereich nutzen. Wir leisten Hilfe zur Selbsthilfe.',
      },
    ],
  },
  {
    kind: 'event',
    legacyId: 361,
    slug: 'gast-veranstaltung-ki-schatten',
    title: 'Gast-Veranstaltung KI & Schatten',
    image: 'legacy-361.png',
    date: d('2025-06-21'),
    timeLabel: '9–16',
    category: 'HACKATHON · TICKET',
    tagColor: 'neutral',
    body: [
      {
        p: 'Der MakerSpace fungiert als Gastgeber für einen Hackathon der Stadt Bonn anlässlich des Digitaltages. Das Urban Data Management Team der Stadt lädt zu einer Veranstaltung ein, bei der Teilnehmende Künstliche Intelligenz erleben und "die urbane Datenzukunft Bonns" mitgestalten können.',
      },
      {
        p: 'Die zentrale Frage lautet: "Wie können wir städtische Daten – insbesondere Luftbilder und Verschattungsdaten – mit Methoden der Künstlichen Intelligenz sinnvoll analysieren und sichtbar machen?"',
      },
      {
        p: 'Die Stadt Bonn entwickelt die Urbane Datenplattform (UDP), ein digitales Werkzeug zur Vernetzung offener Daten, Echtzeitinformationen und Geodaten. Dies unterstützt datenbasierte Entscheidungen in Verwaltung, Stadtplanung und Klimaanpassung. Der Hackathon ermöglicht aktive Mitgestaltung dieser digitalen Transformation.',
      },
      {
        p: 'Termin: Samstag, 21. Juni 2025, 09:00–16:00 Uhr. Die Teilnahme (ab 16 Jahren) erfordert gültige Tickets. Der MakerSpace steht Mitgliedern während der Veranstaltung nicht zur Verfügung (geschlossene Veranstaltung). Ticketlink: [eveeno.com](https://eveeno.com/343744340)',
      },
    ],
  },
  {
    kind: 'event',
    legacyId: 360,
    slug: 'workshop-seifenherstellung-13-06-2025',
    title: 'Workshop Seifenherstellung neuer Termin: 09.08.2025',
    image: 'legacy-360.png',
    date: d('2025-08-09'),
    timeLabel: '15–17',
    category: 'WORKSHOP · TICKET',
    tagColor: 'orange',
    body: [
      {
        p: 'Wolltest Du schon immer wissen, wie Seife hergestellt wird? Dann komm zu unserem hands-on-Worshop in englischer Sprache (Deutsche Übersetzung wenn notwendig) am 09.08.2025 von 15:00 - 17:00 Uhr. In diesem Kurs stellen wir Seife aus Kokosfett und Lauge her, die wir aus Sicherheitsgründen im Voraus vorbereiten. Sie können Ihre eigene Seife in Silikonformen gießen und eine einzigartige Kreation mit nach Hause nehmen! Die Teilnahme ist kostenpflichtig und nur mit gültigem Ticket sowohl für Mitglieder als auch für interessierte Gäste möglich. Tickets gibt es hier: [tickets.makerspacebonn.de](https://tickets.makerspacebonn.de/msb/x3c78-5/)',
      },
      {
        p: 'Für Mitglieder ist währenddessen grundsätzlich geöffnet, die Veranstaltung steht jedoch im Vordergrund, deshalb bitten wir um entsprechende Rücksichtnahme.',
      },
    ],
  },
  {
    kind: 'event',
    legacyId: 359,
    slug: 'home-assistant-jam-session',
    title: 'Home Assistant Jam Session',
    image: 'legacy-359.jpg',
    date: d('2025-06-05'),
    timeLabel: 'ab 18',
    category: 'TREFF · FÜR ALLE',
    tagColor: 'green',
    body: [
      {
        p: 'Am Donnerstag, den 5.6.25 um 18:00 Uhr ist es wieder soweit. Die MakerSpacies treffen sich, um sich weiter mit dem Home Assistant und seinen Möglichkeiten auseinanderzusetzen. Wenn Du Dich auch für solche Themen interessierst und bist noch kein Mitglied, dann komm doch einfach mal an einem Montag bei uns schnuppern und werde selbst Mitglied. Oder sprich uns mal in unserem Discord Server an.',
      },
      { p: 'Wir freuen uns auf Eure zahlreiche Teilnahme.' },
    ],
  },
  {
    kind: 'event',
    legacyId: 357,
    slug: 'collective-neurogenisis-community-textilkunstwerk',
    title: 'Collective Neurogenisis - Community-Textilkunstwerk',
    image: 'legacy-357.png',
    date: d('2025-06-07'),
    endDate: d('2025-07-14'),
    timeLabel: 'samstags 15–17',
    category: 'WORKSHOP-REIHE · KOSTENLOS',
    tagColor: 'green',
    body: [
      {
        p: 'Vom 07.06. - 12.07.2025 findet jeweils Samstags von 15:00 Uhr bis 17:00 Uhr Häkelworkshops und Vorträge statt. Gemeinsam werden kleine textile Gehirnzellen-Skulpturen hergestellt, die später zu einer groß angelegten, mehrfarbigen Installation zusammengesetzt werden, die das Gehirn darstellt. Dabei entsteht eine Gemeinschaft rund um Kunst und Neurowissenschaft und viele interessante Aspekte zum Gehirn werden vermittelt.',
      },
      {
        ul: [
          '7. Juni: Eröffnung der Projektphase 9 mit Mini-Vortrag.',
          '14. Juni: regulärer Häkelworkshop.',
          '28. Juni: regulärer Häkelworkshop.',
          '5. Juli: Mini-Vortrag + Häkelworkshop.',
          '14. Juli: regulärer Häkelworkshop.',
        ],
      },
      {
        p: 'Die Teilnahme ist kostenlos und ohne Anmeldung sowohl für Mitglieder als auch für interessierte Gäste möglich.',
      },
    ],
  },
  {
    kind: 'event',
    legacyId: 356,
    slug: 't-shirts-und-co-veranstaltung-nur-fuer-mitglieder',
    title: 'T-Shirts und Co. – Veranstaltung nur für Mitglieder',
    image: 'legacy-356.jpg',
    date: d('2025-05-15'),
    timeLabel: 'ab 19',
    category: 'NUR FÜR MITGLIEDER',
    tagColor: 'neutral',
    body: [
      {
        p: 'Am Donnerstag den 15.5. ist eine Veranstaltung exclusiv für Mitglieder um sich mit dem Thema T-Shirts und Co. zu beschäftigen. Der Workshop beginnt ca. 19:00 Uhr nach dem Mitgliedertreffen.',
      },
      {
        p: 'Wir werden Motive erstellen, aus Folie plotten und auf die Kleidungsstücke pressen. Wir werden uns mit DTF beschäftigen und uns gemeinsam ein paar Motive bestellen (haben leider keinen passenden eigenen Drucker). Wir werden unsere Stickmaschine besser kennenlernen und wahrscheinlich etwas Siebdruck ausprobieren. und vor allem gemeinsam Spass dabei haben.',
      },
      {
        p: 'Wenn Du Dich auch für solche Themen interessierst, komm doch einfach mal an einem Montag bei uns schnuppern und werde selbst Mitglied. Oder sprich uns mal in unserem [Discord Server](https://discord.gg/whu9jsHwAy) an.',
      },
    ],
  },
  {
    kind: 'event',
    legacyId: 355,
    slug: 'teckids-campdays',
    title: 'Teckids Campdays',
    image: 'legacy-355.jpg',
    date: d('2025-05-09'),
    endDate: d('2025-05-11'),
    timeLabel: 'ganztägig',
    category: 'CAMP · EXTERN',
    tagColor: 'neutral',
    body: [
      {
        p: 'Vom 09. bis 11.05.2025 ist der MakerSpace Gastgeber der Teckids Campdays. Die Campdays sind das Aktiven-Barcamp der Teckids-Gemeinschaft. Hier treffen sich alle, die dort aktiv sind, regelmäßig für ein Wochenende für gemeinsame Themen-Sessions, Freizeit und mehr. Mehr Infos gibt es unter: [https://teckids.org/blog/2025/04/einladung-campdays/](https://teckids.org/blog/2025/04/einladung-campdays/) Für Mitglieder ist grundsätzlich geöffnet, die Veranstaltung steht jedoch im Vordergrund, deshalb bitten wir um entsprechende Rücksichtnahme. Genaueres wie immer über Discord #öffnungszeiten.',
      },
    ],
  },
  {
    kind: 'event',
    legacyId: 354,
    slug: 'workshop-home-assistent',
    title: 'Workshop Home-Assistent',
    image: 'legacy-354.png',
    date: d('2025-05-08'),
    timeLabel: 'ab 18',
    category: 'WORKSHOP · MITGLIEDER',
    tagColor: 'neutral',
    body: [
      {
        p: 'Am Donnerstag, den 08.05.2025 um 18:00 Uhr treffen sich Mitglieder des Makerspace, um sich mit dem Home Assistant und seinen Möglichkeiten auseinanderzusetzen. Wir sehen uns die Software an, werden Automatisierungen und Sensoren basteln und einbinden, uns über Plugins und Konfiguration unterhalten, mit eigenen Integrationen angeben und einfach unseren Spass haben. Wenn Du Dich auch für solche Themen interessierst und bist noch kein Mitglied, komm doch einfach mal an einem Montag bei uns schnuppern und werde selbst Mitglied. Oder sprich uns mal in unserem [Discord Server](https://discord.gg/whu9jsHwAy) an.',
      },
    ],
  },
  {
    kind: 'event',
    legacyId: 353,
    slug: 'handarbeitstreff-am-04-05-2025-vorstellung-neue-maschinen',
    title: 'Handarbeitstreff am 04.05.2025 - Vorstellung neue Maschinen',
    image: 'legacy-353.jpg',
    date: d('2025-05-04'),
    timeLabel: '10–14',
    category: 'OFFENER TREFF · FÜR ALLE',
    tagColor: 'green',
    body: [
      {
        p: 'Am Sonntag, den 4. Mai 2025 findet der nächste Handarbeitstreff mit Makerbrunch statt, wie üblich von 10 Uhr an. Bis 14 Uhr sind wir auf jeden Fall da, ggf. auch länger.',
      },
      {
        p: 'Wir stellen die neuen Maschinen vor! Wir sind nun im Besitz von vier Brother Innov-is A65 Nähmaschinen sowie einer Janome MyLock 644D Overlock.',
      },
      { p: 'Wer möchte, kann sie sich gerne erklären lassen und selbst ausprobieren.' },
      {
        p: 'Für den MAkerbrunch gilt: Jeder bringt sein eigenes Brunch-Set mit (also Brötchen, Aufschnitt, Käse, Joghurt, Müsli etc.). Kaffee und Geschirr sind natürlich da.',
      },
      {
        p: 'Darüber hinaus beraten und unterstützen wir auch bei der Reparatur von anderen Alltagsgegenständen. Du kannst unsere Werkstätten (Holz, Metall), 3D Drucker, Elektronikbereich nutzen. Wir leisten Hilfe zur Selbsthilfe.',
      },
      { p: 'Wir freuen uns auf euch!' },
    ],
  },
  {
    kind: 'event',
    legacyId: 352,
    slug: 'kreative-osterzeit-am-12-04-2025',
    title: 'Kreative Osterzeit am 12.04.2025',
    image: 'legacy-352.png',
    date: d('2025-04-12'),
    timeLabel: '10–16',
    category: 'FÜR ALLE · KOSTENLOS',
    tagColor: 'green',
    body: [
      {
        p: 'Wir laden Euch ein in den Makerspace zum Osterbasteln am 12.04 von 10:00 Uhr bsi 16:00 Uhr zu kommen. Was erwartet Euch? Maker Deine persönliche Osterdekorationen.',
      },
      {
        ul: [
          'Filigrane Osteranhänger vom Lasercutter, die Du nach Deinen Wünschen bemalen und personalisieren kannst – vielleicht mit Deinem Namen oder einem besonderen Motiv?',
          'Zauberhafte Origami-Hasen aus Papier, die mit einfachen Falttechniken zum Leben erweckt werden.',
          'Praktische Eierbecher im Scheckkartenformat aus dem 3D-Drucker – ein perfektes Geschenk für Deine Liebsten.',
        ],
      },
      {
        p: 'Lass Deiner Kreativität freien Lauf und nimm selbstgemachte Osterschätze mit nach Hause! Die Teilnahme ist kostenlos, ein Spende ist willkommen.',
      },
    ],
  },
  {
    kind: 'event',
    legacyId: 351,
    slug: 'makerspace-foerdert-geomint-school-2',
    title: 'Makerspace fördert GeoMINT@school',
    date: d('2025-04-02'),
    timeLabel: '10–14',
    category: 'EXTERN · MINT',
    tagColor: 'neutral',
    body: [
      {
        p: 'Wie werden junge Menschen nachhaltig für Geo- und MINT-Berufe begeistert? Dazu gibt es die Initiative GeoMint@School',
      },
      {
        p: 'Die Wirtschaftsförderung der Stadt Bonn hat gemeinsam mit der IHK Bonn/Rhein-Sieg eine Workshop-Reihe organisiert, die unter der Leitfrage „Wie kann die Geobusiness-Region Bonn den Prozess zur digitalen Stadt Bonn weiterentwickeln" steht. Ein zentrales Thema ist der Nachwuchskräftemangel in der gesamten Branche. Im Dezember 2022 traf sich die Gruppe erstmals zu einem eigenen Workshop im MakerSpace Bonn.. Die hohe Teilnehmendenzahl und die gute und konstruktive Stimmung zeigten, dass die Initiative auf dem richtigen Weg ist und bereits viele Unterstützende aus Bildungseinrichtungen und Unternehmen gewonnen hat.',
      },
      {
        p: 'Im Rahmen einer Berufsfelderkundungsveranstaltung zum Thema Berufe zum Thema "Geoinformationen & Co." der Initiative GeoMINT@school der Wirtschaftsförderung der Stadt Bonn treffen sich am 02. April 2025 von 10:00 - 14:00 Uhr im Makerspace Bonn 50 SuS um bei spannenden Vorträgen Informationen zu diesem Berufen zu erhalten',
      },
      { p: 'Wir freuen uns auf weitere Treffen im Makerspace. Die MINT-Föderung ist uns ein besonders Anliegen' },
    ],
  },
  {
    kind: 'event',
    legacyId: 350,
    slug: 'tdd-test-driven-development-workshop',
    title: 'TDD (Test Driven Development) Workshop',
    image: 'legacy-350.jpg',
    date: d('2025-03-26'),
    timeLabel: '19–21',
    category: 'WORKSHOP · TICKET',
    tagColor: 'orange',
    body: [
      {
        p: 'Du entwickelst Software und hast schon mal was von TDD gehört und hast Lust mal was dazu zu lernen und es mal auszuprobieren? TDD (Test Driven Development) kommt aus den Praktiken des eXtreme Programming und kann eine extrem hilfreiche Bereicherung des Entwicklungslebens sein. Allerdings ist es auch nicht so einfach, wie es oft verkauft wird. Wenn Dich das Thema interessiert, dann komm zu uns in den Makerspace Bonn und wir schauen uns das mal etwas genauer an. Wir werden uns kurz mit Tests im allgemeinen beschäftigen und dann darauf eingehen, was TDD eigentlich ist und wie man sich da ranwagen kann. Und dann probieren wir es einfach mal in einer TDD Kata aus, in der ihr zu zweit gemeinsam mal eine kleine Programmieraufgabe bearbeitet. Und danach teilen wir noch mal unsere Erfahrungen miteinander. Das ganze dauert etwa 90 Minuten und ihr könnt sowohl als Anfänger oder auch Fortgeschrittene mitmachen.',
      },
      {
        p: 'Was ihr am Besten mitbringt, ist ein Rechner, wo ihr schon folgendes drauf installiert habt. Wir machen mal beispielhaft Javascript und Python:',
      },
      { p: 'Javascript:' },
      {
        ul: [
          'Nodejs installiert',
          'Eine IDE installiert, mit der man arbeiten kann (Visual Studio Code oder Webstorm)',
          'einen Github Account, damit es etwas leichter wird.',
        ],
      },
      { p: 'Python:' },
      {
        ul: [
          'eine aktuelle Python Version',
          'eine IDE installiert. (Visual Studio Code oder PyCharm)',
          'einen Github Account, damit es einfacher wird.',
        ],
      },
      {
        p: 'Falls ihr eine andere Sprache nutzen wollt, geht das auch, das Muster kennt ihr nun ja. Falls Ihr keinen Rechner haben solltet, geht das bitte an, dann machen wir das auch mit einem von unseren möglich.',
      },
    ],
  },
  {
    kind: 'event',
    legacyId: 349,
    slug: 'workshop-seifenherstellung',
    title: 'Workshop Seifenherstellung',
    image: 'legacy-349.png',
    date: d('2025-03-15'),
    timeLabel: '15–18',
    category: 'WORKSHOP · 15 €',
    tagColor: 'orange',
    body: [
      {
        p: 'Wolltest Du schon immer wissen, wie Seife hergestellt wird? Dann komm zu unserem hands-on Workshop in englischer Sprache (Deutsche Übersetzung wenn notwendig) am 15.03.2025 von 15:00 - 18:00 Uhr. In diesem Kurs stellen wir Seife aus Kokosfett und Lauge her, die wir aus Sicherheitsgründen im Voraus vorbereiten. Sie können Ihre eigene Seife in Silikonformen gießen und eine einzigartige Kreation mit nach Hause nehmen!',
      },
      { p: 'Anmeldungen an workshops (at) makerspacebonn.de.' },
      { p: 'Kosten 15 EUR pro person, bar oder per paypal an phillipp (at) makerspacebonn.de für die Materialien' },
    ],
  },
  {
    kind: 'event',
    legacyId: 345,
    slug: 'gem-einsam-das-gesellschaftsspiele-event-im-makerspace-bonn',
    title: 'GEM-einsam – Das Gesellschaftsspiele-Event im Makerspace Bonn',
    image: 'legacy-345.png',
    date: d('2024-11-27'),
    endDate: d('2024-12-18'),
    timeLabel: 'mittwochs 18:30–21',
    category: 'SPIELEABEND · FÜR ALLE',
    tagColor: 'green',
    body: [
      {
        p: 'Du liebst Gesellschaftsspiele und suchst nach Gleichgesinnten? Dann komm vorbei und erlebe unvergessliche Spieleabende in gemütlicher Runde! Wir waren für euch auf der Spielemesse und haben ein paar der unterhaltsamsten, schönsten und spannendsten Gesellschaftsspiele mitgebracht. Ob Strategie, Abenteuer oder Klassiker – es ist für jeden etwas dabei. Natürlich kannst du auch gerne deine eigenen Lieblingsspiele mitbringen! Hier findest Du geneigte Mitspieler.',
      },
      { p: 'Wann? An den folgenden Mittwochen: 27.11., 4.12., 11.12. und 18.12. Jeweils von 18:30 Uhr bis 21:00 Uhr.' },
      { p: 'Wo? Bei uns im MakerSpace Bonn.' },
      {
        p: 'Anmeldung: Damit wir besser planen können, bitten wir um eine kurze E-Mail an oliver.lenburg@makerspacebonn.de, wenn du dabei sein möchtest.',
      },
      { p: 'Auch für Nicht-Mitglieder! Wir freuen uns auf Dich' },
    ],
  },
  {
    kind: 'event',
    legacyId: 344,
    slug: 'makerwochenende-23-und-24-november-2024',
    title: 'Makerwochenende 23. und 24. November 2024',
    image: 'legacy-344.jpg',
    date: d('2024-11-23'),
    endDate: d('2024-11-24'),
    timeLabel: '10–21',
    category: 'MAKER-WOCHENENDE · KOSTENFREI',
    tagColor: 'green',
    body: [
      {
        p: 'Am Samstag, den 23.11 und Sonntag, den 24.11.2024 - jeweils von 10:00 -21:00 Uhr ist Makern angesagt. Dazu finden im Makerspace Workshops und Vorträge mit gemeinsamen Makern statt.',
      },
      { p: 'Programm:' },
      {
        ul: [
          '23.11. - 10:00 Uhr - 3D-Design',
          '23.11. - 15:00 Uhr - 3D-Druck',
          '23.11. - 18:00 Uhr - Fräsen',
          '24.11. - 10:00 Uhr - Microcontroller',
          '24.11. - 16:00 Uhr - Künstliche Intelligenz',
        ],
      },
      {
        p: 'Anmeldungen per E-Mail an janto (at) makerspacebonn.de wäre nett. Die Startzeiten sind ungefähre Angaben. Die Veranstaltung ist kostenfrei dank Unterstützung von WS.',
      },
      { p: 'Wir freuen uns auf Eure zahlreiche Teilnahme.' },
    ],
  },
  {
    kind: 'event',
    legacyId: 343,
    slug: 'kurzfristiger-haloween-kunstworkshop',
    title: 'Kurzfristiger Haloween Kunstworkshop',
    image: 'legacy-343.jpg',
    date: d('2024-10-17'),
    timeLabel: '15–17',
    location: 'Altes Rathaus Oberkassel, 1. Stock, Bonn',
    category: 'WORKSHOP · 16 €',
    tagColor: 'orange',
    body: [
      {
        p: 'Am Donnerstag dem 17.10 findet von 15 bis 17 Uhr im alten Rathaus Oberkassel im 1. Stock passend zur Vorbereitung auf Halloween ein Tusche-Workshop statt, bei dem der Fokus auf dem Zeichen von gruseligen Monstern und Kreaturen gelegt wird. Es werden verschiedene Tusche und Schattierungstechnicken genutzt werden, um die eigene Fantasie lebendig werden zu lassen. Pro Person kostet der Workshop 16 €, diese werden bar vor Ort bezahlt. Anmeldung bitte unter der E-Mail-Adresse: maddy-pfeiffer (at) outlook.com',
      },
    ],
  },
  {
    kind: 'event',
    legacyId: 342,
    slug: 'kunst-workshop-und-ferienprogramm',
    title: 'Kunst Workshop und Ferienprogramm',
    image: 'legacy-342.jpg',
    date: d('2024-10-18'),
    endDate: d('2024-10-25'),
    timeLabel: 'mehrteilig',
    location: 'Kulturzentrum altes Rathaus, Königswintererstaße 720, 53227 Bonn',
    category: 'FERIENPROGRAMM · 16 €',
    tagColor: 'orange',
    body: [
      { h2: 'Ferienprogramm in den Herbstferien:' },
      {
        p: 'In den Herbst Ferien findet jeden Freitag die Kunstwerkstatt statt. Am 18.10 findet der Kurs von 16:00 bis 18:00 statt und am 25.10 von 17:00 bis 19:00. Der zweistündige Kurs kostet pro Teilnehmer 16€. Bitte das Geld bar Vorort zahlen.',
      },
      { h2: 'Kunstworkshop' },
      {
        p: 'Am 23.10 findet von 15:00 bis 17:00 Uhr ein Workshop statt in dem wir Federn und kleine Holzscheiben mit Tierbildern und perlen verzieren. Dieser kostet pro Teilnehmer 16€ bitte bar mitbringen.',
      },
      {
        p: 'Alle Kurse und der Workshop finden im Kulturzentrum altes Rathaus in Oberkassel statt: Königswintererstaße 720, 53227 Bonn.',
      },
      { p: 'Für die Anmeldung gerne eine Mail an: maddy-pfeiffer (at) outlook.com' },
      { p: 'Wir freuen Euch auf Eure Teilnahme' },
    ],
  },
  {
    kind: 'event',
    legacyId: 341,
    slug: 'handarbeitstreff-am-06-10-10-00-14-00',
    title: 'Handarbeitstreff am 06.10 10:00 - 14:00',
    image: 'legacy-341.jpg',
    date: d('2024-10-06'),
    timeLabel: '10–14',
    category: 'OFFENER TREFF · FÜR ALLE',
    tagColor: 'green',
    body: [
      {
        p: 'Es ist wieder soweit. Am Sonntag, den 06.10 fidet wieder unser Handarbeisttreff mit Makerbrunch statt. Die letzte Gelegenheit vor Halloween gemeinsam Kostüme Accessoires oder Dekoartikel zu basteln Natürlich stehen Nähmaschinen, Folienplot und Textilveredelung, Stickmaschine, Strickmaschine, Fachsimpeln, ratschen, Spaß haben auch auf dem Programm. Parallel findet auch der Makerbrunch statt. Jeder bringt sein eigenes Brunch-Set mit (also Brötchen, Aufschnitt, Käse, Joghurt, Müsli etc.). Kaffee und Geschirr sind natürlich da. Wir freuen uns auf Euch',
      },
    ],
  },
  {
    kind: 'blog',
    legacyId: 358,
    slug: 'umfangreiche-buchspende-staerkt-know-how-und-technikkompetenz',
    title: 'Umfangreiche Buchspende stärkt Know-How und Technikkompetenz',
    image: 'legacy-358.jpg',
    publishedAt: d('2025-05-21'),
    body: [
      {
        p: 'Wir freuen uns über eine großzügige Spende des Bonner [Rheinwerk-Verlag](https://www.rheinwerk-verlag.de/). Insgesamt 32 hochwertige Bücher aus den Themenfeldern Fotografie, Grafik & Design, IT sowie Maker & Technik bereichern ab sofort die Vereinsbibliothek – handverlesen für unsere Maker. Die Bücher stellen eine wertvolle Ressource für unsere Mitglieder und Workshop-Teilnehmenden dar. Sie unterstützen sowohl praktische Projekte als auch das selbstorganisierte Lernen. Die Titel reichen von Grundlagenwerken über aktuelle Technologien bis hin zu kreativen Praxisanleitungen. Die Spende trägt zur Förderung von Bildung, kreativem Schaffen und Technikkompetenz bei. Der MakerSpace Bonn bedankt sich herzlich für die Unterstützung und lädt ein, die neue Fachbibliothek bei einem Besuch kennenzulernen',
      },
    ],
  },
  {
    kind: 'blog',
    legacyId: 347,
    slug: 'workshops-zur-demystifizierung-it-3',
    title: 'Workshops zur Demystifizierung IT',
    image: 'legacy-347.jpg',
    publishedAt: d('2025-01-27'),
    body: [
      {
        p: 'Im vergangen Jahr habe verschiedene Workshops zu IT-Themen stattgefunden. Danke an Oliver und die Binas Stiftung für die Unterstützung. Die [Projektunterlagen](https://wiki.makerspacebonn.de/bin/view/Main/Tutorial%20und%20Workshops/Workshops%20Demystifizierung%20IT/) sind im Wiki veröffentlicht.',
      },
    ],
  },
  {
    kind: 'event',
    legacyId: 346,
    slug: 'di-10-12-2024-18-21-uhr-naehen-mit-gurtband-und-fuer-anfaenger-kuchentasche',
    title: 'Achtung!! Neuer Termin: Fr. 27.12.2024, 18 - 21 Uhr: Nähen mit Gurtband! Und für Anfänger: Kuchentasche',
    date: d('2024-12-27'),
    timeLabel: '18–21',
    category: 'WORKSHOP · NÄHEN',
    tagColor: 'green',
    body: [
      {
        p: 'Nach vielen Stunden des Probierens und der Recherche, um eine ordentliche Naht auf Gurtband zu schaffen, möchte ich gerne meine Erkenntnisse mit euch teilen. Ihr könnt eure eigenen Kreationen verfolgen, oder nach Anleitung einen Träger zum Umhängen nähen (für eine Trinkflasche oder ein Tetrapack). Es geht auch wieder um Grundlagen. Ralf und ich haben einige Ursachen für Frust statt Lust ausgemacht. Diese wollen wir aus der Welt schaffen. Anfänger können eine Kuchentasche nähen. Bring dazu ein Geschirrhandtuch (etwa 50 x 70 cm) mit. Kurzentschlossene finden Material in unserem Fundus. Bei Fragen, bitte eine mail an britta@makerspacebonn.de',
      },
      { p: 'Bei Interesse findet eine Fortsetzung „zwischen den Tagen" statt. Wir freuen uns auf euch!' },
    ],
  },
  {
    kind: 'blog',
    legacyId: 348,
    slug: 'monatlicher-handarbeitstreff-kreativitaet-nachhaltigkeit',
    title: 'Monatlicher Handarbeitstreff: Kreativität und Nachhaltigkeit vereint',
    publishedAt: d('2025-02-24'),
    body: [
      {
        p: 'Jeden ersten Sonntag im Monat findet im Makerspace ein offener Handarbeitstreff statt. Diese Veranstaltung bietet nicht nur die Möglichkeit, gemeinsam kreativ zu sein, sondern legt auch einen besonderen Fokus auf Nachhaltigkeit und Ressourcenschonung indem Textilien repariert und upgecyclet werden können.',
      },
      { h2: 'Was erwartet Dich?' },
      {
        ul: [
          'Geselliges Beisammensein mit Gleichgesinnten (Makerbrunch: Jeder bringt sein eigenes Brunch-Set mit)',
          'Austausch von Tipps und Tricks rund ums Handarbeiten',
          'Fachkundige Unterstützung bei Reparaturen von Textilien',
          'Kreative Ideen für Upcycling-Projekte',
        ],
      },
      {
        p: 'Egal ob Du ein Profi mit der Nähnadel bist oder gerade erst die Freude am Handarbeiten entdeckt haben – hier ist jeder willkommen! Erfahrene Handarbeiterinnen und Handarbeiter stehen Dir mit Rat zur Seite, wenn es darum geht, Kleidungsstücke zu reparieren oder alten Textilien neues Leben einzuhauchen.',
      },
      {
        p: 'Darüber hinaus beraten und unterstützen wir auch bei der Reparatur von anderen Alltagsgegenständen. Du kannst unsere Werkstätten (Holz, Metall), 3D Drucker, Elektronikbereich nutzen. Wir leisten Hilfe zur Selbsthilfe.',
      },
    ],
  },
]
