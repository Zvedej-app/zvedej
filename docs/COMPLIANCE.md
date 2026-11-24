# Zvedej – právní soulad (kontrolní seznam)

Stav k 28. 11. 2026. Nejde o právní radu – před spuštěním pro veřejnost doporučujeme kontrolu advokátem
(zaměřte se hlavně na body označené ⚠️).

## Co řeší aplikace sama ✅

| Oblast | Předpis | Jak je to vyřešené |
| --- | --- | --- |
| Zásady ochrany osobních údajů, podmínky použití, kontakt | GDPR čl. 12–14, DSA čl. 11–14 | Obrazovky `/legal/privacy`, `/legal/terms`, `/legal/contact` (cs/sk/en), odkazy v registraci a v Nastavení |
| Souhlas s podmínkami | občanský zákoník, GDPR čl. 7 | Nezaškrtnuté políčko při registraci, ukládá se čas a verze podmínek |
| Nový souhlas po změně podmínek | GDPR čl. 7, § 1752 OZ | Při změně `LEGAL_UPDATED` se uživatel po spuštění znovu zeptá (`TermsGate`) |
| Věk a souhlas rodičů | GDPR čl. 8, zákon 110/2019 Sb. § 7 | Od 13 let. Do 15 (CZ) / 16 (SK a jinde) let se souhlasem zákonného zástupce přes odkaz (jméno, e-mail, prohlášení, čas). Do té doby jen tréninkový deník (hlídá i databáze) |
| Ochrana nezletilých | DSA čl. 28 | Do 18 let skrytý profil ve výchozím stavu, zprávy jen od přátel a vlastního trenéra, trenér jen ze stejného klubu, žádná reklama ani profilování |
| Nahlášení obsahu, blokování | DSA čl. 16 | Nahlášení uživatele, zprávy a videa v aplikaci; blokování; nahlášení e-mailem i bez účtu |
| Odůvodnění zásahu | DSA čl. 17 | Oznámení v aplikaci s důvodem při odstranění obsahu nebo blokaci |
| Odvolání (vnitřní systém vyřizování stížností) | DSA čl. 20 | Žádost o přezkum v aplikaci do 6 měsíců; správce rozhoduje v Nastavení → Správa → Odvolání |
| Kontaktní místo | DSA čl. 11, 12 | Stránka Provozovatel a kontakt |
| Práva subjektu údajů | GDPR čl. 15–21 | Úprava profilu, export všech dat (JSON), smazání účtu v aplikaci, kontaktní e-mail |
| Minimalizace a soukromí ve výchozím stavu | GDPR čl. 25 | Tělesná hmotnost skrytá, nezletilí skrytí, žádná analytika ani reklama |
| Cookies / úložiště | § 89 zák. 127/2005 Sb. | Jen technicky nezbytné úložiště → lišta se souhlasem není potřeba; popsáno v zásadách |
| Obchodní sdělení | zákon 480/2004 Sb. | Neposíláme. Kdyby ano: jen se souhlasem a s odkazem na odhlášení |
| Doba uchování | GDPR čl. 5 odst. 1 písm. e) | Hosté po 90 dnech nečinnosti, vyřízená nahlášení po 1 roce (automaticky) |
| Bezpečnost | GDPR čl. 32 | RLS na všech tabulkách, soukromé údaje v oddělené tabulce, soukromá videa trenéra s podepsanými odkazy |

## Co musíš udělat ty (mimo aplikaci) 📋

1. **Doplnit provozovatele** v `src/data/legal.ts` (`OPERATOR`): jméno / název, adresa, IČO, kontaktní e-mail.
   Bez toho jsou dokumenty neplatné. ⚠️ Zvaž založení s. r. o. nebo spolku (omezí osobní odpovědnost).
2. **Smlouvy o zpracování (DPA)** se zpracovateli – stačí odsouhlasit v jejich administraci:
   - Supabase: Settings → Legal → Data Processing Addendum (region EU – Frankfurt),
   - GitHub (Pages) a případně Cloudflare: jejich DPA platí automaticky v obchodních podmínkách,
   - e-mailová služba pro souhlas rodičů (např. Resend) – DPA a ověřená doména.
3. **Záznamy o činnostech zpracování** (GDPR čl. 30) – jednoduchá tabulka: jaké údaje, proč, jak dlouho,
   kdo je zpracovatel. Vzor má ÚOOÚ na www.uoou.cz. Uchovávej ji pro případnou kontrolu.
4. **Postup při úniku dat** (GDPR čl. 33): při úniku nahlásit ÚOOÚ do 72 hodin; mít v Supabase zapnuté zálohy.
5. **E-mail pro souhlas rodičů**: v Supabase → Edge Functions nasadit `parent-consent-mail` a nastavit tajné
   proměnné `RESEND_API_KEY`, `MAIL_FROM`, `APP_URL`. Bez nich aplikace nabídne dítěti odkaz ke sdílení rodiči.
6. **Moderace**: pravidelně (ideálně denně) projít Nahlášení a Odvolání. ⚠️ Obsah ohrožující děti
   (sexuální obsah s nezletilými) ihned nahlásit Policii ČR a zachovat důkazy.
7. **Loga klubů a svazu**: ⚠️ loga jsou chráněná (autorské právo / ochranné známky). Vyžádej si od klubů
   a od ČSV souhlas s jejich použitím, nebo je nahraď zkratkami. Totéž platí pro lva v logu ČSV.
8. **Obsah z webu ČSV** (kalendář, novinky): přebíráme z veřejných RSS s odkazem na zdroj; souhlas svazu
   je stále vhodné mít písemně (viz připravený e-mail).
9. **Hudba ve videích výzvy**: podmínky ukládají uživatelům nahrávat jen obsah, ke kterému mají práva.
   Při nahlášení porušení autorských práv video odstraň.
10. **Obchody s aplikacemi**: App Store a Google Play vyžadují vyplnit dotazník o ochraně dat
    („Privacy Nutrition Label“ / „Data safety“), uvést URL zásad, nabídnout smazání účtu v aplikaci (je)
    a u Google Play i webový formulář pro smazání účtu (stačí e-mail na kontakt uvedený v zásadách).
11. **Přístupnost** (zákon 424/2023 Sb., European Accessibility Act): mikropodniky (< 10 zaměstnanců
    a obrat < 2 mil. €) jsou u služeb vyňaty; při růstu bude potřeba prohlášení o přístupnosti.
12. **Supabase ochrana proti zneužití**: zapnout CAPTCHA (Cloudflare Turnstile) pro registraci a hosty.

## Ověřit s právníkem ⚠️

- Věková hranice pro Slovensko (16 let, zákon 18/2018 Z. z. § 15) a pro ostatní země – aplikace používá 16 jako bezpečnou volbu.
- Rozsah povinností DSA pro mikro a malé platformy (čl. 19 výjimky) – aplikace přesto plní čl. 16, 17, 20 a 28.
- Formulace prohlášení zákonného zástupce a dostatečnost ověření e-mailem (GDPR čl. 8 odst. 2 – „přiměřené úsilí“).
- Zda je potřeba posouzení vlivu (DPIA) – zpracováváme údaje nezletilých, ale bez profilování a zdravotních údajů.
