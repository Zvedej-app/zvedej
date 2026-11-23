/**
 * Zásady ochrany osobních údajů a Podmínky použití aplikace Zvedej.
 *
 * DŮLEŽITÉ: Jde o návrh, který před spuštěním pro veřejnost zkontroluje právník.
 * Údaje v [hranatých závorkách] doplní provozovatel (OPERATOR níže).
 */
import type { Lang } from '../lib/i18n';

export const LEGAL_UPDATED = '2026-11-24';

/** Údaje o provozovateli – doplnit před spuštěním. */
export const OPERATOR = {
  name: '[Jméno a příjmení / název provozovatele]',
  address: '[Adresa]',
  id: '[IČO, pokud existuje]',
  email: '[kontaktní e-mail]',
};

export type LegalDoc = 'privacy' | 'terms';
export interface LegalSection {
  h: string;
  p: string[];
}

const op = (lang: Lang) =>
  lang === 'en'
    ? `${OPERATOR.name}, ${OPERATOR.address}, ID ${OPERATOR.id}, e-mail ${OPERATOR.email}`
    : `${OPERATOR.name}, ${OPERATOR.address}, IČO ${OPERATOR.id}, e-mail ${OPERATOR.email}`;

const PRIVACY: Record<Lang, LegalSection[]> = {
  cs: [
    {
      h: '1. Kdo vaše údaje zpracovává',
      p: [
        `Správcem osobních údajů je ${op('cs')} (dále „provozovatel“). S jakýmkoli dotazem nebo žádostí ohledně osobních údajů nám napište na uvedený e-mail.`,
        'Aplikace Zvedej není oficiální aplikací Českého svazu vzpírání.',
      ],
    },
    {
      h: '2. Jaké údaje zpracováváme',
      p: [
        'Účet: e-mail, heslo (uložené jen v zašifrované podobě), jméno, příjmení, datum narození a datum souhlasu s podmínkami.',
        'Profil (vyplňujete dobrovolně): profilová fotka, motto, klub, pohlaví, rok narození, věková a váhová kategorie, osobní rekordy, tělesná hmotnost a nastavení viditelnosti.',
        'Tréninky: plány, odtrénované série, váhy, maxima, poznámky a hodnocení tréninků.',
        'Výzva Vzpěrač měsíce: nahraná videa, popisky, lajky a nahlášení.',
        'Komunikace: žádosti o přátelství, soukromé zprávy, blokování a nahlášení uživatelů.',
        'Technické údaje nutné pro chod aplikace (přihlášení, nastavení jazyka a vzhledu). Nepoužíváme reklamní ani analytické nástroje třetích stran a nesledujeme vás napříč weby.',
      ],
    },
    {
      h: '3. Proč údaje zpracováváme a na jakém základě',
      p: [
        'Poskytování aplikace podle podmínek použití (čl. 6 odst. 1 písm. b GDPR): účet, profil, tréninky, výzva, přátelé a zprávy.',
        'Oprávněný zájem (čl. 6 odst. 1 písm. f GDPR): bezpečnost, ochrana před zneužitím, řešení nahlášení a moderace obsahu.',
        'Plnění právních povinností (čl. 6 odst. 1 písm. c GDPR): např. vyřizování žádostí úřadů nebo povinnosti podle nařízení o digitálních službách (DSA).',
        'Tělesnou hmotnost a tréninková data používáme jen k výpočtům v aplikaci (Sinclair, procenta z maxim). Hmotnost ostatním uživatelům nezobrazujeme, pokud to sami nepovolíte.',
      ],
    },
    {
      h: '4. Věk',
      p: [
        'Aplikaci mohou používat osoby od 15 let. Mladší osoby se registrovat nemohou. Pokud zjistíme, že účet patří osobě mladší 15 let, smažeme ho.',
      ],
    },
    {
      h: '5. Kdo k údajům má přístup',
      p: [
        'Ostatní uživatelé vidí váš veřejný profil (jméno, foto, klub, kategorii, rekordy), vaše videa ve výzvě a zprávy, které jim pošlete. Ve vyhledávání se můžete skrýt v nastavení.',
        'Zpracovatelé, kteří pro nás zajišťují provoz: Supabase Inc. (databáze, přihlášení a úložiště, servery v EU – Frankfurt), případně Cloudflare Inc. (úložiště videí) a GitHub Inc. (hostování webové verze aplikace). Se zpracovateli máme uzavřené smlouvy o zpracování osobních údajů.',
        'Údaje neprodáváme a nepředáváme k marketingovým účelům.',
      ],
    },
    {
      h: '6. Jak dlouho údaje uchováváme',
      p: [
        'Po dobu existence účtu. Po smazání účtu se údaje smažou do 30 dnů, zálohy do 90 dnů.',
        'Nahlášení a záznamy o moderaci uchováváme nejvýše 1 rok od vyřízení, pokud je nepotřebujeme k řešení sporu nebo pro úřady.',
      ],
    },
    {
      h: '7. Vaše práva',
      p: [
        'Máte právo na přístup k údajům, jejich opravu, výmaz, omezení zpracování, přenositelnost a právo vznést námitku.',
        'V aplikaci si můžete kdykoli stáhnout všechna svá data (Nastavení → Stáhnout moje data) a smazat účet (Nastavení → Smazat účet).',
        'Máte právo podat stížnost u Úřadu pro ochranu osobních údajů (www.uoou.cz).',
      ],
    },
    {
      h: '8. E-maily a oznámení',
      p: [
        'Posíláme jen e-maily nutné pro účet (potvrzení registrace, obnovení hesla). Obchodní sdělení posíláme jen s vaším výslovným souhlasem a s možností se kdykoli odhlásit.',
        'Oznámení v telefonu (konec pauzy) zobrazujeme jen s vaším povolením a můžete je vypnout v nastavení.',
      ],
    },
    { h: '9. Změny', p: ['O podstatných změnách těchto zásad vás informujeme v aplikaci.'] },
  ],
  sk: [
    {
      h: '1. Kto spracúva vaše údaje',
      p: [
        `Prevádzkovateľom osobných údajov je ${op('sk')} (ďalej „prevádzkovateľ“). S akoukoľvek otázkou alebo žiadosťou ohľadom osobných údajov nám napíšte na uvedený e-mail.`,
        'Aplikácia Zvedej nie je oficiálnou aplikáciou Českého svazu vzpírání.',
      ],
    },
    {
      h: '2. Aké údaje spracúvame',
      p: [
        'Účet: e-mail, heslo (uložené len v zašifrovanej podobe), meno, priezvisko, dátum narodenia a dátum súhlasu s podmienkami.',
        'Profil (vypĺňate dobrovoľne): profilová fotka, motto, klub, pohlavie, rok narodenia, veková a váhová kategória, osobné rekordy, telesná hmotnosť a nastavenie viditeľnosti.',
        'Tréningy: plány, odtrénované série, váhy, maximá, poznámky a hodnotenia tréningov.',
        'Výzva Vzpierač mesiaca: nahrané videá, popisky, lajky a nahlásenia.',
        'Komunikácia: žiadosti o priateľstvo, súkromné správy, blokovanie a nahlásenia používateľov.',
        'Technické údaje nutné na chod aplikácie (prihlásenie, nastavenie jazyka a vzhľadu). Nepoužívame reklamné ani analytické nástroje tretích strán.',
      ],
    },
    {
      h: '3. Prečo údaje spracúvame a na akom základe',
      p: [
        'Poskytovanie aplikácie podľa podmienok používania (čl. 6 ods. 1 písm. b GDPR).',
        'Oprávnený záujem (čl. 6 ods. 1 písm. f GDPR): bezpečnosť, ochrana pred zneužitím, riešenie nahlásení a moderovanie obsahu.',
        'Plnenie zákonných povinností (čl. 6 ods. 1 písm. c GDPR), napr. podľa nariadenia o digitálnych službách (DSA).',
        'Telesnú hmotnosť a tréningové dáta používame len na výpočty v aplikácii. Hmotnosť ostatným nezobrazujeme, pokiaľ to sami nepovolíte.',
      ],
    },
    { h: '4. Vek', p: ['Aplikáciu môžu používať osoby od 15 rokov. Účet osoby mladšej ako 15 rokov zmažeme.'] },
    {
      h: '5. Kto má k údajom prístup',
      p: [
        'Ostatní používatelia vidia váš verejný profil, vaše videá vo výzve a správy, ktoré im pošlete. Vo vyhľadávaní sa môžete skryť v nastaveniach.',
        'Sprostredkovatelia: Supabase Inc. (databáza, prihlásenie a úložisko, servery v EÚ – Frankfurt), prípadne Cloudflare Inc. (úložisko videí) a GitHub Inc. (hosting webovej verzie). So sprostredkovateľmi máme uzavreté zmluvy o spracúvaní osobných údajov.',
        'Údaje nepredávame ani neposkytujeme na marketingové účely.',
      ],
    },
    {
      h: '6. Ako dlho údaje uchovávame',
      p: [
        'Počas existencie účtu. Po zmazaní účtu sa údaje zmažú do 30 dní, zálohy do 90 dní.',
        'Nahlásenia a záznamy o moderovaní uchovávame najviac 1 rok od vybavenia.',
      ],
    },
    {
      h: '7. Vaše práva',
      p: [
        'Máte právo na prístup, opravu, vymazanie, obmedzenie spracúvania, prenosnosť a právo namietať.',
        'V aplikácii si môžete stiahnuť všetky svoje dáta (Nastavenia → Stiahnuť moje dáta) a zmazať účet.',
        'Sťažnosť môžete podať na Úrad pre ochranu osobných údajov SR alebo na Úřad pro ochranu osobních údajů ČR.',
      ],
    },
    {
      h: '8. E-maily a oznámenia',
      p: ['Posielame len e-maily nutné pre účet. Obchodné oznámenia len s vaším výslovným súhlasom a s možnosťou odhlásenia.'],
    },
    { h: '9. Zmeny', p: ['O podstatných zmenách vás budeme informovať v aplikácii.'] },
  ],
  en: [
    {
      h: '1. Who processes your data',
      p: [
        `The controller of your personal data is ${op('en')} (the “operator”). Contact us at the e-mail above with any question or request about your data.`,
        'Zvedej is not an official app of the Czech Weightlifting Federation.',
      ],
    },
    {
      h: '2. What data we process',
      p: [
        'Account: e-mail, password (stored only in hashed form), first and last name, date of birth and the date you accepted the terms.',
        'Profile (optional): photo, motto, club, gender, birth year, age and weight category, personal records, bodyweight and visibility settings.',
        'Training: plans, completed sets, weights, maxes, notes and session ratings.',
        'Lifter of the Month challenge: uploaded videos, captions, likes and reports.',
        'Communication: friend requests, private messages, blocks and user reports.',
        'Technical data needed to run the app (sign-in, language and theme). We do not use third-party advertising or analytics and do not track you across websites.',
      ],
    },
    {
      h: '3. Why we process data and on what legal basis',
      p: [
        'Providing the app under the terms of use (Art. 6(1)(b) GDPR).',
        'Legitimate interest (Art. 6(1)(f) GDPR): security, abuse prevention, handling reports and content moderation.',
        'Legal obligations (Art. 6(1)(c) GDPR), e.g. under the Digital Services Act (DSA).',
        'Bodyweight and training data are used only for calculations in the app. Your bodyweight is not shown to others unless you allow it.',
      ],
    },
    { h: '4. Age', p: ['The app is for people aged 15 and over. Accounts of people under 15 will be deleted.'] },
    {
      h: '5. Who can access the data',
      p: [
        'Other users see your public profile, your challenge videos and the messages you send them. You can hide from search in settings.',
        'Processors: Supabase Inc. (database, sign-in and storage, servers in the EU – Frankfurt), where applicable Cloudflare Inc. (video storage) and GitHub Inc. (hosting of the web version). We have data processing agreements with them.',
        'We do not sell your data or share it for marketing.',
      ],
    },
    {
      h: '6. How long we keep data',
      p: [
        'For as long as your account exists. After deletion, data is erased within 30 days and from backups within 90 days.',
        'Reports and moderation records are kept for at most 1 year after they are resolved.',
      ],
    },
    {
      h: '7. Your rights',
      p: [
        'You have the right of access, rectification, erasure, restriction, portability and objection.',
        'You can download all your data (Settings → Download my data) and delete your account in the app at any time.',
        'You may lodge a complaint with the Czech Data Protection Authority (www.uoou.cz) or your local authority.',
      ],
    },
    {
      h: '8. E-mails and notifications',
      p: [
        'We send only e-mails required for your account. Marketing messages are sent only with your explicit consent and can be unsubscribed at any time.',
      ],
    },
    { h: '9. Changes', p: ['We will inform you in the app about material changes.'] },
  ],
};

