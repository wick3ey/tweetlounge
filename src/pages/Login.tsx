
import Navbar from "@/components/layout/Navbar";
import LoginForm from "@/components/auth/LoginForm";

const Login = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-twitter-extraExtraLight">
      <Navbar />
      <div className="page-container py-12">
        <LoginForm />
      </div>
    </div>
  );
};

export default Login;
