import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Citrus, Mail, Phone, Apple } from "lucide-react";

const Auth = () => {
  const [isSignIn, setIsSignIn] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkAuth();
  }, [navigate]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      if (isSignIn) {
        // For sign in, we need both email and password
        if (!password) {
          toast({
            title: "Password Required",
            description: "Please enter your password to continue.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast({
            title: "Sign In Error",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Welcome back!",
            description: "You've been signed in successfully.",
          });
          navigate("/");
        }
      } else {
        // For sign up
        const redirectUrl = `${window.location.origin}/`;
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl
          }
        });

        if (error) {
          toast({
            title: "Sign Up Error",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Check your email",
            description: "We've sent you a confirmation link to complete your sign up.",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-6">
        <div>
          <Citrus className="w-8 h-8 text-yellow-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Kickisfood</h1>
          <p className="text-sm text-muted-foreground">Recipe Manager</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Welcome Message */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">
              {isSignIn ? "Welcome back" : "Create your account"}
            </h1>
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4 mb-6">
            <div>
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                required
                disabled={isLoading}
              />
            </div>
            
            {isSignIn && (
              <div>
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  required
                  disabled={isLoading}
                />
              </div>
            )}

            {!isSignIn && (
              <div>
                <Input
                  type="password"
                  placeholder="Create password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  required
                  minLength={6}
                  disabled={isLoading}
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full h-12 bg-black hover:bg-gray-800 text-white rounded-lg font-medium"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isSignIn ? "Signing in..." : "Creating account..."}
                </div>
              ) : (
                "Continue"
              )}
            </Button>
          </form>

          {/* Toggle Sign In/Up */}
          <div className="text-center mb-6">
            <span className="text-gray-600">
              {isSignIn ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              onClick={() => {
                setIsSignIn(!isSignIn);
                setPassword("");
              }}
              className="text-blue-600 hover:underline font-medium"
            >
              {isSignIn ? "Sign up" : "Sign in"}
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">OR</span>
            </div>
          </div>

          {/* Social Login Options */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-12 border border-gray-300 hover:bg-gray-50 justify-start gap-3"
              disabled={isLoading}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              Continue with Google
            </Button>

            <Button
              variant="outline"
              className="w-full h-12 border border-gray-300 hover:bg-gray-50 justify-start gap-3"
              disabled={isLoading}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path fill="#00BCF2" d="M0 0h11.377v11.372H0z"/>
                  <path fill="#00BCF2" d="M11.377 0H24v11.372H11.377z"/>
                  <path fill="#00BCF2" d="M0 11.372h11.377V24H0z"/>
                  <path fill="#FFC107" d="M11.377 11.372H24V24H11.377z"/>
                </svg>
              </div>
              Continue with Microsoft Account
            </Button>

            <Button
              variant="outline"
              className="w-full h-12 border border-gray-300 hover:bg-gray-50 justify-start gap-3"
              disabled={isLoading}
            >
              <Apple className="w-5 h-5" />
              Continue with Apple
            </Button>

            <Button
              variant="outline"
              className="w-full h-12 border border-gray-300 hover:bg-gray-50 justify-start gap-3"
              disabled={isLoading}
            >
              <Phone className="w-5 h-5" />
              Continue with phone
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 text-center">
        <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
          <a href="#" className="hover:underline">Terms of Use</a>
          <span>|</span>
          <a href="#" className="hover:underline">Privacy Policy</a>
        </div>
      </div>
    </div>
  );
};

export default Auth;