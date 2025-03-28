
import Navbar from "@/components/layout/Navbar";
import LoginForm from "@/components/auth/LoginForm";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const Login = () => {
  return (
    <div className="min-h-screen bg-background bg-mesh-gradient">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Navbar />
      <div className="container mx-auto py-12">
        <div className="max-w-md mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-display font-bold mb-2 gradient-text">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in to continue to TweetLounge</p>
          </div>
          <div className="glass-card p-8">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
