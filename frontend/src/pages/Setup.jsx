import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Check,
  CheckCircle2,
  Clock,
  Code2,
  Cpu,
  FileText,
  Info,
  Layers,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Trash2,
  UserCheck,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getProfile, startSession } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import PdfUpload from "../components/PdfUpload.jsx";
import { saveSession } from "../session.js";

const MIN = 20;
const MAX = 15000;

const PRESETS = [
  {
    id: "fresher_swe",
    title: "Junior / Fresher Software Engineer",
    level: "Fresher (0 - 1 yrs)",
    icon: Code2,
    tags: ["Data Structures", "Python/Java", "REST APIs", "SQL", "Projects"],
    job_description: `Role: Junior Software Engineer / Campus Graduate
Level: Entry / Fresher (0-1 years)
Tech Stack: Python, Java or JavaScript, Data Structures & Algorithms, Basic SQL, Git

About the Role:
We are looking for an enthusiastic Junior / Fresher Software Engineer with solid foundational computer science skills, genuine curiosity, and hands-on academic or personal project experience.

Key Responsibilities:
- Write clean, well-tested, and readable code for core features and API endpoints.
- Collaborate with senior engineers to learn engineering best practices, code reviews, and debugging.
- Participate in problem-solving discussions and translate logical requirements into functioning algorithms.
- Work with relational databases to write efficient SQL queries.

Requirements:
- Degree in Computer Science, Engineering, or equivalent practical hands-on project portfolio.
- Strong grasp of core CS fundamentals: Data Structures, Algorithms, OOP concepts, and basic system logic.
- Experience building at least 1-2 personal, college, or internship projects using Python, Java, or JavaScript/React.
- Eagerness to learn, clear communication, and structured problem-solving approach.`,
  },
  {
    id: "fullstack",
    title: "Full Stack Engineer",
    level: "Mid - Senior",
    icon: Layers,
    tags: ["React", "Node.js", "TypeScript", "PostgreSQL", "Docker"],
    job_description: `Role: Full Stack Engineer
Level: Mid to Senior
Tech Stack: React, TypeScript, Node.js, Express, PostgreSQL, Redis, Docker, AWS

About the Role:
We are seeking a talented Full Stack Engineer to architect and deliver high-impact web applications. You will work across the entire stack, from fluid React interfaces to scalable microservices and robust database architectures.

Key Responsibilities:
- Design and build responsive frontend user experiences using React, TypeScript, and modern state management.
- Architect, develop, and maintain resilient RESTful and GraphQL APIs in Node.js.
- Optimize database schemas and queries in PostgreSQL; design caching strategies with Redis for sub-100ms response times.
- Implement automated CI/CD pipelines and containerize applications with Docker.
- Collaborate closely with product managers and designers to translate complex technical requirements into intuitive features.

Requirements:
- 3+ years of professional full-stack web development experience.
- Solid proficiency in modern JavaScript/TypeScript, React hooks, and asynchronous programming.
- Strong database fundamentals (SQL joins, indexing, query optimization, ACID transactions).
- Experience with cloud infrastructure (AWS/GCP), containerization, and automated testing (Jest, Playwright).
- Excellent problem-solving, communication, and system design skills.`,
  },
  {
    id: "backend",
    title: "Backend & Systems",
    level: "Senior",
    icon: Cpu,
    tags: ["Python", "FastAPI", "PostgreSQL", "Kafka", "Redis"],
    job_description: `Role: Backend & Distributed Systems Engineer
Level: Senior
Tech Stack: Python, FastAPI, PostgreSQL, Apache Kafka, Redis, Docker, Kubernetes

About the Role:
Join our core infrastructure engineering team building high-throughput distributed systems capable of handling millions of real-time transactions with high availability.

Key Responsibilities:
- Design high-throughput, low-latency microservices using Python (FastAPI/asyncio).
- Architect distributed event-driven systems using Apache Kafka for real-time data streaming.
- Ensure high availability, fault tolerance, and data integrity across distributed databases and cache layers.
- Design and manage database migrations, partition strategies, and indexing in PostgreSQL.
- Monitor system health, latency SLAs, and memory profiles using Prometheus and Grafana.

Requirements:
- 4+ years designing and scaling backend services handling high concurrent workloads.
- Deep understanding of concurrency, event-driven architectures, and distributed system design trade-offs.
- Hands-on experience with message brokers (Kafka/RabbitMQ) and distributed caching (Redis).
- Strong understanding of API design principles, rate limiting, and authentication protocols (OAuth2/JWT).
- Passion for writing clean, tested, and maintainable code.`,
  },
  {
    id: "frontend",
    title: "Frontend Specialist",
    level: "Mid - Senior",
    icon: Sparkles,
    tags: ["React 19", "TypeScript", "Tailwind CSS", "Web Vitals", "Next.js"],
    job_description: `Role: Senior Frontend Engineer (UI/UX & Performance)
Level: Mid to Senior
Tech Stack: React 19, TypeScript, Next.js, Tailwind CSS, Web Vitals, Jest/Playwright

About the Role:
We are looking for a Senior Frontend Engineer obsessed with craft, UI micro-interactions, responsive design systems, and web performance optimization.

Key Responsibilities:
- Build fluid, accessible, and high-performance web applications using React and TypeScript.
- Architect reusable, maintainable component design systems and micro-frontends.
- Optimize web vitals (LCP, FID, CLS), render cycles, bundle sizes, and client-side memory footprint.
- Work closely with UI/UX designers in Figma to create pixel-perfect micro-interactions and animations.
- Write robust unit, integration, and end-to-end tests with Jest and Playwright.

Requirements:
- 3+ years in front-end development with deep expertise in modern React, DOM rendering, and CSS/Tailwind.
- Strong knowledge of browser internals, rendering performance, and web accessibility standards (WCAG AA).
- Proven track record of architecting scalable client-side state management solutions.
- Eye for detail, typography, responsive design, and motion design.`,
  },
  {
    id: "ai_ml",
    title: "AI & ML Engineer",
    level: "Mid - Senior",
    icon: Zap,
    tags: ["Python", "PyTorch", "LLMs", "RAG", "Vector DBs"],
    job_description: `Role: AI / Machine Learning Engineer
Level: Mid to Senior
Tech Stack: Python, PyTorch, LangChain/LlamaIndex, OpenAI/Gemini APIs, Pinecone/Qdrant, FastAPI, Docker

About the Role:
We are seeking an AI Engineer to build generative AI solutions, automated reasoning agents, and production-grade Retrieval-Augmented Generation (RAG) pipelines.

Key Responsibilities:
- Build and scale production LLM pipelines, Retrieval-Augmented Generation (RAG) architectures, and autonomous agent workflows.
- Fine-tune, evaluate, and benchmark embedding models and open-source foundation models.
- Design vector database indexing, hybrid search, and semantic re-ranking strategies.
- Deploy scalable inference endpoints with FastAPI, Triton, and Docker.
- Implement guardrails, hallucination detection, prompt evaluation, and cost-latency optimization.

Requirements:
- Solid background in Machine Learning, Deep Learning, and NLP fundamentals.
- Practical experience building and evaluating production applications with LLMs and Vector DBs.
- Strong Python engineering skills, vector math, and asynchronous API integration.
- Experience with MLOps, model monitoring, and prompt engineering frameworks.`,
  },
  {
    id: "devops",
    title: "DevOps & Cloud",
    level: "Mid - Senior",
    icon: Target,
    tags: ["Kubernetes", "AWS", "Terraform", "CI/CD", "Linux"],
    job_description: `Role: Cloud & DevOps Engineer
Level: Mid to Senior
Tech Stack: AWS, Terraform, Kubernetes, Docker, GitHub Actions, Linux, Datadog

About the Role:
We are looking for a DevOps Engineer to automate infrastructure, optimize CI/CD pipelines, and ensure cloud security and reliability across multi-region deployments.

Key Responsibilities:
- Architect and automate resilient cloud infrastructure using Infrastructure-as-Code (Terraform/OpenTofu).
- Manage multi-cluster Kubernetes deployments, ingress controllers, and service meshes.
- Build zero-downtime CI/CD deployment pipelines using GitHub Actions and ArgoCD.
- Implement comprehensive observability, alerting, and log aggregation with Datadog/Prometheus.
- Enforce security best practices, IAM least-privilege, network segmentation, and vulnerability scanning.

Requirements:
- 3+ years experience managing AWS/GCP infrastructure in production environments.
- Deep expertise with Kubernetes orchestration, Helm, container networking, and security.
- Strong scripting skills (Python/Bash) and Linux system administration.
- Experience with disaster recovery, backup strategies, and cost optimization.`,
  },
  {
    id: "mobile",
    title: "Mobile App Engineer",
    level: "Mid - Senior",
    icon: Code2,
    tags: ["React Native", "Flutter", "TypeScript", "iOS/Android"],
    job_description: `Role: Mobile App Developer (iOS & Android)
Level: Mid to Senior
Tech Stack: React Native / Flutter, TypeScript, Swift / Kotlin, SQLite / WatermelonDB, Firebase

About the Role:
Join our mobile team crafting flagship cross-platform mobile experiences downloaded by hundreds of thousands of users worldwide.

Key Responsibilities:
- Develop cross-platform mobile apps delivering smooth 60fps animations and native-grade responsiveness.
- Architect offline-first sync engines and local encrypted storage.
- Integrate native mobile device features (camera, biometric auth, push notifications, Bluetooth).
- Manage app store deployment pipelines (App Store Connect, Google Play Console, Fastlane).
- Collaborate with backend engineers to define resilient, battery-efficient mobile API contracts.

Requirements:
- 3+ years of professional mobile development experience shipping production apps.
- Strong proficiency with React Native or Flutter and native bridges.
- Expertise in mobile memory management, battery optimization, and networking under poor connections.`,
  },
];

