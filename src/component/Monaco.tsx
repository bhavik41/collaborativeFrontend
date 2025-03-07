import React, { useState, useRef, useEffect } from 'react';
import Editor, { loader } from "@monaco-editor/react";
import { WebContainer, WebContainerProcess } from '@webcontainer/api';
import axios from '../config/axios';
import { receiveMessage, sendMessage } from '../config/socket';
import { getIcon } from './Explorer';


loader.config({
    paths: {
        vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs'
    }
});

interface FileContent {
    file: {
        contents: string;
        language?: string;
    };
}

interface DirectoryContent {
    directory: {
        [key: string]: FileNode;
    };
}

type FileNode = FileContent | DirectoryContent;

interface FileTree {
    [key: string]: FileNode;
}

interface Project {
    id: string;
    name: string;
    users: string[];
    creator: string;
    language?: string;
    description?: string;
    version?: number;
    createdAt?: string;
}

interface CodeEditorProps {
    fileTree: FileTree;
    setFileTree: React.Dispatch<React.SetStateAction<FileTree>>;
    currentFile: string | null;
    setCurrentFile: React.Dispatch<React.SetStateAction<string | null>>;
    openFiles: string[];
    setOpenFiles: React.Dispatch<React.SetStateAction<string[]>>;
    webContainer: WebContainer | null;
    project: Project;
}

const getLanguageFromFilename = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
        'js': 'javascript',
        'jsx': 'javascript',
        'ts': 'typescript',
        'tsx': 'typescript',
        'py': 'python',
        'java': 'java',
        'cpp': 'cpp',
        'cc': 'cpp',
        'cxx': 'cpp',
        'c': 'c',
        'json': 'json',
        'html': 'html',
        'css': 'css',
        'scss': 'scss',
        'less': 'less',
        'md': 'markdown',
        'yml': 'yaml',
        'yaml': 'yaml',
        'xml': 'xml',
        'svg': 'xml',
        'sql': 'sql',
        'sh': 'shell',
        'bash': 'shell',
        'php': 'php',
        'go': 'go',
        'rust': 'rust',
        'rb': 'ruby',
        'pl': 'perl',
        'lua': 'lua',
        'swift': 'swift',
        'vue': 'html',
        'dart': 'dart',
        'graphql': 'graphql',
        'kt': 'kotlin',
        'scala': 'scala'
    };
    return languageMap[ext || ''] || 'plaintext';
};

const setNestedValue = (obj: FileTree, path: string[], value: FileContent): FileTree => {
    if (path.length === 1) {
        return {
            ...obj,
            [path[0]]: value
        };
    }

    const [first, ...rest] = path;

    // Check if the current path exists and is a directory
    const currentNode = obj[first];
    const isDirectory = currentNode && 'directory' in currentNode;

    // Get the existing directory or create an empty one
    const existingDirectory = isDirectory
        ? (currentNode as DirectoryContent).directory
        : {};

    // Recursively set the value in the nested structure
    const updatedDirectory = setNestedValue(existingDirectory, rest, value);

    return {
        ...obj,
        [first]: {
            directory: updatedDirectory
        }
    };
};

const editorThemes = [
    { id: 'vs-dark', name: 'VS Dark' },
    { id: 'vs-light', name: 'VS Light' },
    { id: 'hc-black', name: 'High Contrast Dark' },
    { id: 'hc-light', name: 'High Contrast Light' }
];
const fontSizeOptions = [12, 14, 16, 18, 20, 22, 24];
// Helper function to get nested value
const getNestedValue = (obj: FileTree, path: string[]): FileContent | undefined => {
    if (path.length === 1) {
        return obj[path[0]] as FileContent;
    }

    const [first, ...rest] = path;
    const currentNode = obj[first];
    if (!currentNode || !('directory' in currentNode)) return undefined;

    return getNestedValue((currentNode as DirectoryContent).directory, rest);
};

