# DSGVO-konforme, Open-Source & self-hosted Web-Analytics

**Research-Dokument · Stand: Juli 2026**
**Fokus: Plausible Analytics (Community Edition) vs. Matomo (On-Premise)**

---

## 1. Zusammenfassung (TL;DR)

Für eine kleine bis mittlere Vereins-/Organisationswebseite (wie MakerSpace Bonn) sind **Plausible CE** und **Matomo On-Premise** die beiden ausgereiftesten self-hosted Optionen, die man ohne Cookie-Banner betreiben kann.

- **Plausible** = minimalistisch, extrem leichtgewichtig (~1 KB Script), ein Dashboard, keine personenbezogenen Daten, „set & forget". Ideal, wenn man nur wissen will *wie viele Leute kommen woher und lesen was*.
- **Matomo** = Voll-Suite (Google-Analytics-Ersatz mit allen Features: Funnels, Heatmaps, E-Commerce, Sitzungsaufzeichnung, Custom Reports). Mächtig, aber deutlich schwerer im Betrieb (PHP + MySQL/MariaDB, größerer Wartungsaufwand).

**Faustregel:** *Plausible, wenn Einfachheit und Datensparsamkeit oberste Priorität haben. Matomo, wenn man tiefe Analysefähigkeit und Feature-Breite braucht.*

Beide lassen sich **rechtssicher ohne Consent-Banner** betreiben, wenn korrekt konfiguriert (siehe Abschnitt 5).

---

## 2. Warum überhaupt self-hosted & Open Source?

| Kriterium | Nutzen |
|---|---|
| **Datenhoheit** | Rohdaten liegen auf eigenem Server (EU/DE), kein Drittland-Transfer, kein Data-Sharing mit einem Analytics-Anbieter |
| **DSGVO Art. 44 ff.** | Kein Problem mit US-Cloud-Transfer wie bei Google Analytics (Schrems II / TADPF-Unsicherheit entfällt) |
| **Keine Auftragsverarbeitung nötig** | Bei self-hosted verarbeitet niemand außer dir die Daten → kein AVV mit Dritten erforderlich (nur mit dem Hoster) |
| **Transparenz** | Quelloffen → prüfbar, was tatsächlich getrackt wird |
| **Keine laufenden Kosten** | Lizenzkostenfrei; nur Serverkosten |
| **Kein Vendor-Lock-in** | Migration/Export jederzeit möglich |

**Abgrenzung Google Analytics 4:** GA4 ist gratis, aber (a) überträgt Daten in die USA, (b) erfordert praktisch immer ein Consent-Banner, (c) mehrere EU-Datenschutzbehörden (Österreich, Frankreich, Italien) haben den GA-Einsatz als DSGVO-widrig eingestuft. Self-hosted OSS umgeht diese Kernprobleme.

---

## 3. Die beiden Kandidaten im Detail

### 3.1 Plausible Analytics (Community Edition)

- **Lizenz:** AGPLv3 (Community Edition). Die frühere Bezeichnung „self-hosted" wurde zu **Plausible CE** umbenannt.
- **Tech-Stack:** Elixir/Phoenix + **ClickHouse** (Event-Datenbank) + PostgreSQL (Metadaten). Deployment via Docker Compose.
- **Herkunft:** Firma in Estland (EU), betrieben mit Hosting in der EU.
- **Tracking-Script:** ~1 KB, cookiefrei, kein Fingerprinting, keine persistente Nutzer-ID.
- **Datenmodell:** aggregiert & anonym. Es werden **keine personenbezogenen Daten** und keine Cookies gespeichert; Besucher werden über einen täglich rotierenden, gehashten Zähler (Salt) gezählt, der nicht auf Personen zurückführbar ist.
- **Dashboard:** Eine einzige, aufgeräumte Ansicht (Besucher, Quellen, Seiten, Länder, Geräte, Ziele/Goals).

**Was Plausible bewusst NICHT tut:** keine persönlichen Profile, kein Cross-Site-Tracking, keine Retargeting-Daten, keine individuelle User-Journey über Tage hinweg.

### 3.2 Matomo (On-Premise / self-hosted)

