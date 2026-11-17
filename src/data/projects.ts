export const projectCategories = [
  { id: "full-stack", name: "Full-Stack Projects" },
  { id: "iot", name: "IoT Projects" },
] as const;

export type ProjectCategory = (typeof projectCategories)[number]["id"];

export type Project = {
  id: string;
  name: string;
  category: ProjectCategory;
  stack: string;
  description: string;
  status?: string;
  /** Add a local asset path such as /projects/smartphset.webp when available. */
  thumbnail?: string;
  githubUrl?: string;
  liveUrl?: string;
};

// The About folders and main Projects section both read this catalog.
export const projects: readonly Project[] = [
  {
    id: "product-management-app",
    name: "Product Management App",
    category: "full-stack",
    stack: "React · Spring Boot · PostgreSQL",
    description: "A product management app with a React frontend, Spring Boot API, and PostgreSQL. Docker runs the app services, with host Nginx acting as the reverse proxy.",
  },
  {
    id: "nextjs-deployment-lab",
    name: "Next.js Deployment Lab",
    category: "full-stack",
    stack: "Next.js · Vagrant · systemd · Nginx",
    status: "Deployment lab",
    description: "A full-stack Next.js app deployment lab on Ubuntu, using Vagrant, rsync, systemd, and Nginx.",
  },
  {
    id: "smartphset",
    name: "SmartPhset",
    category: "iot",
    stack: "ESP32 · Spring Boot · Next.js",
    status: "In progress",
    description: "An in-progress smart plant monitoring project with an ESP32 camera and sensors, a Spring Boot backend, and a Next.js dashboard.",
  },
  {
    id: "arduino-water-pump-controller",
    name: "Arduino Water Pump Controller",
    category: "iot",
    stack: "Arduino Uno · Keypad · LCD · Relay",
    description: "An Arduino Uno project with a keypad, LCD, relay, and water pump. The user picks a setting from the keypad and sees the status on the LCD.",
  },
];
