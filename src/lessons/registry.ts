import { Boxes, Cloud, Container, KeyRound, Rocket, Workflow } from 'lucide-react'
import type { Lesson } from './types'
import RequestFlow from './RequestFlow'
import VpcNetworking from './VpcNetworking'
import DockerBuild from './DockerBuild'
import CicdPipeline from './CicdPipeline'
import K8sCluster from './K8sCluster'
import LinuxPermissions from './LinuxPermissions'
import internet from './foundations/Internet'
import ip from './foundations/IpAddressing'
import tcp from './foundations/TcpPorts'
import dns from './foundations/Dns'
import http from './foundations/Http'
import linuxFs from './foundations/LinuxFs'
import processes from './foundations/Processes'
import bash from './foundations/Bash'
import git from './foundations/Git'
import loadBalancing from './LoadBalancing'

export type { Lesson }

const NET = 'Foundations: Networking'
const LINUX = 'Foundations: Linux and tools'
const CLOUD = 'Cloud and AWS'
const CONTAINERS = 'Containers and delivery'

const permissions: Lesson = {
  id: 'linux-permissions',
  title: 'Linux file permissions',
  track: LINUX,
  tone: 'rose',
  icon: KeyRound,
  summary: 'Decode chmod numbers bit by bit. Toggle read, write and execute for owner, group and others, and see exactly who can do what.',
  minutes: 5,
  Playground: LinuxPermissions,
  playgroundIntro: 'Click the r, w and x buttons, type a chmod number, or pick a preset.',
  interview: [
    {
      q: 'What does chmod 755 mean?',
      a: 'Owner 7 = 4+2+1 = read, write, execute. Group 5 = 4+1 = read, execute. Others 5 = read, execute. Typical for scripts and directories.',
    },
    {
      q: 'Why does SSH refuse my private key?',
      a: 'If the key file is readable by others, SSH errors with "UNPROTECTED PRIVATE KEY FILE". Fix with chmod 600 key.pem (owner read/write only) or 400.',
    },
    {
      q: 'What does execute mean on a directory?',
      a: 'Permission to enter it (cd) and access files inside by name. Read on a directory lets you list names; you usually need both r and x.',
    },
    {
      q: 'Why is chmod 777 bad?',
      a: 'Everyone on the system can modify or replace the file. On a web server that can mean anyone exploiting the app can overwrite code. Fix ownership with chown instead.',
    },
  ],
  commands: [
    { cmd: 'ls -l deploy.sh', note: 'Show permissions, owner and group' },
    { cmd: 'chmod 755 deploy.sh', note: 'rwxr-xr-x' },
    { cmd: 'chmod u+x deploy.sh', note: 'Add execute for the owner only' },
    { cmd: 'chown joel:devs deploy.sh', note: 'Change owner and group' },
    { cmd: 'chmod 600 ~/.ssh/key.pem', note: 'Lock down an SSH key' },
  ],
}

const requestFlow: Lesson = {
  id: 'request-flow',
  title: 'A real web request on AWS',
  track: CLOUD,
  tone: 'sky',
  icon: Workflow,
  summary:
    'Follow one request from the browser through DNS, a load balancer, an app server and a database. Then break each piece and see the exact error it causes.',
  minutes: 6,
  Playground: RequestFlow,
  playgroundIntro: 'Press Play, then pick a failure and replay to see where the request dies.',
  interview: [
    {
      q: 'The website is down. How do you debug it?',
      a: 'Work along the request path. DNS resolves? (dig). Load balancer healthy targets? App process running and listening? (systemctl status, ss -tulnp). Logs? (journalctl, app logs). Disk full? (df -h). Database reachable? (nc -zv host 3306). Recent deploy? Roll back if so.',
    },
    {
      q: 'What is the difference between 502, 503 and 504?',
      a: '502 Bad Gateway: the target answered badly or refused the connection, e.g. the app crashed. 503 Service Unavailable: no healthy targets to send to. 504 Gateway Timeout: the target took too long, e.g. a slow DB query.',
    },
    {
      q: 'Why put the app servers in a private subnet?',
      a: 'They have no public IP, so nobody on the internet can reach them directly. Only the load balancer in the public subnet can, and security groups restrict it further. Smaller attack surface.',
    },
  ],
  commands: [
    { cmd: 'dig shop.example.com +short', note: 'Does DNS resolve?' },
    { cmd: 'curl -Iv https://shop.example.com', note: 'Status code + TLS details' },
    { cmd: 'systemctl status myapp', note: 'Is the app running?' },
    { cmd: 'journalctl -u myapp -n 100 --no-pager', note: 'Recent app logs' },
    { cmd: 'ss -tulnp | grep 8080', note: 'Is anything listening on the port?' },
    { cmd: 'nc -zv db.internal 3306', note: 'Can the app reach the DB port?' },
  ],
}

