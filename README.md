# Ro/Box Website
[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/Robox-Technologies/Robox-Website/droplet-deploy.yml?label=Build)](https://github.com/Robox-Technologies/Robox-Website/actions)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Frobox.com.au&label=Website)](https://robox.com.au)

[![Instagram](https://img.shields.io/twitter/url?url=https%3A%2F%2Fwww.instagram.com%2Frobox.kit&style=flat&logo=instagram&label=Instagram&labelColor=d62976&color=d62976)](https://www.instagram.com/robox.kit)
[![X (formerly Twitter)](https://img.shields.io/twitter/url?url=https%3A%2F%2Fx.com%2Frobox_kit&style=flat&logo=x&label=%2F%20Twitter&labelColor=black&color=black)](https://x.com/robox_kit)
[![LinkedIn](https://img.shields.io/twitter/url?url=https%3A%2F%2Fwww.linkedin.com%2Fcompany%2Froboxeducation&style=flat&label=LinkedIn&labelColor=0e76a8&color=0e76a8)](https://www.linkedin.com/company/roboxeducation)

Repository for the official source code of the [Ro/Box website](https://robox.com.au).

Usage of this repository's code is permitted under the terms of the *GPL-3.0 License*.

## Feedback & Contributions

Contributions to the Ro/Box website are always welcome! Please feel free to create or contribute to [an issue](https://github.com/Robox-Technologies/Robox-Website/issues) or fork this repository and open a [pull request](https://github.com/Robox-Technologies/Robox-Website/pulls) for any new features or bug fixes.
Alternatively, feel free to email us with feedback at [hello@robox.com.au](hello@robox.com.au).

When reporting feedback or bugs, we strongly encourage including steps to reproduce, relevant screenshots, and OS/browser used if applicable. If the issue is irreproducible, it will be closed.

## Installation

Clone the repository:
```bash
git clone https://github.com/Robox-Technologies/Robox-Website.git <directory>
```

Install dependencies:
```bash
npm install
```

Create a new `.env` file in the root folder. An example of its contents can be found in `example.env`.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command             | Action                                          |
| :------------------ | :---------------------------------------------- |
| `npm install`       | Installs dependencies                           |
| `npm run dev`       | Starts local dev server at `localhost:3000`     |
| `npm run build`     | Build your production site to `./dist/`         |
| `npm run build:ios` | Builds the iOS web app and runs it in Xcode     |
|                     | (useful for running on an iPad)                 |
| `npm run ios`       | Opens up a simulator of IOS                     |
| `npm run preview`   | Preview your build locally, before deploying    |

The code automatically recompiles upon file changes.

## Testing Webhooks
When testing emails on a local server, webhooks will need to be set up locally to ensure Stripe sends payment updates.

First ensure sure the server is running with 
```bash
npm run dev
```
Then (with stripe CLI installed) run 
```bash
stripe listen --forward-to localhost:3000/api/store/webhook
```
Then run the payment and it should all work!
<br>

<br>

<hr>

*Copyright &copy; Ro/Box Technologies 2026*
