import React from 'react';
import {createRoot} from 'react-dom/client';
import {FixtureProvider} from './mock.jsx';
import {ThemeProvider} from '../../../src/context/theme';
import {AppUserMenu} from '../../../src/components/app/AppUserMenu';
createRoot(document.getElementById('root')).render(<FixtureProvider><ThemeProvider>
  <div className="mx-auto max-w-lg"><div className="flex justify-end"><AppUserMenu /></div>
    <h1 className="mt-8 text-[32px] font-bold">Qelt / Mshelt</h1><p className="mt-3 text-ink-2">Actual profile menu and theme provider. Local disposable UI fixture; no backend.</p>
  </div>
</ThemeProvider></FixtureProvider>);