const SAMPLE_RESUME = `Alex Chen — Senior Software Engineer
Email: alex.chen@example.com | Portfolio: alexchen.dev | GitHub: github.com/alexchen

Summary:
Full-stack software engineer with 4+ years of experience designing and scaling web services, distributed systems, and real-time frontend applications. Passionate about developer tooling, performance tuning, and clean architecture.

Technical Skills:
- Languages: TypeScript, JavaScript, Python, Go, SQL, HTML/CSS
- Frontend: React 19, Next.js, Redux Toolkit, Tailwind CSS, WebSockets
- Backend & Cloud: Node.js, FastAPI, PostgreSQL, Redis, Docker, Kubernetes, AWS (S3, EC2, Lambda)
- Tools: Git, GitHub Actions, Jest, Vitest, Playwright, Prometheus

Professional Experience:
Senior Software Engineer | CloudScale Inc. (2022 – Present)
- Architected a distributed real-time notifications service using Node.js, Redis Pub/Sub, and WebSockets, handling over 25,000 concurrent connections with <50ms delivery latency.
- Migrated core monolith services to containerized FastAPI microservices on AWS EKS, reducing average server response time by 38% and lowering AWS hosting costs by 22%.
- Led frontend redesign using React and Tailwind CSS, improving Lighthouse performance score from 61 to 94 and decreasing cumulative layout shift.
- Mentored junior engineers, established automated CI/CD checks, and raised test coverage from 45% to 88%.

Software Engineer | NovaTech Solutions (2020 – 2022)
- Built interactive dashboard analytics using React, TypeScript, and Recharts processing 5M+ daily event records.
- Optimized PostgreSQL queries and designed composite indexes, resolving database connection pool bottlenecks during peak traffic.
- Implemented OAuth2 / JWT authentication flow with role-based access control (RBAC).

Key Projects:
- TaskMesh: An open-source distributed task orchestrator in Go and Redis with automatic retry queues and failure telemetry.
- DevPulse: Real-time code collaboration IDE with operational transformation algorithms and WebRTC video sharing.`;

