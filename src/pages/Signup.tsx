
import Navbar from "@/components/layout/Navbar";
import SignupForm from "@/components/auth/SignupForm";

const Signup = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-twitter-extraExtraLight">
      <Navbar />
      <div className="page-container py-12">
        <SignupForm />
      </div>
    </div>
  );
};

export default Signup;
