# DevOps Visual Lab

Interactive, animated explanations of cloud and DevOps concepts. Every lesson is a simulation you control: play it, step through it, break something on purpose, and see the exact error and the commands to debug it. Each lesson ends with the interview questions it answers.

## How lessons work

Each foundation lesson has the same shape:

1. **Scroll story**: explanation on the left, a sticky illustrated scene on the right that changes as you read each part.
2. **Try it yourself**: an interactive playground.
3. **Key terms**, a **quiz** with explanations, and an **interview corner** with commands to remember.

Visual style: friendly flat illustrations with ink outlines, warm palette, springy motion. Light theme by default, dark mode toggle.

## Lessons

| # | Lesson | Playground |
| --- | --- | --- |
| 1 | How the internet works | Send a message as packets over random routes, with optional packet loss |
| 2 | IP addresses and CIDR | Real subnet calculator with live binary view (AWS reserved IPs) |
| 3 | TCP, UDP and ports | Connection tester: connected vs refused vs timed out |
| 4 | DNS | Pretend `dig` with a sample zone and caching |
| 5 | HTTP and HTTPS | Request builder against a fake shop API, plus what a Wi-Fi snooper sees |
| 6 | Linux files and folders | Sandbox terminal (cd, ls, mkdir, cp, mv, rm, cat, echo >) with challenges |
| 7 | Linux file permissions | chmod bit toggler |
| 8 | Processes and services | systemctl simulator: start, stop, crash, reboot, enable, Restart=always |
| 9 | Bash scripting | Pipeline lab on a real access log |
| 10 | Git | Live commit graph: commit, branch, switch, merge |
| 11 | A real web request on AWS | DNS → ALB → EC2 → RDS with failure simulation |
| 12 | VPC, subnets and gateways | Toggle IGW, NAT, routes and security groups |
| 13 | Docker images, layers and cache | Layer cache: good vs bad Dockerfile order |
| 14 | CI/CD pipeline | Make any stage fail |
| 15 | Kubernetes self-healing | Kill pods, crash a node, scale, rolling update |

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173. Keyboard: `Space` play/pause, `←` / `→` step.

```bash
npm run build    # type-check and build to dist/
npm run lint     # oxlint
```

## Tech stack

- React 19 + TypeScript + Vite
- [Motion](https://motion.dev) for animation
- React Router (hash routing, so it works on S3 / GitHub Pages without rewrite rules)
- Lucide icons

## Project structure

```
src/
  components/   Illustrations (Laptop, Server, Router, Envelope, Bubble…), Story (scroll engine, Tip, Shell),
                Quiz, Sequence (animated sequence diagrams), Diagram/Controls/Caption (simulators)
  lessons/      foundations/*.tsx (one file per story lesson), older simulators, registry.ts (order and tracks)
  lib/          motion presets, useLoop, useStepper, vfs (sandbox filesystem), storage (progress, theme)
  pages/        Home, LessonPage
```

### Adding a story lesson

1. Copy a file in `src/lessons/foundations/`. It default-exports a `Lesson` object: `story.sections` (title + JSX text) and `story.Scene` (receives the current `step`), plus optional `Playground`, `terms`, `quiz`, `interview`, `commands`.
2. Build each scene step from `components/Illustrations` and wrap animated loops in a small component that calls `useLoop`.
3. Add it to the `lessons` array in `src/lessons/registry.ts` with its track.

## Roadmap

Lessons:
- Load balancing algorithms and health checks
- Auto Scaling group reacting to CPU load
- Terraform plan / apply / state, and drift
- Deployment strategies: rolling vs blue/green vs canary
- Monitoring: metrics, logs, traces, and an alert firing
- IAM policy evaluation (explicit deny wins)
- S3 + CloudFront caching

Features:
- Quiz mode at the end of each lesson
- "Incident mode": a random failure is injected and you diagnose it
- Built-in terminal simulator for practising commands

## Deploy (planned DevOps portfolio work)

This app is a static site, so it is also the project used to practise the DevOps toolchain:
- Dockerfile (multi-stage: build with Node, serve with nginx)
- GitHub Actions: lint, build, deploy on push to main
- Terraform: S3 bucket + CloudFront + ACM certificate + Route 53 record
