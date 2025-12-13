# AWS Migration Checklist

## Phase 1: Frontend (Vercel to Amplify)
- [ ] Amplify app created
- [ ] GitHub repo connected
- [ ] Build settings configured
- [ ] Custom domain set
- [ ] SSL certificate

## Phase 2: Database (Supabase to RDS)
- [ ] RDS instance created
- [ ] Security groups configured
- [ ] Schema exported
- [ ] Data migrated
- [ ] Connection string updated

## Phase 3: Backend (Vercel to Lambda)
- [ ] SST project initialized
- [ ] Lambda functions written
- [ ] API Gateway configured
- [ ] Environment variables set
- [ ] Local testing done

## Phase 4: CDN and Cache
- [ ] CloudFront distribution
- [ ] Cache policies
- [ ] ElastiCache Redis

## Phase 5: Monitoring
- [ ] CloudWatch logs
- [ ] Metrics dashboard
- [ ] Alarms configured
- [ ] X-Ray tracing

## Phase 6: Security
- [ ] IAM least privilege
- [ ] VPC configured
- [ ] Secrets Manager
- [ ] Encryption enabled

## Phase 7: CI/CD
- [ ] GitHub OIDC
- [ ] IAM role created
- [ ] Workflow written
- [ ] Staging deploy
- [ ] Production deploy