const TERMS: Record<Lang, LegalSection[]> = {
  cs: [
    {
      h: '1. Úvod',
      p: [
        `Aplikaci Zvedej provozuje ${op('cs')}. Registrací souhlasíte s těmito podmínkami a potvrzujete, že je vám alespoň 15 let.`,
        'Aplikace je určena vzpěračům a jejich trenérům. Není oficiální aplikací Českého svazu vzpírání; informace o závodech a novinky přebírá z veřejných kanálů webu vzpirani.cz s odkazem na zdroj.',
      ],
    },
    {
      h: '2. Účet',
      p: [
        'Uvádějte pravdivé údaje, účet je osobní a nesmíte ho přenechat jiné osobě. Za přihlašovací údaje odpovídáte vy.',
        'Účet můžete kdykoli smazat v Nastavení.',
      ],
    },
    {
      h: '3. Pravidla obsahu',
      p: [
        'Za obsah, který nahrajete nebo pošlete (videa, popisky, profil, zprávy), odpovídáte vy. Nahrávejte jen obsah, ke kterému máte práva – pozor na hudbu na pozadí videí a na osoby ve videu.',
        'Zakázáno je: urážky, šikana, výhrůžky a nenávistné projevy; sexuální nebo násilný obsah; obsah ohrožující nezletilé; spam a reklama; podvody a vydávání se za jinou osobu; porušování autorských práv a soukromí; propagace dopingu a nebezpečného chování.',
        'Ve výzvě Vzpěrač měsíce nahrávejte jen vlastní pokusy. Manipulace s hlasováním (falešné účty, kupování lajků) vede k vyřazení.',
      ],
    },
    {
      h: '4. Nahlášení a moderace',
      p: [
        'Nevhodný obsah, zprávu nebo uživatele můžete nahlásit přímo v aplikaci. Nežádoucího uživatele můžete zablokovat – nebude vám moci psát ani posílat žádosti o přátelství.',
        'Nahlášení posuzujeme bez zbytečného odkladu. Obsah porušující tato pravidla nebo zákon můžeme skrýt či odstranit a v závažných nebo opakovaných případech zablokovat účet. Video s pěti nahlášeními se automaticky skryje do posouzení.',
        'O odstranění obsahu nebo blokaci účtu vás informujeme v aplikaci i s odůvodněním. Pokud nesouhlasíte, napište nám na kontaktní e-mail – rozhodnutí znovu přezkoumáme.',
        `Kontaktní místo pro uživatele i orgány podle nařízení o digitálních službách (DSA): ${OPERATOR.email}.`,
      ],
    },
    {
      h: '5. Zdraví a bezpečnost',
      p: [
        'Tréninkové plány, procenta a výpočty v aplikaci jsou orientační a nenahrazují trenéra ani lékaře. Trénujte s ohledem na svůj zdravotní stav a s odpovídajícím dohledem.',
      ],
    },
    {
      h: '6. Licence k obsahu',
      p: [
        'Nahráním videa nebo fotky nám udělujete bezplatnou nevýhradní licenci zobrazovat tento obsah v aplikaci po dobu, kdy je obsah v aplikaci zveřejněn. Vlastnictví obsahu zůstává vám.',
      ],
    },
    {
      h: '7. Odpovědnost a dostupnost',
      p: [
        'Aplikaci poskytujeme tak, jak je, bez záruky nepřetržité dostupnosti. Neodpovídáme za obsah nahraný uživateli ani za správnost údajů převzatých z webu svazu.',
        'Aplikaci i tyto podmínky můžeme měnit; o podstatných změnách vás budeme informovat v aplikaci.',
      ],
    },
    {
      h: '8. Závěr',
      p: ['Tyto podmínky se řídí právem České republiky. Ochranu osobních údajů popisují Zásady ochrany osobních údajů.'],
    },
  ],
  sk: [
    {
      h: '1. Úvod',
      p: [
        `Aplikáciu Zvedej prevádzkuje ${op('sk')}. Registráciou súhlasíte s týmito podmienkami a potvrdzujete, že máte aspoň 15 rokov.`,
        'Aplikácia nie je oficiálnou aplikáciou Českého svazu vzpírání; informácie o pretekoch preberá z verejných kanálov webu vzpirani.cz s odkazom na zdroj.',
      ],
    },
    { h: '2. Účet', p: ['Uvádzajte pravdivé údaje, účet je osobný. Účet môžete kedykoľvek zmazať v Nastaveniach.'] },
    {
      h: '3. Pravidlá obsahu',
      p: [
        'Za obsah, ktorý nahráte alebo pošlete, zodpovedáte vy. Nahrávajte len obsah, ku ktorému máte práva.',
        'Zakázané je: urážky, šikana, vyhrážky a nenávistné prejavy; sexuálny alebo násilný obsah; obsah ohrozujúci maloletých; spam; podvody a vydávanie sa za inú osobu; porušovanie autorských práv a súkromia; propagácia dopingu.',
        'Vo výzve nahrávajte len vlastné pokusy. Manipulácia s hlasovaním vedie k vyradeniu.',
      ],
    },
    {
      h: '4. Nahlásenie a moderovanie',
      p: [
        'Nevhodný obsah, správu alebo používateľa môžete nahlásiť v aplikácii a nežiaduceho používateľa zablokovať.',
        'Obsah porušujúci pravidlá môžeme skryť alebo odstrániť a v závažných prípadoch zablokovať účet. O odstránení vás informujeme v aplikácii aj s odôvodnením; proti rozhodnutiu sa môžete ohradiť na kontaktnom e-maile.',
        `Kontaktné miesto podľa nariadenia o digitálnych službách (DSA): ${OPERATOR.email}.`,
      ],
    },
    { h: '5. Zdravie a bezpečnosť', p: ['Tréningové plány a výpočty sú orientačné a nenahrádzajú trénera ani lekára.'] },
    {
      h: '6. Licencia k obsahu',
      p: ['Nahraním obsahu nám udeľujete bezplatnú nevýhradnú licenciu zobrazovať ho v aplikácii. Vlastníctvo zostáva vám.'],
    },
    {
      h: '7. Zodpovednosť',
      p: ['Aplikáciu poskytujeme tak, ako je. Podmienky môžeme meniť; o podstatných zmenách vás budeme informovať.'],
    },
    { h: '8. Záver', p: ['Podmienky sa riadia právom Českej republiky.'] },
  ],
  en: [
    {
      h: '1. Introduction',
      p: [
        `Zvedej is operated by ${op('en')}. By registering you accept these terms and confirm you are at least 15 years old.`,
        'The app is not an official app of the Czech Weightlifting Federation; competition information is taken from public feeds of vzpirani.cz with a link to the source.',
      ],
    },
    {
      h: '2. Account',
      p: ['Provide truthful information; your account is personal. You can delete it in Settings at any time.'],
    },
    {
      h: '3. Content rules',
      p: [
        'You are responsible for the content you upload or send. Upload only content you have the rights to.',
        'Prohibited: insults, bullying, threats and hate speech; sexual or violent content; content endangering minors; spam; fraud and impersonation; copyright and privacy violations; promotion of doping.',
        'Upload only your own lifts to the challenge. Vote manipulation leads to disqualification.',
      ],
    },
    {
      h: '4. Reporting and moderation',
      p: [
        'You can report content, messages or users in the app and block unwanted users.',
        'We may hide or remove content that breaks these rules or the law and, in serious cases, suspend accounts. We notify you in the app with a statement of reasons; you can contest the decision via the contact e-mail.',
        `Point of contact under the Digital Services Act (DSA): ${OPERATOR.email}.`,
      ],
    },
    {
      h: '5. Health and safety',
      p: ['Training plans and calculations are guidance only and do not replace a coach or a doctor.'],
    },
    {
      h: '6. Content licence',
      p: ['By uploading content you grant us a free, non-exclusive licence to display it in the app. You keep ownership.'],
    },
    { h: '7. Liability', p: ['The app is provided as is. We may change these terms and will inform you of material changes.'] },
    { h: '8. Governing law', p: ['These terms are governed by the laws of the Czech Republic.'] },
  ],
};

export function legalDoc(doc: LegalDoc, lang: Lang): LegalSection[] {
  return (doc === 'privacy' ? PRIVACY : TERMS)[lang] ?? (doc === 'privacy' ? PRIVACY : TERMS).cs;
}
