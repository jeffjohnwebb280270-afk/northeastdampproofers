# Northeast Damp Proofers site: rules for agents

- Static HTML site, deployed by Vercel from `main`.
- **Every new or edited HTML page must end with these two lines just before `</body>`** (lead tracking and the WhatsApp "Send us a photo" button):

```html
<script defer src="/assets/site.js"></script>
<script defer src="/_vercel/insights/script.js"></script>
```

- Before opening a PR, check: `grep -L "assets/site.js" *.html` must print nothing.
- Phone: 07446 522034 (tel:+447446522034). Email: info@northeastdampproofers.co.uk.
