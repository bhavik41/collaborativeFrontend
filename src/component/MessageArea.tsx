import React, { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../App/store";
import Markdown from "markdown-to-jsx";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { sendMessage } from "../config/socket";

interface Message {
    sender: string;
    message: any;
}

interface MessageAreaProps {
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const MessageArea: React.FC<MessageAreaProps> = ({ messages, setMessages }) => {
    const [message, setMessage] = useState<string>("");
    const messageBoxRef = useRef<HTMLDivElement>(null);
    const { user } = useSelector((state: RootState) => state.auth);

    const handleSendMessage = () => {
        if (message.trim() && user) {
            const newMessage: Message = { sender: user.email, message };
            setMessages((prevMessages) => [...prevMessages, newMessage]);
            sendMessage("project-message", { message, sender: user.email });
            setMessage("");
        }
    };

    useEffect(() => {
        if (messageBoxRef.current) {
            messageBoxRef.current.scrollTop = messageBoxRef.current.scrollHeight;
        }
    }, [messages]);

    const renderMessageContent = (msg: Message) => {
        if (msg.sender === "AI") {
            const messageObject = JSON.parse(msg.message);
            return (
                <div className="overflow-auto bg-slate-950 text-white p-2 rounded-md">
                    <Markdown
                        options={{
                            overrides: {
                                code: {
                                    component: ({ children }) => (
                                        <SyntaxHighlighter language="javascript" style={oneDark}>
                                            {String(children).trim()}
                                        </SyntaxHighlighter>
                                    ),
                                },
                            },
                        }}
                    >
                        {messageObject.text || "No content provided."}
                    </Markdown>
                </div>
            );
        }
        return <span>{msg.message}</span>;
    };

    return (
        <div className="conversation-area h-[calc(100vh-56px)]  flex flex-col">
            <div
                ref={messageBoxRef}
                className="message-box p-1 flex flex-1 flex-col gap-1 overflow-y-scroll custom-scrollbar"
            >
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`message flex flex-col p-2 max-w-60 rounded-md ${msg.sender === user?.email
                            ? "bg-blue-500 text-white w-fit ml-auto"
                            : "bg-slate-50 w-fit"
                            }`}
                    >
                        <small className="opacity-65 text-xs">{msg.sender}</small>
                        <div className="text-sm">{renderMessageContent(msg)}</div>
                    </div>
                ))}
            </div>

            <div className="inputField w-full flex">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-grow p-2 px-4 border-none outline-none"
                    placeholder="Enter message"
                />
                <button onClick={handleSendMessage} className="px-5 bg-slate-950 text-white">
                    <i className="ri-send-plane-fill"></i>
                </button>
            </div>
        </div>
    );
};

export default MessageArea;
