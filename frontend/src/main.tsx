import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme, App as AntdApp } from 'antd';
import App from './App';
import { useThemeStore } from './store/useThemeStore';
import './i18n';
import './index.css';

const ThemedApp = () => {
    const darkMode = useThemeStore((state) => state.darkMode);

    return (
        <ConfigProvider
            theme={{
                algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
                token: {
                    colorPrimary: '#1890ff',
                    borderRadius: 6,
                },
            }}
        >
            <AntdApp>
                <App />
            </AntdApp>
        </ConfigProvider>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ThemedApp />
        </BrowserRouter>
    </React.StrictMode>
);
