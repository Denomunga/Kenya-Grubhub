import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Briefcase,
  MapPin,
  Calendar,
  DollarSign,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Building2,
  FileText,
  User,
  Award
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useHybridAuth } from '@/lib/hybrid-auth';

interface JobPosting {
  _id: string;
  jobId: string;
  title: string;
  department: string;
  location: string;
  employmentType: 'full_time' | 'part_time' | 'contract' | 'intern';
  description: string;
  requirements: string[];
  responsibilities: string[];
  salaryRange: {
    min: number;
    max: number;
    currency: string;
  };
  postedDate: string;
  closingDate: string;
  status: string;
}

interface JobApplication {
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  resumeUrl?: string;
  coverLetter?: string;
  experience: string;
  education: string;
  skills: string[];
  expectedSalary?: number;
  availabilityDate: string;
}

export default function JobApplicationPage() {
  const { user, isAuthenticated, loading: authLoading } = useHybridAuth();
  const [, setLocation] = useLocation();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<JobApplication>({
    applicantName: '',
    applicantEmail: '',
    applicantPhone: '',
    resumeUrl: '',
    coverLetter: '',
    experience: '',
    education: '',
    skills: [],
    expectedSalary: undefined,
    availabilityDate: new Date().toISOString().split('T')[0],
  });

  const [skillsInput, setSkillsInput] = useState('');

  useEffect(() => {
    fetchOpenJobs();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        applicantName: user.name || '',
        applicantEmail: user.email || '',
        applicantPhone: user.phone || '',
      }));
    }
  }, [user]);

  const fetchOpenJobs = async () => {
    try {
      const res = await apiFetch('/api/v1/hr/jobs?status=open&page=1&limit=50');
      if (res.ok) {
        const data = await res.json();
        setJobs(data.data?.jobs || []);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'expectedSalary' ? (value ? Number(value) : undefined) : value,
    }));
  };

  const handleSkillsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSkillsInput(e.target.value);
    const skillsArray = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, skills: skillsArray }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedJob) {
      setError('Please select a job to apply for');
      return;
    }

    if (!isAuthenticated) {
      setLocation('/login');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/v1/hr/jobs/${selectedJob._id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
      } else {
        setError(data.message || 'Failed to submit application');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

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

  const daysUntilClosing = (closingDate: string) => {
    const closing = new Date(closingDate);
    const now = new Date();
    const diff = Math.ceil((closing.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Application Submitted!</h2>
            <p className="text-muted-foreground mb-6">
              Thank you for applying. We will review your application and get back to you soon.
            </p>
            <Button onClick={() => setLocation('/')} className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <Button
            variant="ghost"
            className="text-primary-foreground hover:bg-primary-foreground/10 mb-4"
            onClick={() => setLocation('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <h1 className="text-3xl md:text-4xl font-bold">Career Opportunities</h1>
          <p className="text-primary-foreground/80 mt-2">Join our team and grow with us</p>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-8">
        {!isAuthenticated && !authLoading && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Login Required to Apply</h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    You can view job listings without logging in, but you'll need to{' '}
                    <Link href="/login" className="underline font-medium">
                      sign in
                    </Link>{' '}
                    to submit an application.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Job Listings */}
          <div>
            <h2 className="text-xl font-bold mb-4">Open Positions</h2>
            <div className="space-y-4">
              {jobs.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    <Briefcase className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No open positions at this time</p>
                  </CardContent>
                </Card>
              ) : (
                jobs.map((job) => {
                  const daysLeft = daysUntilClosing(job.closingDate);
                  const isSelected = selectedJob?._id === job._id;
                  
                  return (
                    <Card
                      key={job._id}
                      className={`cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedJob(job)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{job.title}</CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <Building2 className="h-3 w-3" />
                              {job.department}
                            </CardDescription>
                          </div>
                          <Badge variant="secondary">
                            {getEmploymentTypeLabel(job.employmentType)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {job.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatSalary(job.salaryRange.min, job.salaryRange.max, job.salaryRange.currency)}
                          </span>
                          {daysLeft > 0 && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {job.description}
                        </p>
                        {isSelected && (
                          <Badge className="mt-3 bg-primary text-primary-foreground">
                            Selected for Application
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          {/* Application Form */}
          <div>
            <h2 className="text-xl font-bold mb-4">
              {selectedJob ? `Apply for ${selectedJob.title}` : 'Application Form'}
            </h2>
            
            {!selectedJob ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Select a job listing to apply</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your Application</CardTitle>
                  <CardDescription>
                    Fill in your details below to apply for this position
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Personal Information */}
                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Personal Information
                      </h4>
                      
                      <div className="grid gap-3">
                        <div>
                          <Label htmlFor="applicantName">Full Name *</Label>
                          <Input
                            id="applicantName"
                            name="applicantName"
                            value={formData.applicantName}
                            onChange={handleInputChange}
                            required
                            disabled={!isAuthenticated}
                          />
                        </div>
                        
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="applicantEmail">Email *</Label>
                            <Input
                              id="applicantEmail"
                              name="applicantEmail"
                              type="email"
                              value={formData.applicantEmail}
                              onChange={handleInputChange}
                              required
                              disabled={!isAuthenticated}
                            />
                          </div>
                          <div>
                            <Label htmlFor="applicantPhone">Phone *</Label>
                            <Input
                              id="applicantPhone"
                              name="applicantPhone"
                              type="tel"
                              value={formData.applicantPhone}
                              onChange={handleInputChange}
                              required
                              disabled={!isAuthenticated}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Professional Information */}
                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Professional Details
                      </h4>
                      
                      <div className="grid gap-3">
                        <div>
                          <Label htmlFor="experience">Work Experience *</Label>
                          <Textarea
                            id="experience"
                            name="experience"
                            placeholder="Describe your relevant work experience..."
                            value={formData.experience}
                            onChange={handleInputChange}
                            required
                            rows={3}
                            disabled={!isAuthenticated}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="education">Education *</Label>
                          <Textarea
                            id="education"
                            name="education"
                            placeholder="Your educational background..."
                            value={formData.education}
                            onChange={handleInputChange}
                            required
                            rows={2}
                            disabled={!isAuthenticated}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="skills">Skills (comma-separated)</Label>
                          <Input
                            id="skills"
                            name="skills"
                            placeholder="e.g., JavaScript, React, Node.js"
                            value={skillsInput}
                            onChange={handleSkillsChange}
                            disabled={!isAuthenticated}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Additional Information */}
                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Additional Information
                      </h4>
                      
                      <div className="grid gap-3">
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="expectedSalary">Expected Salary (KES)</Label>
                            <Input
                              id="expectedSalary"
                              name="expectedSalary"
                              type="number"
                              placeholder="e.g., 50000"
                              value={formData.expectedSalary || ''}
                              onChange={handleInputChange}
                              disabled={!isAuthenticated}
                            />
                          </div>
                          <div>
                            <Label htmlFor="availabilityDate">Available From</Label>
                            <Input
                              id="availabilityDate"
                              name="availabilityDate"
                              type="date"
                              value={formData.availabilityDate}
                              onChange={handleInputChange}
                              required
                              disabled={!isAuthenticated}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="resumeUrl">Resume/CV URL</Label>
                          <Input
                            id="resumeUrl"
                            name="resumeUrl"
                            type="url"
                            placeholder="Link to your resume (Google Drive, Dropbox, etc.)"
                            value={formData.resumeUrl}
                            onChange={handleInputChange}
                            disabled={!isAuthenticated}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="coverLetter">Cover Letter</Label>
                          <Textarea
                            id="coverLetter"
                            name="coverLetter"
                            placeholder="Tell us why you're the right fit for this role..."
                            value={formData.coverLetter}
                            onChange={handleInputChange}
                            rows={4}
                            disabled={!isAuthenticated}
                          />
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={!isAuthenticated || submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : !isAuthenticated ? (
                        <>
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Login to Apply
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Submit Application
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
