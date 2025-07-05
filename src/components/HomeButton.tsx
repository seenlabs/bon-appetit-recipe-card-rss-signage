import React from 'react';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface HomeButtonProps {
  className?: string;
}

const HomeButton: React.FC<HomeButtonProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  
  return (
    <Button
      onClick={() => navigate('/')}
      variant="outline"
      size="sm"
      className={`fixed top-4 left-4 z-50 bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg ${className}`}
      title="Go to Home"
    >
      <Home size={16} />
    </Button>
  );
};

export default HomeButton; 