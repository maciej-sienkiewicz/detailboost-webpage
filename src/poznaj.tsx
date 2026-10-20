import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/geist/wght.css';
import '@fontsource-variable/geist-mono/wght.css';
import './index.css';
import { Backdrop } from './components/Backdrop';
import { Navbar } from './components/Navbar';
import { PoznajProgram } from './poznaj/PoznajProgram';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <div className="relative isolate overflow-x-clip">
            <Backdrop />
            <Navbar current="poznaj" />
            <main>
                <PoznajProgram />
            </main>
        </div>
    </StrictMode>,
);
