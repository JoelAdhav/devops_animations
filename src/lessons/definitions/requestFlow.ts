import { Workflow } from 'lucide-react'
import type { Lesson } from '../types'
import RequestFlow from '../RequestFlow'

const lesson: Lesson = {
  id: 'request-flow',
  title: 'A real web request on AWS',
  track: "Cloud and AWS",
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

export default lesson
