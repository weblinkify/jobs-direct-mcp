/** Browser port of jobsdirect/writer.py (resume tailoring and cover letter). */
import { SKILL_LEXICON, candidateYears, extractDomains, hasTerm } from './ats';

const BULLET_RE = /^\s*(?:[-*•▪]|\d+[.)])\s+(.*\S)\s*$/;

export function cvBullets(cv: string): string[] {
  const bullets = cv
    .split(/\r?\n/)
    .map((line) => line.match(BULLET_RE)?.[1])
    .filter((b): b is string => Boolean(b));
  if (bullets.length) return bullets;
  return cv
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => /\d/.test(s) && s.split(/\s+/).length >= 5);
}

export function jobKeywords(jobDescription: string): string[] {
  const lower = jobDescription.toLowerCase();
  return SKILL_LEXICON.filter((s) => hasTerm(s, lower));
}

export interface RankedBullet {
  text: string;
  hits: string[];
}

/** Most job keywords first; quantified bullets win ties; otherwise CV order is kept. */
export function rankBullets(bullets: string[], keywords: string[]): RankedBullet[] {
  return bullets
    .map((text, index) => {
      const lower = text.toLowerCase();
      return { text, index, hits: keywords.filter((k) => hasTerm(k, lower)), metric: /\d/.test(text) ? 1 : 0 };
    })
    .sort((a, b) => b.hits.length - a.hits.length || b.metric - a.metric || a.index - b.index)
    .map(({ text, hits }) => ({ text, hits }));
}

export function tailorResume(cv: string, jobDescription: string, role?: string, company?: string): string {
  const r = role || 'the role';
  const c = company || 'the company';
  const keywords = jobKeywords(jobDescription);
  const cvLower = cv.toLowerCase();
  const have = keywords.filter((k) => hasTerm(k, cvLower));
  const gaps = keywords.filter((k) => !have.includes(k));
  const domains = Object.keys(extractDomains(cv));
  const years = candidateYears(cv);
  const ranked = rankBullets(cvBullets(cv), keywords);

  const yearsTxt = years ? `${years}+ years of experience` : 'Hands-on experience';
  const domainTxt = domains.length ? ` in ${domains.slice(0, 2).join(', ')}` : '';
  const skillsTxt = have.length ? `, strongest in ${have.slice(0, 5).join(', ')}` : '';

  const lines = [
    `# Tailored resume: ${r} at ${c}`, '', '## Professional summary',
    `${yearsTxt}${domainTxt}${skillsTxt}. Targeting ${r} at ${c}.`, '',
    '## Keyword alignment',
    `- **Matched**: ${have.length ? have.join(', ') : 'none of the tracked keywords'}`,
    `- **Missing**: ${gaps.length ? gaps.join(', ') : 'none'}`, '',
    '## Experience bullets, most relevant first',
  ];
  if (ranked.length) {
    for (const { text, hits } of ranked.slice(0, 8)) {
      lines.push(`- ${text}${hits.length ? `  _(matches: ${hits.join(', ')})_` : ''}`);
    }
  } else {
    lines.push("- No bullet points found in the CV. Add achievements as '- ' lines to rank them.");
  }
  const weak = ranked.filter((b) => !/\d/.test(b.text)).map((b) => b.text);
  if (weak.length) {
    lines.push('', '## Add a number to these (STAR: Situation, Task, Action, Result)');
    lines.push(...weak.slice(0, 4).map((b) => `- ${b}`));
  }
  if (gaps.length) {
    lines.push('', '## Gaps to address honestly');
    lines.push(...gaps.slice(0, 5).map((g) => `- ${g}: mention adjacent experience or a plan to ramp up.`));
  }
  return lines.join('\n');
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December'];

export function formatLetterDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export function coverLetter(
  cv: string,
  jobDescription: string,
  company: string,
  role: string,
  candidateName?: string,
  hiringManager?: string,
  today: Date = new Date(),
): string {
  const keywords = jobKeywords(jobDescription);
  const proof = rankBullets(cvBullets(cv), keywords)
    .slice(0, 2)
    .map((b) => b.text.replace(/\.+$/, ''));
  const have = keywords.filter((k) => hasTerm(k, cv.toLowerCase()));
  const greeting = hiringManager ? `Dear ${hiringManager},` : `Dear ${company} hiring team,`;
  const skills = have.length ? ` My background in ${have.slice(0, 3).join(', ')} lines up with what you are asking for.` : '';

  const paragraphs = [formatLetterDate(today), greeting, `I am applying for the ${role} position at ${company}.${skills}`];
  if (proof.length) {
    paragraphs.push(`Two examples of the work I would bring:\n${proof.map((p) => `- ${p}.`).join('\n')}`);
  }
  paragraphs.push(
    `I would welcome a conversation about how I can contribute to ${company}. Thank you for your time.`,
    `Kind regards,\n${candidateName || '[Your name]'}`,
  );
  return paragraphs.join('\n\n');
}
