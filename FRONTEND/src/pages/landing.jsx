import React from 'react';
import "../App.css";
import { Link, useNavigate } from 'react-router-dom';

export default function LandingPage() {

    const router = useNavigate();

    // Bug #16 fixed: was hardcoded "/aljk23" — generates a random guest room code instead
    const joinAsGuest = () => {
        const guestCode = Math.random().toString(36).substring(2, 9);
        router(`/${guestCode}`);
    };

    return (
        <div className='landingPageContainer'>
            <nav>
                <div className='navHeader'>
                    {/* Bug #17 fixed: was "Apna Video Call" (tutorial branding) */}
                    <h2>NexMeet</h2>
                </div>
                <div className='navlist'>
                    <p onClick={joinAsGuest}>Join as Guest</p>
                    <p onClick={() => { router("/auth"); }}>Register</p>
                    <div onClick={() => { router("/auth"); }} role='button'>
                        <p>Login</p>
                    </div>
                </div>
            </nav>

            <div className="landingMainContainer">
                <div>
                    <h1><span style={{ color: "#FF9839" }}>Connect</span> with your loved Ones</h1>
                    <p>Cover a distance by NexMeet</p>
                    <div role='button'>
                        <Link to={"/auth"}>Get Started</Link>
                    </div>
                </div>
                <div>
                    <img src="/mobile.png" alt="" />
                </div>
            </div>
        </div>
    );
}
