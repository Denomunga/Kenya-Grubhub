import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Briefcase, MapPin, Clock, DollarSign } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface JobPosting {
  _id: string;
  jobId: string;
  title: string;
  department: string;
  location: string;
  employmentType: 'full_time' | 'part_time' | 'contract' | 'intern';
  salaryRange: {
    min: number;
    max: number;
    currency: string;
  };
  status: string;
  closingDate: string;
}

export default function JobAdvertBanner() {
  const [, setLocation] = useLocation();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [dismissedJobs, setDismissedJobs] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('dismissedJobAds');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOpenJobs();
  }, []);

  useEffect(() => {
    localStorage.setItem('dismissedJobAds', JSON.stringify([...dismissedJobs]));
  }, [dismissedJobs]);

  const fetchOpenJobs = async () => {
    try {
      const res = await apiFetch('/api/v1/hr/jobs?status=open&page=1&limit=10');
      if (res.ok) {
        const data = await res.json();
        setJobs(data.data?.jobs || []);
      }
    } catch (error) {
      console.error('Failed to fetch job postings:', error);
    } finally {
      setLoading(false);
    }
  };

  const visibleJobs = jobs.filter(job => !dismissedJobs.has(job._id));

  const handleDismiss = (jobId: string) => {
    setDismissedJobs(prev => new Set([...prev, jobId]));
    if (currentIndex >= visibleJobs.length - 1) {
      setCurrentIndex(Math.max(0, visibleJobs.length - 2));
    }
    if (visibleJobs.length <= 1) {
      setIsVisible(false);
    }
  };

  const handleApply = () => {
    setLocation('/jobs');
  };

  const nextJob = () => {
    setCurrentIndex((prev) => (prev + 1) % visibleJobs.length);
  };

  const prevJob = () => {
    setCurrentIndex((prev) => (prev - 1 + visibleJobs.length) % visibleJobs.length);
  };

  if (loading || !isVisible || visibleJobs.length === 0) {
    return null;
  }

  const currentJob = visibleJobs[currentIndex];
  if (!currentJob) return null;

  const formatSalary = (min: number, max: number, currency: string) => {
    const curr = currency || 'KES';
    if (min && max) {
      return `${curr} ${min.toLocaleString()} - ${max.toLocaleString()}`;
    }
    return curr === 'KES' ? 'Competitive' : `${curr} Competitive`;
  };

  const getEmploymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      full_time: 'Full Time',
      part_time: 'Part Time',
      contract: 'Contract',
      intern: 'Internship',
    };
    return labels[type] || type;
  };

  const daysUntilClosing = () => {
    const closing = new Date(currentJob.closingDate);
    const now = new Date();
    const diff = Math.ceil((closing.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const daysLeft = daysUntilClosing();

  return (
    <div className="w-full bg-linear-to-r from-blue-600 via-purple-600 to-pink-500 text-white shadow-lg animate-in slide-in-from-top duration-500">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left side - Job info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Briefcase className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide opacity-90">We're Hiring!</span>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs">
                {getEmploymentTypeLabel(currentJob.employmentType)}
              </Badge>
            </div>
            
            <h3 className="text-lg font-bold truncate">{currentJob.title}</h3>
            
            <div className="flex flex-wrap items-center gap-3 text-sm opacity-90">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {currentJob.location}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {formatSalary(currentJob.salaryRange.min, currentJob.salaryRange.max, currentJob.salaryRange.currency)}
              </span>
              {daysLeft > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                </span>
              )}
            </div>
          </div>

          {/* Center - Navigation dots */}
          {visibleJobs.length > 1 && (
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={prevJob}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                aria-label="Previous job"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="flex gap-1.5">
                {visibleJobs.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentIndex ? 'w-4 bg-white' : 'w-2 bg-white/50 hover:bg-white/70'
                    }`}
                    aria-label={`Go to job ${idx + 1}`}
                  />
                ))}
              </div>
              
              <button
                onClick={nextJob}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                aria-label="Next job"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-white text-purple-600 hover:bg-gray-100 font-semibold"
              onClick={handleApply}
            >
              Apply Now
            </Button>
            
            <button
              onClick={() => handleDismiss(currentJob._id)}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Dismiss this job ad"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile navigation */}
        {visibleJobs.length > 1 && (
          <div className="sm:hidden flex justify-center gap-1.5 mt-2">
            {visibleJobs.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentIndex ? 'w-3 bg-white' : 'w-1.5 bg-white/50'
                }`}
                aria-label={`Go to job ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
