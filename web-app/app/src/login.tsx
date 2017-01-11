import * as React from "react";
import { connect } from "react-redux";
import { InjectedRouter } from "react-router";
import { bindActionCreators, Dispatch } from "redux";
import * as ReactGoogleLogin from "react-google-login";
import GoogleLogin from "react-google-login";

import { config } from "./config";
import { loginAction } from "./actions";
import { getSlackAuthUrl } from "./services";
import { IAppState } from "./state";

// props from redux state
interface IStateProps {
    googleToken?: string;
    slackToken?: string;
}

// props given to component
interface IOwnProps {}

// dispatch functions
interface IDispatchProps {
    login: (accessToken: string) => void;
}

interface IRouterContext {
    router: InjectedRouter;
}

export interface ILoginProps extends IStateProps, IOwnProps, IDispatchProps {}

interface ILoginState {
    loginErrors?: string;
    googleLogin?: boolean;
}

class UnconnectedLogin extends React.Component<ILoginProps, ILoginState> {
    public state: ILoginState = {
        loginErrors: undefined,
    };

    public context: IRouterContext;
    static contextTypes = {
        router: React.PropTypes.object.isRequired,
    };

    public componentDidMount() {
        const canvas = document.getElementById("poofytoo") as HTMLCanvasElement;
        let context = canvas.getContext("2d");
        let elapsedTime = 0, w = 0, h = 0, cx = 0, cy = 0;
        let d = Date.now()

        window.addEventListener("resize", resizeCanvas, false);

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            drawBackground(); 
        }

        resizeCanvas();

        function drawDiamond(ox: number, oy: number, w: number, h: number, c: string) {
            w = w || 100;
            h = h || 200;
            context.beginPath();
            context.moveTo(ox, oy);
            context.lineTo(ox+w/2, oy+h/2);
            context.lineTo(ox, oy+h);
            context.lineTo(ox-w/2, oy+h/2);
            context.closePath();
            context.lineWidth = 0;
            context.fillStyle = c;
            context.fill();
        }

        function drawBackground() {
            var DIA_WIDTH = 100
            var DIA_HEIGHT = 190
            var rA = 254, rB = 210
            var gA = 255, gB = 220
            var bA = 255, bB = 205

            w = canvas.width;
            h = canvas.height;
            cx = Math.ceil(w/DIA_WIDTH)+1
            cy = Math.ceil(h/(DIA_HEIGHT/2))+1
            var rOffset = 0, gOffset = 0, bOffset = 0;

            for (let j = 0; j < cy; ++j) {
                for (let i = 0; i < cx; ++i) {
                rOffset = Math.round(((rB - rA) / cx) * i) + Math.floor(Math.sin(elapsedTime-i*0.8)*20)
                gOffset = Math.round(((gB - gA) / cy) * j) 
                bOffset = Math.round(((bB - bA) / cx) * j)
                drawDiamond(
                    i*DIA_WIDTH+(j%2)*(DIA_WIDTH/2), 
                    j*(DIA_HEIGHT/2)-DIA_HEIGHT/2,
                    DIA_WIDTH+1,
                    DIA_HEIGHT+1,
                    "rgb(" + (rA + rOffset) + ", " + (gA + gOffset) + ", " + (bA + bOffset) + ")")
                }
            }
        }

        function animateBackground() {
            elapsedTime = (Date.now() - d) / 1000;
            drawBackground();
        }

        window.setInterval(animateBackground,80);
    }

    public componentDidUpdate(oldProps: ILoginProps) {
        if (oldProps.googleToken === undefined && this.props.googleToken !== undefined) {
            if (oldProps.slackToken === undefined && this.props.slackToken !== undefined) {
                this.context.router.push("/admin");
            } else {
                console.log("here");
                (window as any).location = getSlackAuthUrl();
            }
        }
    }

    public render() {
        const random = Math.floor(Math.random() * 8);
        return (
            <div className="login">
                <div className="login-container">
                    <div className={`login-image person-${random}`} />
                    <div className="login-title">
                        super team awesomeboard
                    </div>
                    <div className="login-subtitle">
                        let"s have some mystery hunt fun
                    </div>
                    <GoogleLogin
                        clientId={config.google.clientId}
                        onSuccess={this.handleLogin}
                        onFailure={this.handleLoginFailure}
                    />
                </div>
                <canvas id="poofytoo"></canvas>
            </div>
        )
    }

    private handleLogin = (response: ReactGoogleLogin.GoogleLoginResponse) => {
        const { login } = this.props;
        login(response.getAuthResponse().access_token);
    }

    private handleLoginFailure = (error: Error) => {
        this.setState({ loginErrors: error.message });
    }
}

function mapStateToProps(state: IAppState, _props: IOwnProps): IStateProps {
    const { auth } = state;
    return {
        googleToken: auth.googleToken,
        slackToken: auth.slackToken,
    };
}

function mapDispatchToProps(dispatch: Dispatch<IAppState>): IDispatchProps {
    return bindActionCreators({
        login: loginAction,
    }, dispatch);
}

export const Login = connect(mapStateToProps, mapDispatchToProps)(UnconnectedLogin);