- **Lizenz:** GPLv3 (Core kostenlos). Einige **Premium-Plugins** (Heatmaps, Funnels, A/B-Testing, Roll-Up-Reporting u.a.) sind kostenpflichtig – auch in der self-hosted Variante.
- **Tech-Stack:** **PHP + MySQL/MariaDB**. Läuft auf klassischem LAMP-Stack, schon auf günstigem Shared-Hosting/kleinem VPS.
- **Herkunft:** Firma in Neuseeland; self-hosted läuft aber komplett auf deinem Server.
- **Tracking:** Cookie-basiert *oder* cookiefrei konfigurierbar. Standardmäßig umfangreicher (mehr Datenpunkte).
- **Datenmodell:** kann personenbezogen sein (Besucher-Log, IP), lässt sich aber per Konfiguration weitgehend anonymisieren (IP-Anonymisierung, cookiefrei, „Do Not Track" respektieren).
- **Dashboard:** Sehr umfangreich, viele Widgets, Reports, Segmente, Custom Dimensions, E-Commerce, Kampagnen-Tracking.
- **Features (Auszug):** Besucher-Logs, Verweildauer, Funnels, Heatmaps, Session Recordings, Formular-Analyse, SEO-Keywords, Goals/Events, Roll-Up über mehrere Sites, API, White-Label.
- **GDPR-Tools:** eingebaute GDPR-Seite (Datenlöschung, Anonymisierung, Opt-out-Widget, DSAR-Export).

---

## 4. Direkte Gegenüberstellung

### 4.1 Feature-Matrix

| Kriterium | **Plausible CE** | **Matomo On-Premise** |
|---|---|---|
| Lizenz | AGPLv3 | GPLv3 (+ kostenpflichtige Premium-Plugins) |
| Kosten Software | 0 € | 0 € Core / Plugins kostenpflichtig |
| Tech-Stack | Elixir + ClickHouse + Postgres (Docker) | PHP + MySQL/MariaDB (LAMP) |
| Ressourcenbedarf Server | Höher (ClickHouse braucht RAM) | Niedriger, läuft auf Shared-Hosting |
| Installations-Komplexität | Mittel (Docker Compose) | Niedrig–mittel (PHP-Upload / Docker) |
| Wartungsaufwand | Gering (kaum Konfiguration) | Höher (Updates, DB-Pflege, Archivierung) |
| Script-Größe | ~1 KB | ~20–25 KB (matomo.js) |
| Cookies | nie | optional (abschaltbar) |
| Personenbez. Daten | nein (per Design) | ja, aber anonymisierbar |
| Cookie-Banner nötig? | nein | nein, wenn Privacy-Mode korrekt gesetzt |
| Dashboard-Umfang | minimal, 1 Ansicht | sehr umfangreich, viele Reports |
| Funnels / Goals | Goals ja, Funnels ja (neuere Versionen) | ja (Funnels teils Premium-Plugin) |
| Heatmaps / Session Recording | nein | ja (Premium-Plugin) |
| E-Commerce-Tracking | begrenzt | ja, ausgereift |
| Custom Dimensions/Segmente | begrenzt | ja, sehr flexibel |
| Roh-Datenexport / API | ja (Stats API) | ja (umfangreiche Reporting-API) |
| Import aus Google Analytics | nein | ja (GA-Import-Tool) |
| Google-Search-Console-Integration | ja | ja |
| Mehrere Websites | ja | ja |
| Nutzerverwaltung / Rollen | einfach | granular |
| Learning Curve | sehr flach | steiler |

### 4.2 Plausible – Vor- & Nachteile

**Vorteile**
- Radikale Datensparsamkeit: sammelt per Design keine personenbezogenen Daten → einfachste DSGVO-Story überhaupt.
- Kein Cookie-Banner, garantiert, ohne Konfigurations-Fallstricke.
- Extrem schnelles, leichtes Script → keine spürbaren Performance-/Core-Web-Vitals-Einbußen.
- Übersichtliches, schönes Dashboard, das auch Nicht-Techniker sofort verstehen.
- Geringer Wartungsaufwand nach Setup.
- Aktive Entwicklung, EU-Firma, klares Datenschutz-Ethos.

**Nachteile**
- Weniger Features/Tiefe – keine Heatmaps, keine Session Recordings, kein detailliertes Besucher-Log.
- ClickHouse ist ressourcenhungriger → nicht auf klassischem Shared-Hosting, braucht VPS mit genügend RAM.
- Kein Import historischer Daten aus Google Analytics.
- AGPLv3: relevant, falls man den Code modifiziert und als Netzwerk-Dienst anbietet (Copyleft greift). Für reinen Eigenbetrieb unkritisch.
- Segmentierung/Custom-Analysen begrenzt.

### 4.3 Matomo – Vor- & Nachteile

**Vorteile**
- Vollwertiger GA-Ersatz: praktisch jedes Feature vorhanden, das man von Google Analytics kennt (und mehr).
- Läuft auf günstigem LAMP-Hosting – niedrige Einstiegshürde bei der Infrastruktur.
- Granulare Kontrolle über Anonymisierung, Aufbewahrung, Rollen.
- Google-Analytics-**Import** möglich → historische Daten übernehmbar.
- Eingebaute DSGVO-Werkzeuge (Anonymisierung, Opt-out, DSAR-Export, Datenlöschung).
- Mehrere EU-Datenschutzbehörden (CNIL/FR, DSB/AT, belgische DPA) haben Matomos Privacy-Mode explizit als *ohne Consent-Banner* zulässig anerkannt.
- Riesige Community, viele Plugins, ausführliche Doku.

**Nachteile**
- Deutlich mehr Wartung: regelmäßige Core-/Plugin-Updates, DB-Archivierung (Cronjob nötig), Performance-Tuning bei viel Traffic.
- Größeres Tracking-Script, mehr Overhead als Plausible.
- Standard-Konfiguration ist *nicht* automatisch banner-frei – man muss aktiv IP-Anonymisierung, Cookie-Deaktivierung, DoNotTrack korrekt setzen. Fehlkonfiguration = doch Banner-/Einwilligungspflicht.
- Einige begehrte Features (Heatmaps, Funnels, A/B-Tests, Session Recording) sind **kostenpflichtige Premium-Plugins** – auch self-hosted.
- Komplexeres, überladenes UI → höhere Einarbeitung.
- Bei sehr hohem Traffic kann MySQL zum Flaschenhals werden.

---

## 5. DSGVO-Betrieb ohne Cookie-Banner – die Bedingungen

Beide Tools *können* ohne Einwilligungs-Banner betrieben werden. Das ist rechtlich möglich, weil dann keine Einwilligung nach § 25 TTDSG (Zugriff auf Endgerät) und keine Verarbeitung personenbezogener Daten i.S.d. DSGVO stattfindet.

**Plausible:** von Haus aus erfüllt – cookiefrei, keine personenbezogenen Daten. Kein Konfigurationsaufwand.

**Matomo – Pflicht-Konfiguration für banner-freien Betrieb:**
1. **IP-Anonymisierung** aktivieren (mindestens 2 Bytes maskieren).
2. **Cookies deaktivieren** (`disableCookies` bzw. cookiefreies Tracking).
3. **„Do Not Track" respektieren** aktivieren.
4. Keine personenbezogenen Custom-Dimensions/UserID tracken.
5. Datenaufbewahrung begrenzen (Raw-Data-Löschung/Anonymisierung nach X Monaten).
6. Server in der EU (bei self-hosted ohnehin gegeben).

**Immer nötig (beide):**
- Eintrag in der **Datenschutzerklärung** (welches Tool, welche Daten, Rechtsgrundlage Art. 6 Abs. 1 lit. f – berechtigtes Interesse an Reichweitenmessung).
- **Verzeichnis von Verarbeitungstätigkeiten** ergänzen.
- Ggf. **Widerspruchsmöglichkeit** (Matomo: Opt-out-Widget/DoNotTrack; Plausible: kein Personenbezug → i.d.R. entbehrlich).
- **AVV mit dem Hoster** (z. B. Hetzner), falls dort verarbeitet.

> ⚠️ Hinweis: Rechtssicherheit hängt vom Einzelfall ab. Diese Zusammenstellung ist keine Rechtsberatung. Bei Unsicherheit den Datenschutzbeauftragten / eine Fachperson einbinden.

---

## 6. Empfehlung für die Praxis (MakerSpace Bonn)

Für eine Vereinswebseite mit überschaubarem Traffic, kleinem Team und dem bereits gelebten Datenschutz-Fokus (eigene Impressum-/Datenschutz-Seiten, Hetzner-Hosting):

**→ Empfehlung: Plausible Community Edition.**

Begründung:
- Ihr wollt vermutlich nur wissen: *Wie viele Besucher, woher, welche Seiten, welche Events (z. B. „Kontakt geklickt")* – genau Plausibles Kernkompetenz.
- Kein Cookie-Banner, keine personenbezogenen Daten → minimaler Datenschutz- und Wartungsaufwand.
- Ihr hostet bereits per Docker (Dockerfile/compose im Repo vorhanden) → Plausible via Docker Compose fügt sich sauber ein.
- Kein PHP/MySQL-Betrieb nebenher nötig.

**Matomo lohnt sich, falls** ihr später detaillierte Analysen braucht (Heatmaps, Funnels, Kampagnen-ROI, E-Commerce für Kurse/Tickets) oder historische GA-Daten importieren wollt – dann ist die höhere Komplexität gerechtfertigt.

**Ressourcen-Realität:** Plausible braucht wegen ClickHouse mehr RAM als ein reines LAMP-Matomo. Auf einem kleinen Hetzner-VPS (z. B. CX22, 4 GB RAM) laufen beide, aber prüfe die RAM-Auslastung, wenn Plausible neben Next.js/Payload + SQLite auf derselben Maschine läuft. Ggf. Plausible auf separatem kleinen Server oder Managed-DB.

---

## 7. Weitere Alternativen im Überblick

Neben Plausible und Matomo gibt es ein lebhaftes Feld weiterer self-hosted, privacy-first OSS-Tools. Übersicht:

| Tool | Lizenz | Stack | Cookiefrei / banner-frei | Ressourcen | Feature-Tiefe | Kurz-Charakter |
|---|---|---|---|---|---|---|
| **Umami** | MIT | Node.js + Postgres/MySQL | ja | sehr niedrig | niedrig–mittel | Schlankster ernsthafter Plausible-Konkurrent |
| **Rybbit** | AGPLv3 | Node.js + ClickHouse + Postgres | ja | mittel–hoch | **hoch** | Neu (2025), feature-reichste self-hosted Option |
| **Pirsch** | AGPLv3 | Go + ClickHouse | ja (server-side) | niedrig–mittel | mittel | Server-side Tracking, deutsche Firma |
| **Swetrix** | AGPLv3 | Node.js + ClickHouse | ja | mittel | hoch | Richtung Produkt-Analytics, A/B-Tests |
| **OpenPanel** | AGPLv3 | Node.js + ClickHouse | ja | mittel–hoch | hoch | Web + Product Analytics kombiniert |
| **GoatCounter** | EUPL/GPL | Go + SQLite/Postgres | ja | sehr niedrig | niedrig | Winziges Script, ideal für Blogs/Docs |
| **Ackee** | MIT | Node.js + MongoDB | ja | niedrig | niedrig | Minimalistisch, Nische |
| **Shynet** | Apache-2.0 | Django/Python | ja (auch ohne JS via Pixel) | niedrig | niedrig | Tracking auch komplett ohne JavaScript |
| **Offen Fair Web Analytics** | Apache-2.0 | Go | Opt-in (consent-first) | niedrig | niedrig | Nutzer sehen eigene Daten; für Civic/Bildung |
| **PostHog** | MIT (Core) | ClickHouse + Kafka + … | ja (konfig.) | **sehr hoch** | sehr hoch | Product-Analytics-Suite, schwergewichtig |
| **GoAccess** | MIT | C (Logfile-Parser) | n/a (kein Client-Script) | minimal | niedrig | Analysiert Server-Logs, kein JS nötig |
| **Fathom Lite** | MIT | Go | ja | niedrig | niedrig | Ur-Konzept hinter Plausible, kaum gepflegt |

### Kurzporträts der interessantesten Kandidaten

**Umami** — MIT-lizenziert, ~2 KB Script, cookiefrei & DSGVO-konform by default. Läuft auf Node.js mit Postgres *oder* MySQL, minimaler RAM-Bedarf. Der stärkste „dritte Kandidat" neben Plausible/Matomo, wenn du es noch einfacher und ressourcenschonender willst als Plausible (kein ClickHouse). Verzichtet bewusst auf Funnels, Session-Replay und Web Vitals.

**Rybbit** — der Newcomer (öffentlich seit April 2025), gilt als das *featurereichste* self-hosted Tool im kostenlosen Tier: Session-Replay, Funnels, Retention-Analyse und Core Web Vitals sind ohne Paywall dabei – Dinge, die bei Plausible CE fehlen oder bei Matomo Premium-Plugins sind. Preis dafür: ClickHouse-Stack (mehr RAM), jüngeres Projekt = weniger Langzeit-Track-Record. Sehr spannend, wenn du „Plausible-Simplizität + Matomo-Features" suchst.

**Pirsch** — aus Deutschland, in Go geschrieben, **server-side Tracking** mit anonymisierten Fingerprints. Vorteil: funktioniert auch bei aktiven Ad-Blockern (kein Client-Script, das geblockt wird), GDPR/PECR-konform. Guter Fit, wenn dir deutsche Anbieterherkunft und Blocker-Resistenz wichtig sind.

**Swetrix / OpenPanel** — beide AGPLv3, ClickHouse-basiert, zielen über reine Web-Analytics hinaus Richtung *Product Analytics* (Events, User-Flows, Funnels, teils A/B-Tests, Revenue). Overkill für eine Vereinsseite, interessant falls später eine App/SaaS dazukommt.

**GoatCounter** — extrem leichtgewichtig (Go + SQLite), winziges Script, cookiefrei, keine personenbezogenen Daten. Perfekt für Blogs, Doku-Seiten, kleine statische Sites. Weniger hübsch/umfangreich als Plausible, aber quasi wartungsfrei und läuft auf kleinstem Server.

**Shynet** — Django-basiert, kann Besucher sogar **ganz ohne JavaScript** per Tracking-Pixel zählen. Nische, aber nützlich, wenn JS-Tracking keine Option ist.

**GoAccess** — Sonderfall: kein Client-Tracking, sondern ein Analyzer für **Server-Logs** (nginx/Apache). Null Datenschutz-Overhead auf Client-Seite, aber grobkörniger (Bots schwerer zu filtern, keine Events/JS-Interaktionen). Gute Ergänzung, nicht unbedingt Ersatz.

**PostHog** — Vollständige Product-Analytics-Plattform (Feature-Flags, Experiments, Replays, SQL). Mächtig, aber schwergewichtig (ClickHouse + Kafka …) und für eine Vereinsseite klar überdimensioniert.

### Einordnung für den MSB-Kontext

An der Empfehlung aus Abschnitt 6 ändert das nichts: **Plausible CE** bleibt der ausgewogene Default. Die realistischen Alternativen in absteigender Relevanz:
1. **Umami** — wenn Server-Ressourcen knapp sind oder es maximal simpel sein soll.
2. **Rybbit** — wenn ihr doch mehr Features (Replay/Funnels/Web Vitals) gratis & self-hosted wollt, ohne Matomos Komplexität.
3. **Pirsch** — wenn deutsche Herkunft + Ad-Blocker-Resistenz zählen.
4. **GoatCounter** — wenn es nur um schlichte Besucherzahlen auf kleinstem Server geht.

---

## 8. Entscheidungs-Kurzleitfaden

```
Brauchst du GA-Import / E-Commerce / granulare Reports auf LAMP-Hosting?
   JA  → Matomo On-Premise
   NEIN ↓
Willst du Replay + Funnels + Web Vitals gratis & self-hosted, ohne Matomo-Komplexität?
   JA  → Rybbit
   NEIN ↓
Ist der Server sehr klein / kein ClickHouse möglich (nur Node/PHP/SQLite)?
   JA  → Umami  (oder GoatCounter für minimalste Sites)
   NEIN ↓
Deutsche Anbieterherkunft + Ad-Blocker-Resistenz wichtig?
   JA  → Pirsch (server-side)
   NEIN ↓
Standard: minimaler Aufwand, banner-frei, schönes Dashboard
        → Plausible CE   ◄ Default-Empfehlung
```

---

## Quellen

- [Plausible – Self-Hosted Web Analytics](https://plausible.io/self-hosted-web-analytics)
- [Plausible – Introducing Community Edition](https://plausible.io/blog/community-edition)
- [Plausible Analytics – GitHub (AGPLv3)](https://github.com/plausible/analytics)
- [Plausible – Open Source GA Alternative](https://plausible.io/open-source-website-analytics)
- [Matomo On-Premise](https://matomo.org/matomo-on-premise/)
- [DanubeData – Self-Host Matomo or Umami (2026)](https://danubedata.ro/blog/self-host-matomo-umami-google-analytics-alternative-2026)
- [All Things Open – Matomo 2026 Guide](https://allthingsopen.org/articles/matomo-2026-guide-privacy-self-hosted-analytics)
- [Aquaray – Matomo Cloud vs Self-Hosted GDPR](https://www.aquaray.com/en/blog/posts/matomo-cloud-vs-self-hosted-gdpr-comparison)
- [Haloy – Self-Hosted Analytics: Umami vs Plausible vs Rybbit](https://haloy.dev/blog/self-hosted-analytics-compared)
- [OpenPanel – Self-Hosted Web Analytics 2026 (Plausible vs Matomo vs Umami vs OpenPanel)](https://openpanel.dev/articles/self-hosted-web-analytics)
- [OpenPanel – Open Source Analytics Tools: 2026 Survey](https://openpanel.dev/articles/open-source-web-analytics)
- [Swetrix – Open Source Web Analytics Self-Hosted](https://swetrix.com/blog/open-source-web-analytics-self-hosted)
- [PostHog – 8 Best Open Source Analytics Tools You Can Self-Host](https://posthog.com/blog/best-open-source-analytics-tools)
- [Geekflare – 13 Best Self-Hosted Open Source Web Analytics Platforms](https://geekflare.com/software/best-open-source-web-analytics-tools/)
- [awesome-analytics (GitHub, kuratierte Liste)](https://github.com/oxnr/awesome-analytics)

*Erstellt: Juli 2026 · Keine Rechtsberatung.*
