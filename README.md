This is the site and CMS for [www.lepi-labs.com](). It's powered by
[Payload](https://payloadcms.com/docs/getting-started/what-is-payload) and
[Next.js](https://nextjs.org/docs). Consult their respective docs for development.

If you have Nix and devenv, a dev environment config is already provided for
you. Otherwise, use the quick start instructions below to get setup.

## Quick Start

To spin up this example locally, follow these steps:

### Clone

If you have not done so already, you need to have standalone copy of this repo
on your machine. If you've already cloned this repo, skip to
[Development](#development).

Use the `create-payload-app` CLI to clone this template directly to your
machine:

```bash pnpx create-payload-app my-project -t ecommerce ```

### Development

1. First [clone the repo](#clone) if you have not done so already 1. `cd
my-project && cp .env.example .env` to copy the example environment variables 1.
`pnpm install && pnpm dev` to install dependencies and start the dev server 1.
open `http://localhost:3000` to open the app in your browser

That's it! Changes made in `./src` will be reflected in your app. Follow the
on-screen instructions to login and create your first admin user. Then check out
[Production](#production) once you're ready to build and serve your app, and
[Deployment](#deployment) when you're ready to go live.

## TODO

### Images to replace
- Home
  - Carousel
    - Acrylics
    - Protogen badge
    - Synth badge
  - Acrylic demo
  - ~~Badge demo~~
  - ~~Customization demo~~
- PCB Badges
  - Hero
  - Component images
    - Gullwing LEDs
    - Side mounted LEDs and hot glue
    - RGB LEDs
    - MCU
    - Coming soon
