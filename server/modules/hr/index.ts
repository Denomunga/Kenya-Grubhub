import router from './routes';
import {
  EmployeeService,
  JobPostingService,
  JobApplicationService,
  PayrollService
} from './service';

export {
  EmployeeService,
  JobPostingService,
  JobApplicationService,
  PayrollService
};

export const hrModule = {
  routes: router,
  services: {
    EmployeeService,
    JobPostingService,
    JobApplicationService,
    PayrollService
  }
};

export default hrModule;