import { Rocket } from 'lucide-react'
import type { Lesson } from '../types'
import CicdPipeline from '../CicdPipeline'

const lesson: Lesson = {
  id: 'cicd',
  title: 'CI/CD pipeline',
  track: "Containers and delivery",
  tone: 'amber',
  icon: Rocket,
  summary: 'A git push travels through test, build, push, deploy and smoke test. Make any stage fail and watch the pipeline protect production.',
  minutes: 6,
  Playground: CicdPipeline,
  playgroundIntro: 'Press Play for a green run, then pick a failure and replay.',
  interview: [
    {
      q: 'Explain your CI/CD pipeline.',
      a: 'On push to main: install and run lint + unit tests, build a Docker image tagged with the commit SHA, push it to ECR, deploy to staging, run smoke tests, then promote the same image to production after approval. Any failure stops the pipeline.',
    },
    {
      q: 'CI vs continuous delivery vs continuous deployment?',
      a: 'CI: every change is built and tested automatically. Continuous delivery: every passing change is ready to release, but production needs a manual approval. Continuous deployment: passing changes go to production automatically.',
    },
    {
      q: 'Why tag images with the commit SHA instead of "latest"?',
      a: 'It is immutable and traceable: you know exactly which code is running, and rollback means redeploying the previous SHA. "latest" changes under you.',
    },
    {
      q: 'How do you store secrets in a pipeline?',
      a: 'Never in the repo. Use the CI secret store (GitHub Actions secrets) or, better, OIDC to assume an AWS role with no long-lived keys, plus AWS Secrets Manager / SSM Parameter Store at runtime.',
    },
  ],
  commands: [
    { cmd: 'git push origin main', note: 'Triggers the pipeline' },
    { cmd: 'docker build -t app:$GITHUB_SHA .', note: 'Immutable image tag' },
    { cmd: 'aws ecr get-login-password | docker login --username AWS --password-stdin <registry>', note: 'Log in to ECR' },
    { cmd: 'kubectl rollout status deploy/app', note: 'Wait for the deploy to finish' },
    { cmd: 'kubectl rollout undo deploy/app', note: 'Roll back to the previous version' },
  ],
}

export default lesson
