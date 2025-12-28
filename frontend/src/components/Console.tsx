/// <reference types="vite/client" />
import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { io, Socket } from 'socket.io-client';

interface ConsoleProps {
    serverId: string;
}

const Console: React.FC<ConsoleProps> = ({ serverId }) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<Terminal | null>(null);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!terminalRef.current) return;

        // Initialize Xterm
        const term = new Terminal({
            cursorBlink: true,
            theme: {
                background: '#1e1e1e',
            },
            fontSize: 14,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        });
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);

        // Wait for DOM to handle dimensions
        setTimeout(() => {
            try {
                fitAddon.fit();
            } catch (e) {
                console.warn('Failed to fit terminal', e);
            }
        }, 100);

        xtermRef.current = term;

        term.writeln('\x1b[34m[System] Connecting to server terminal...\x1b[0m');

        // Initialize Socket.io
        const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000');
        socketRef.current = socket;

        socket.on('connect', () => {
            term.writeln('\x1b[32m[System] Connected to terminal service.\x1b[0m');
            socket.emit('terminal:join', { serverId });
        });

        socket.on('terminal:output', (data: string) => {
            term.write(data);
        });

        socket.on('terminal:status', (data: any) => {
            term.writeln(`\x1b[34m[System] Server status: ${data.status}\x1b[0m`);
        });

        socket.on('terminal:error', (data: any) => {
            term.writeln(`\x1b[31m[Error] ${data.message}\x1b[0m`);
        });

        socket.on('disconnect', () => {
            term.writeln('\x1b[31m[System] Disconnected from terminal service.\x1b[0m');
        });

        // Handle input
        let command = '';
        term.onData((data: string) => {
            if (data === '\r') { // Enter
                if (command.trim()) {
                    socket.emit('terminal:command', { serverId, command });
                }
                command = '';
                term.write('\r\n');
            } else if (data === '\u007f') { // Backspace
                if (command.length > 0) {
                    command = command.slice(0, -1);
                    term.write('\b \b');
                }
            } else {
                command += data;
                term.write(data);
            }
        });

        // Handle resize
        const handleResize = () => fitAddon.fit();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            socket.disconnect();
            term.dispose();
        };
    }, [serverId]);

    return (
        <div
            ref={terminalRef}
            style={{
                height: '400px',
                width: '100%',
                padding: '10px',
                background: '#1e1e1e',
                borderRadius: '8px',
                overflow: 'hidden'
            }}
        />
    );
};

export default Console;
