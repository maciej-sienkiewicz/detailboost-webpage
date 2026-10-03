#!/usr/bin/env python3
"""
Lektor do nagrań: src/scenes/narration.json -> public/narration/<scena>-<n>.mp3.

Każde zdanie scenariusza jest przypięte do kroku nagrania (klucz z *.timing.json)
i zaczyna się, gdy nagranie dojdzie do tego kroku. Skrypt po syntezie sprawdza,
czy zdanie skończy się przed następnym zdaniem tej sceny (z zapasem) i przed końcem
nagrania - przy przekroczeniu wypisuje, o ile za długo, i kończy się błędem.

Głos:
  --provider elevenlabs  (domyślnie) klucz z ELEVENLABS_API_KEY, głos --voice
  --provider piper       offline, model .onnx z --piper-model (głos zastępczy)

Przykład:
  ELEVENLABS_API_KEY=... python3 capture/narration.py --voice CLuTGacrAhcIhaJslbXt
  python3 capture/narration.py --provider piper --piper-model pl_PL-gosia-medium.onnx
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / 'src/scenes/narration.json'
TIMING = ROOT / 'src/scenes'
VIDEOS = ROOT / 'public/scenes'
OUT = ROOT / 'public/narration'
GAP = 0.3  # cisza między zdaniami, s


def duration(path: Path) -> float:
    out = subprocess.run(
        ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


def encode(src: Path, dst: Path) -> None:
    """Mono, 64 kb/s, cisza z początku i końca przycięta - zdanie startuje równo z krokiem."""
    trim = 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,' \
           'silenceremove=start_periods=1:start_threshold=-50dB,areverse'
    subprocess.run(
        ['ffmpeg', '-y', '-v', 'error', '-i', str(src), '-af', trim, '-ac', '1', '-ar', '44100',
         '-b:a', '64k', str(dst)],
        check=True,
    )


def elevenlabs(text: str, voice: str, previous: str | None, following: str | None, raw: Path) -> None:
    key = os.environ.get('ELEVENLABS_API_KEY')
    if not key:
        sys.exit('Brak ELEVENLABS_API_KEY w środowisku.')
    body = {
        'text': text,
        'model_id': 'eleven_multilingual_v2',
        'voice_settings': {'stability': 0.5, 'similarity_boost': 0.8, 'style': 0.15, 'use_speaker_boost': True},
    }
    # Sąsiednie zdania dają ciągłość intonacji między osobnymi plikami.
    if previous:
        body['previous_text'] = previous
    if following:
        body['next_text'] = following
    req = urllib.request.Request(
        f'https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128',
        data=json.dumps(body).encode(),
        headers={'xi-api-key': key, 'Content-Type': 'application/json'},
    )
    try:
        with urllib.request.urlopen(req) as res:
            raw.write_bytes(res.read())
    except urllib.error.HTTPError as e:
        sys.exit(f'ElevenLabs {e.code}: {e.read().decode(errors="replace")}')


def piper(text: str, model: str, raw: Path) -> None:
    subprocess.run([sys.executable, '-m', 'piper', '-m', model, '-f', str(raw)], input=text.encode(), check=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--provider', choices=['elevenlabs', 'piper'], default='elevenlabs')
    ap.add_argument('--voice', default='CLuTGacrAhcIhaJslbXt')
    ap.add_argument('--piper-model')
    ap.add_argument('--scene', action='append', help='tylko te sceny (można powtórzyć)')
    args = ap.parse_args()

    script = json.loads(SCRIPT.read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    problems = []

    for scene, cues in script.items():
        if args.scene and scene not in args.scene:
            continue
        timing = json.loads((TIMING / f'{scene}.timing.json').read_text())
        video_end = duration(VIDEOS / f'{scene}.mp4')
        for i, cue in enumerate(cues):
            if cue['beat'] not in timing:
                sys.exit(f'{scene}: nie ma kroku „{cue["beat"]}" w {scene}.timing.json')
            dst = OUT / f'{scene}-{i}.mp3'
            with tempfile.TemporaryDirectory() as tmp:
                raw = Path(tmp) / ('raw.mp3' if args.provider == 'elevenlabs' else 'raw.wav')
                if args.provider == 'elevenlabs':
                    prev = cues[i - 1]['text'] if i > 0 else None
                    nxt = cues[i + 1]['text'] if i + 1 < len(cues) else None
                    elevenlabs(cue['text'], args.voice, prev, nxt, raw)
                else:
                    if not args.piper_model:
                        sys.exit('Podaj --piper-model.')
                    piper(cue['text'], args.piper_model, raw)
                encode(raw, dst)

            start = timing[cue['beat']]['at']
            end = start + duration(dst)
            limit = timing[cues[i + 1]['beat']]['at'] - GAP if i + 1 < len(cues) else video_end - GAP
            mark = 'OK ' if end <= limit else 'ZA DŁUGO'
            print(f'{mark} {scene}-{i}: {start:5.1f}–{end:5.1f} s (do {limit:5.1f})  {cue["text"]}')
            if end > limit:
                problems.append(f'{scene}-{i}: o {end - limit:.1f} s za długo')

    if problems:
        print('\nZdania do skrócenia:\n  ' + '\n  '.join(problems))
        sys.exit(1)


if __name__ == '__main__':
    main()
