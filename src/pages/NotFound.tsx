
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-twitter-extraExtraLight">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-twitter-blue">404</h1>
        <p className="text-2xl text-gray-700 mb-8">Oops! Page not found</p>
        <Button className="btn-twitter" onClick={() => navigate("/")}>
          Return to Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
