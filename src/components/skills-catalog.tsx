import Image from "next/image";

type Technology = { name: string; logo: string; contrast?: "ink" | "backing" };

const groups: { index: string; name: string; description: string; tools: Technology[] }[] = [
  {
    index: "01", name: "Cloud & Systems",
    description: "Provision servers, automate setup, and configure routing and failover.",
    tools: [
      { name: "Linux", logo: "linux", contrast: "backing" },
      { name: "Bash", logo: "bash", contrast: "backing" },
      { name: "AWS EC2", logo: "amazonwebservices", contrast: "backing" },
      { name: "Ansible", logo: "ansible", contrast: "ink" },
      { name: "Vagrant", logo: "vagrant" },
      { name: "VirtualBox", logo: "virtualbox", contrast: "ink" },
      { name: "Nginx", logo: "nginx" },
      { name: "HAProxy", logo: "haproxy", contrast: "backing" },
      { name: "Keepalived", logo: "keepalived.png" },
      { name: "systemd", logo: "systemd", contrast: "backing" },
    ],
  },
  {
    index: "02", name: "CI/CD & Containers",
    description: "Build pipelines, scan code, and publish versioned images.",
    tools: [
      { name: "Git", logo: "git" },
      { name: "GitHub", logo: "github", contrast: "ink" },
      { name: "Jenkins", logo: "jenkins" },
      { name: "SonarQube", logo: "sonarqube" },
      { name: "Docker", logo: "docker" },
      { name: "Docker Compose", logo: "docker" },
      { name: "Docker Hub", logo: "docker" },
      { name: "Nexus Repository", logo: "nexus", contrast: "backing" },
    ],
  },
  {
    index: "03", name: "APIs & Services",
    description: "Build and secure REST APIs for web and connected apps.",
    tools: [
      { name: "Java", logo: "java" },
      { name: "Spring Boot", logo: "springboot" },
      { name: "Spring Security", logo: "springsecurity" },
      { name: "Spring Data JPA", logo: "spring" },
      { name: "JWT", logo: "jwt", contrast: "backing" },
      { name: "Gradle", logo: "gradle", contrast: "ink" },
    ],
  },
  {
    index: "04", name: "Web Interfaces",
    description: "Build responsive interfaces and connect them to backend APIs.",
    tools: [
      { name: "TypeScript", logo: "typescript" },
      { name: "React", logo: "react" },
      { name: "Next.js", logo: "nextjs", contrast: "ink" },
      { name: "Vite", logo: "vite" },
      { name: "Tailwind CSS", logo: "tailwindcss" },
      { name: "HTML", logo: "html5" },
      { name: "CSS", logo: "css3" },
    ],
  },
  {
    index: "05", name: "Databases",
    description: "Model relational data and connect it to applications.",
    tools: [
      { name: "PostgreSQL", logo: "postgresql" },
      { name: "SQL", logo: "database", contrast: "ink" },
    ],
  },
  {
    index: "06", name: "IoT & Prototyping",
    description: "Prototype sensor and camera projects that connect to the web.",
    tools: [
      { name: "ESP32", logo: "espressif" },
      { name: "Arduino", logo: "arduino" },
      { name: "MQTT", logo: "mqtt", contrast: "ink" },
      { name: "Python", logo: "python" },
    ],
  },
];

function TechnologyLabel({ name, logo, contrast }: Technology) {
  return <>
    <span className={`about-tech-logo${contrast ? ` about-tech-logo--${contrast}` : ""}`} aria-hidden="true">
      <Image src={`/tech/${logo.includes(".") ? logo : `${logo}.svg`}`} alt="" width={18} height={18} loading="eager" />
    </span>
    <span className="about-tech-name">{name}</span>
  </>;
}

export function SkillsCatalog() {
  return <div className="about-tech mx-auto max-w-7xl px-6 sm:px-10" role="region" aria-labelledby="tech-stack-heading">
    <div className="about-tech-header" data-scroll-entry>
      <h3 id="tech-stack-heading" className="font-display font-[750] tracking-[-.045em]">SKILLS</h3>
      <p className="about-tech-eyebrow font-technical">WHAT I WORK WITH /<br />IN PROJECTS AND LABS</p>
    </div>
    <div className="about-tech-groups">
      {groups.map(group => <div key={group.index} className="about-tech-group" role="group" aria-labelledby={`skill-group-${group.index}`} data-scroll-entry data-entry-stagger>
        <div className="about-tech-title">
          <span className="about-tech-index font-technical">{group.index}<span aria-hidden="true"> ·</span></span>
          <h4 id={`skill-group-${group.index}`} className="font-display font-semibold">{group.name}</h4>
        </div>
        <p className="about-tech-description">{group.description}</p>
        <ul className="about-tech-chips font-technical" aria-label={group.name}>
          {group.tools.map(tool => <li key={tool.name}><TechnologyLabel {...tool} /></li>)}
        </ul>
      </div>)}
    </div>
    <div className="about-tech-learning font-technical" data-scroll-entry>
      <p>Currently learning</p>
      <span className="about-tech-learning-tool"><TechnologyLabel name="Kubernetes" logo="kubernetes" /></span>
    </div>
  </div>;
}
