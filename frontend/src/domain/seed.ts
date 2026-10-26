/** Mock job postings for the web demo. Companies are fictional. Dates are relative to "now"
 * so the demo never looks stale. */

export type Portal = 'linkedin' | 'himalayas' | 'remote_co' | 'careerhound' | 'hiredchina' | 'kariyer';

export const PORTALS: { id: Portal; label: string; focus: string }[] = [
  { id: 'linkedin', label: 'LinkedIn', focus: 'Global, all industries' },
  { id: 'himalayas', label: 'Himalayas', focus: 'Remote tech, salary ranges' },
  { id: 'remote_co', label: 'Remote.co', focus: 'Curated remote roles' },
  { id: 'careerhound', label: 'CareerHound', focus: 'Direct-from-employer' },
  { id: 'hiredchina', label: 'HiredChina', focus: 'China & Asia, bilingual' },
  { id: 'kariyer', label: 'Kariyer.net', focus: 'Türkiye' },
];

export type Workplace = 'remote' | 'hybrid' | 'onsite';

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  workplace: Workplace;
  portal: Portal;
  postedDaysAgo: number;
  salary?: string;
  url: string;
  description: string;
}

function isoIn(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function seedJobs(): Job[] {
  return [
    {
      id: 'li-4012345678', title: 'Senior Full-Stack Engineer', company: 'Northwind Cloud', location: 'Helsinki, Finland',
      workplace: 'hybrid', portal: 'linkedin', postedDaysAgo: 2, url: 'https://www.linkedin.com/jobs/view/4012345678',
      description: `Northwind Cloud builds a B2B SaaS platform for field-service companies.

What you'll do
- Own features end to end across our TypeScript / React front end and Node.js microservices
- Run services on AWS with Docker and Kubernetes; improve our CI/CD pipelines
- Work with product on the roadmap and keep KPIs visible

What we look for
- 5+ years of experience shipping web products
- Strong TypeScript, React, Node.js and PostgreSQL
- Bachelor's degree in CS or equivalent experience
- English required; Finnish is a plus

Application deadline: ${isoIn(21)}`,
    },
    {
      id: 'hm-7f3a', title: 'Staff Backend Engineer (Python)', company: 'Ledgerly', location: 'Remote (EU)',
      workplace: 'remote', portal: 'himalayas', postedDaysAgo: 4, salary: '€95k–€125k',
      url: 'https://himalayas.app/companies/ledgerly/jobs/staff-backend-engineer',
      description: `Ledgerly is a fintech company building card payments and lending infrastructure for European merchants.

Requirements
- 8+ years of experience in backend engineering, Python and PostgreSQL
- Payments, banking or credit domain experience
- AWS, Terraform, Docker
- Comfortable with REST API and GraphQL design

Remote within the EU. Fluent English required.`,
    },
    {
      id: 'rc-ops-221', title: 'Remote Operations Manager', company: 'Parcelwise', location: 'Remote (worldwide)',
      workplace: 'remote', portal: 'remote_co', postedDaysAgo: 6, url: 'https://remote.co/job/remote-operations-manager-221',
      description: `Parcelwise runs e-commerce logistics for 400 Shopify retail brands.

You will
- Manage warehouse partners, freight vendors and procurement
- Own the operations budget and weekly KPI reviews
- Build reporting in Power BI and keep Jira boards clean

You have
- 6+ years of experience in logistics or supply chain operations
- Vendor management and cross-functional leadership
- Agile ways of working`,
    },
    {
      id: 'ch-pm-88', title: 'Technical Project Manager', company: 'Voltgrid Energy', location: 'Berlin, Germany',
      workplace: 'hybrid', portal: 'careerhound', postedDaysAgo: 3, url: 'https://careerhound.io/jobs/voltgrid-technical-pm',
      description: `Voltgrid builds EV charging and battery storage for utilities across Europe.

Responsibilities
- Lead delivery of solar + battery projects from tender to commissioning
- Stakeholder management with utilities and installers
- Agile and Scrum ceremonies, Jira and Confluence

Requirements
- 5-7 years of experience in project management (PMP is a plus)
- Fluent German required, plus English
- Master's degree in engineering preferred`,
    },
    {
      id: 'hc-ml-12', title: 'Machine Learning Engineer, Bilingual', company: 'Lotus Health AI', location: 'Shanghai, China',
      workplace: 'onsite', portal: 'hiredchina', postedDaysAgo: 9, salary: '¥45k–¥65k / month',
      url: 'https://hiredchina.com/jobs/lotus-health-ml-engineer',
      description: `Lotus Health AI builds clinical diagnostics software for hospitals.

Requirements
- 3+ years of experience in machine learning with Python
- Healthcare or clinical data experience
- Mandarin required; English is a plus
- MSc or PhD in a quantitative field`,
    },
    {
      id: 'kn-proje-41', title: 'Proje Yöneticisi (Project Manager)', company: 'Anadolu Makina', location: 'İstanbul, Türkiye',
      workplace: 'onsite', portal: 'kariyer', postedDaysAgo: 5, url: 'https://www.kariyer.net/is-ilani/anadolu-makina-proje-yoneticisi-41',
      description: `Anadolu Makina manufactures heavy machinery and industrial equipment for export.

Aranan nitelikler / Requirements
- 7+ years of experience in manufacturing project management
- Procurement, supply chain and factory commissioning
- ERP (SAP) and budget ownership
- Turkish is mandatory; English business level

Son başvuru tarihi: ${isoIn(14).split('-').reverse().join('.')}`,
    },
    {
      id: 'li-4011112222', title: 'Product Designer', company: 'Brightpath Learning', location: 'Remote (UK)',
      workplace: 'remote', portal: 'linkedin', postedDaysAgo: 1, url: 'https://www.linkedin.com/jobs/view/4011112222',
      description: `Brightpath is an edtech company building e-learning tools for universities.

- 4+ years of experience in product design for SaaS products
- Expert in Figma and design systems
- Run research with students and academic staff
- Collaborate with React engineers`,
    },
    {
      id: 'hm-9c1d', title: 'Data Analyst, Growth', company: 'Cartloop', location: 'Remote (Americas)',
      workplace: 'remote', portal: 'himalayas', postedDaysAgo: 12, salary: '$70k–$90k',
      url: 'https://himalayas.app/companies/cartloop/jobs/data-analyst-growth',
      description: `Cartloop is a marketplace for consumer goods.

- 2-4 years of experience with SQL, Python and Tableau
- Own growth KPIs and experiment analysis
- HubSpot or Salesforce CRM data is a plus`,
    },
    {
      id: 'li-4009998888', title: 'DevOps Engineer', company: 'Fortis Defence Systems', location: 'Reston, VA, USA',
      workplace: 'onsite', portal: 'linkedin', postedDaysAgo: 7, url: 'https://www.linkedin.com/jobs/view/4009998888',
      description: `Fortis builds cloud infrastructure for aerospace programs.

- 5+ years of experience with AWS, Terraform, Kubernetes and CI/CD
- Active security clearance; must be a citizen
- Bachelor's degree required`,
    },
    {
      id: 'rc-sup-07', title: 'Customer Success Lead', company: 'Tidyhire', location: 'Remote (Europe)',
      workplace: 'remote', portal: 'remote_co', postedDaysAgo: 20, url: 'https://remote.co/job/customer-success-lead-07',
      description: `Tidyhire is a SaaS platform for recruiting teams.

This position has been filled. No longer accepting applications.

- 4+ years in customer success for B2B software
- HubSpot, CRM hygiene and renewal KPIs`,
    },
    {
      id: 'ch-fe-19', title: 'Frontend Engineer (React)', company: 'Mosaic Media', location: 'Lisbon, Portugal',
      workplace: 'hybrid', portal: 'careerhound', postedDaysAgo: 2, url: 'https://careerhound.io/jobs/mosaic-frontend-engineer',
      description: `Mosaic Media runs a streaming platform for independent films.

- 3+ years of experience with React, TypeScript and GraphQL
- Performance work on video players and media pages
- Git, CI/CD and testing culture`,
    },
    {
      id: 'kn-yazilim-77', title: 'Yazılım Geliştirici (Backend, Java)', company: 'Bosfor Bank', location: 'Ankara, Türkiye',
      workplace: 'hybrid', portal: 'kariyer', postedDaysAgo: 10, url: 'https://www.kariyer.net/is-ilani/bosfor-bank-yazilim-gelistirici-77',
      description: `Bosfor Bank is a digital banking and payments company.

- 4+ years of experience with Java, SQL and microservices
- Docker, Kubernetes, REST API design
- Turkish is mandatory

Application deadline: ${isoIn(-3)}`,
    },
  ];
}

export const SAMPLE_PROFILE = `Alex Morgan — Senior Software Engineer
7 years of experience building SaaS platform products. BSc in Computer Science.
Languages: English (native), Finnish (B1)

- Led migration of 40 microservices to Kubernetes and Docker on AWS, cutting cloud cost 30%
- Built TypeScript and React dashboards used by 12,000 customers
- Owned CI/CD pipelines in GitHub Actions; deploy frequency went from weekly to daily
- Designed REST API and GraphQL gateway serving 50M requests a day
- Mentored 4 engineers and ran Agile sprint planning
- Wrote internal docs and onboarding guides`;
