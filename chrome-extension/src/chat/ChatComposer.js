import * as React from "react";

export default class ChatComposer extends React.Component {
    constructor(props) {
        super(props);
        this.state = { inputValue: "" };
        this.inputRef = React.createRef();
    }

    focus() {
        if (this.inputRef.current) {
            this.inputRef.current.focus();
        }
    }

    render() {
       return <textarea
           ref={this.inputRef}
           className="ChatWidget-composerInput"
           placeholder={this.props.placeholder}
           value={this.state.inputValue}
           onChange={this.handleChange.bind(this)}
           onBlur={this.props.onBlur}
           onFocus={this.props.onFocus}
           onKeyDown={this.handleKeyDown.bind(this)}
           onPaste={this.handlePaste.bind(this)}
        />;
    }

    handleChange(event) {
        this.setState({ inputValue: event.target.value });
    }

    handleKeyDown(event) {
        if (event.key === "Escape") {
            chrome.runtime.sendMessage({
                msg: "closeChatWidget"
            });
        } else if (event.key === "Enter") {
            if (event.shiftKey) {
                // multi-line message! go right ahead.
                return;
            }
            const inputValue = this.state.inputValue;
            this.setState({ inputValue: "" });

            const message = inputValue
                .replace(/#([a-z0-9-]+)/g, (match, channelName) => {
                    const channels = this.props.connectionInfo.channels
                        .filter(channel => channel.name === channelName);

                    return channels.length > 0
                        ? `<#${channels[0].id}|${channels[0].name}>`
                        : match;
                })
                .replace(/@([a-z0-9-._]+)/g, (match, userName) => {
                    if (userName === "here" || userName === "channel") {
                        return `<!${userName}>`;
                    }
                    const users = this.props.connectionInfo.users
                        .filter(user => user.name === userName);

                    return users.length > 0
                        ? `<@${users[0].id}>`
                        : match;
                });

            this.props.onNewMessage(message);
            event.preventDefault();
        } else {
            chrome.runtime.sendMessage({
                msg: "userTyping",
                channel: this.props.channel.id
            });
        }
    }

    handlePaste(event) {
        if (!event.clipboardData || !event.clipboardData.items) {
            return;
        }
        const clipboardItems = event.clipboardData.items;
        for (let i = 0; i < clipboardItems.length; i++) {
            const item = clipboardItems[i];
            if (item.type.indexOf("image") !== -1) {
                const file = item.getAsFile();
                if (file !== null) {
                    this.props.onNewFileUpload(file);
                    xhrPostFormData("https://slack.com/api/files.upload", {
                        token: this.props.connectionInfo.accessToken,
                        channels: this.props.channel.id,
                        file,
                    }, (response) => {
                        this.props.onFileUploadComplete();
                    });
                    event.preventDefault();
                }
            }
        }
    }
}

function xhrPostFormData(url, args, callback) {
    const formData = new FormData();
    for (name in args) {
        formData.append(name, args[name])
    }
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = handleReadyStateChange;
    xhr.open("POST", url, /*async=*/true);
    xhr.send(formData);

    function handleReadyStateChange() {
        if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
            if (callback) {
                callback(JSON.parse(xhr.responseText));
            }
        }
    }
}