const SAMPLE_FRESHER_RESUME = `Rohan Sharma — Junior Software Engineer / Computer Science Graduate
Email: rohan.sharma@example.com | GitHub: github.com/rohansharma-dev | LinkedIn: linkedin.com/in/rohan-sharma

Education:
B.Tech in Computer Science & Engineering (2022 – 2026) | CGPA: 8.7 / 10.0
Relevant Coursework: Data Structures & Algorithms, Object-Oriented Programming, Database Management Systems, Operating Systems, Computer Networks

Technical Skills:
- Languages: Python, Java, JavaScript, C++, SQL
- Frameworks & Tools: React, FastAPI, Node.js, Express, PostgreSQL, Git, Linux
- Core Concepts: OOP, RESTful APIs, Relational DB Design, Algorithm Complexity

Projects:
1. DevConnector — Developer Portfolio & Community Hub (React, FastAPI, PostgreSQL)
- Developed a full-stack platform where college developers share project repos and find study partners.
- Implemented RESTful APIs for user profiles, project posts, and search filtering by skills.
- Wrote clean SQL schemas with indexing on user IDs, handling 500+ student profiles.
- Handled client-side state with React Context and designed responsive UI using Tailwind CSS.

2. Algorithmic Pathfinding Visualizer (JavaScript, HTML5 Canvas)
- Created an interactive web visualizer for Dijkstra's, BFS/DFS, and Sorting algorithms (Merge Sort, Quick Sort).
- Added step-by-step playback controls, custom obstacle generation, and animation throttling.

Internship Experience:
Software Development Intern | CodeCraft Labs (Summer 2025)
- Collaborated in a 4-person team building internal dashboard widgets in React and Python.
- Fixed 15+ frontend UI responsiveness bugs and wrote unit tests covering API endpoints.
- Conducted technical peer reviews and participated in daily standups.`;

const EXPERIENCE_LEVELS = [
  {
    id: "fresher",
    name: "Fresher / Entry-Level",
    badge: "0 – 1 years",
    desc: "Focuses on CS fundamentals (data structures, algorithms, memory, basic SQL/APIs), college/personal projects, and clear reasoning. No enterprise distributed systems grilling.",
  },
  {
    id: "mid",
    name: "Mid-Level Engineer",
    badge: "2 – 4 years",
    desc: "Focuses on real production patterns: API contracts, database query tuning, concurrency, error handling, and automated testing.",
  },
  {
    id: "senior",
    name: "Senior / Lead",
    badge: "5+ years",
    desc: "Focuses on system design trade-offs, scalability, distributed reliability, and technical leadership decisions.",
  },
  {
    id: "auto",
    name: "Auto-Detect",
    badge: "Dynamic",
    desc: "Automatically detects your level based on your resume dates, degrees, internships, and target job description.",
  },
];

const PROJECT_STARTERS = [
  {
    label: "Distributed Caching",
    content:
      "Project: Distributed Cache & Invalidation Layer\nRole: Lead Backend Engineer\nTech: Redis Cluster, Go, PostgreSQL, Kafka\nChallenge: Mitigated cache stampedes and stale reads during 50x flash sale surges.\nKey Decision: Implemented probabilistic early expiration (XFetch) and distributed mutex locking.",
  },
  {
    label: "Real-Time Collaboration",
    content:
      "Project: Real-Time Collaborative Canvas\nRole: Full Stack Engineer\nTech: React, WebSockets, TypeScript, CRDTs (Yjs)\nChallenge: Resolving concurrent conflicts between hundreds of simultaneous editors with zero data loss.\nKey Decision: Adopted CRDTs over Operational Transformation to enable offline edits and deterministic peer sync.",
  },
  {
    label: "Zero-Downtime DB Migration",
    content:
      "Project: Core Billing Microservice & DB Migration\nRole: Systems Architect\nTech: Python, FastAPI, PostgreSQL, AWS RDS\nChallenge: Migrated 12M customer transaction records from MySQL to PostgreSQL without maintenance downtime.\nKey Decision: Used dual-write abstraction and CDC (Change Data Capture) with Debezium for shadow verification.",
  },
  {
    label: "AI Agent Orchestration",
    content:
      "Project: Autonomous Multi-Agent Support Pipeline\nRole: AI Engineer\nTech: Python, LangGraph, Vector Search (Qdrant), Gemini 1.5 Pro\nChallenge: Preventing hallucination and loops while routing customer questions across 20+ specialized toolkits.\nKey Decision: Enforced structured JSON output schemas, deterministic state machines, and human-in-the-loop escalation gates.",
  },
];

