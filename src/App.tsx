import { Backdrop } from './components/Backdrop';
import { Benefits } from './components/Benefits';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { KsefSection } from './components/KsefSection';
import { Navbar } from './components/Navbar';
import { Pricing } from './components/Pricing';
import { useScenePlayer } from './components/ScenePlayer';
import { SCENES, findStep } from './scenes';

export default function App() {
    // Odtwarzacz żyje tu, nie w Hero: karty z sekcji niżej („Zobacz na nagraniu")
    // przewijają do okna i włączają konkretny krok nagrania.
    const player = useScenePlayer(SCENES);
    const show = (scene: string, beat?: string) => {
        const step = findStep(scene, beat);
        player.jump(step.scene, step.at);
        const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        document.getElementById('nagrania')?.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'center' });
    };

    return (
        <div id="top" className="relative isolate overflow-x-clip">
            <Backdrop />
            <Navbar />
            <main>
                <Hero player={player} />
                <Benefits onShow={show} />
                <KsefSection onShow={show} />
                <Pricing />
            </main>
            <Footer />
        </div>
    );
}
