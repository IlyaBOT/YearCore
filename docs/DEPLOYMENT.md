# Deploy YEARCORE to GitHub Pages

The application consists entirely of static files. It requires no npm,
build action, database, home server, or external API.

## 1. Publish

1. Create a **public** GitHub repository named `yearcore` owned by `IlyaBOT`.
2. Upload this repository's contents to the repository root.
3. Open **Settings → Pages → Build and deployment**.
4. Select **Deploy from a branch**, `main`, `/(root)`, then **Save**.
5. Use <https://ilyabot.github.io/YearCore/> after Pages completes deployment.

GitHub repository settings cannot be enabled by files alone.

## 2. Add a custom domain (optional)

GitHub Pages supports `yearcore.ilyabot.space`.

1. Open **Settings → Pages → Custom domain** and enter
   `yearcore.ilyabot.space`.
2. At the DNS host for `ilyabot.space`, create:

   | Type | Host | Target |
   | --- | --- | --- |
   | CNAME | yearcore | IlyaBOT.github.io |

   The DNS target **must not** include `/yearcore`.
3. Wait for DNS validation and HTTPS provisioning, then enable
   **Enforce HTTPS** in Pages settings.

With branch-based Pages publishing, GitHub writes a `CNAME` file in
the publishing source when you save the custom domain setting.
There is no `CNAME` file in this starter repository to avoid claiming
a domain before it is configured.

## 3. Add repository metadata

In the repository's **About** pane, click the gear:

- Description: `A nostalgic internet time capsule. Create your own yearly trend posters, tier lists and bingo boards.`
- Website: `https://ilyabot.github.io/YearCore/` (or verified custom domain).
- Topics: `nostalgia`, `internet-culture`, `tier-list`, `bingo`,
  `time-capsule`, `memes`, `retro-web`, `github-pages`, `javascript`.

To customize the repository share preview, open **Settings → Social preview**
and upload `docs/social-preview.png`. This is a repository setting,
not an automatic effect of committing the image.

## Notes

- GitHub Pages hosts the site independently of the author's computer.
- User data stays in browser localStorage, not in GitHub.
- Import/export JSON is the way to move collections between devices.
- Remote images can fail PNG export due to third-party CORS rules.

Docs:
- <https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site>
- <https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site>
