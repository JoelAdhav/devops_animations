import { Cloud } from 'lucide-react'
import type { Lesson } from '../types'
import VpcNetworking from '../VpcNetworking'

const lesson: Lesson = {
  id: 'vpc',
  title: 'VPC, subnets and gateways',
  track: "Cloud and AWS",
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

export default lesson
