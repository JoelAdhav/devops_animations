import { Boxes } from 'lucide-react'
import type { Lesson } from '../types'
import K8sCluster from '../K8sCluster'

const lesson: Lesson = {
  id: 'kubernetes',
  title: 'Kubernetes self-healing',
  track: "Containers and delivery",
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

export default lesson
