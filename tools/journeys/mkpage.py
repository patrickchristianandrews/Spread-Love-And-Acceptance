import sys, re, html
ROOT=__import__('os').path.abspath(__import__('os').path.join(__import__('os').path.dirname(__file__), '..', '..'))
import os
SP=os.path.dirname(os.path.abspath(__file__))
src=open(ROOT+'/living-alone.html',encoding='utf-8').read()
head=src[:src.index('<!-- seo:start -->')]
def mk(out, title, desc, body, extra='', index=True):
    h=re.sub(r'<title>.*?</title>', '<title>'+html.escape(title, quote=False)+'</title>', head)
    h=re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="'+html.escape(desc)+'">', h)
    url='https://spreadloveandacceptance.com/'+out
    seo=('<!-- seo:start -->\n<link rel="canonical" href="%s">\n<meta name="robots" content="index, follow, max-image-preview:large">\n'
         '<meta property="og:site_name" content="Spread Love &amp; Acceptance">\n<meta property="og:title" content="%s">\n<meta property="og:description" content="%s">\n'
         '<meta property="og:type" content="article">\n<meta property="og:url" content="%s">\n<meta property="og:image" content="https://spreadloveandacceptance.com/assets/img/og-image.png">\n'
         '<link rel="icon" href="/favicon.ico" sizes="any">\n<link rel="manifest" href="/manifest.webmanifest">\n<!-- seo:end -->\n') % (url, html.escape(title), html.escape(desc), url)
    h=h.replace('</style>\n', '</style>\n'+extra, 1)
    open(ROOT+'/'+out,'w',encoding='utf-8').write(h+seo+'</head>\n'+open(SP+'/'+body,encoding='utf-8').read())
mk('after-a-breakup.html','After a Breakup: Getting Steady Again, Gently',
   'Free, kind help for the weeks after a breakup: the first days, feelings in waves, a kinder inner voice, who you are now, and small steps that count.',
   'breakup-simple-body.html')
mk('after-a-breakup-in-depth.html','After a Breakup: Steady Again, the Full Guide',
   'The full guide to getting steady after a breakup, with the research: why recovery is often faster than we expect, self-compassion, your sense of self, and social media.',
   'breakup-deep-body.html')
mk('journeys.html','Guided Journeys: Small Steps for What’s Going On',
   'Short guided journeys of 3 to 6 small steps: after a breakup, the same argument again, chores, feeling close, blended families and more. Free, private, on your device.',
   'journeys-body.html', extra='<link rel="stylesheet" href="/assets/css/journeys.css">\n<script src="/assets/js/tools-registry.js" defer></script>\n<script src="/assets/js/journeys.js" defer></script>\n<script src="/assets/js/remind.js" defer></script>\n')
