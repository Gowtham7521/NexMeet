import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const withAuth = (WrappedComponent) => {
    const AuthComponent = (props) => {
        const router = useNavigate();
        // Bug #30 fixed: was rendering the page then redirecting → brief flash of protected content
        const [isChecking, setIsChecking] = useState(true);

        useEffect(() => {
            if (!localStorage.getItem("token")) {
                router("/auth");
            } else {
                setIsChecking(false);
            }
        }, []);

        if (isChecking) return null;
        return <WrappedComponent {...props} />;
    };

    return AuthComponent;
};

export default withAuth;