const QUESTION_TIERS = [
  {
    count: 5,
    name: "Sprint",
    tagline: "Quick Warm-up",
    time: "~15m",
    icon: Zap,
    desc: "Rapid calibration on core fundamentals & problem-solving.",
  },
  {
    count: 8,
    name: "Standard",
    tagline: "Full Technical Screen",
    time: "~25m",
    icon: Target,
    desc: "Balanced mix of architecture, coding depth, and behavioral follow-ups.",
    badge: "Recommended",
  },
  {
    count: 10,
    name: "In-Depth",
    tagline: "Senior Architecture",
    time: "~35m",
    icon: Layers,
    desc: "Thorough probe of design trade-offs, edge cases, and past decisions.",
  },
  {
    count: 12,
    name: "Comprehensive",
    tagline: "Staff-Level Gauntlet",
    time: "~45m",
    icon: Cpu,
    desc: "Exhaustive deep-dive covering end-to-end system design & failure recovery.",
  },
];

const LOADING_STEPS = [
  "Analyzing job specifications and seniority level…",
  "Evaluating candidate experience and technical skills…",
  "Synthesizing dynamic technical question chain…",
  "Configuring adaptive follow-up parameters…",
  "Initializing AI interviewer room…",
];

const PRO_TIPS = [
  "Use the STAR method (Situation, Task, Action, Result) to make behavioral answers crisp.",
  "Clarify constraints and scale requirements before jumping directly into architectural solutions.",
  "State trade-offs explicitly: latency vs throughput, consistency vs availability.",
  "If you don't know a niche library detail, explain how you would debug or look it up.",
];

