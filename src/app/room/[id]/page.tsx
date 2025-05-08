'use client';

import { useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';

export default function Sala() {
    const { id } = useParams();

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    const localStreamRef = useRef<MediaStream | null>(null); // <--- novo
    const peerRef = useRef<RTCPeerConnection | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const bc = useRef<BroadcastChannel | null>(null);

    useEffect(() => {
        if (!id || typeof id !== 'string') return;

        bc.current = new BroadcastChannel(id);
        const peer = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        peerRef.current = peer;

        const setupConnection = async () => {
            const localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });

            localStreamRef.current = localStream;

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = localStream;
            }

            localStream.getTracks().forEach((track) =>
                peer.addTrack(track, localStream)
            );

            peer.ontrack = (event) => {
                const remoteStream = event.streams[0];
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = remoteStream;
                }
            };

            peer.onicecandidate = (event) => {
                if (event.candidate) {
                    bc.current?.postMessage({
                        type: 'ice',
                        candidate: event.candidate.toJSON(),
                    });
                }
            };

            if (bc.current) {
                bc.current.onmessage = async (e) => {
                    const msg = e.data;

                    if (msg.type === 'offer') {
                        await peer.setRemoteDescription(new RTCSessionDescription(msg.offer));
                        const answer = await peer.createAnswer();
                        await peer.setLocalDescription(answer);
                        bc.current?.postMessage({ type: 'answer', answer });
                    } else if (msg.type === 'answer') {
                        await peer.setRemoteDescription(new RTCSessionDescription(msg.answer));
                    } else if (msg.type === 'ice') {
                        const candidate = new RTCIceCandidate(msg.candidate);
                        await peer.addIceCandidate(candidate);
                    }
                };
            }

            const isInitiator = window.location.hash !== '#joined';
            if (isInitiator) {
                const offer = await peer.createOffer();
                await peer.setLocalDescription(offer);

                if (bc.current) {
                    bc.current.postMessage({ type: 'offer', offer });
                }
            } else {
                window.location.hash = '#joined';
            }

        };

        setupConnection();

        return () => bc.current?.close();
    }, [id]);

    const startRecording = () => {
        const stream = localStreamRef.current;

        if (!stream || stream.getTracks().length === 0) {
            console.error("Stream local está vazia ou não inicializada.");
            return;
        }


        if (!stream) {
            console.error('Stream local não disponível.');
            return;
        }

        const recorder = new MediaRecorder(stream);
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `gravacao-${id}.webm`;
            a.click();
        };

        recorder.start();
        recorderRef.current = recorder;
    };

    const stopRecording = () => {
        recorderRef.current?.stop();
    };

    return (
        <main className="flex flex-col items-center gap-4 p-6">
            <h1 className="text-2xl font-bold">Sala: {id}</h1>

            <div className="flex gap-4">
                <video ref={localVideoRef} autoPlay muted playsInline className="w-64 border" />
                <video ref={remoteVideoRef} autoPlay playsInline className="w-64 border" />
            </div>

            <div className="flex gap-2">
                <button
                    onClick={startRecording}
                    className="bg-green-500 px-4 py-2 rounded text-white"
                >
                    Gravar
                </button>
                <button
                    onClick={stopRecording}
                    className="bg-red-500 px-4 py-2 rounded text-white"
                >
                    Parar e Salvar
                </button>
            </div>
        </main>
    );
}
