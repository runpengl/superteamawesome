import * as React from "react";

export default class PopupLogin extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isSigningIn: false
        };
    }

    componentDidMount() {
        var me = this;
        var context = me.refs.canvas.getContext("2d");
        var w = 0, h = 0, cx = 0, cy = 0;
        var d = Date.now();
        window.addEventListener("resize", resizeCanvas);
        function resizeCanvas() {
            if (me.refs.canvas) {
                me.refs.canvas.width = window.innerWidth;
                me.refs.canvas.height = window.innerHeight;
            } else {
                window.removeEventListener("resize", resizeCanvas);
            }
        }
        resizeCanvas();
        function drawDiamond(ox, oy, w, h, c) {
            w = w || 100;
            h = h || 200;
            context.beginPath();
            context.moveTo(ox, oy);
            context.lineTo(ox + w / 2, oy + h / 2);
            context.lineTo(ox, oy + h);
            context.lineTo(ox - w / 2, oy + h / 2);
            context.closePath();
            context.lineWidth = 0;
            context.fillStyle = c;
            context.fill();
        }
        function drawBackground(elapsedTime) {
            if (!me.refs.canvas) {
                return;
            }
            var DIA_WIDTH = 100;
            var DIA_HEIGHT = 190;
            var rA = 254, rB = 210;
            var gA = 255, gB = 220;
            var bA = 255, bB = 205;
            w = me.refs.canvas.width;
            h = me.refs.canvas.height;
            cx = Math.ceil(w / DIA_WIDTH) + 1;
            cy = Math.ceil(h / (DIA_HEIGHT / 2)) + 1;
            var rOffset = 0, gOffset = 0, bOffset = 0;
            for (var j = 0; j < cy; ++j) {
                for (var i = 0; i < cx; ++i) {
                    rOffset = Math.round(((rB - rA) / cx) * i) + Math.floor(Math.sin(elapsedTime/1000 - i * 0.8) * 20);
                    gOffset = Math.round(((gB - gA) / cy) * j);
                    bOffset = Math.round(((bB - bA) / cx) * j);
                    drawDiamond(i * DIA_WIDTH + (j % 2) * (DIA_WIDTH / 2), j * (DIA_HEIGHT / 2) - DIA_HEIGHT / 2, DIA_WIDTH + 1, DIA_HEIGHT + 1, "rgb(" + (rA + rOffset) + ", " + (gA + gOffset) + ", " + (bA + bOffset) + ")");
                }
            }
            window.requestAnimationFrame(drawBackground);
        }
        drawBackground(0);
    }

    componentWillReceiveProps() {
        this.setState({ isSigningIn: false });
    }

    render() {
        var me = this;
        return <div className="PopupLogin">
            <canvas ref="canvas" className="PopupLogin-background" />
            <div
                className="PopupLogin-image"
                style={{
                    backgroundPosition: -(Math.floor(Math.random() * 8) * 200) + "px"
                }}
            />
            <div className="PopupLogin-title">
                super team awesome toolbar
            </div>
            {this.state.isSigningIn
                ? <img className="PopupLogin-loading" src="../ripple.svg" />
                : <div
                    className="PopupLogin-button"
                    onClick={function() {
                        chrome.runtime.sendMessage({ msg: "signIn" });
                        me.setState({ isSigningIn: true });
                    }}
                >Sign in with Google</div>}
        </div>;
    }
}
