# R. Barela

An artist and filmmaker’s portfolio for art, makeup, props, sets, film, and writing. The site pairs a static visitor experience with a browser editor for projects, essays, Bio, and media.

| Resource | Location |
| --- | --- |
| Website | [rbarela.com](https://rbarela.com/) |
| Hosted editor | [rbarela.com/admin/](https://rbarela.com/admin/) |
| Source | [GitHub repository](https://github.com/aindaco1/rhiannon-portfolio) |
| Site releases | [Pages workflow](https://github.com/aindaco1/rhiannon-portfolio/actions/workflows/pages.yml) |
| Documentation | [Project handbook](docs/README.md) |

The visitor site and editor shell are built with Node, Jekyll, and native browser JavaScript, then hosted on GitHub Pages. The hosted editor uses a separate Cloudflare Worker, D1 email-link sessions, Resend, and a GitHub App. Dust Wave Platform supplies the shared WYSIWYG editor and infrastructure helpers.

**Publishing visibility:** this is a public repository. Hosted draft saves and uploads are visible in GitHub source/history before website publication. The Pages artifact includes only published content and referenced media. Local editing stays on your computer. See [the editor guide](docs/EDITOR_GUIDE.md) and [deployment](docs/DEPLOYMENT.md).

## Start locally

Use Node **26.12.1** and Ruby **3.3** to match CI, with Bundler and Git installed. From the repository root:

```sh
git submodule update --init --recursive
bundle install
npm ci
npx playwright install chromium
npm run dev
```

- [Local portfolio](http://127.0.0.1:4321/)
- [Local editor](http://127.0.0.1:4322/admin/) — opens a loopback session without email sign-in

The development server builds once. Restart it after source changes. Content saves and local publication persist in ignored `.local/`; they do not change the tracked catalog or the hosted site. Do not delete `.local/` to refresh the preview. [Development](docs/DEVELOPMENT.md) explains the separate content stores and troubleshooting.

## Verify

```sh
npm run check
npm run build:production
```

The first command checks documentation, unit/API behavior, the build, and browser workflows. The second enforces production content requirements. CI additionally audits dependencies. See [quality assurance](docs/QUALITY_ASSURANCE.md) for focused checks and the boundary between local tests and live service acceptance.

## Work on the project

Start with the [handbook](docs/README.md). Artists can go directly to the [editor guide](docs/EDITOR_GUIDE.md); developers to [development](docs/DEVELOPMENT.md) and [architecture](docs/ARCHITECTURE.md); operators to [deployment](docs/DEPLOYMENT.md) and [recovery](docs/OPERATIONS.md).

Contributors and agents should read [AGENTS.md](AGENTS.md). Keep the stack small, reuse the pinned Platform contracts, and update the relevant guide with behavior changes. The handbook distinguishes current guidance from historical plans and acceptance records.
