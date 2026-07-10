import { doc, h2, p, t } from './lexical'

/* Haftungsausschluss / Disclaimer. References the DDG (§ 7 Abs. 1, §§ 8–10),
   which replaced the corresponding TMG provisions in May 2024. Not legal
   advice. */

const haftungBody = doc([
  h2('Haftung für Inhalte'),
  p(
    t(
      'Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden entsprechender Rechtsverletzungen entfernen wir diese Inhalte umgehend.',
    ),
  ),

  h2('Haftung für Links'),
  p(
    t(
      'Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft; rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen entfernen wir derartige Links umgehend.',
    ),
  ),

  h2('Urheberrecht'),
  p(
    t(
      'Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechts bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet. Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter beachtet und als solche gekennzeichnet. Sollten Sie dennoch auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen entfernen wir derartige Inhalte umgehend.',
    ),
  ),
])

/** The Haftung page document (pageIntro header + prose body). */
export const haftungPage = {
  title: 'Haftung',
  slug: 'haftung',
  _status: 'published' as const,
  layout: [
    {
      blockType: 'pageIntro' as const,
      tag: 'HAFTUNG',
      tagColor: 'green' as const,
      meta: 'Haftungsausschluss (Disclaimer)',
      headline: 'Haftung',
      lede: 'Angaben zu Inhalten, Links und Urheberrecht.',
    },
    { blockType: 'prose' as const, body: haftungBody as never },
  ],
}
