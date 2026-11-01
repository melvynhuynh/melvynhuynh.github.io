# melvynhuynh.github.io

Personal academic website, built with Jekyll and the [Bay](https://github.com/eliottvincent/bay) theme (ISC license, see `LICENSE.md`).

## Run locally

```bash
docker compose up
```

The site is served at http://localhost:4000. Restart after changing `_config.yml`.

## Deployment

Every push to `main` builds and deploys the site through `.github/workflows/deploy.yml`.

## Updating content

| Content | File |
| --- | --- |
| Bio | `index.md` |
| Projects | `_data/projects.yml` |
| Teaching | `projects.md` |
| Personal page | `personal.md` |
| Photo | `assets/img/profile-pic.jpg` |
| CV | `assets/pdf/cv/cv.pdf` |
| Email, links, favicon | `_config.yml` |

Remaining placeholders are marked `TODO`. To list them: `git grep -n TODO`.
