/**
 * Návod k aplikaci (Nastavení → Návod). Text je v češtině; názvy tlačítek odpovídají aplikaci.
 */
export interface HelpItem {
  q: string;
  a: string;
}
export interface HelpSection {
  id: string;
  icon: string;
  title: string;
  items: HelpItem[];
}

export const HELP: HelpSection[] = [
  {
    id: 'start',
    icon: 'rocket',
    title: 'Začínáme',
    items: [
      {
        q: 'Účet, nebo bez registrace?',
        a: 'Na úvodní obrazovce se můžeš zaregistrovat e-mailem, nebo klepnout na „Začít hned bez registrace“. Bez účtu si zapisuješ tréninky jen pro sebe; po prvním tréninku ti aplikace nabídne vytvořit účet a nic se neztratí. Účet potřebuješ pro přátele, zprávy, trenéra a výzvu měsíce.',
      },
      {
        q: 'Úvodní průvodce',
        a: 'Při prvním spuštění se tě aplikace zeptá na pár věcí (jak dlouho trénuješ, kolikrát týdně, jestli máš trenéra a jaká máš maxima) a podle toho doporučí plán z knihovny. Můžeš ho přeskočit.',
      },
      {
        q: 'Prohlídka ovládání',
        a: 'Krátká prohlídka postupně zvýrazní hlavní části aplikace a vysvětlí je. Spustíš ji kdykoli tady nahoře tlačítkem „Spustit prohlídku“.',
      },
      {
        q: 'Spodní lišta',
        a: 'Lev = Svaz (závody a novinky) · činka = Tréninky · tlačítko přehrát = Výzva měsíce · ozubené kolo = Nastavení · tvoje fotka = Profil. Klepnutí na ikonu sekce, ve které už jsi, tě vrátí na její začátek.',
      },
      {
        q: 'Jazyk, jednotky, vzhled',
        a: 'Nastavení → Vzhled a Tréninky: čeština, slovenština nebo angličtina, světlý či tmavý vzhled, kilogramy nebo libry, váha osy a délka pauzy.',
      },
    ],
  },
  {
    id: 'csv',
    icon: 'newspaper',
    title: 'Svaz – závody a novinky',
    items: [
      {
        q: 'Kalendář závodů',
        a: 'Záložka „Kalendář závodů“ ukazuje nadcházející a proběhlé závody a výsledky. Barva u závodu: červená = MČR, modrá = liga, šedá = ostatní soutěže. Klepnutím na závod otevřeš detail s přílohami (propozice, startovky, výsledky).',
      },
      {
        q: 'Novinky',
        a: 'Záložka „Novinky“ přebírá články z webu vzpirani.cz. Klepnutím otevřeš celý článek.',
      },
      {
        q: 'Hledání vzpěračů a klubů',
        a: 'Do pole nahoře napiš jméno nebo klub. Ve výsledcích přepínáš mezi Vzpěrači a Kluby. Profil klubu ukazuje adresu, kontakty a členy, kteří mají aplikaci.',
      },
      {
        q: 'Bez signálu',
        a: 'Když se data nenačtou, ukáže se poslední uložená verze s upozorněním. Stáhnutím seznamu dolů obsah obnovíš.',
      },
    ],
  },
  {
    id: 'plans',
    icon: 'calendar',
    title: 'Tréninkové plány',
    items: [
      {
        q: 'Vytvoření plánu',
        a: 'Tréninky → tlačítko + vpravo nahoře (nebo Plány → Vytvořit plán). Průvodce má 3 kroky: název a délka plánu, dny v týdnu, cviky pro každý den.',
      },
      {
        q: 'Série, opakování a zátěž',
        a: 'U cviku nastavíš počet nástupů × opakování a zátěž: procenta z maxima (20–150 %, aplikace dopočítá kila podle tvých maxim), přesná kila, RPE (náročnost 1–10) nebo bez zátěže. Jeden cvik může mít víc řádků, např. 3 × 2 @ 75 % a 2 × 1 @ 85 %.',
      },
      {
        q: 'Týdenní progrese',
        a: 'U plánu můžeš nastavit, o kolik procent se má každý týden přidávat (např. +2,5 %). Váhy v procentech se pak samy zvyšují; na kartě plánu vidíš „Týden 2 z 6“.',
      },
      {
        q: 'Aktivace a změny',
        a: 'Aktivní je vždy jen jeden plán – ten se ukazuje v Tréninky → Dnes. Plán můžeš upravit, zkopírovat, archivovat nebo „změnit od příštího týdne“ (stará verze zůstane v historii).',
      },
      {
        q: 'Knihovna hotových plánů',
        a: 'Plány → Knihovna hotových plánů: začátečník, technika, silový blok, příprava na závod, plán podle pocitu (RPE) a další. Filtruj podle úrovně a cíle, otevři náhled všech dnů a klepni na „Začít podle plánu“ nebo „Nejdřív upravit“.',
      },
      {
        q: 'Plán od trenéra',
        a: 'Když ti trenér pošle plán, objeví se v Tréninky → Dnes s označením „Plán od trenéra“ a dostaneš upozornění. Úpravy od trenéra se ti promítnou automaticky.',
      },
    ],
  },
  {
    id: 'workout',
    icon: 'barbell',
    title: 'Trénink',
    items: [
      {
        q: 'Začít trénink',
        a: 'Tréninky → Dnes → Začít trénink. Cviky a váhy se předvyplní podle plánu. Bez plánu zvol „Volný trénink“ a cviky přidávej sám, nebo „Zopakovat poslední“.',
      },
      {
        q: 'Odškrtávání nástupů',
        a: 'Klepni na kolečko vpravo u nástupu – odškrtne se a spustí se časovač pauzy. Klepnutím na „opakování × kg“ změníš váhu nebo počet opakování. Ikonou se dvěma fajfkami odškrtneš všechny nástupy cviku najednou.',
      },
      {
        q: 'Časovač pauzy',
        a: 'Po odškrtnutí běží dole odpočet (délku nastavíš v Nastavení). Tlačítky −30 s / +30 s ho upravíš. Na konci zazní zvuk a ukáže se další nástup, který jde odškrtnout přímo z lišty. Časovač běží i na zamčené obrazovce a na hodinkách.',
      },
      {
        q: 'Rozcvička a doplňky',
        a: 'Nahoře v tréninku: „Rozcvička“ přidá seznam k odškrtání (nepočítá se do nástupů ani tonáže), „Přidat doplňky“ přidá doplňkové cviky na konec. Vlastní seznamy si uložíš v Nástroje → Rozcvičky a doplňky a ke dni plánu je přiřadíš v editoru plánu.',
      },
      {
        q: 'Návrh vah podle formy',
        a: 'Když máš v deníku regenerace nízkou připravenost, aplikace nabídne ubrat váhy o 5 %. Když ti cvik minule šel lehce (RPE 7 a méně), nabídne přidat 2,5 kg; když byl těžký, doporučí váhu držet. Je to jen návrh – použiješ ho klepnutím.',
      },
      {
        q: 'Dokončení tréninku',
        a: 'Hotovo → vyplň náročnost (RPE), pocit, tělesnou hmotnost a poznámku (nepovinné) → Dokončit trénink. Uloží se jen odškrtnuté nástupy. Následuje oslava se shrnutím a případnými novými rekordy.',
      },
      {
        q: 'Sdílení',
        a: 'Po tréninku nebo v detailu tréninku klepni na „Sdílet“. Vznikne obrázek ve formátu Instagram story – souhrn tréninku, nebo karta nového osobního rekordu.',
      },
      {
        q: 'Rychlý zápis (i zpětně)',
        a: 'Deník → Rychle zapsat trénink: jeden řádek = jeden cvik. Příklady: „Trh 70x2x3, 75x2“ (3× 2 opak. 70 kg a 1× 2 opak. 75 kg), „Dřep 5x5 100“, „Nadhoz 3x1@85%“ (z maxima), „Shyby 3x10“. Funguje i diktování z klávesnice. Datum můžeš změnit na dřívější den.',
      },
    ],
  },
  {
    id: 'log',
    icon: 'book',
    title: 'Deník a pokrok',
    items: [
      {
        q: 'Deník',
        a: 'Tréninky → Deník: tréninky po týdnech, nahoře pás dnů s odtrénovanými dny. Karta ukazuje všechny cviky, celkový počet nástupů a tonáž. Klepnutím otevřeš detail, kde jde trénink upravit, sdílet, zopakovat nebo smazat.',
      },
      {
        q: 'Můj pokrok',
        a: 'Deník → Můj pokrok: graf vývoje maxim (zapsaná maxima i nejtěžší váhy z tréninků), tonáž po týdnech a měsících a připravenost z deníku regenerace.',
      },
      {
        q: 'Deník regenerace',
        a: 'Na kartě „Deník regenerace“ zapíšeš spánek, energii, bolest svalů, náladu a případnou bolest nebo zranění. Aplikace z toho spočítá připravenost 0–100. Údaje o zdraví ukládáme jen s tvým souhlasem; s trenérem je sdílíš jen když to sám zapneš.',
      },
    ],
  },
  {
    id: 'tools',
    icon: 'construct',
    title: 'Nástroje',
    items: [
      {
        q: 'Moje maxima',
        a: 'Tréninky → Nástroje → Moje maxima. Z maxim se počítají váhy v procentech. Další cviky přidáš tlačítkem „Přidat cvik“, vývoj uvidíš v „Graf vývoje maxim“.',
      },
      {
        q: 'Kalkulačka kotoučů',
        a: 'Zadej cílovou váhu a osu – aplikace ukáže, jaké kotouče dát na každou stranu, i s barvami podle IWF.',
      },
      {
        q: 'Sinclair a převod jednotek',
        a: 'Sinclairovy body podle aktuálních koeficientů (2025–2028) pro muže i ženy a převod kg ↔ lb.',
      },
      {
        q: 'Export tréninků',
        a: 'Nastavení → Data → Exportovat tréninky (PDF) – přehled tréninků do souboru, který jde poslat trenérovi nebo vytisknout.',
      },
    ],
  },
  {
    id: 'coach',
    icon: 'people',
    title: 'Trenér a tým',
    items: [
      {
        q: 'Zapnutí trenérského režimu',
        a: 'Nastavení → Trenér → Jsem trenér. V Trénincích se objeví tlačítko Tým. Trenérský režim je zdarma.',
      },
      {
        q: 'Pozvání svěřenců',
        a: 'Tým → ikona přidání: pošli odkaz nebo ukaž QR kód. Svěřenec pozvánku potvrdí a sám rozhodne, jestli trenér uvidí i jeho tělesnou hmotnost a deník regenerace. Nezletilý svěřenec se může připojit jen k trenérovi ze stejného klubu.',
      },
      {
        q: 'Přehled týmu – záložka Dnes',
        a: 'Kdo dnes trénoval, kdo ještě trénink má, kdo vynechal plánovaný trénink, kdo hlásí bolest nebo má nízkou připravenost a kdo dlouho netrénoval. Klepnutím otevřeš deník svěřence.',
      },
      {
        q: 'Plány pro svěřence',
        a: 'Vytvoř plán (v procentech, kilech, RPE nebo bez zátěže) a klepni na „Poslat svěřencům“ – vyber jednotlivce nebo skupinu. Plán v kilech je dobré poslat každému zvlášť. Úpravy plánu se svěřencům promítnou.',
      },
      {
        q: 'Skupiny, žebříček, komentáře',
        a: 'Skupiny (např. Junioři) usnadní posílání plánů. Žebříček řadí tým podle Sinclairu a maxim. K tréninkům svěřenců můžeš psát komentáře a prohlížet videa, která ti pošlou.',
      },
    ],
  },
  {
    id: 'social',
    icon: 'chatbubbles',
    title: 'Výzva, přátelé a zprávy',
    items: [
      {
        q: 'Výzva měsíce',
        a: 'Každý měsíc nové téma. Nahraj video (tlačítko nahrání), prohlížej videa ostatních a lajkuj. Video s nejvíc lajky na konci měsíce vyhrává titul Vzpěrač měsíce. Nahrávej jen videa, ke kterým máš práva (i hudba).',
      },
      {
        q: 'Přátelé a zprávy',
        a: 'Profil → ikony vlevo nahoře. Přátele přidáš z jejich profilu. Zprávy od lidí, kteří nejsou tvoji přátelé, přijdou jako žádost.',
      },
      {
        q: 'Nahlášení a blokování',
        a: 'U profilu, zprávy nebo videa přes ⋯ → Nahlásit. Uživatele můžeš zablokovat; seznam blokovaných je v Nastavení → Soukromí. Při odstranění obsahu dostaneš oznámení s důvodem a můžeš do 6 měsíců požádat o přezkum.',
      },
    ],
  },
  {
    id: 'notify',
    icon: 'notifications',
    title: 'Upozornění, widget, hodinky',
    items: [
      {
        q: 'Upozornění',
        a: 'Nastavení → Upozornění: připomínka tréninku v plánovaný den (čas si zvolíš), nový plán a komentáře od trenéra, nové zprávy a závody tvého klubu. Upozornění fungují v mobilní aplikaci, ne ve webové verzi.',
      },
      {
        q: 'Widget na ploše',
        a: 'Podrž prst na ploše telefonu → přidat widget → Zvedej. Ukazuje dnešní trénink z plánu, týdny v řadě a odtrénované dny týdne.',
      },
      {
        q: 'Hodinky',
        a: 'Oznámení o konci pauzy se samo zobrazí na Apple Watch i Wear OS – přímo z hodinek odškrtneš nástup nebo přidáš 30 s.',
      },
      {
        q: 'Bez signálu',
        a: 'Tréninky si zapisuješ i bez internetu. Změny čekají v telefonu (ukáže se „Bez signálu – tréninky se ukládají do telefonu“) a odešlou se samy, jakmile se připojíš.',
      },
    ],
  },
  {
    id: 'privacy',
    icon: 'shield-checkmark',
    title: 'Účet a soukromí',
    items: [
      {
        q: 'Kdo vidí můj profil',
        a: 'Nastavení → Soukromí: viditelnost profilu ve vyhledávání a zobrazení tělesné hmotnosti ostatním (ve výchozím stavu skrytá). Profily nezletilých jsou skryté automaticky.',
      },
      {
        q: 'Moje data',
        a: 'Nastavení → Data → Stáhnout všechna moje data (JSON). Účet a všechna data smažeš v Nastavení → Smazat účet.',
      },
      {
        q: 'Děti a souhlas rodičů',
        a: 'Aplikaci mohou používat lidé od 13 let. Do 15 let (Česko) nebo 16 let (Slovensko a jinde) je potřeba souhlas rodiče – aplikace mu pošle odkaz. Do té doby funguje jen tréninkový deník.',
      },
    ],
  },
  {
    id: 'faq',
    icon: 'help-buoy',
    title: 'Časté otázky',
    items: [
      {
        q: 'Plán mi počítá divné váhy',
        a: 'Váhy v procentech se počítají z maxim v Nástroje → Moje maxima. Zkontroluj, že máš maximum zadané u správného cviku (např. přemístění se počítá z nadhozu). Bez maxim zvol plán podle RPE.',
      },
      {
        q: 'Neukládá se mi trénink',
        a: 'Uloží se jen odškrtnuté nástupy. Bez signálu se trénink uloží v telefonu a odešle se později – neodinstalovávej aplikaci, dokud se neodešle.',
      },
      {
        q: 'Nechodí mi upozornění',
        a: 'Zkontroluj Nastavení → Upozornění a povolení upozornění v nastavení telefonu. Ve webové verzi upozornění nefungují.',
      },
      {
        q: 'Našel jsem chybu / mám nápad',
        a: 'Napiš nám přes Nastavení → Provozovatel a kontakt. Když se aplikace pokazí, na chybové obrazovce je tlačítko pro odeslání hlášení.',
      },
    ],
  },
];
