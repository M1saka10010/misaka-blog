import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const sharedProps: IconProps = {
  "aria-hidden": true,
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 1.75,
  viewBox: "0 0 24 24",
};

export function MenuIcon(props: IconProps) {
  return <svg {...sharedProps} {...props}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
}

export function CloseIcon(props: IconProps) {
  return <svg {...sharedProps} {...props}><path d="m6 6 12 12M18 6 6 18" /></svg>;
}

export function SearchIcon(props: IconProps) {
  return <svg {...sharedProps} {...props}><circle cx="11" cy="11" r="7" /><path d="m16 16 4 4" /></svg>;
}

export function ArrowIcon(props: IconProps) {
  return <svg {...sharedProps} {...props}><path d="M5 12h14m-5-5 5 5-5 5" /></svg>;
}

export function GithubIcon(props: IconProps) {
  return <svg {...sharedProps} {...props}><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3.3-.4 6.8-1.6 6.8-7A5.4 5.4 0 0 0 19.3 4 5 5 0 0 0 19.2.5S18 0 15 2a13.4 13.4 0 0 0-7 0C5 .1 3.8.5 3.8.5A5 5 0 0 0 3.7 4a5.4 5.4 0 0 0-1.5 3.5c0 5.4 3.5 6.6 6.8 7A4.8 4.8 0 0 0 8 18v4" /><path d="M8 19c-3 .9-3-1.5-4-2" /></svg>;
}

export function MailIcon(props: IconProps) {
  return <svg {...sharedProps} {...props}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>;
}

export function SunIcon(props: IconProps) {
  return <svg {...sharedProps} {...props}><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
}

export function MoonIcon(props: IconProps) {
  return <svg {...sharedProps} {...props}><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" /></svg>;
}

export function MonitorIcon(props: IconProps) {
  return <svg {...sharedProps} {...props}><rect x="2" y="4" width="20" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></svg>;
}
