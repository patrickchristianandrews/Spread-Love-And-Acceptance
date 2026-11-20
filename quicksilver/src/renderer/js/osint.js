// OSINT knowledge base: how to run an open-source-intelligence investigation, and the open-source
// tools that do the work. OSINT = finding and making sense of information that is already public.
// Everything here is for lawful use: research, journalism, due diligence, auditing your OWN
// footprint, and authorised security testing. It is not for stalking, harassment or unauthorised
// access, which are illegal. Collect only public data, keep a clear purpose, and keep records.
'use strict';

// The investigation process — the classic intelligence cycle, in plain words.
const OSINT_PHASES = [
  ['1 · Plan', 'Write down the exact question and why you may lawfully ask it. Decide what a good answer looks like, and what you will NOT touch (private accounts, anything needing a login you are not entitled to).'],
  ['2 · Set up safely (OPSEC)', 'Protect yourself and avoid tipping off the subject. Use a separate browser profile or VM, a VPN, and research ("sock puppet") accounts — never your own. Do not log in to, message, friend or download from a target. Looking is passive; interacting is not.'],
  ['3 · Collect', 'Gather public data from many sources: search engines and dorks, social media, public records, domains/DNS, breach data, images and their metadata, maps. Save everything (URL, screenshot, date) as you go — pages change and vanish.'],
  ['4 · Process', 'Turn raw finds into tidy facts: extract names, usernames, emails, phones, handles, dates, locations. Normalise them (one person, many handles). Note the source and confidence of each.'],
  ['5 · Analyse & corroborate', 'Connect the dots and, crucially, confirm each claim from a second independent source. Watch for coincidence (two people, same name), stale data and deliberate fakes. Map relationships (people ↔ accounts ↔ domains).'],
  ['6 · Report', 'Write it up so someone else could repeat it: the question, the method, each finding with its source and date, your confidence, and the gaps. Keep the evidence trail.'],
];

// Ground rules.
const OSINT_RULES = [
  ['Stay legal', 'Public ≠ permitted for every purpose. Follow local law (computer-misuse, privacy/GDPR, anti-stalking) and the site’s terms. If you need a login you are not entitled to, stop.'],
  ['Passive first', 'Prefer collection that never touches the target. Do not DM, friend, comment, or run active scans against infrastructure you are not authorised to test.'],
  ['Protect yourself', 'Separate identity and device for research. A VPN plus a clean browser profile stops your own identity leaking into the investigation.'],
  ['Record as you go', 'Screenshot with the URL and timestamp. The Wayback Machine and a notes file are your friends — findings must be reproducible.'],
  ['Corroborate', 'One source is a lead, not a fact. Confirm from an independent second source before you rely on anything.'],
  ['Mind bias & harm', 'Beware jumping to the person you expected. Consider the harm of being wrong, and of the data itself; minimise what you keep.'],
];

