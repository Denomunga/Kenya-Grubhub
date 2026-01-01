import { useAuth0 } from '@auth0/auth0-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UtensilsCrossed } from 'lucide-react';

export default function AuthPage() {
  const { loginWithRedirect, isLoading } = useAuth0();

  const handleLogin = () => {
    loginWithRedirect({
      authorizationParams: {
        screen_hint: 'signup', // Show signup by default, users can switch to login
      }
    });
  };

  const handleLoginOnly = () => {
    loginWithRedirect({
      authorizationParams: {
        screen_hint: 'login',
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-muted/30 px-4 particle-container gradient-mesh">
      <Card className="w-full max-w-md card-3d border-animated-gradient depth-layer-3 hover-lift liquid-transition-slow">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto bg-blue-600 p-3 rounded-full w-fit mb-2">
            <UtensilsCrossed className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-heading">WATHII</CardTitle>
          <CardDescription>
            Welcome to Kenya's Food Delivery Platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleLogin}
            className="w-full h-11"
            size="lg"
          >
            Create Account or Login
          </Button>
          
          <div className="text-center">
            <Button 
              variant="outline" 
              onClick={handleLoginOnly}
              className="text-sm"
            >
              Already have an account? Login
            </Button>
          </div>
          
          <div className="text-center text-xs text-muted-foreground">
            <p>Secure authentication powered by Auth0</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