const vpc: Lesson = {
  id: 'vpc',
  title: 'VPC, subnets and gateways',
  track: CLOUD,
  tone: 'violet',
  icon: Cloud,
  summary:
    'Public vs private subnets, internet gateway, NAT gateway, route tables and security groups. Flip switches and watch packets get through or get dropped.',
  minutes: 8,
  Playground: VpcNetworking,
  playgroundIntro: 'Pick a scenario, flip the infrastructure switches, and press Play.',
  interview: [
    {
      q: 'What makes a subnet "public"?',
      a: 'Only its route table: a public subnet has a route 0.0.0.0/0 → internet gateway. A private subnet does not. Instances also need a public IP to be reachable.',
    },
    {
      q: 'Why do private instances need a NAT gateway?',
      a: 'To start outbound connections (OS updates, calling APIs) without being reachable from the internet. NAT lives in a public subnet; the private route table sends 0.0.0.0/0 to it.',
    },
    {
      q: 'Security group vs NACL?',
      a: 'Security group: attached to an instance/ENI, stateful (replies allowed automatically), allow rules only. NACL: attached to a subnet, stateless (must allow both directions), allow and deny rules, evaluated in number order.',
    },
    {
      q: 'How do you SSH into a private instance?',
      a: 'Preferred: AWS Systems Manager Session Manager (no open port 22, no keys). Alternatives: a bastion host in a public subnet, or a VPN.',
    },
  ],
  commands: [
    { cmd: 'aws ec2 describe-route-tables --filters Name=vpc-id,Values=vpc-123', note: 'Inspect routes' },
    { cmd: 'aws ec2 describe-security-groups --group-ids sg-123', note: 'Inspect SG rules' },
    { cmd: 'curl -s ifconfig.me', note: 'Which public IP does this server use? (NAT IP if private)' },
    { cmd: 'aws ssm start-session --target i-0abc123', note: 'Shell into a private instance' },
  ],
}

const docker: Lesson = {
  id: 'docker',
  title: 'Docker images, layers and cache',
  track: CONTAINERS,
  tone: 'teal',
  icon: Container,
  summary:
    'Watch a Dockerfile become stacked image layers, then a running container with a port mapping. Rebuild after a code change and see why instruction order decides build speed.',
  minutes: 7,
  Playground: DockerBuild,
  playgroundIntro: 'Build first, then choose "Edit code & rebuild" and compare good vs bad order.',
  interview: [
    {
      q: 'Image vs container?',
      a: 'An image is a read-only stack of layers (a template). A container is a running instance of an image plus a thin writable layer on top. Many containers can share one image.',
    },
    {
      q: 'How do you make Docker builds faster?',
      a: 'Order instructions from least to most frequently changing: copy package files and install dependencies before copying source. Use .dockerignore. Use small base images (alpine/distroless) and multi-stage builds.',
    },
    {
      q: 'What does -p 8080:3000 mean?',
      a: 'Host port 8080 forwards to container port 3000. The app inside listens on 3000; you reach it from the host at localhost:8080.',
    },
    {
      q: 'What is a multi-stage build?',
      a: 'Build in a large image with compilers and dev tools, then COPY --from=build only the output into a small runtime image. Smaller, faster and more secure images.',
    },
  ],
  commands: [
    { cmd: 'docker build -t my-app:1.0 .', note: 'Build an image from the Dockerfile' },
    { cmd: 'docker run -d -p 8080:3000 --name web my-app:1.0', note: 'Run detached with port mapping' },
    { cmd: 'docker ps', note: 'Running containers' },
    { cmd: 'docker logs -f web', note: 'Follow container logs' },
    { cmd: 'docker exec -it web sh', note: 'Shell inside the container' },
    { cmd: 'docker history my-app:1.0', note: 'See the layers and their sizes' },
  ],
}