// Per-target playbooks: start with one identifier, this is the order to work through.
const OSINT_PLAYBOOKS = [
  { id: 'person', icon: '🧑', name: 'A person (by name)', steps: [
    'Exact-match the full name in quotes; add a city, employer or middle name to cut the noise.',
    'Find usernames/handles they use, then pivot (see "A username").',
    'Look for a CV/resume (filetype:pdf) — often has email, phone, history.',
    'Check the big social sites and People-search/Public-records sites for your region.',
    'Reverse-image their profile photo to find other accounts.',
    'Corroborate identity across at least two independent sources before linking anything.' ], tools: ['sherlock', 'maigret', 'pipl', 'reverse-image', 'osint-framework'] },
  { id: 'username', icon: '🏷️', name: 'A username / handle', steps: [
    'Run it through a username checker (Sherlock / Maigret / WhatsMyName) to find every site it exists on.',
    'Open each hit — profiles leak real names, locations, other handles, email hints.',
    'Search the handle in quotes on search engines and inside code hosts (GitHub).',
    'Note reused avatars and bios — reverse-image the avatar.' ], tools: ['sherlock', 'maigret', 'whatsmyname', 'mitaka'] },
  { id: 'email', icon: '📧', name: 'An email address', steps: [
    'Check breach exposure (Have I Been Pwned) — tells you where it has an account and what leaked.',
    'Run holehe / EmailRep to see which sites the address is registered on and its reputation.',
    'Dork the address (see the Email-identification dorks) and search paste sites.',
    'If you only have a name + domain, guess the format (first.last@) and verify.' ], tools: ['hibp', 'holehe', 'emailrep', 'hunter', 'ghunt'] },
  { id: 'phone', icon: '📞', name: 'A phone number', steps: [
    'PhoneInfoga for carrier, line type and footprint.',
    'Search the number in several formats (+1, 001, spaces, dashes) in quotes.',
    'Check messaging apps and marketplace listings where numbers appear.' ], tools: ['phoneinfoga', 'osint-framework'] },
  { id: 'domain', icon: '🌐', name: 'A domain / website', steps: [
    'WHOIS and DNS records (registrar, name servers, mail servers).',
    'Enumerate subdomains (Amass / subfinder / crt.sh certificate transparency).',
    'theHarvester for emails, hosts and staff tied to the domain.',
    'Wayback Machine for old pages and removed content; BuiltWith/Wappalyzer for the tech stack.',
    'Dork the domain for exposed files, logins and documents (see Company & domain recon).' ], tools: ['theharvester', 'amass', 'subfinder', 'crtsh', 'wayback', 'spiderfoot', 'shodan'] },
  { id: 'ip', icon: '📡', name: 'An IP / server / device', steps: [
    'Shodan / Censys for open ports, services, banners and known CVEs.',
    'Reverse-DNS and geolocation for rough ownership and location.',
    'Only probe directly if you are authorised to test it.' ], tools: ['shodan', 'censys', 'nmap'] },
  { id: 'image', icon: '🖼️', name: 'A photo / image', steps: [
    'Read the metadata (ExifTool) — camera, sometimes GPS, date.',
    'Reverse-image on Google, Yandex (best for faces/places), Bing and TinEye.',
    'Geolocate from clues in the frame: signs, language, plates, architecture, sun position; confirm on satellite/street view.' ], tools: ['exiftool', 'reverse-image', 'yandex-images', 'tineye', 'google-maps'] },
  { id: 'social', icon: '💬', name: 'Social media', steps: [
    'Find all of the subject’s accounts first (username/image pivots).',
    'Read bios, pinned posts, tagged photos, followers/following for connections.',
    'Note posting times and places (timezone, check-ins) — but corroborate.',
    'Archive posts immediately; they get deleted.' ], tools: ['social-analyzer', 'wayback', 'osint-framework'] },
  { id: 'company', icon: '🏢', name: 'A company', steps: [
    'Registry filings and officers (company registers for the country).',
    'Domain + subdomain + staff recon (see "A domain").',
    'Public documents (filetype: dorks), job ads (reveal the tech stack), press.',
    'Breach and credential exposure for the corporate domain.' ], tools: ['theharvester', 'spiderfoot', 'hibp', 'maltego'] },
];

