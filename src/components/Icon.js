import React from 'react';

const paths = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 15h3"/></>,
  alert: <><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.8 3h15.6a2 2 0 0 0 1.8-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  box: <><path d="m3 7 9-4 9 4v10l-9 4-9-4V7Z"/><path d="m3 7 9 4 9-4M12 11v10"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  search: <><circle cx="10.8" cy="10.8" r="7"/><path d="m16 16 5 5"/></>,
  download: <><path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/></>,
  upload: <><path d="M12 16V4m-4 4 4-4 4 4M4 17v4h16v-4"/></>,
  printer: <><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6zM18 12h.01"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>,
  chevron: <path d="m9 18 6-6-6-6"/>,
  close: <path d="M18 6 6 18M6 6l12 12"/>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/></>,
  shield: <><path d="m12 2 9 4v6c0 6-4 9-9 10-5-1-9-4-9-10V6l9-4Z"/><path d="m8 12 3 3 5-6"/></>,
  layers: <><rect x="3" y="3" width="18" height="8" rx="2"/><rect x="3" y="13" width="18" height="8" rx="2"/></>,
  filter: <><path d="M4 7h16M7 12h10m-7 5h4"/><circle cx="8" cy="7" r="2" fill="currentColor" stroke="none"/></>,
  more: <><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></>,
  file: <><path d="M6 2h8l5 5v15H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M14 2v6h5M8 13h8m-8 4h6"/></>,
  scan: <><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 10v4m3-5v6m3-6v6m3-5v4"/></>,
  camera: <><path d="M14 4H9l-2 3H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-4l-2-3Z"/><circle cx="12" cy="13" r="3"/></>,
  leaf: <><path d="M20 4c-12-1-17 4-16 12 7 3 16-3 16-12ZM4 20c2-6 6-9 12-12"/></>
};

export default function Icon({ name, size = 19, className = '' }) {
  return <svg aria-hidden="true" focusable="false" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name] || paths.box}</svg>;
}
