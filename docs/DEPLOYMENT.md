# AIRGUARD Deployment Guide

## Prerequisites

- AWS Account with appropriate permissions
- Docker installed
- AWS CLI configured
- Node.js 18+ and Python 3.11+
- Domain name (optional, for custom domain)

## Local Development

### 1. Clone and Configure
```bash
git clone <repository-url>
cd AERION
cp .env.example .env
```

### 2. Configure Environment
Edit `.env` with your API keys and configuration.

### 3. Start with Docker Compose
```bash
docker-compose up -d
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

## AWS Production Deployment

### Step 1: Provision Infrastructure

```bash
cd infrastructure

# Create CloudFormation stack
aws cloudformation create-stack \
  --stack-name airguard-production \
  --template-body file://cloudformation/main.yml \
  --parameters \
    ParameterKey=Environment,ParameterValue=production \
    ParameterKey=DBUsername,ParameterValue=airguard \
    ParameterKey=DBPassword,ParameterValue=<secure-password> \
  --capabilities CAPABILITY_IAM

# Wait for stack creation
aws cloudformation wait stack-create-complete \
  --stack-name airguard-production
```

### Step 2: Get Infrastructure Outputs

```bash
aws cloudformation describe-stacks \
  --stack-name airguard-production \
  --query 'Stacks[0].Outputs'
```

Note the following values:
- RDS Endpoint
- S3 Bucket Name
- Cognito User Pool ID
- Cognito Client ID
- ECS Cluster Name

### Step 3: Configure Secrets

Store sensitive data in AWS Secrets Manager:

```bash
aws secretsmanager create-secret \
  --name airguard/production \
  --secret-string '{
    "database_url": "postgresql://user:pass@rds-endpoint:5432/airguard",
    "openaq_api_key": "your-key",
    "nasa_firms_api_key": "your-key",
    "mapbox_token": "your-token",
    "openai_api_key": "your-key",
    "jwt_secret": "your-secret"
  }'
```

### Step 4: Build and Push Docker Images

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Create ECR repositories
aws ecr create-repository --repository-name airguard/backend
aws ecr create-repository --repository-name airguard/frontend

# Build and push backend
cd backend
docker build -t airguard-backend .
docker tag airguard-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/airguard/backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/airguard/backend:latest

# Build and push frontend
cd ../frontend
docker build -t airguard-frontend .
docker tag airguard-frontend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/airguard/frontend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/airguard/frontend:latest
```

### Step 5: Create ECS Task Definitions

```bash
# Backend task definition
aws ecs register-task-definition \
  --cli-input-json file://infrastructure/ecs/backend-task-def.json

# Worker task definition
aws ecs register-task-definition \
  --cli-input-json file://infrastructure/ecs/worker-task-def.json
```

### Step 6: Create ECS Services

```bash
# Backend service
aws ecs create-service \
  --cluster airguard-production-cluster \
  --service-name airguard-backend \
  --task-definition airguard-backend \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"

# Worker service
aws ecs create-service \
  --cluster airguard-production-cluster \
  --service-name airguard-worker \
  --task-definition airguard-worker \
  --desired-count 1 \
  --launch-type FARGATE
```

### Step 7: Deploy Frontend to Amplify

```bash
cd frontend

# Initialize Amplify
amplify init

# Configure environment
amplify env add production

# Deploy
amplify publish
```

### Step 8: Initialize Database

```bash
# Connect to RDS via bastion or VPN
psql -h <rds-endpoint> -U airguard -d airguard -f backend/database/init.sql
```

### Step 9: Train and Deploy ML Models

```bash
cd ml

# Train models
python scripts/train_model.py

# Upload to S3
aws s3 cp models/ s3://<bucket-name>/ml_models/ --recursive
```

## Monitoring Setup

### CloudWatch Alarms

```bash
# High error rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name airguard-high-error-rate \
  --alarm-description "Alert on high API error rate" \
  --metric-name Errors \
  --namespace AWS/ECS \
  --statistic Sum \
  --period 300 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold

# High response time alarm
aws cloudwatch put-metric-alarm \
  --alarm-name airguard-high-response-time \
  --alarm-description "Alert on high API response time" \
  --metric-name TargetResponseTime \
  --namespace AWS/ApplicationELB \
  --statistic Average \
  --period 300 \
  --threshold 1.0 \
  --comparison-operator GreaterThanThreshold
```

## Continuous Deployment

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Login to ECR
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
      
      - name: Build and push
        run: |
          cd backend
          docker build -t $ECR_REGISTRY/airguard/backend:$GITHUB_SHA .
          docker push $ECR_REGISTRY/airguard/backend:$GITHUB_SHA
      
      - name: Update ECS service
        run: |
          aws ecs update-service --cluster airguard-production-cluster \
            --service airguard-backend --force-new-deployment
  
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Amplify
        run: |
          cd frontend
          amplify publish --yes
```

## Rollback Procedures

### ECS Rollback
```bash
# Rollback to previous task definition
aws ecs update-service \
  --cluster airguard-production-cluster \
  --service airguard-backend \
  --task-definition airguard-backend:previous-revision
```

### Database Rollback
```bash
# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier airguard-restored \
  --db-snapshot-identifier airguard-backup-2024-01-01
```

## Health Checks

### Backend Health
```bash
curl https://api.airguard.io/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "production",
  "database": "connected"
}
```

### Frontend Health
```bash
curl https://airguard.io
```

## Troubleshooting

### Backend Not Starting
1. Check ECS task logs in CloudWatch
2. Verify environment variables and secrets
3. Check security group rules
4. Verify RDS connectivity

### Database Connection Issues
1. Check security group allows traffic from ECS
2. Verify credentials in Secrets Manager
3. Check RDS instance status
4. Review VPC subnet configuration

### High Latency
1. Check CloudWatch metrics for bottlenecks
2. Review database query performance
3. Check Redis cache hit rate
4. Consider scaling ECS tasks

## Maintenance

### Database Backups
Automated daily backups are configured with 7-day retention.

Manual backup:
```bash
aws rds create-db-snapshot \
  --db-instance-identifier airguard-production \
  --db-snapshot-identifier airguard-manual-$(date +%Y%m%d)
```

### Log Rotation
CloudWatch logs have 30-day retention by default.

### Security Updates
Regularly update dependencies:
```bash
# Backend
cd backend
pip-review --auto

# Frontend
cd frontend
npm audit fix

# Rebuild and redeploy Docker images
```

## Cost Optimization

- Use FARGATE_SPOT for non-critical workloads
- Enable RDS storage autoscaling
- Configure S3 lifecycle policies
- Use CloudFront caching
- Monitor unused resources with AWS Cost Explorer
