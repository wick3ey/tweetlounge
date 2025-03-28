
import Navbar from "@/components/layout/Navbar";
import SignupForm from "@/components/auth/SignupForm";

const Signup = () => {
  return (
    <div className="min-h-screen bg-background bg-mesh-gradient">
      <Navbar />
      <div className="container mx-auto py-12">
        <div className="max-w-md mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-display font-bold mb-2 gradient-text">Join TweetLounge</h1>
            <p className="text-muted-foreground">Create your account to get started</p>
          </div>
          <div className="glass-card p-8">
            <SignupForm />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
