/* ui-screens.js — the screenshot import, end to end, in a real browser.
   The Conversation Reader is now the Chat analyzer's "A whole conversation or screenshot" view
   (/signal-translator.html#conversation), and its screenshot test moved with it: tools/signal/ui-shots.js
   renders made-up chat screenshots (iMessage, WhatsApp, Messenger, Android Messages, Instagram, a group chat,
   light and dark, overlapping screenshots, mine on the left), reads them with the on-device OCR, measures
   who-said-what and the text, and checks the page. This file just runs it, so old notes that say
   "node tools/reader/ui-screens.js" still work.

     python3 -m http.server 8540 --bind 127.0.0.1   (from the repo root)
     PORT=8540 node tools/reader/ui-screens.js      (SHOTS=folder to keep the screenshots)            */
'use strict';
require('../signal/ui-shots.js');
