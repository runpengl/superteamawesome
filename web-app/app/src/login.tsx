import * as React from "react";

export class Login extends React.Component<{}, {}> {
    public render() {
        const random = Math.floor(Math.random() * 8);
        return (
            <div className='login'>
                <div className='login-container'>
                    <div className={`login-image person-${random}`} />
                    <div className='login-title'>
                        super team awesomeboard
                    </div>
                    <div className='login-subtitle'>
                        let's have some mystery hunt fun
                    </div>
                    <a className='login-button' href='/auth/google'>
                        <span className="flaticon-google" />
                        <span className="text">Sign in with Google</span>
                    </a>
                </div>
                <canvas id='poofytoo'></canvas>
            </div>
        )
    }
}