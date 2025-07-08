# Ro/Box Website
[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/Robox-Technologies/Robox-Website/firebase-hosting-merge.yml)](https://github.com/Robox-Technologies/Robox-Website/actions)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Frobox.com.au&label=Production)](https://robox.com.au)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fdev.robox.com.au&label=Develop)](https://dev.robox.com.au)

[![Instagram](https://img.shields.io/twitter/url?url=https%3A%2F%2Fwww.instagram.com%2Frobox.kit&style=flat&logo=instagram&label=Instagram&labelColor=d62976&color=d62976)](https://www.instagram.com/robox.kit)
[![X (formerly Twitter)](https://img.shields.io/twitter/url?url=https%3A%2F%2Fx.com%2Frobox_kit&style=flat&logo=x&label=%2F%20Twitter&labelColor=black&color=black)](https://x.com/robox_kit)
[![LinkedIn](https://img.shields.io/twitter/url?url=https%3A%2F%2Fwww.linkedin.com%2Fcompany%2Froboxeducation&style=flat&label=LinkedIn&labelColor=0e76a8&color=0e76a8)](https://www.linkedin.com/company/roboxeducation)

Repository for the official source code of the [Ro/Box website](https://robox.com.au).

Usage of this repository's code is permitted under the terms of the *GPL-3.0 License*.

## Contributions

Contributions to the Ro/Box website are always welcome! Please feel free to create or contribute to [an issue](https://github.com/Robox-Technologies/Robox-Website/issues) or fork this repository and open a [pull request](https://github.com/Robox-Technologies/Robox-Website/pulls) for any new features or bug fixes.

## Installation

Clone the repository:
```bash
git clone https://github.com/Robox-Technologies/Robox-Website.git <directory>
```

Install dependencies:
```bash
npm install
```

Create a new `.env` file in the root folder. The `.env` structure is shown in `example.env`:
```env
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
CACHE_MODE=false
```

Compile and run on localhost:
```bash
npm run dev
```
This will open a localhost server on port 3000 (`localhost:3000`).

The code automatically recompiles upon file changes.

<br>

<br>

<hr>

*Copyright &copy; Ro/Box Technologies 2025*
