#!/usr/bin/env python3
"""Озвучка роликов через ElevenLabs (с разметкой времени по символам).
Пишет fizika2/audio/ch<N>-l<i>.mp3 и src/voice.json {id: {dur, starts}} — с какого времени начинается каждая сцена.
Запуск: python3 tts_el.py <voice_id> [ch1-l1 ...]  (без списка — все уроки, у которых ещё нет озвучки)"""
import base64, json, os, subprocess, sys, urllib.request
D = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(D, '..', 'audio')
VOICE_ID = sys.argv[1]; only = set(sys.argv[2:])
book = json.loads(subprocess.check_output(['node', '-e', "eval(require('fs').readFileSync('book.js','utf8').replace(/^const /gm,'var '));console.log(JSON.stringify(CONTENT))"], cwd=D))
vj = os.path.join(D, 'voice.json'); voice = json.load(open(vj)) if os.path.exists(vj) else {}
for ch, C in book.items():
    for i, L in enumerate(C['lessons'], 1):
        vid = f'ch{ch}-l{i}'
        if (only and vid not in only) or (not only and vid in voice): continue
        parts, offs, pos = [], [], 0
        for s in L['video']: offs.append(pos); parts.append(s['t']); pos += len(s['t']) + 1
        text = ' '.join(parts)
        req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}/with-timestamps?output_format=mp3_44100_64',
            data=json.dumps({'text': text, 'model_id': 'eleven_multilingual_v2', 'language_code': 'ru', 'voice_settings': {'stability': 0.55, 'similarity_boost': 0.75, 'style': 0.15}}).encode(),
            headers={'Content-Type': 'application/json', 'xi-api-key': 'proxy'})
        d = json.load(urllib.request.urlopen(req, timeout=180))
        open(os.path.join(OUT, vid + '.mp3'), 'wb').write(base64.b64decode(d['audio_base64']))
        a = d['alignment']; st = a['character_start_times_seconds']
        voice[vid] = {'dur': round(a['character_end_times_seconds'][-1] + 0.6, 2), 'starts': [0] + [round(max(0, st[o] - 0.15), 2) for o in offs[1:]]}
        json.dump(voice, open(vj, 'w'), indent=0)
        print(vid, len(text), 'символов,', voice[vid]['dur'], 'с')