export default function Setup() {
  const navigate = useNavigate();
  const { isEmployer, companyName } = useAuth();
  const [jd, setJd] = useState("");
  const [resume, setResume] = useState("");
  const [project, setProject] = useState("");
  const [count, setCount] = useState(8);
  const [experienceLevel, setExperienceLevel] = useState("fresher");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [activePreset, setActivePreset] = useState(null);
  const [jdTab, setJdTab] = useState("text"); // 'pdf' | 'text'
  const [resumeTab, setResumeTab] = useState("pdf"); // 'pdf' | 'text'
  const [loadingStep, setLoadingStep] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [hasProfile, setHasProfile] = useState(false);
  const [syncingProfile, setSyncingProfile] = useState(false);

  // Check if saved profile exists
  useEffect(() => {
    let cancelled = false;
    getProfile()
      .then((res) => {
        if (!cancelled && res?.profile) {
          const p = res.profile;
          if (p.name || p.target_role || p.skills?.length > 0 || p.bio) {
            setHasProfile(true);
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Multi-step loading animation
  useEffect(() => {
    if (!busy) {
      setLoadingStep(0);
      return undefined;
    }
    const stepInterval = setInterval(() => {
      setLoadingStep((s) => (s < LOADING_STEPS.length - 1 ? s + 1 : s));
    }, 3800);

    const tipInterval = setInterval(() => {
      setTipIndex((i) => (i + 1) % PRO_TIPS.length);
    }, 4500);

    return () => {
      clearInterval(stepInterval);
      clearInterval(tipInterval);
    };
  }, [busy]);

  const jdValid = jd.trim().length >= MIN;
  const resumeValid = resume.trim().length >= MIN;
  const tooShort = !jdValid || !resumeValid;

  // Calculate readiness percentage
  let readiness = 0;
  if (jdValid) readiness += 40;
  if (resumeValid) readiness += 40;
  if (project.trim().length >= MIN) readiness += 10;
  if (count) readiness += 10;

  function applyPreset(preset) {
    setActivePreset(preset.id);
    setJd(preset.job_description);
    setJdTab("text");
    setError("");
    if (preset.level?.toLowerCase().includes("fresher") || preset.level?.toLowerCase().includes("entry")) {
      setExperienceLevel("fresher");
    } else if (preset.level?.toLowerCase().includes("senior")) {
      setExperienceLevel("senior");
    } else {
      setExperienceLevel("mid");
    }
  }

  function clearPreset() {
    setActivePreset(null);
    setJd("");
  }

  function loadSampleResume(forceType = null) {
    const isFresher = forceType ? forceType === "fresher" : experienceLevel === "fresher";
    setResume(isFresher ? SAMPLE_FRESHER_RESUME : SAMPLE_RESUME);
    setResumeTab("text");
    setError("");
  }

  async function importFromProfile() {
    setSyncingProfile(true);
    setError("");
    try {
      const res = await getProfile();
      const p = res?.profile;
      if (!p) throw new Error("No profile data found.");

      const text = [
        p.name ? `Candidate Name: ${p.name}` : "",
        p.target_role ? `Target Role: ${p.target_role}` : "",
        p.bio ? `Professional Summary: ${p.bio}` : "",
        p.degree || p.college
          ? `Education: ${[p.degree, p.college, p.grad_year].filter(Boolean).join(" - ")}`
          : "",
        p.skills?.length ? `Core Skills: ${p.skills.join(", ")}` : "",
        p.github ? `GitHub: ${p.github}` : "",
        p.linkedin ? `LinkedIn: ${p.linkedin}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      if (text.length < MIN) {
        throw new Error("Your profile details are too short. Please add more details in Profile.");
      }

      setResume(text);
      setResumeTab("text");
    } catch (err) {
      setError(err.message || "Failed to load profile");
    } finally {
      setSyncingProfile(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (isEmployer) {
      setError("You are signed in with an Employer account. Practice mock interviews are designed for candidate accounts. Please switch to a Candidate account or navigate to your Talent Pipeline.");
      return;
    }
    if (tooShort || busy) return;
    setError("");
    setBusy(true);
    try {
      const data = await startSession({
        job_description: jd.trim(),
        resume_text: resume.trim(),
        project_info: project.trim(),
        n_questions: count,
        experience_level: experienceLevel,
      });
      saveSession(data.session_id, {
        question: data.question,
        question_number: data.question_number,
        total_questions: data.total_questions,
        is_followup: false,
      });
      navigate(`/interview/${data.session_id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      {/* Animated Loading Overlay */}
      {busy && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#12152b]/85 px-4 backdrop-blur-md"
        >
          <div className="w-full max-w-lg rounded-2xl border border-line/40 bg-surface p-8 text-center shadow-2xl">
            <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-teal/20" />
              <span className="absolute inset-2 animate-pulse rounded-full bg-teal/30" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-teal text-white shadow-lg">
                <Sparkles size={30} className="animate-spin text-white" style={{ animationDuration: "4s" }} />
              </div>
            </div>

            <h2 className="mt-6 font-display text-2xl font-bold tracking-tight text-ink">
              Building Your Interview Simulation
            </h2>
            <p className="mt-2 text-sm text-muted">
              Intervia's AI is reading your credentials and preparing targeted, adaptive questions.
            </p>

            {/* Stepper indicator */}
            <div className="mt-6 rounded-xl border border-line bg-paper/60 p-4 text-left">
              <div className="flex items-center gap-3">
                <Loader2 size={18} className="animate-spin text-teal shrink-0" />
                <span className="text-sm font-semibold text-teal">
                  {LOADING_STEPS[loadingStep]}
                </span>
              </div>
              <div className="mt-3 flex gap-1.5">
                {LOADING_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                      i <= loadingStep ? "bg-teal" : "bg-line"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Pro Tip Card */}
            <div className="mt-5 rounded-xl border border-gold/30 bg-gold/5 p-4 text-left">
              <div className="flex items-start gap-2.5">
                <Sparkles size={16} className="text-gold shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gold">Interview Tip</p>
                  <p className="mt-1 text-xs text-ink/80 leading-relaxed transition-all">
                    {PRO_TIPS[tipIndex]}
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-5 text-xs text-muted">
              Estimated setup time: ~15 to 25 seconds. Please do not refresh.
            </p>
          </div>
        </div>
      )}

      {/* Recruiter / Employer Access Warning Banner */}
      {isEmployer && (
        <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-300">
                  Signed in as Employer / Recruiter ({companyName || "Acme Corp"})
                </p>
                <p className="mt-0.5 text-xs text-amber-200/80 leading-relaxed">
                  Mock interview simulations are reserved for candidate accounts. Use the Recruiter Talent Pipeline to screen applicant dossiers and post open engineering roles.
                </p>
              </div>
            </div>
            <Link
              to="/employer"
              className="inline-flex items-center gap-1.5 self-start sm:self-center shrink-0 rounded-xl bg-teal px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-dark transition-colors"
            >
              <span>Go to Talent Pipeline</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* Main Studio Form */}
      <form onSubmit={onSubmit} className="space-y-10">
        {/* Header Hero Section */}
        <div className="relative overflow-hidden rounded-2xl border border-teal/20 bg-gradient-to-br from-soft/70 via-surface to-paper p-6 sm:p-8">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal/30 bg-surface/80 px-3.5 py-1 text-xs font-semibold text-teal shadow-xs backdrop-blur-sm">
                <Sparkles size={14} className="text-teal" />
                <span>AI Interview Studio</span>
              </div>
              <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                Set up your technical interview
              </h1>
              <p className="mt-2 text-base text-muted leading-relaxed">
                Provide the job requirements and your resume. The AI interviewer tailors each question to your specific background and actively probes your architecture choices with follow-ups.
              </p>
            </div>

            {/* Quick Readiness Ring Badge */}
            <div className="shrink-0 flex items-center gap-4 rounded-xl border border-line bg-surface/90 p-4 shadow-sm backdrop-blur-sm">
              <div className="relative flex h-14 w-14 items-center justify-center">
                <svg className="h-14 w-14 -rotate-90 transform" viewBox="0 0 36 36">
                  <path
                    className="text-line"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={`${readiness === 100 ? "text-emerald-500" : readiness >= 80 ? "text-teal" : "text-gold"} transition-all duration-700 ease-out`}
                    strokeDasharray={`${readiness}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute font-display text-sm font-bold tabular-nums text-ink">
                  {readiness}%
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Readiness</p>
                <p className="text-sm font-medium text-ink">
                  {readiness >= 80 ? (
                    <span className="text-teal font-semibold">Ready to launch</span>
                  ) : (
                    <span>Add inputs below</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Role Presets Shelf */}
        <section aria-labelledby="presets-title" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 id="presets-title" className="font-display text-lg font-bold text-ink flex items-center gap-2">
                <Zap size={18} className="text-gold" />
                Quick-Start Role Presets
              </h2>
              <p className="text-xs text-muted">
                Select a pre-configured role to immediately autofill realistic job requirements.
              </p>
            </div>
            {activePreset && (
              <button
                type="button"
                onClick={clearPreset}
                className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-danger"
              >
                <RotateCcw size={13} />
                Reset job description
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {PRESETS.map((p) => {
              const Icon = p.icon;
              const isSelected = activePreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={`group relative flex flex-col items-start justify-between rounded-xl border p-3.5 text-left transition-all ${
                    isSelected
                      ? "border-teal bg-soft/60 shadow-sm ring-2 ring-teal/30"
                      : "border-line bg-surface hover:border-teal/40 hover:bg-paper"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        isSelected ? "bg-teal text-white" : "bg-soft text-teal group-hover:scale-105"
                      } transition-transform`}
                    >
                      <Icon size={16} />
                    </div>
                    {isSelected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal text-white">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-ink leading-tight">{p.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{p.level}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Two-Column Studio Layout */}
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          {/* Left Column: Form & Inputs */}
          <div className="space-y-8">
            {/* Step 1: Job Description Card */}
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal/10 text-teal">
                    <Briefcase size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg font-bold text-ink">Job Description</h3>
                      <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[11px] font-semibold text-teal">
                        Required
                      </span>
                    </div>
                    <p className="text-xs text-muted">Upload posting PDF or paste requirements</p>
                  </div>
                </div>

                {/* Input Method Tabs */}
                <div className="flex rounded-lg border border-line bg-paper p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setJdTab("text")}
                    className={`rounded-md px-3 py-1 font-medium transition-all ${
                      jdTab === "text"
                        ? "bg-surface text-ink shadow-xs"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    Paste Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setJdTab("pdf")}
                    className={`rounded-md px-3 py-1 font-medium transition-all ${
                      jdTab === "pdf"
                        ? "bg-surface text-ink shadow-xs"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    Upload PDF
                  </button>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {jdTab === "pdf" ? (
                  <div className="space-y-3">
                    <PdfUpload
                      label="Upload job description PDF"
                      disabled={busy}
                      onText={(text) => {
                        setJd(text);
                        setActivePreset(null);
                      }}
                      onError={setError}
                      hint="Upload the job posting, JD or specification PDF"
                    />
                    {jd.length >= MIN && (
                      <div className="rounded-xl border border-line bg-paper/50 p-3 text-xs text-muted flex items-center justify-between">
                        <span>Extracted text ready ({jd.length.toLocaleString()} characters)</span>
                        <button
                          type="button"
                          onClick={() => setJdTab("text")}
                          className="font-medium text-teal hover:underline"
                        >
                          View & edit text →
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <textarea
                      id="jd"
                      rows={8}
                      maxLength={MAX}
                      value={jd}
                      onChange={(e) => {
                        setJd(e.target.value);
                        setActivePreset(null);
                      }}
                      disabled={busy}
                      placeholder="Paste the target job description, responsibilities, requirements, and tech stack here…"
                      className="w-full rounded-xl border border-line bg-paper/30 p-3.5 text-sm leading-relaxed text-ink placeholder:text-muted/60 focus:bg-surface"
                    />
                  </div>
                )}

                {/* Status Bar */}
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={`inline-flex items-center gap-1.5 font-medium ${
                      jdValid ? "text-emerald-600 dark:text-emerald-400" : "text-muted"
                    }`}
                  >
                    {jdValid ? (
                      <>
                        <CheckCircle2 size={14} />
                        Job description ready
                      </>
                    ) : (
                      <>
                        <Info size={14} />
                        Min {MIN} characters required
                      </>
                    )}
                  </span>
                  <div className="flex items-center gap-3">
                    {jd.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setJd("");
                          setActivePreset(null);
                        }}
                        className="text-muted hover:text-danger flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Clear
                      </button>
                    )}
                    <span className="tabular-nums text-muted">
                      {jd.length.toLocaleString()} / {MAX.toLocaleString()} chars
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Resume / Experience Card */}
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal/10 text-teal">
                    <FileText size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg font-bold text-ink">Candidate Resume</h3>
                      <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[11px] font-semibold text-teal">
                        Required
                      </span>
                    </div>
                    <p className="text-xs text-muted">Your experience, projects, and technologies</p>
                  </div>
                </div>

                {/* Input Method Tabs */}
                <div className="flex rounded-lg border border-line bg-paper p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setResumeTab("pdf")}
                    className={`rounded-md px-3 py-1 font-medium transition-all ${
                      resumeTab === "pdf"
                        ? "bg-surface text-ink shadow-xs"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    Upload PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setResumeTab("text")}
                    className={`rounded-md px-3 py-1 font-medium transition-all ${
                      resumeTab === "text"
                        ? "bg-surface text-ink shadow-xs"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    Paste Text
                  </button>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {/* Quick Helper Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted">Quick test:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setExperienceLevel("fresher");
                      loadSampleResume("fresher");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                  >
                    <Sparkles size={12} className="text-emerald-500" />
                    Load Fresher Resume
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExperienceLevel("senior");
                      loadSampleResume("senior");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink hover:border-teal hover:text-teal"
                  >
                    <Sparkles size={12} className="text-teal" />
                    Load Senior Resume
                  </button>
                  {hasProfile && (
                    <button
                      type="button"
                      onClick={importFromProfile}
                      disabled={syncingProfile}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink hover:border-teal hover:text-teal disabled:opacity-50"
                    >
                      <UserCheck size={12} className="text-teal" />
                      {syncingProfile ? "Importing…" : "Sync from My Profile"}
                    </button>
                  )}
                </div>

                {resumeTab === "pdf" ? (
                  <div className="space-y-3">
                    <PdfUpload
                      label="Upload resume PDF"
                      disabled={busy}
                      onText={(text) => setResume(text)}
                      onError={setError}
                      hint="Upload your 1-page or 2-page resume in PDF format"
                    />
                    {resume.length >= MIN && (
                      <div className="rounded-xl border border-line bg-paper/50 p-3 text-xs text-muted flex items-center justify-between">
                        <span>Parsed resume text ready ({resume.length.toLocaleString()} characters)</span>
                        <button
                          type="button"
                          onClick={() => setResumeTab("text")}
                          className="font-medium text-teal hover:underline"
                        >
                          View & edit text →
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <textarea
                      id="resume"
                      rows={9}
                      maxLength={MAX}
                      value={resume}
                      onChange={(e) => setResume(e.target.value)}
                      disabled={busy}
                      placeholder="Paste your resume text here (experience, education, projects, skills)…"
                      className="w-full rounded-xl border border-line bg-paper/30 p-3.5 text-sm leading-relaxed text-ink placeholder:text-muted/60 focus:bg-surface"
                    />
                  </div>
                )}

                {/* Status Bar */}
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={`inline-flex items-center gap-1.5 font-medium ${
                      resumeValid ? "text-emerald-600 dark:text-emerald-400" : "text-muted"
                    }`}
                  >
                    {resumeValid ? (
                      <>
                        <CheckCircle2 size={14} />
                        Resume loaded
                      </>
                    ) : (
                      <>
                        <Info size={14} />
                        Min {MIN} characters required
                      </>
                    )}
                  </span>
                  <div className="flex items-center gap-3">
                    {resume.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setResume("")}
                        className="text-muted hover:text-danger flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Clear
                      </button>
                    )}
                    <span className="tabular-nums text-muted">
                      {resume.length.toLocaleString()} / {MAX.toLocaleString()} chars
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Spotlight Project (Optional) */}
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal/10 text-teal">
                    <Code2 size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg font-bold text-ink">Spotlight Project</h3>
                      <span className="rounded-full border border-line bg-paper px-2 py-0.5 text-[11px] font-medium text-muted">
                        Optional
                      </span>
                    </div>
                    <p className="text-xs text-muted">Defend a specific architecture, trade-off, or scaling challenge</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <p className="text-xs text-muted">
                  The AI interviewer will dedicate specific deep-dive questions around this project, challenging your decisions, edge cases, and unexpected failures.
                </p>

                {/* Quick starter chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted mr-1">Starters:</span>
                  {PROJECT_STARTERS.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => setProject(s.content)}
                      className="rounded-full border border-line bg-paper px-2.5 py-1 text-xs text-ink hover:border-teal hover:text-teal"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <textarea
                  id="project"
                  rows={4}
                  maxLength={MAX}
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  disabled={busy}
                  placeholder="Example: Designed and led a distributed Redis caching layer to handle 20k RPS flash sales. Managed cache stampedes with probabilistic early expiration…"
                  className="w-full rounded-xl border border-line bg-paper/30 p-3.5 text-sm leading-relaxed text-ink placeholder:text-muted/60 focus:bg-surface"
                />

                <div className="flex justify-end text-xs text-muted">
                  <span className="tabular-nums">
                    {project.length.toLocaleString()} / {MAX.toLocaleString()} chars
                  </span>
                </div>
              </div>
            </div>

            {/* Step 4: Experience Level Calibration */}
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal/10 text-teal">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-ink">Candidate Experience Calibration</h3>
                    <p className="text-xs text-muted">
                      Calibrates technical depth, problem scope, and grading bar to your career stage
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {EXPERIENCE_LEVELS.map((lvl) => {
                  const isSelected = experienceLevel === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setExperienceLevel(lvl.id)}
                      disabled={busy}
                      className={`group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                        isSelected
                          ? "border-teal bg-soft/60 shadow-sm ring-2 ring-teal/30"
                          : "border-line bg-surface hover:border-teal/40 hover:bg-paper"
                      }`}
                    >
                      {lvl.badge && (
                        <span
                          className={`absolute -top-2.5 right-4 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-xs ${
                            lvl.id === "fresher"
                              ? "bg-emerald-600 text-white"
                              : "border border-line bg-paper text-muted"
                          }`}
                        >
                          {lvl.badge}
                        </span>
                      )}

                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-ink">{lvl.name}</p>
                        {isSelected && <Check size={16} className="text-teal" />}
                      </div>

                      <div className="mt-2.5">
                        <p className="text-xs text-muted leading-relaxed">{lvl.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 5: Question Count & Pacing */}
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal/10 text-teal">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-ink">Interview Format & Pacing</h3>
                    <p className="text-xs text-muted">Follow-up questions are dynamic and adjust in real time</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {QUESTION_TIERS.map((tier) => {
                  const Icon = tier.icon;
                  const isSelected = count === tier.count;
                  return (
                    <button
                      key={tier.count}
                      type="button"
                      onClick={() => setCount(tier.count)}
                      disabled={busy}
                      className={`group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                        isSelected
                          ? "border-teal bg-soft/60 shadow-sm ring-2 ring-teal/30"
                          : "border-line bg-surface hover:border-teal/40 hover:bg-paper"
                      }`}
                    >
                      {tier.badge && (
                        <span className="absolute -top-2.5 right-4 rounded-full bg-teal px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs">
                          {tier.badge}
                        </span>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                              isSelected ? "bg-teal text-white" : "bg-soft text-teal"
                            }`}
                          >
                            <Icon size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-ink">{tier.name}</p>
                            <p className="text-xs text-muted">{tier.tagline}</p>
                          </div>
                        </div>
                        <span className="rounded-md border border-line bg-surface px-2 py-0.5 text-xs font-semibold tabular-nums text-teal">
                          {tier.time}
                        </span>
                      </div>

                      <div className="mt-3">
                        <p className="text-xs text-muted leading-relaxed">{tier.desc}</p>
                        <p className="mt-2 text-xs font-semibold text-ink">
                          {tier.count} core questions + follow-ups
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Studio HUD & Blueprint */}
          <div className="space-y-6">
            <div className="sticky top-20 rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-6">
              {/* Readiness Header */}
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold text-ink">Session Blueprint</h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      readiness >= 80
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-gold/10 text-gold"
                    }`}
                  >
                    {readiness >= 80 ? "Ready" : "Incomplete"}
                  </span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      readiness === 100
                        ? "bg-emerald-500"
                        : readiness >= 80
                          ? "bg-teal"
                          : "bg-gold"
                    }`}
                    style={{ width: `${readiness}%` }}
                  />
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-2.5 border-t border-line pt-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted">
                    {jdValid ? (
                      <CheckCircle2 size={15} className="text-emerald-500" />
                    ) : (
                      <span className="h-3.5 w-3.5 rounded-full border border-muted/60" />
                    )}
                    Job Description
                  </span>
                  <span className={jdValid ? "font-semibold text-ink" : "text-muted"}>
                    {jdValid ? "Provided" : "Required"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted">
                    {resumeValid ? (
                      <CheckCircle2 size={15} className="text-emerald-500" />
                    ) : (
                      <span className="h-3.5 w-3.5 rounded-full border border-muted/60" />
                    )}
                    Candidate Resume
                  </span>
                  <span className={resumeValid ? "font-semibold text-ink" : "text-muted"}>
                    {resumeValid ? "Loaded" : "Required"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted">
                    {project.trim().length >= MIN ? (
                      <CheckCircle2 size={15} className="text-emerald-500" />
                    ) : (
                      <span className="h-3.5 w-3.5 rounded-full border border-muted/40" />
                    )}
                    Spotlight Project
                  </span>
                  <span className={project.trim().length >= MIN ? "font-semibold text-ink" : "text-muted"}>
                    {project.trim().length >= MIN ? "Active" : "Optional"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted">
                    <UserCheck size={15} className="text-emerald-500" />
                    Target Level
                  </span>
                  <span className="font-semibold text-ink">
                    {experienceLevel === "fresher"
                      ? "Fresher (0-1 yrs)"
                      : experienceLevel === "mid"
                        ? "Mid-Level (2-4 yrs)"
                        : experienceLevel === "senior"
                          ? "Senior (5+ yrs)"
                          : "Auto-Detect"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted">
                    <CheckCircle2 size={15} className="text-emerald-500" />
                    Format
                  </span>
                  <span className="font-semibold text-ink">
                    {count} Questions
                  </span>
                </div>
              </div>

              {/* Engine Specs Box */}
              <div className="rounded-xl border border-line bg-paper/60 p-4 text-xs space-y-2">
                <p className="font-semibold text-ink flex items-center gap-1.5">
                  <Sparkles size={14} className="text-teal" />
                  What to Expect
                </p>
                <ul className="space-y-1.5 text-muted leading-relaxed">
                  <li className="flex items-start gap-1.5">
                    <span className="text-teal font-bold">•</span>
                    <span>Adaptive follow-ups probing trade-offs and technical depth.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-teal font-bold">•</span>
                    <span>Real-time voice & speech pace evaluation.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-teal font-bold">•</span>
                    <span>Comprehensive post-interview score & skill gap report.</span>
                  </li>
                </ul>
              </div>

              {/* Error display */}
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-danger/40 bg-danger/5 p-3.5 text-xs text-danger"
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p className="leading-snug">{error}</p>
                </div>
              )}

              {/* Action Button */}
              <div>
                <button
                  type="submit"
                  disabled={tooShort || busy}
                  className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-teal px-5 py-3.5 font-display text-base font-bold text-white shadow-md shadow-teal/20 transition-all hover:bg-teal-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  {busy ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Setting Up Simulation…
                    </>
                  ) : (
                    <>
                      <Play size={18} className="fill-white" />
                      Start Interview
                      <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>

                {tooShort && !busy && (
                  <p className="mt-2 text-center text-xs text-muted">
                    Add a job description and resume to launch.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