const CodeEditor: React.FC<CodeEditorProps> = ({
    currentFile,
    setCurrentFile,
    fileTree,
    setFileTree,
    openFiles,
    setOpenFiles,
    webContainer,
    project,


}) => {
    const [iframeUrl, setIframeUrl] = useState<string | null>(null);
    const [runProcess, setRunProcess] = useState<WebContainerProcess | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [installLogs, setInstallLogs] = useState<string[]>([]);
    const [serverLogs, setServerLogs] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'logs'>('editor');
    const [logType, setLogType] = useState<'server' | 'install'>('install');
    // const [leftPanelWidth, setLeftPanelWidth] = useState(50); // percentage
    // const resizingRef = useRef(false);
    // const startXRef = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const [hasError, setHasError] = useState(false);
    const [editorKey, setEditorKey] = useState(0); // Used to force re-render the editor

    const editorRef = useRef<any>(null);

    // Editor preferences
    const [editorTheme, setEditorTheme] = useState<string>('vs-dark');
    const [fontSize, setFontSize] = useState<number>(14);
    const [wordWrap, setWordWrap] = useState<'on' | 'off'>('on');
    const [showMinimap, setShowMinimap] = useState<boolean>(true);
    const [showSettingsPanel, setShowSettingsPanel] = useState<boolean>(false);

    // Auto save timeout
    const autoSaveTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        // Force editor re-mount when switching to editor tab
        if (activeTab === 'editor' && currentFile) {
            setEditorKey(prev => prev + 1);
        }
        receiveMessage("project-code", (data: any) => {
            console.log(data)
            setFileTree(data);
        });

        const savedTheme = localStorage.getItem('editorTheme');
        const savedFontSize = localStorage.getItem('editorFontSize');
        const savedWordWrap = localStorage.getItem('editorWordWrap');
        const savedShowMinimap = localStorage.getItem('editorShowMinimap');

        if (savedTheme) setEditorTheme(savedTheme);
        if (savedFontSize) setFontSize(parseInt(savedFontSize));
        if (savedWordWrap) setWordWrap(savedWordWrap as 'on' | 'off');
        if (savedShowMinimap) setShowMinimap(savedShowMinimap === 'true');

        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };

    }, [activeTab, currentFile]);


    // Function to handle editor mounting
    const handleEditorDidMount = (editor: any, monaco: any) => {
        editorRef.current = editor;

        // Configure Monaco editor
        configureMonaco(monaco);

        // Focus editor after mount
        editor.focus();
    };

    const configureMonaco = (monaco: any) => {
        if (!monaco) return;

        // Auto bracket completion for all languages
        monaco.languages.setLanguageConfiguration('typescript', {
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')'],
                ['<', '>'],
            ],
            autoClosingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '<', close: '>' },
                { open: "'", close: "'", notIn: ['string', 'comment'] },
                { open: '"', close: '"', notIn: ['string'] },
                { open: '`', close: '`', notIn: ['string', 'comment'] },
            ]
        });

        // Enhanced HTML/JSX auto-closing tags
        monaco.languages.setLanguageConfiguration('html', {
            onEnterRules: [
                {
                    beforeText: /<([_:\w][_:\w-.\d]*)(?:\s+[^>]*)?>[^<]*$/i,
                    afterText: /^<\/([_:\w][_:\w-.\d]*)>/i,
                    action: { indentAction: monaco.languages.IndentAction.IndentOutdent }
                }
            ],
            autoClosingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: "'", close: "'" },
                { open: '"', close: '"' },
                { open: '<', close: '>' }
            ],
            autoCloseBefore: ";:.,=}])> \n\t",
            folding: {
                markers: {
                    start: new RegExp("^\\s*<!--\\s*#region\\b.*-->"),
                    end: new RegExp("^\\s*<!--\\s*#endregion\\b.*-->")
                }
            }
        });

        // Register custom themes
        monaco.editor.defineTheme('github-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '6A9955' },
                { token: 'keyword', foreground: 'CF8E6D' },
                { token: 'string', foreground: 'CE9178' }
            ],
            colors: {
                'editor.background': '#0D1117',
                'editor.foreground': '#E1E4E8',
                'editorCursor.foreground': '#E1E4E8',
                'editor.lineHighlightBackground': '#161B22',
                'editorLineNumber.foreground': '#8B949E',
                'editor.selectionBackground': '#3B5070',
                'editor.inactiveSelectionBackground': '#3A3D41'
            }
        });
    };

    const handleInput = (value: string | undefined) => {
        if (!currentFile || !value) return;

        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }

        // Set new timeout for auto-save (700ms delay)
        autoSaveTimeoutRef.current = setTimeout(() => {
            const pathParts = currentFile.split('/');
            const fileData: FileContent = {
                file: {
                    contents: value,
                    language: getLanguageFromFilename(currentFile),
                }
            };

            const updatedTree = setNestedValue(fileTree, pathParts, fileData);
            setFileTree(updatedTree);
            saveFileTree(updatedTree);
            sendMessage("project-code", updatedTree);
        }, 700);
    };

    const getCurrentFileContents = (): string => {
        if (!currentFile) return "";

        const pathParts = currentFile.split('/');
        const fileData = getNestedValue(fileTree, pathParts);
        return fileData?.file?.contents || "";
    };

    const handleFileClick = (file: string) => {
        setCurrentFile(file);
        setActiveTab('editor');
        if (!openFiles.includes(file)) {
            setOpenFiles((prev) => [...prev, file]);
        }
    };

    const handleFileClose = (file: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updatedOpenFiles = openFiles.filter((f) => f !== file);
        setOpenFiles(updatedOpenFiles);
        if (currentFile === file) {
            setCurrentFile(updatedOpenFiles.length > 0 ? updatedOpenFiles[0] : null);
        }
    };

    const saveFileTree = async (ft: FileTree) => {
        try {
            await axios.put('/project/update-file-tree', {
                projectId: project.id,
                fileTree: ft,
            });
        } catch (err) {
            console.error("Error saving file tree:", err);
            addLog('install', `❌ Error: Failed to save changes`);
            setHasError(true);
        }
    };

    const saveEditorPreferences = () => {
        localStorage.setItem('editorTheme', editorTheme);
        localStorage.setItem('editorFontSize', fontSize.toString());
        localStorage.setItem('editorWordWrap', wordWrap);
        localStorage.setItem('editorShowMinimap', showMinimap.toString());
    };

    // Apply editor preferences when they change
    useEffect(() => {
        saveEditorPreferences();
    }, [editorTheme, fontSize, wordWrap, showMinimap]);

    const checkForPackageJson = (tree: FileTree): boolean => {
        return 'package.json' in tree;
    };

    const addLog = (type: 'install' | 'server', message: string) => {
        if (type === 'install') {
            setInstallLogs(prev => [...prev, message]);
        } else {
            setServerLogs(prev => [...prev, message]);
        }
    };

    const flattenFileTree = (tree: FileTree, path = ""): Record<string, string> => {
        let result: Record<string, string> = {};
        for (const [key, value] of Object.entries(tree)) {
            const newPath = path ? `${path}/${key}` : key;
            if ("file" in value) {
                result[newPath] = value.file.contents;
            } else if ("directory" in value) {
                Object.assign(result, flattenFileTree(value.directory, newPath));
            }
        }
        return result;
    };


    const getJudge0LanguageId = (language: string): number | null => {
        const languageMap: Record<string, number | null> = {
            'c': 50,
            'cpp': 54,
            'java': 62,
            'python': 71,
            'javascript': 63,
            'typescript': 74,
            'go': 60,
            'ruby': 72,
            'php': 68,
            'swift': 83,
            'rust': 73,
            'kotlin': 78,
            'scala': 81,
            'perl': 85,
            'lua': 90,
            'haskell': 82,
            'csharp': 51,
            'r': 80,
            'dart': 91,
            'objective-c': 105,
            'pascal': 77,
            'fortran': 59,
            'bash': 46,
            'sql': 82, // SQL variants may require different handling
            'json': null, // JSON is not executable
            'xml': null,  // XML is not executable
            'yaml': null, // YAML is not executable
            'plaintext': null, // Not an executable language
        };

        return languageMap[language] || null;
    };



    const runWebcontainers = async () => {
        if (!webContainer) {
            addLog('install', `❌ Error: WebContainer not initialized`);
            setActiveTab('logs');
            setLogType('install');
            setHasError(true);
            return;
        }

        setIsRunning(true);
        setInstallLogs([]);
        setServerLogs([]);
        setActiveTab('logs');
        setLogType('install');
        setHasError(false);

        try {
            // Kill existing process if running
            if (runProcess) {
                await runProcess.kill();
                setRunProcess(null);
            }

            // Mount files
            addLog('install', "📁 Mounting files...");
            await webContainer.mount(fileTree);
            addLog('install', "✅ Files mounted successfully");

            // Check for package.json
            if (!checkForPackageJson(fileTree)) {
                addLog('install', "❌ Error: No package.json found in project root");
                setIsRunning(false);
                setHasError(true);
                return;
            }

            // if (!checkForPackageJson(fileTree)) {
            //     addLog('install', "⚠️ No package.json found, creating one...");

            //     const mainFile = currentFile || "index.js"; // Set main file dynamically

            //     fileTree["package.json"] = {
            //         file: {
            //             contents: JSON.stringify({
            //                 name: "webcontainer-app",
            //                 version: "1.0.0",
            //                 main: mainFile,
            //                 scripts: {
            //                     start: `node ${mainFile}`
            //                 }
            //             }, null, 2),
            //         },
            //     };

            //     addLog('install', `✅ Created package.json with main file: ${mainFile}`);
            // }

            // Install dependencies
            addLog('install', "📦 Installing dependencies...");
            const installProcess = await webContainer.spawn('npm', ['install']);

            const installExitPromise = new Promise((resolve, reject) => {
                installProcess.output.pipeTo(new WritableStream({
                    write(chunk) {
                        addLog('install', chunk.toString());
                    },
                }));

                installProcess.exit.then(code => {
                    if (code !== 0) {
                        reject(new Error(`npm install failed with code ${code}`));
                    } else {
                        resolve(null);
                    }
                });
            });

            await installExitPromise;

            // Clear port 3000
            addLog('install', "🔄 Clearing port 3000...");
            await webContainer.spawn('npx', ['kill-port', '3000']);

            // Start development server
            addLog('install', "🚀 Starting development server...");
            addLog('server', "🚀 Starting development server...");
            const devProcess = await webContainer.spawn('npm', ['start']);
            setRunProcess(devProcess);

            devProcess.output.pipeTo(new WritableStream({
                write(chunk) {
                    addLog('server', chunk.toString());
                },
            }));
            // const url = await webContainer.getServerUrl();
            // const message = `✨ Server ready at ${url}`;
            // addLog('install', message);
            // addLog('server', message);
            // setIframeUrl(url); // Set iframeUrl with a string value
            // setLogType('server'); // Automatically switch to server logs when ready
            // setActiveTab('preview');

            webContainer.on('server-ready', (url: any) => {
                const message = `✨ Server ready at ${url}`;
                addLog('install', message);
                addLog('server', message);
                setIframeUrl(url);
                setLogType('server'); // Automatically switch to server logs when ready
                setActiveTab('preview'); // Automatically show preview when ready
            });

        } catch (err) {
            console.error("Run error:", err);
            const errorMsg = `❌ Error: ${err instanceof Error ? err.message : "Unknown error"}`;
            addLog('install', errorMsg);
            addLog('server', errorMsg);
            setHasError(true);
        } finally {
            setIsRunning(false);
        }
    };

    // const runWebcontainers = async () => {
    //     if (!webContainer) {
    //         addLog('install', `❌ Error: WebContainer not initialized`);
    //         setActiveTab('logs');
    //         setLogType('install');
    //         setHasError(true);
    //         return;
    //     }

    //     setIsRunning(true);
    //     setInstallLogs([]);
    //     setServerLogs([]);
    //     setActiveTab('logs');
    //     setLogType('install');
    //     setHasError(false);

    //     try {
    //         if (runProcess) {
    //             await runProcess.kill();
    //             setRunProcess(null);
    //         }

    //         if (!checkForPackageJson(fileTree)) {
    //             addLog('install', "⚠️ No package.json found, creating one...");
    //             const mainFile = currentFile || "index.js";

    //             fileTree["package.json"] = {
    //                 file: {
    //                     contents: JSON.stringify({
    //                         name: "webcontainer-app",
    //                         version: "1.0.0",
    //                         main: mainFile,
    //                         scripts: {
    //                             start: `node ${mainFile}`
    //                         }
    //                     }, null, 2),
    //                 },
    //             };

    //             addLog('install', `✅ Created package.json with main file: ${mainFile}`);
    //         }

    //         await saveFileTree(fileTree);
    //         addLog('install', "📁 Mounting files...");
    //         await webContainer.mount(fileTree);
    //         addLog('install', "✅ Files mounted successfully");

    //         addLog('install', "🚀 Starting development server...");
    //         addLog('server', "🚀 Starting development server...");
    //         const devProcess = await webContainer.spawn('npm', ['start']);
    //         setRunProcess(devProcess);

    //         devProcess.output.pipeTo(new WritableStream({
    //             write(chunk) {
    //                 addLog('server', chunk.toString());
    //             },
    //         }));

    //         webContainer.on('server-ready', (port, url) => {
    //             const message = `✨ Server ready at ${url}`;
    //             addLog('install', message);
    //             addLog('server', message);
    //             setIframeUrl(url);
    //             setLogType('server');
    //             setActiveTab('preview');
    //         });

    //     } catch (err: any) {
    //         console.error("Run error:", err);
    //         addLog('install', `❌ Error: ${err.message || "Unknown error"}`);
    //         setHasError(true);
    //     } finally {
    //         setIsRunning(false);
    //     }
    // };

    const runJavaScriptInIframe = (): void => {
        addLog('server', `⚡ Running ${currentFile} in iframe...`);

        const jsCode: string = currentFile && 'file' in fileTree[currentFile] ? fileTree[currentFile].file.contents : "";

        // Remove existing iframe if present
        const existingIframe = document.getElementById("js-execution-iframe") as HTMLIFrameElement;
        if (existingIframe && existingIframe.parentNode) {
            existingIframe.parentNode.removeChild(existingIframe);
        }

        const iframe: HTMLIFrameElement = document.createElement("iframe");
        iframe.id = "js-execution-iframe";
        iframe.style.width = "100%";
        iframe.style.height = "400px";
        iframe.style.border = "1px solid #ccc";
        document.body.appendChild(iframe);

        const iframeDoc: Document | null = iframe.contentDocument || iframe.contentWindow?.document || null;
        if (iframeDoc) {
            iframeDoc.open();
            iframeDoc.write(`
            <html>
            <head><title>Run Code</title></head>
            <body>
                <script>
                    (function() {
                        const originalConsoleLog = console.log;
                        console.log = function(...args) {
                            parent.postMessage({ type: 'log', data: args }, '*');
                            originalConsoleLog.apply(console, args);
                        };

                        try {
                            ${jsCode} // Runs user-provided JavaScript
                        } catch (err) {
                            console.error("Execution Error:", err);
                        }
                    })();
                <\/script>
            </body>
            </html>
        `);
            iframeDoc.close();
        }

        window.addEventListener("message", (event: MessageEvent) => {
            if (event.data.type === "log") {
                addLog('server', event.data.data.join(" "));
            }
        });
    };




    const handleRun = async () => {
        if (!currentFile) return;

        // const ext = currentFile.split('.').pop();
        const language = project.language;

        console.log("Selected Language:", language);



        if (language == 'Node') {
            runWebcontainers();
        }
        else if (language === 'JavaScript') {
            runJavaScriptInIframe();
        }
        else {
            const languageId = language ? getJudge0LanguageId(language.toLowerCase()) : null;
            if (!languageId) {
                setServerLogs(["❌ Error: Unsupported language."]);
                return;
            }
            console.log("Using Judge0 for execution...");

            const JUDGE0_API = "https://judge0-ce.p.rapidapi.com/submissions";
            const JUDGE0_HEADERS = {
                'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
                'x-rapidapi-key': import.meta.env.JUDGEO_API_KEY, // Replace with your API key
                'content-type': 'application/json'
            };

            const files = flattenFileTree(fileTree);
            const mainFile = files[currentFile] || "";

            console.log("Main File Content:", mainFile);

            if (!mainFile.trim()) {
                setServerLogs(["❌ Error: Main file is empty"]);
                return;
            }

            const submissionData = {
                source_code: mainFile,
                language_id: languageId,
                stdin: "",
                additional_files: Object.entries(files)
                    .filter(([path]) => path !== currentFile)
                    .map(([path, content]) => ({ name: path, content })),
            };

            console.log("Submission Data:", submissionData);

            try {
                const submissionResponse = await fetch(JUDGE0_API, {
                    method: 'POST',
                    headers: JUDGE0_HEADERS,
                    body: JSON.stringify(submissionData),
                });

                if (!submissionResponse.ok) {
                    const errorText = await submissionResponse.text();
                    console.error("Judge0 Submission Error:", errorText);
                    setServerLogs(["❌ Judge0 API Error: " + errorText]);
                    return;
                }

                const { token } = await submissionResponse.json();
                console.log("Submission Token:", token);

                // Check result repeatedly instead of fixed timeout
                let status = null;
                let output = null;
                for (let i = 0; i < 5; i++) {
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    const resultResponse = await fetch(`${JUDGE0_API}/${token}`, {
                        method: 'GET',
                        headers: JUDGE0_HEADERS,
                    });

                    const resultData = await resultResponse.json();
                    console.log("Judge0 Response:", resultData);

                    if (resultData.status && resultData.status.id >= 3) { // 3 = Finished
                        output = resultData.stdout || resultData.stderr;
                        status = resultData.status.description;
                        break;
                    }
                }

                if (!output) {
                    setServerLogs(["❌ Error: Execution timed out or failed."]);
                } else {
                    setServerLogs([`✅ ${status}\n\n${output}`]);
                }
            } catch (error) {
                console.error("Execution Error:", error);
                setServerLogs(["❌ Error: Failed to execute code"]);
            }
        }
    };

    // const handleRun = async () => {
    //     if (!currentFile) return;

    //     const ext = currentFile.split('.').pop();
    //     const language = getLanguageFromFilename(currentFile);
    //     const languageId = getJudge0LanguageId(language);

    //     if (!languageId) {
    //         setServerLogs(["❌ Error: Unsupported language."]);
    //         return;
    //     }

    //     if (language === "javascript") {
    //         runJavaScriptInIframe();
    //     } else {
    //         console.log("Running", language);

    //         const JUDGE0_API = "https://judge0-ce.p.rapidapi.com/submissions";
    //         const JUDGE0_HEADERS = {
    //             "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
    //             'x-rapidapi-key': 'f72520e9f9msh9e7426361479b74p144c1ejsn730574d7951d', // Replace with your API key
    //             "content-type": "application/json"
    //         };

    //         const files = flattenFileTree(fileTree);
    //         const mainFile = files[currentFile] || "";

    //         // Fetch the latest input from server logs
    //         const userInput = serverLogs[serverLogs.length - 1] || "";

    //         const submissionData = {
    //             source_code: mainFile,
    //             language_id: languageId,
    //             stdin: userInput, // Use the last log entry as input
    //         };

    //         try {
    //             const submissionResponse = await fetch(JUDGE0_API, {
    //                 method: "POST",
    //                 headers: JUDGE0_HEADERS,
    //                 body: JSON.stringify(submissionData),
    //             });

    //             const { token } = await submissionResponse.json();
    //             setTimeout(async () => {
    //                 const resultResponse = await fetch(`${JUDGE0_API}/${token}`, {
    //                     method: "GET",
    //                     headers: JUDGE0_HEADERS,
    //                 });

    //                 const resultData = await resultResponse.json();
    //                 setServerLogs(resultData.stdout || resultData.stderr);
    //             }, 3000);
    //         } catch (error) {
    //             setServerLogs(["❌ Error: Failed to execute code"]);
    //         }
    //     }
    // };



    const truncateFilename = (filename: string, maxLength: number = 20) => {
        if (filename.length <= maxLength) return filename;
        const extension = filename.lastIndexOf('.') > 0 ?
            filename.substring(filename.lastIndexOf('.')) : '';
        const name = filename.substring(0, filename.lastIndexOf('.') > 0 ?
            filename.lastIndexOf('.') : filename.length);
        return `${name.substring(0, maxLength - 3 - extension.length)}...${extension}`;
    };

    // const startResizing = (e: React.MouseEvent) => {
    //     e.preventDefault();
    //     resizingRef.current = true;
    //     startXRef.current = e.clientX;
    //     document.addEventListener('mousemove', handleResize);
    //     document.addEventListener('mouseup', stopResizing);
    // };

    // const handleResize = (e: MouseEvent) => {
    //     if (!resizingRef.current || !containerRef.current) return;

    //     const containerRect = containerRef.current.getBoundingClientRect();
    //     const newX = e.clientX - containerRect.left;
    //     const newWidth = (newX / containerRect.width) * 100;

    //     // Limit resize range (10% to 90%)
    //     if (newWidth >= 10 && newWidth <= 90) {
    //         setLeftPanelWidth(newWidth);
    //     }
    // };

    // const stopResizing = () => {
    //     resizingRef.current = false;
    //     document.removeEventListener('mousemove', handleResize);
    //     document.removeEventListener('mouseup', stopResizing);
    // };

    const getCurrentLogs = () => {
        return logType === 'install' ? installLogs : serverLogs;
    };
    // const getCurrentLogs = () => {
    //     const logs = logType === 'install' ? installLogs : serverLogs;
    //     return Array.isArray(logs) ? logs : []; // Ensure logs is always an array
    // };



    const handleFindReplace = () => {
        if (editorRef.current) {
            editorRef.current.getAction('actions.find').run();
        }
    };

    return (
        <div
            ref={containerRef}
            className="flex flex-col h-full flex-grow relative bg-gray-900"
            style={{ overflow: 'hidden' }}
        >
            {/* Top Navigation Bar */}
            <div className="flex items-center bg-gray-800 p-2 shadow-md z-10">
                {/* File Tabs */}
                <div className="flex-1 flex gap-1 overflow-x-auto mr-4">
                    {openFiles.map((file) => (
                        <button
                            key={file}
                            onClick={() => handleFileClick(file)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-t-md transition-colors
                                ${currentFile === file && activeTab === 'editor'
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                        >
                            {getIcon(file, false)}
                            <span className="truncate max-w-xs">{truncateFilename(file)}</span>
                            <span
                                onClick={(e) => handleFileClose(file, e)}
                                className="ml-2 hover:bg-gray-500 rounded-full p-1"
                            >
                                ×
                            </span>
                        </button>
                    ))}
                </div>

                {/* View Controls */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                        className={`px-3 py-1.5 rounded-md transition-colors
                            ${showSettingsPanel ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                    >
                        ⚙️ Editor Settings
                    </button>
                    <button
                        onClick={handleRun}
                        disabled={isRunning}
                        className={`px-4 py-1.5 rounded-md transition-colors ${isRunning
                            ? 'bg-gray-600 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700'
                            } text-white flex items-center gap-2`}
                    >
                        {isRunning ? (
                            <>
                                <span className="animate-spin">⚙️</span>
                                Running...
                            </>
                        ) : (
                            <>▶ Run</>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('preview')}
                        disabled={!iframeUrl}
                        className={`px-3 py-1.5 rounded-md transition-colors
                            ${activeTab === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
                            ${!iframeUrl && 'opacity-50 cursor-not-allowed'}`}
                    >
                        🖥️ Preview
                    </button>

                    <button
                        onClick={() => {
                            setActiveTab('logs');
                            if (!logType) setLogType('install');
                        }}
                        className={`px-3 py-1.5 rounded-md transition-colors relative
                            ${activeTab === 'logs' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                    >
                        📋 Logs
                        {hasError && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                        )}
                    </button>
                </div>

                {/* {showSettingsPanel && (
                    <div className="bg-gray-800 p-3 border-b border-gray-700 flex flex-wrap gap-4 items-center">
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-300">Theme:</label>
                            <select
                                value={editorTheme}
                                onChange={(e) => setEditorTheme(e.target.value)}
                                className="bg-gray-700 text-white rounded-md p-1 text-sm"
                            >
                                {editorThemes.map(theme => (
                                    <option key={theme.id} value={theme.id}>{theme.name}</option>
                                ))}
                                <option value="github-dark">GitHub Dark</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-300">Font Size:</label>
                            <select
                                value={fontSize}
                                onChange={(e) => setFontSize(parseInt(e.target.value))}
                                className="bg-gray-700 text-white rounded-md p-1 text-sm"
                            >
                                {fontSizeOptions.map(size => (
                                    <option key={size} value={size}>{size}px</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-300">Word Wrap:</label>
                            <select
                                value={wordWrap}
                                onChange={(e) => setWordWrap(e.target.value as 'on' | 'off')}
                                className="bg-gray-700 text-white rounded-md p-1 text-sm"
                            >
                                <option value="on">On</option>
                                <option value="off">Off</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-300">Minimap:</label>
                            <input
                                type="checkbox"
                                checked={showMinimap}
                                onChange={(e) => setShowMinimap(e.target.checked)}
                                className="rounded-md"
                            />
                        </div>

                        <div className="border-l border-gray-600 pl-4 flex gap-2">
                            <button
                                onClick={handleFormatDocument}
                                className="bg-gray-700 text-gray-200 hover:bg-gray-600 px-2 py-1 rounded-md text-sm flex items-center gap-1"
                            >
                                <span>🧹</span> Format
                            </button>
                            <button
                                onClick={handleToggleComment}
                                className="bg-gray-700 text-gray-200 hover:bg-gray-600 px-2 py-1 rounded-md text-sm flex items-center gap-1"
                            >
                                <span>💬</span> Comment
                            </button>
                            <button
                                onClick={handleFindReplace}
                                className="bg-gray-700 text-gray-200 hover:bg-gray-600 px-2 py-1 rounded-md text-sm flex items-center gap-1"
                            >
                                <span>🔍</span> Find
                            </button>
                        </div>
                    </div>
                )} */}
            </div>
            <div className="flex items-center bg-gray-800 p-2 shadow-md z-10">

                {showSettingsPanel && (
                    <div className="bg-gray-800 p-3 border-b border-gray-700 flex flex-wrap gap-4 items-center">
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-300">Theme:</label>
                            <select
                                value={editorTheme}
                                onChange={(e) => setEditorTheme(e.target.value)}
                                className="bg-gray-700 text-white rounded-md p-1 text-sm"
                            >
                                {editorThemes.map(theme => (
                                    <option key={theme.id} value={theme.id}>{theme.name}</option>
                                ))}
                                <option value="github-dark">GitHub Dark</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-300">Font Size:</label>
                            <select
                                value={fontSize}
                                onChange={(e) => setFontSize(parseInt(e.target.value))}
                                className="bg-gray-700 text-white rounded-md p-1 text-sm"
                            >
                                {fontSizeOptions.map(size => (
                                    <option key={size} value={size}>{size}px</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-300">Word Wrap:</label>
                            <select
                                value={wordWrap}
                                onChange={(e) => setWordWrap(e.target.value as 'on' | 'off')}
                                className="bg-gray-700 text-white rounded-md p-1 text-sm"
                            >
                                <option value="on">On</option>
                                <option value="off">Off</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-300">Minimap:</label>
                            <input
                                type="checkbox"
                                checked={showMinimap}
                                onChange={(e) => setShowMinimap(e.target.checked)}
                                className="rounded-md"
                            />
                        </div>

                        <div className="border-l border-gray-600 pl-4 flex gap-2">

                            <button
                                onClick={handleFindReplace}
                                className="bg-gray-700 text-gray-200 hover:bg-gray-600 px-2 py-1 rounded-md text-sm flex items-center gap-1"
                            >
                                <span>🔍</span> Find
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Main content area with fixed height */}
            <div className="flex flex-grow w-full" style={{ height: 'calc(100% - 48px)' }}>
                {/* Editor Panel */}
                {activeTab === 'editor' && (
                    <div className="flex flex-grow h-full">
                        <div className="bg-gray-800 h-full overflow-hidden w-full">
                            {currentFile ? (
                                <Editor
                                    key={editorKey}
                                    height="100%"
                                    width="100%"
                                    theme={editorTheme}
                                    language={getLanguageFromFilename(currentFile)}
                                    value={getCurrentFileContents()}
                                    onChange={handleInput}
                                    onMount={handleEditorDidMount}
                                    options={{
                                        autoClosingBrackets: "always",
                                        autoClosingQuotes: "always",
                                        suggestOnTriggerCharacters: true,
                                        snippetSuggestions: "inline",
                                        tabCompletion: "on",
                                        minimap: {
                                            enabled: showMinimap,
                                            maxColumn: 60,
                                            scale: 3
                                        },
                                        fontSize: fontSize,
                                        fontFamily: "'Fira Code', Consolas, 'Courier New', monospace",
                                        fontLigatures: true,
                                        lineNumbers: "on",
                                        scrollBeyondLastLine: false,
                                        wordWrap: wordWrap,
                                        automaticLayout: true,
                                        tabSize: 2,
                                        scrollbar: {
                                            verticalScrollbarSize: 8,
                                            horizontalScrollbarSize: 8
                                        },
                                        bracketPairColorization: {
                                            enabled: true
                                        },
                                        guides: {
                                            bracketPairs: true,
                                            indentation: true,
                                        },
                                        // snippets: {
                                        //     always: true
                                        // },
                                        inlineSuggest: {
                                            enabled: true
                                        },
                                        suggest: {
                                            filterGraceful: true,
                                            showIcons: true,
                                            showFiles: true,
                                            preview: true
                                        },
                                        formatOnPaste: true,
                                        formatOnType: true,
                                        autoClosingDelete: 'always',
                                        autoIndent: 'full',
                                        autoSurround: 'languageDefined',
                                        renderWhitespace: 'selection',
                                        renderControlCharacters: true,
                                        linkedEditing: true,
                                        mouseWheelZoom: true,
                                        parameterHints: {
                                            enabled: true,
                                            cycle: true
                                        },
                                        cursorSmoothCaretAnimation: 'on',
                                        cursorBlinking: 'smooth',
                                        accessibilitySupport: 'auto',
                                        quickSuggestions: {
                                            other: true,
                                            comments: true,
                                            strings: true
                                        },
                                        acceptSuggestionOnCommitCharacter: true,
                                        acceptSuggestionOnEnter: 'on',
                                        smoothScrolling: true,
                                        colorDecorators: true
                                    }}
                                />
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-500 p-4">
                                    Select a file to edit
                                </div>
                            )}
                        </div>

                        {/* Resizer */}
                        {/* <div
                            className="cursor-col-resize w-1 bg-gray-600 hover:bg-blue-500 active:bg-blue-600 transition-colors"
                            onMouseDown={startResizing}
                        ></div> */}

                        {/* Empty space when no file is selected */}
                        {/* <div className="bg-gray-900 h-full" style={{ width: `${100 - leftPanelWidth}%` }}>
                            <div className="h-full flex items-center justify-center text-gray-500">
                                {currentFile ? "Editor view" : "Select a file to edit"}
                            </div>
                        </div> */}
                    </div>
                )}

                {/* Preview Panel */}
                {activeTab === 'preview' && (
                    <div className="flex-grow h-full bg-gray-900">
                        {iframeUrl ? (<>

                            <div className="p-2 bg-gray-800 text-gray-300 text-sm flex justify-around">
                                <input type="text"
                                    onChange={(e) => setIframeUrl(e.target.value)}
                                    value={iframeUrl}
                                    className="w-full h-10 px-4 p-2 text-lg text-gray-400 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <a
                                    href={iframeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline hover:text-white"
                                >
                                    Open in new tab
                                </a>
                            </div>
                            <iframe src={iframeUrl} className="w-full h-full border-none bg-white" />
                        </>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500">
                                Run the project to see the preview
                            </div>
                        )}
                    </div>
                )}

                {/* Logs Panel */}
                {activeTab === 'logs' && (
                    <div className="flex flex-col h-full w-full">
                        <div className="flex items-center bg-gray-800 p-2 border-b border-gray-700">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setLogType('install')}
                                    className={`px-3 py-1 text-sm rounded-md transition-colors
                                        ${logType === 'install' ? 'bg-blue-500 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                                >
                                    Installation Logs
                                    {installLogs.length > 0 && (
                                        <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-700 rounded-full">
                                            {installLogs.length}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => setLogType('server')}
                                    className={`px-3 py-1 text-sm rounded-md transition-colors
                                        ${logType === 'server' ? 'bg-blue-500 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                                >
                                    Server Logs
                                    {serverLogs.length > 0 && (
                                        <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-700 rounded-full">
                                            {serverLogs.length}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 bg-gray-900 overflow-auto">
                            <div className="h-full overflow-auto p-4 font-mono text-sm text-gray-300">
                                {getCurrentLogs().map((line, i) => (
                                    <div key={i} className="whitespace-pre-wrap mb-1">
                                        {line.startsWith('❌ Error:') ? (
                                            <span className="text-red-400">{line}</span>
                                        ) : line.startsWith('✅') ? (
                                            <span className="text-green-400">{line}</span>
                                        ) : line.startsWith('📁') || line.startsWith('📦') || line.startsWith('🔄') || line.startsWith('🚀') || line.startsWith('✨') ? (
                                            <span className="text-blue-400">{line}</span>
                                        ) : (
                                            line
                                        )}
                                    </div>
                                ))}
                                {isRunning && logType === 'install' && (
                                    <div className="animate-pulse text-blue-400">Installation in progress...</div>
                                )}
                                {isRunning && logType === 'server' && (
                                    <div className="animate-pulse text-blue-400">Server starting...</div>
                                )}
                                {getCurrentLogs().length === 0 && !isRunning && (
                                    <div className="text-gray-500">No {logType} logs available</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CodeEditor;
