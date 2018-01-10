import * as React from "react";

export default class ChatComposer extends React.Component {
    constructor(props) {
        super(props);
        this.state = { inputValue: "" };
    }

    render() {
       return <textarea
           className="ChatWidget-composerInput"
           placeholder={this.props.placeholder}
           value={this.state.inputValue}
           onChange={this.handleInputChange.bind(this)}
           onKeyDown={this.handleInputKeyDown.bind(this)}
        />;
    }

    handleInputChange(event) {
        this.setState({ inputValue: event.target.value });
    }

    handleInputKeyDown(event) {
        if (event.key === "Enter") {
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
        }
    }
}