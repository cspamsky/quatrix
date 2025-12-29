/// <reference types="vite/client" />
import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { io, Socket } from 'socket.io-client';
import { useTranslation } from 'react-i18next';
import { Progress } from 'antd';

interface ConsoleProps {
    serverId: string;
}

const Console: React.FC<ConsoleProps> = ({ serverId }) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<Terminal | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const outputBufferRef = useRef<string[]>([]);
    const flushTimerRef = useRef<NodeJS.Timeout | null>(null);
    const { t } = useTranslation();
    const [progress, setProgress] = React.useState<number>(0);

    useEffect(() => {
        if (!terminalRef.current) return;

        // Initialize Xterm with optimized settings
        const term = new Terminal({
            cursorBlink: true,
            theme: {
                background: '#1e1e1e',
                foreground: '#d4d4d4',
                cursor: '#ffffff',
                black: '#000000',
                red: '#cd3131',
                green: '#0dbc79',
                yellow: '#e5e510',
                blue: '#2472c8',
                magenta: '#bc3fbc',
                cyan: '#11a8cd',
                white: '#e5e5e5',
            },
            fontSize: 13,
            fontFamily: '"Cascadia Code", Consolas, "Courier New", monospace',
            lineHeight: 1.2,
            scrollback: 1000,
            convertEol: true, // Automatically convert \n to \r\n
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);

        // Fit terminal after DOM is ready
        setTimeout(() => {
            try {
                fitAddon.fit();
            } catch (e) {
                console.warn('Failed to fit terminal', e);
            }
        }, 100);

        xtermRef.current = term;

        // Spam filter patterns
        const spamPatterns = [
            'CTextConsoleWin::GetLine: !GetNumberOfConsoleInputEvents',
            'Could not PreloadLibrary',
        ];

        const isSpam = (line: string): boolean => {
            return spamPatterns.some(pattern => line.includes(pattern));
        };

        // Buffered output flusher (reduces DOM updates)
        const flushBuffer = () => {
            if (outputBufferRef.current.length > 0 && xtermRef.current) {
                const output = outputBufferRef.current.join('');
                xtermRef.current.write(output);
                outputBufferRef.current = [];
            }
        };

        const scheduleFlush = () => {
            if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
            flushTimerRef.current = setTimeout(flushBuffer, 16); // ~60fps
        };

        const writeToTerminal = (data: string) => {
            // Split into lines and filter spam
            const lines = data.split(/\r?\n/);
            const filtered = lines.filter(line => !isSpam(line));

            if (filtered.length > 0) {
                const output = filtered.join('\r\n');
                if (output.trim()) {
                    outputBufferRef.current.push(output);
                    scheduleFlush();
                }
            }
        };

        term.writeln(`\x1b[34m${t('common.system')} ${t('terminal.connecting')}\x1b[0m`);

        // Initialize Socket.io
        const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            term.writeln(`\x1b[32m${t('common.system')} ${t('terminal.connected')}\x1b[0m`);
            socket.emit('terminal:join', { serverId });
        });

        socket.on('terminal:output', (data: string) => {
            writeToTerminal(data);
        });

        socket.on('terminal:status', (data: any) => {
            term.writeln(`\x1b[34m${t('common.system')} ${t('terminal.serverStatus')}: ${data.status}\x1b[0m`);
        });

        socket.on('terminal:error', (data: any) => {
            term.writeln(`\x1b[31m[${t('common.error')}] ${data.message}\x1b[0m`);
        });

        socket.on('terminal:progress', (data: any) => {
            setProgress(data.percent);
        });

        socket.on('disconnect', () => {
            term.writeln(`\x1b[31m${t('common.system')} ${t('terminal.disconnected')}\x1b[0m`);
        });

        socket.on('connect_error', (error) => {
            term.writeln(`\x1b[31m[${t('common.error')}] ${t('common.disconnected')}: ${error.message}\x1b[0m`);
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
            } else if (data === '\u0003') { // Ctrl+C
                command = '';
                term.write('^C\r\n');
            } else {
                command += data;
                term.write(data);
            }
        });

        // Handle resize
        const handleResize = () => {
            try {
                fitAddon.fit();
            } catch (e) {
                console.warn('Resize failed', e);
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
            window.removeEventListener('resize', handleResize);
            if (socketRef.current) {
                if (socketRef.current.connected) {
                    socketRef.current.disconnect();
                } else {
                    socketRef.current.close();
                }
            }
            term.dispose();
        };
    }, [serverId, t]);

    return (
        <div style={{ background: '#1e1e1e', borderRadius: '8px', padding: '4px' }}>
            {progress > 0 && progress < 100 && (
                <div style={{ padding: '8px 12px' }}>
                    <Progress
                        percent={progress}
                        status="active"
                        strokeColor={{ from: '#108ee9', to: '#87d068' }}
                        format={percent => `${t('common.loading')}: %${percent?.toFixed(1)}`}
                        trailColor="#444"
                    />
                </div>
            )}
            <div
                ref={terminalRef}
                style={{
                    height: '500px',
                    width: '100%',
                    padding: '12px',
                    background: '#1e1e1e',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
                }}
            />
        </div>
    );
};

export default Console;
