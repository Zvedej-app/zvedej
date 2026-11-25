# Zvedej – podklady pro App Store

Texty jsou připravené ke zkopírování do App Store Connect (jazyk: čeština; slovenštinu a angličtinu lze přidat
jako další lokalizace). Při změně názvu aplikace je potřeba upravit název, podtitul i popis.

## Odkazy

| Pole v App Store Connect | URL |
| --- | --- |
| Zásady ochrany osobních údajů (Privacy Policy URL) | https://zvedej-app.github.io/zvedej/legal/privacy |
| Podpora (Support URL) | https://zvedej-app.github.io/zvedej/legal/contact |
| Marketingová stránka (nepovinné) | https://zvedej-app.github.io/zvedej/ |
| Podmínky použití (do popisu / EULA) | https://zvedej-app.github.io/zvedej/legal/terms |

Google Play navíc chce odkaz na smazání účtu – stačí stránka kontaktu (smazání je i přímo v aplikaci: Nastavení → Smazat účet).

## Název a podtitul

- **Název** (max. 30 znaků): `Zvedej – vzpírání`
- **Podtitul** (max. 30 znaků): `Tréninkový deník pro vzpěrače`
- **Klíčová slova** (max. 100 znaků, oddělit čárkou, bez mezer):
  `vzpírání,trh,nadhoz,činka,trénink,deník,sinclair,kotouče,trenér,závody,silový,crossfit,maximum`

## Propagační text (max. 170 znaků, lze měnit bez nové verze)

Tréninkový deník, plány od trenéra, grafy pokroku a kalendář závodů. Všechno, co vzpěrač potřebuje, v jedné aplikaci – i bez signálu v posilovně.

## Popis

Zvedej je aplikace pro vzpěrače a jejich trenéry.

TRÉNINK
• Plány s procenty z maxima, přesnými kily, RPE nebo bez zátěže
• Odškrtávání nástupů a časovač pauzy – i na zamčené obrazovce a na hodinkách
• Rychlý zápis tréninku textem: „Trh 70x2x3, 75x2“
• Funguje i bez signálu, data se synchronizují později

POKROK
• Deník všech tréninků po týdnech s tonáží a počtem nástupů
• Grafy vývoje maxim a tonáže
• Deník regenerace: spánek, energie, bolest svalů a denní připravenost
• Widget na plochu s dnešním tréninkem

NÁSTROJE
• Kalkulačka kotoučů na osu
• Sinclairovy body (koeficienty 2025–2028)
• Výpočet vah z procent maxima (20–150 %)

TRENÉR A TÝM
• Pozvi svěřence přes QR kód nebo odkaz
• Přiřaď plán celé skupině nebo jednotlivcům
• Komentuj tréninky a sleduj připravenost týmu

KOMUNITA
• Kalendář závodů a novinky ze světa českého vzpírání
• Profily vzpěračů a klubů, přátelé a zprávy
• Výzva Vzpěrač měsíce s videi

Aplikaci můžeš vyzkoušet i bez registrace. Bez reklam a bez sledování.

Zvedej není oficiální aplikací Českého svazu vzpírání. Informace o závodech přebírá z veřejných zdrojů webu vzpirani.cz.

## Kategorie a věk

- Primární kategorie: **Zdraví a fitness** (Health & Fitness); sekundární: **Sport**
- Věkové hodnocení – v dotazníku zaškrtnout:
  - obsah vytvářený uživateli: **ano** (moderace: nahlášení, blokování, správce),
  - komunikace mezi uživateli (zprávy): **ano**,
  - ostatní (násilí, alkohol, hazard…): **ne**.
  Výsledek bude zřejmě 13+, což odpovídá minimálnímu věku v aplikaci.

## App Privacy (dotazník o ochraně dat)

„Údaje používané ke sledování“ (tracking): **žádné**. Všechny níže jsou **spojené s uživatelem** a slouží
pouze pro **funkce aplikace** (App Functionality):

| Kategorie Apple | Co přesně |
| --- | --- |
| Kontaktní údaje – e-mail, jméno | registrace, profil |
| Zdraví a fitness – fitness | tréninky, maxima, tělesná hmotnost |
| Zdraví a fitness – zdraví | deník regenerace (spánek, bolest) – jen se souhlasem |
| Uživatelský obsah – fotky nebo videa | profilová fotka, videa do výzvy a pro trenéra |
| Uživatelský obsah – další obsah, zprávy | zprávy, komentáře trenéra |
| Identifikátory – ID uživatele | účet |
| Další údaje – datum narození | ověření věku a souhlasu rodičů |

Analytika, reklama, poloha, nákupy: **nesbíráme**.

## Poznámky pro recenzenta (App Review Information)

```
Testovací účet: <e-mail> / <heslo>   (založit předem, ideálně s pár tréninky a rolí trenéra)

Aplikaci lze vyzkoušet i bez účtu („Začít hned bez registrace“ na úvodní obrazovce).

Obsah od uživatelů (profily, zprávy, videa) lze nahlásit (⋯ → Nahlásit) a uživatele zablokovat.
Nahlášení vyřizuje správce v Nastavení → Správa. Smazání účtu: Nastavení → Smazat účet.

Režim trenéra: Tréninky → Tým. Trenér pozve svěřence odkazem/QR kódem a přiřazuje plány.

Aplikace není oficiální aplikací Českého svazu vzpírání; kalendář závodů a novinky přebírá
z veřejných RSS webu vzpirani.cz s odkazem na zdroj.
```

## Screenshoty

V `docs/appstore/` jsou náhledy pro iPhone 6,9" (1320 × 2868) z webové verze s ukázkovými daty:
`2-dnes.png`, `3-denik.png`, `4-pokrok.png`, `5-nastroje.png`.

Doporučení:
- Do App Storu raději nahraj screenshoty z **TestFlight buildu na skutečném iPhonu** (se stavovým řádkem) –
  ukázková data přitom nech hezky vyplněná (aktivní plán, pár týdnů tréninků).
- Na screenshotech **nepoužívej logo ČSV ani loga klubů**, dokud k tomu nemáš písemný souhlas.
- Apple chce screenshoty jen pro 6,9" iPhone (menší velikosti si dopočítá). iPad je vypnutý (`supportsTablet: false`).
