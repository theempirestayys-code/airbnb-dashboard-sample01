// Entry for the single-file HTML build (npm run build:html → dist/empire-command.html).
// Renders the same pages as the Next.js app with hash routing, so it runs from file://.
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Home from '@/app/page';
import Dashboard from '@/app/dashboard/page';
import DataBuilder from '@/app/data-builder/page';
import FieldApp from '@/app/m/page';

const ROUTES: Record<string, () => React.ReactElement> = {
  '/': () => <Home />,
  '/dashboard/': () => <Dashboard />,
  '/data-builder/': () => <DataBuilder />,
  '/m/': () => <FieldApp />
};

function currentPath() {
  const p = window.location.hash.replace(/^#/, '') || '/';
  return p.endsWith('/') ? p : p + '/';
}

function App() {
  const [path, setPath] = useState(currentPath);
  useEffect(() => {
    const onHash = () => { setPath(currentPath()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return (ROUTES[path] ?? ROUTES['/'])();
}

createRoot(document.getElementById('root')!).render(<App />);