const cicd: Lesson = {
  id: 'cicd',
  title: 'CI/CD pipeline',
  track: CONTAINERS,
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

const k8s: Lesson = {
  id: 'kubernetes',
  title: 'Kubernetes self-healing',
  track: CONTAINERS,
  tone: 'green',
  icon: Boxes,
  summary:
    'A Deployment keeps the desired number of pods running. Kill pods, crash a node, scale up and run a rolling update, and watch the control loop fix everything.',
  minutes: 8,
  Playground: K8sCluster,
  playgroundIntro: 'The cluster is live. Kill pods, crash a node, drag replicas, or deploy a new version.',
  interview: [
    {
      q: 'Pod vs Deployment vs Service?',
      a: 'Pod: one or more containers that run together, the smallest unit. Deployment: keeps N replicas of a pod running and handles rolling updates. Service: a stable IP/DNS name that load-balances to healthy pods, because pod IPs keep changing.',
    },
    {
      q: 'What happens when a pod crashes?',
      a: 'The ReplicaSet controller sees current < desired replicas and creates a new pod. The scheduler places it on a node with capacity. The Service only sends traffic to pods that pass readiness probes.',
    },
    {
      q: 'How does a rolling update avoid downtime?',
      a: 'It replaces pods gradually: start a new-version pod (maxSurge), wait until it is ready, then stop an old one (maxUnavailable). If new pods fail readiness, the rollout stalls and you can roll back.',
    },
    {
      q: 'A pod is in CrashLoopBackOff. What do you do?',
      a: 'kubectl describe pod (events, exit code, OOMKilled?), kubectl logs <pod> --previous (logs of the crashed container), check env vars/config/secrets, image tag, and liveness probe settings.',
    },
  ],
  commands: [
    { cmd: 'kubectl get pods -o wide', note: 'Pods and the node each runs on' },
    { cmd: 'kubectl scale deploy/web --replicas=5', note: 'Change desired replicas' },
    { cmd: 'kubectl delete pod web-7f9c-x2k9', note: 'Kill a pod (it comes back)' },
    { cmd: 'kubectl set image deploy/web web=nginx:1.27', note: 'Start a rolling update' },
    { cmd: 'kubectl describe pod <name>', note: 'Events and reasons' },
    { cmd: 'kubectl logs <pod> --previous', note: 'Logs from the crashed container' },
  ],
}

/** Lessons in learning order. */
export const lessons: Lesson[] = [
  { ...internet, track: NET },
  { ...ip, track: NET },
  { ...tcp, track: NET },
  { ...dns, track: NET },
  { ...http, track: NET },
  { ...linuxFs, track: LINUX },
  permissions,
  { ...processes, track: LINUX },
  { ...bash, track: LINUX },
  { ...git, track: LINUX },
  requestFlow,
  vpc,
  docker,
  cicd,
  k8s,
  loadBalancing,
]

export const tracks = [...new Set(lessons.map((l) => l.track))]

export function findLesson(id: string | undefined) {
  return lessons.find((l) => l.id === id)
}
