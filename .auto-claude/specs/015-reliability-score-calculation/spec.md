# Reliability Score Calculation

Automated reliability scoring system that calculates worker scores (1-5 stars) based on attendance rate, punctuality rate, and average ratings from businesses. Uses weighted formula: 40% attendance, 30% punctuality, 30% ratings. Updates automatically after each completed job.

## Rationale
Reliability scores are the platform's key differentiator, addressing the no-show and inconsistent quality pain points. Scores provide businesses with confidence in worker dependability and incentivize workers to maintain high standards.

## User Stories
- As a business, I want to see worker reliability scores so that I can hire dependable workers
- As a worker, I want to earn a high score so that I can get more job opportunities
- As a worker, I want to understand my score calculation so that I can improve

## Acceptance Criteria
- [ ] Reliability scores are calculated automatically after each job
- [ ] Score formula: 40% attendance + 30% punctuality + 30% ratings
- [ ] Scores range from 1.0 to 5.0 stars
- [ ] Scores update in real-time
- [ ] Score calculation is transparent and auditable
- [ ] Workers need 5+ completed jobs to have a reliable score
- [ ] Score history is tracked for trend analysis
