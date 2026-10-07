import { useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Mail, Sparkles } from 'lucide-react';
import { LegalModal, type LegalDocType } from '../../components/layout/LegalModal';
import { TextHoverEffect } from '../../components/ui/text-hover-effect';
import './MarketingFooter.css';

type SocialIconProps = { size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' };
type SocialIcon = ComponentType<SocialIconProps>;

const LinkedinIcon: SocialIcon = ({ size = 18, className, 'aria-hidden': ariaHidden }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden={ariaHidden}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const InstagramIcon: SocialIcon = ({ size = 18, className, 'aria-hidden': ariaHidden }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden={ariaHidden}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const GithubIcon: SocialIcon = ({ size = 18, className, 'aria-hidden': ariaHidden }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden={ariaHidden}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const teamMembers: {
  name: string;
  role: string;
  contribution: string;
  profile: string;
  socials: { label: string; href: string; icon: SocialIcon }[];
}[] = [
  {
    name: 'Hanan',
    role: 'Lead developer',
    contribution: 'Architecture, API, database, and core features',
    profile: 'https://github.com/hananqaisar-commits',
    socials: [
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/hanan-qaisar-22b0b6368', icon: LinkedinIcon },
      { label: 'Instagram', href: 'https://www.instagram.com/hanan.qaisar', icon: InstagramIcon },
      { label: 'GitHub', href: 'https://github.com/hananqaisar-commits', icon: GithubIcon },
    ],
  },
  {
    name: 'Hassan',
    role: 'UI and frontend',
    contribution: 'Dashboard, navigation, and visual polish',
    profile: 'https://github.com/hassanmustafa710',
    socials: [
      { label: 'GitHub', href: 'https://github.com/hassanmustafa710', icon: GithubIcon },
    ],
  },
  {
    name: 'Aftab',
    role: 'Algorithms',
    contribution: 'Animation and interactive learning features',
    profile: 'https://github.com/Aftab-commits',
    socials: [
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/m-aftab-riaz-6468332b9/?skipRedirect=true', icon: LinkedinIcon },
      { label: 'GitHub', href: 'https://github.com/Aftab-commits', icon: GithubIcon },
    ],
  },
];

export function MarketingFooter() {
  const [legalDoc, setLegalDoc] = useState<LegalDocType>(null);

  return (
    <>
      <footer className="mk-footer">
        <div className="mk-footer-inner">
          <div className="mk-footer-grid">
            <div className="mk-footer-brand-column">
              <Link className="mk-footer-brand" to="/dashboard" aria-label="Open the STEM Studio learning dashboard">
                <span className="mk-footer-brand-mark"><Sparkles size={19} aria-hidden="true" /></span>
                <span>STEM <strong>Studio</strong></span>
              </Link>
              <p>Interactive tools for learning computer science, built by the Octa Team.</p>
              <a className="mk-footer-email" href="mailto:hananqaisar316@gmail.com">
                <Mail size={15} aria-hidden="true" />
                hananqaisar316@gmail.com
                <ArrowUpRight size={13} aria-hidden="true" />
              </a>
              <p className="mk-footer-crafted"><Sparkles size={13} aria-hidden="true" /> Crafted by <strong>Octa Team</strong></p>
            </div>

            <nav className="mk-footer-column" aria-label="Website links">
              <h2>Explore</h2>
              <Link to="/#features">Features</Link>
              <Link to="/#how-it-works">How it works</Link>
              <Link to="/#faq">Frequently asked questions</Link>
              <Link to="/dashboard/dsa">Browse DSA topics <ArrowRight size={14} aria-hidden="true" /></Link>
            </nav>

            <div className="mk-footer-column">
              <h2>Policies</h2>
              <button type="button" onClick={() => setLegalDoc('privacy')}>Privacy policy</button>
              <button type="button" onClick={() => setLegalDoc('terms')}>Terms of service</button>
              <button type="button" onClick={() => setLegalDoc('cookies')}>Cookie and storage policy</button>
            </div>
          </div>

          <section className="mk-footer-team" aria-labelledby="mk-footer-team-title">
            <div className="mk-footer-team-heading">
              <div>
                <p className="mk-footer-kicker">The people behind the studio</p>
                <h2 id="mk-footer-team-title">Meet the Octa Team</h2>
              </div>
              <span>Built with care for curious learners.</span>
            </div>
            <div className="mk-footer-team-grid">
              {teamMembers.map((member) => (
                <article className="mk-footer-team-card" key={member.name}>
                  <span className="mk-footer-team-role">{member.role}</span>
                  <a className="mk-footer-team-name" href={member.profile} target="_blank" rel="noopener noreferrer">
                    {member.name}<ArrowUpRight size={14} aria-hidden="true" />
                  </a>
                  <p>{member.contribution}</p>
                  <div className="mk-footer-team-socials">
                    {member.socials.map(({ label, href, icon: Icon }) => (
                      <a key={label} href={href} aria-label={`${member.name} on ${label}`} title={label} target="_blank" rel="noopener noreferrer">
                        <Icon size={15} aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="mk-footer-lower">
            <div className="mk-footer-legal-row">
              <span>© {new Date().getFullYear()} STEM Studio</span>
              <span className="mk-footer-separator" aria-hidden="true">·</span>
              <span>All rights reserved.</span>
              <a href="https://opensource.org/license/mit/" target="_blank" rel="noopener noreferrer">MIT License</a>
              <a href="/sitemap.xml">Sitemap</a>
              <a href="mailto:hananqaisar316@gmail.com">Contact</a>
            </div>
          </div>
        </div>
        <Link className="mk-footer-octa-banner" to="/dashboard" aria-label="Meet Octa and open the STEM Studio learning dashboard">
          <span className="mk-footer-octa-caption">Meet your learning companion</span>
          <span className="mk-footer-octa-art"><TextHoverEffect text="OCTA" duration={0.12} /></span>
        </Link>
      </footer>
      <LegalModal docType={legalDoc} onClose={() => setLegalDoc(null)} />
    </>
  );
}
