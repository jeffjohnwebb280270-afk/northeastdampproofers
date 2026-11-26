# Northeast Damp Proofers site: rules for agents

- Static HTML site, deployed by Vercel from `main`.
- **Every new or edited HTML page must end with these two lines just before `</body>`** (lead tracking and the WhatsApp "Send us a photo" button):

```html
<script defer src="/assets/site.js"></script>
<script defer src="/_vercel/insights/script.js"></script>
```

- Every page's <head> must also contain the Google tag (GA4 ID G-GQG2PLM2M7), copied from index.html, just before </head>.
- Before opening a PR, check: `grep -L "assets/site.js" *.html` and `grep -L "G-GQG2PLM2M7" *.html` must both print nothing.
- Phone: 07366 312425 (tel:+447366312425). Email: info@northeastdampproofers.co.uk.
