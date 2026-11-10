import { Container } from 'lucide-react'
import type { Lesson } from '../types'
import DockerBuild from '../DockerBuild'

const lesson: Lesson = {
  id: 'docker',
  title: 'Docker images, layers and cache',
  track: "Containers and delivery",
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

export default lesson
