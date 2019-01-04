import * as React from "react";
import GoogleLogin from "react-google-login";
import { connect } from "react-redux";
import { Redirect } from "react-router";
import { bindActionCreators, Dispatch } from "redux";

import { firebaseAuth, scopes } from "../auth";
import { config } from "../config";
import { loginAction } from "../store/actions/authActions";
import { IAppState } from "../store/state";

// props from redux state
interface IStateProps {
    googleToken?: string;
    slackToken?: string;
}

// dispatch functions
interface IDispatchProps {
    login: (accessToken: string) => void;
}

export interface ILoginProps extends IStateProps, IDispatchProps {}

interface ILoginState {
    loginErrors?: string;
    googleLogin?: boolean;
    showLogin?: boolean;
    isFirebaseLoaded: boolean;
}

class UnconnectedLogin extends React.Component<ILoginProps, ILoginState> {
    public state: ILoginState = {
        loginErrors: undefined,
        isFirebaseLoaded: false,
    };

    public componentDidMount() {
        firebaseAuth().onAuthStateChanged((user: firebase.UserInfo) => {
            this.setState({ showLogin: user == null, isFirebaseLoaded: true });
        });
    }

    public componentDidUpdate(_oldProps: ILoginProps, oldState: ILoginState) {
        if (this.state.showLogin && !oldState.showLogin) {
            const canvas = document.getElementById("poofytoo") as HTMLCanvasElement;
            const context = canvas.getContext("2d");
            let elapsedTime = 0;
            let w = 0;
            let h = 0;
            let cx = 0;
            let cy = 0;
            const d = Date.now();

            const drawDiamond = (ox: number, oy: number, width: number, height: number, c: string) => {
                w = width || 100;
                h = height || 200;
                context.beginPath();
                context.moveTo(ox, oy);
                context.lineTo(ox + w / 2, oy + h / 2);
                context.lineTo(ox, oy + h);
                context.lineTo(ox - w / 2, oy + h / 2);
                context.closePath();
                context.lineWidth = 0;
                context.fillStyle = c;
                context.fill();
            };

            const drawBackground = () => {
                const DIA_WIDTH = 100;
                const DIA_HEIGHT = 190;
                const rA = 254;
                const rB = 210;
                const gA = 255;
                const gB = 220;
                const bA = 255;
                const bB = 205;

                w = canvas.width;
                h = canvas.height;
                cx = Math.ceil(w / DIA_WIDTH) + 1;
                cy = Math.ceil(h / (DIA_HEIGHT / 2)) + 1;
                let rOffset = 0;
                let gOffset = 0;
                let bOffset = 0;

                for (let j = 0; j < cy; ++j) {
                    for (let i = 0; i < cx; ++i) {
                        rOffset = Math.round(((rB - rA) / cx) * i) + Math.floor(Math.sin(elapsedTime - i * 0.8) * 20);
                        gOffset = Math.round(((gB - gA) / cy) * j);
                        bOffset = Math.round(((bB - bA) / cx) * j);
                        drawDiamond(
                            i * DIA_WIDTH + (j % 2) * (DIA_WIDTH / 2),
                            j * (DIA_HEIGHT / 2) - DIA_HEIGHT / 2,
                            DIA_WIDTH + 1,
                            DIA_HEIGHT + 1,
                            "rgb(" + (rA + rOffset) + ", " + (gA + gOffset) + ", " + (bA + bOffset) + ")",
                        );
                    }
                }
            };

            const animateBackground = () => {
                elapsedTime = (Date.now() - d) / 1000;
                drawBackground();
            };

            const resizeCanvas = () => {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;

                drawBackground();
            };

            window.addEventListener("resize", resizeCanvas, false);

            resizeCanvas();

            window.setInterval(animateBackground, 80);
        }
    }

    public render() {
        const random = Math.floor(Math.random() * 8);
        if (this.state.isFirebaseLoaded && !this.state.showLogin) {
            return <Redirect to="/admin" />;
        }

        if (this.state.showLogin) {
            return (
                <div className="login">
                    <div className="login-container">
                        <div className={`login-image person-${random}`} />
                        <div className="login-title">super team awesomeboard</div>
                        <div className="login-subtitle">let's have some mystery hunt fun</div>
                        <GoogleLogin
                            clientId={config.google.clientId}
                            onSuccess={this.handleLogin}
                            onFailure={this.handleLoginFailure}
                            scope={scopes.join(" ")}
                        />
                    </div>
                    <canvas id="poofytoo" />
                </div>
            );
        } else {
            return null;
        }
    }

    private handleLogin = (response: any) => {
        const { login } = this.props;
        login(response.getAuthResponse().access_token);
    };

    private handleLoginFailure = (error: Error) => {
        this.setState({ loginErrors: error.message });
    };
}

function mapStateToProps(state: IAppState): IStateProps {
    const { auth } = state;
    return {
        googleToken: auth.googleToken,
        slackToken: auth.slackToken,
    };
}

function mapDispatchToProps(dispatch: Dispatch<IAppState>): IDispatchProps {
    return bindActionCreators(
        {
            login: loginAction,
        },
        dispatch,
    );
}

export const Login = connect(
    mapStateToProps,
    mapDispatchToProps,
)(UnconnectedLogin);