// Open-source / free OSINT tools, grouped. type: 'free'|'freemium'|'paid-free-tier'. Each has what it does and a link.
const OSINT_TOOLS = [
  { cat: '🔗 All-in-one & frameworks', list: [
    { id: 'maltego', name: 'Maltego', type: 'freemium', what: 'Visual link-analysis: drops people, emails, domains and more onto a graph and pulls relationships via "transforms". The community edition is free.', url: 'https://www.maltego.com' },
    { id: 'spiderfoot', name: 'SpiderFoot', type: 'free', what: 'Automates OSINT across 200+ sources from one seed (name, email, IP, domain). Open source; runs locally with a web UI.', url: 'https://github.com/smicallef/spiderfoot' },
    { id: 'recon-ng', name: 'Recon-ng', type: 'free', what: 'Modular recon framework (Metasploit-style) for domains, hosts, contacts and credentials.', url: 'https://github.com/lanmaster53/recon-ng' },
    { id: 'osint-framework', name: 'OSINT Framework', type: 'free', what: 'A huge clickable directory of OSINT resources by data type — the map of the whole field.', url: 'https://osintframework.com' },
    { id: 'intel-techniques', name: 'IntelTechniques', type: 'free', what: 'Michael Bazzell’s search tools and workbooks — a gold-standard methodology reference.', url: 'https://inteltechniques.com/tools/' },
    { id: 'gephi', name: 'Gephi', type: 'free', what: 'Open-source graph visualisation — lay out and explore big networks of entities and links.', url: 'https://gephi.org' },
  ] },
  { cat: '📚 Handbooks & learning', list: [
    { id: 'osint-handbook', name: 'OSINT Handbook (i-intelligence)', type: 'free', what: 'A structured free PDF reference: search, social media, company/patent research and security investigations.', url: 'https://i-intelligence.eu/uploads/public-documents/OSINT_Handbook_June-2018_Final.pdf' },
    { id: 'osint-mastery', name: 'Complete OSINT Mastery (JambaAcademy)', type: 'free', what: 'A GitHub collection of OSINT templates, methodology guides and companion resources.', url: 'https://github.com/JambaAcademy/OSINT' },
    { id: 'awesome-osint', name: 'Awesome OSINT', type: 'free', what: 'The community-curated master list of OSINT tools and resources on GitHub.', url: 'https://github.com/jivoi/awesome-osint' },
  ] },
  { cat: '🗂️ Tool directories', list: [
    { id: 'osint-tools-library', name: 'OSINT Tools Library', type: 'free', what: 'A continuously updated directory of vetted tools, noting each tool’s function and whether it is maintained.', url: 'https://tools.osintnewsletter.com/' },
    { id: 'osint-directory', name: 'OSINT Directory', type: 'free', what: 'Hundreds of categorised tools paired with investigative playbooks (domains, social, geolocation, verification).', url: 'https://www.osintdirectory.com/' },
    { id: 'bellingcat', name: 'Bellingcat Toolkit', type: 'free', what: 'The investigative outlet’s public toolkit and how-to guides, strong on verification and geolocation.', url: 'https://bellingcat.gitbook.io/toolkit' },
  ] },
  { cat: '🏷️ Usernames & people', list: [
    { id: 'sherlock', name: 'Sherlock', type: 'free', what: 'Hunts a username across 400+ sites in seconds.', url: 'https://github.com/sherlock-project/sherlock' },
    { id: 'maigret', name: 'Maigret', type: 'free', what: 'Like Sherlock but deeper — 2500+ sites and pulls profile details.', url: 'https://github.com/soxoj/maigret' },
    { id: 'whatsmyname', name: 'WhatsMyName', type: 'free', what: 'Web + tool for username enumeration across sites, community-maintained.', url: 'https://whatsmyname.app' },
    { id: 'social-analyzer', name: 'Social Analyzer', type: 'free', what: 'Finds and rates a person’s profiles across 1000+ sites.', url: 'https://github.com/qeeqbox/social-analyzer' },
    { id: 'pipl', name: 'People-search sites', type: 'freemium', what: 'Region-specific people/public-records search (e.g. your national registry, voter/property records). Varies by country.', url: 'https://osintframework.com' },
  ] },
  { cat: '📧 Email & breaches', list: [
    { id: 'hibp', name: 'Have I Been Pwned', type: 'free', what: 'Tells you which breaches an email/phone appears in.', url: 'https://haveibeenpwned.com' },
    { id: 'holehe', name: 'holehe', type: 'free', what: 'Checks which 120+ sites an email is registered on — without alerting the owner.', url: 'https://github.com/megadose/holehe' },
    { id: 'emailrep', name: 'EmailRep', type: 'freemium', what: 'Reputation and profile of an email address (age, presence, risk).', url: 'https://emailrep.io' },
    { id: 'hunter', name: 'Hunter.io', type: 'paid-free-tier', what: 'Finds and verifies email addresses for a domain, with the likely format.', url: 'https://hunter.io' },
    { id: 'ghunt', name: 'GHunt', type: 'free', what: 'What a Google (Gmail) account exposes — name, photo, reviews, maps.', url: 'https://github.com/mxrch/GHunt' },
  ] },
  { cat: '🌐 Domains, DNS & infrastructure', list: [
    { id: 'theharvester', name: 'theHarvester', type: 'free', what: 'Emails, subdomains, hosts and names for a domain from public sources.', url: 'https://github.com/laramies/theHarvester' },
    { id: 'amass', name: 'OWASP Amass', type: 'free', what: 'Deep subdomain/asset discovery and network mapping.', url: 'https://github.com/owasp-amass/amass' },
    { id: 'subfinder', name: 'subfinder', type: 'free', what: 'Fast passive subdomain enumeration.', url: 'https://github.com/projectdiscovery/subfinder' },
    { id: 'crtsh', name: 'crt.sh', type: 'free', what: 'Certificate-transparency search — subdomains leak via TLS certs.', url: 'https://crt.sh' },
    { id: 'dnsdumpster', name: 'DNSDumpster', type: 'free', what: 'DNS recon and a map of a domain’s hosts.', url: 'https://dnsdumpster.com' },
    { id: 'wayback', name: 'Wayback Machine', type: 'free', what: 'Archived versions of pages — recover removed/old content.', url: 'https://web.archive.org' },
    { id: 'virustotal', name: 'VirusTotal', type: 'paid-free-tier', what: 'Reputation of a file, URL, domain or IP, plus related infrastructure and passive DNS.', url: 'https://www.virustotal.com' },
    { id: 'securitytrails', name: 'SecurityTrails', type: 'paid-free-tier', what: 'DNS and WHOIS history — see how a domain’s records changed over time.', url: 'https://securitytrails.com' },
    { id: 'builtwith', name: 'BuiltWith', type: 'freemium', what: 'The technology stack a website runs (CMS, analytics, hosting, widgets).', url: 'https://builtwith.com' },
    { id: 'urlscan', name: 'urlscan.io', type: 'free', what: 'Loads a URL in a sandbox and reports what it contacts, loads and looks like.', url: 'https://urlscan.io' },
  ] },
  { cat: '🛰️ Live tracking & geospatial', list: [
    { id: 'marinetraffic', name: 'MarineTraffic', type: 'paid-free-tier', what: 'Live and historical ship positions worldwide (AIS) — vessel name, type, flag, port calls.', url: 'https://www.marinetraffic.com' },
    { id: 'vesselfinder', name: 'VesselFinder', type: 'paid-free-tier', what: 'Another live AIS ship tracker, good free map and vessel details.', url: 'https://www.vesselfinder.com' },
    { id: 'adsbexchange', name: 'ADS-B Exchange', type: 'free', what: 'Unfiltered live flight tracking (shows aircraft others hide), with history.', url: 'https://globe.adsbexchange.com' },
    { id: 'flightradar24', name: 'Flightradar24', type: 'paid-free-tier', what: 'Popular live flight tracker — flights, aircraft, routes, airports.', url: 'https://www.flightradar24.com' },
    { id: 'opensky', name: 'OpenSky Network', type: 'free', what: 'Open flight-data network with a free API for research.', url: 'https://opensky-network.org' },
    { id: 'google-earth', name: 'Google Earth', type: 'free', what: 'Satellite and 3D imagery, historical imagery slider, measuring — for geolocation.', url: 'https://earth.google.com/web/' },
    { id: 'openstreetmap', name: 'OpenStreetMap', type: 'free', what: 'Open map with rich detail; query features with Overpass Turbo.', url: 'https://www.openstreetmap.org' },
    { id: 'overpass', name: 'Overpass Turbo', type: 'free', what: 'Query OpenStreetMap for specific features (e.g. all petrol stations in an area) — great for narrowing a location.', url: 'https://overpass-turbo.eu' },
    { id: 'suncalc', name: 'SunCalc', type: 'free', what: 'Sun position and shadow direction by date/time — pin down when a photo was taken.', url: 'https://www.suncalc.org' },
    { id: 'sentinel', name: 'Sentinel Hub / Copernicus', type: 'free', what: 'Free recent satellite imagery (ESA) for change detection and verification.', url: 'https://apps.sentinel-hub.com/eo-browser/' },
  ] },
  { cat: '📡 Devices, IPs & networks', list: [
    { id: 'shodan', name: 'Shodan', type: 'paid-free-tier', what: 'Search engine for internet-connected devices: open ports, services, webcams, ICS.', url: 'https://www.shodan.io' },
    { id: 'censys', name: 'Censys Search', type: 'paid-free-tier', what: 'Hosts, certificates and services across the internet.', url: 'https://search.censys.io' },
    { id: 'nmap', name: 'Nmap', type: 'free', what: 'The classic network/port scanner — for infrastructure you are authorised to test.', url: 'https://nmap.org' },
    { id: 'wigle', name: 'WiGLE', type: 'free', what: 'Database of Wi-Fi networks by location (wardriving data).', url: 'https://wigle.net' },
  ] },
  { cat: '📹 Public cameras & webcams', list: [
    { id: 'earthcam', name: 'EarthCam', type: 'free', what: 'A huge directory of public live webcams (cities, landmarks, beaches) put online on purpose.', url: 'https://www.earthcam.com' },
    { id: 'windy-webcams', name: 'Windy Webcams', type: 'free', what: 'Tens of thousands of public webcams on a world map, with weather overlays.', url: 'https://www.windy.com/webcams' },
    { id: 'skyline-webcams', name: 'Skyline Webcams', type: 'free', what: 'Curated public live HD webcams from around the world.', url: 'https://www.skylinewebcams.com' },
    { id: 'opentopia', name: 'Opentopia / WebcamTaxi', type: 'free', what: 'Directories of public streaming webcams by country and category.', url: 'https://www.webcamtaxi.com' },
    { id: 'wsdot', name: 'Traffic & transport cams', type: 'free', what: 'Government road/traffic cameras are usually public — search "<state/city> traffic cameras".', url: 'https://511.org' },
    // Note: tools that stream strangers’ unsecured/private cameras are deliberately left out — viewing
    // those is a privacy violation and often illegal. To check your OWN cameras aren’t exposed, use Shodan.
  ] },
  { cat: '🖼️ Images, metadata & geolocation', list: [
    { id: 'exiftool', name: 'ExifTool', type: 'free', what: 'Reads metadata from photos/files — camera, timestamps, sometimes GPS.', url: 'https://exiftool.org' },
    { id: 'reverse-image', name: 'Google / Bing Images', type: 'free', what: 'Reverse-image search to find where a picture appears.', url: 'https://images.google.com' },
    { id: 'yandex-images', name: 'Yandex Images', type: 'free', what: 'Often the best reverse-image for faces and places.', url: 'https://yandex.com/images/' },
    { id: 'tineye', name: 'TinEye', type: 'freemium', what: 'Reverse-image search focused on exact copies and first-seen dates.', url: 'https://tineye.com' },
    { id: 'google-maps', name: 'Maps / Street View', type: 'free', what: 'Confirm a location from satellite and street-level imagery.', url: 'https://www.google.com/maps' },
  ] },
  { cat: '📞 Phone', list: [
    { id: 'phoneinfoga', name: 'PhoneInfoga', type: 'free', what: 'Footprint a phone number: carrier, line type, where it appears.', url: 'https://github.com/sundowndev/phoneinfoga' },
  ] },
  { cat: '🔎 Dork automation & secrets', list: [
    { id: 'dorkhunter', name: 'DorkHunter', type: 'free', what: 'Automates running lists of Google dorks against a target. (Quicksilver’s Web Finder builds the same queries for you, no install.)', url: 'https://github.com/KunalNamdas/DorkHunter' },
    { id: 'metagoofil', name: 'Metagoofil', type: 'free', what: 'Pulls public documents for a domain and extracts their metadata (users, software, paths).', url: 'https://github.com/opsdisk/metagoofil' },
    { id: 'trufflehog', name: 'TruffleHog', type: 'free', what: 'Finds leaked secrets/keys in public git repos.', url: 'https://github.com/trufflesecurity/trufflehog' },
    { id: 'gitleaks', name: 'Gitleaks', type: 'free', what: 'Scans repos and history for hard-coded secrets.', url: 'https://github.com/gitleaks/gitleaks' },
  ] },
];

const OSINT_TYPE_LABEL = { free: ['Free / open source', 'b-mint'], freemium: ['Free tier + paid', 'b-sky'], 'paid-free-tier': ['Free tier + paid', 'b-sky'] };
const osintToolById = (id) => { for (const g of OSINT_TOOLS) { const t = g.list.find((x) => x.id === id); if (t) return t; } return null; };