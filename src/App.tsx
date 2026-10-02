import { Backdrop } from './components/Backdrop';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';

export default function App() {
    return (
        <div className="relative isolate overflow-x-clip">
            <Backdrop />
            <Navbar />
            <main>
                <Hero />
            </main>
        </div>
    );
}
