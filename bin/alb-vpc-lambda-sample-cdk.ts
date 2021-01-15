#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AlbVpcLambdaSampleCdkStack } from '../lib/alb-vpc-lambda-sample-cdk-stack';

const app = new cdk.App();
new AlbVpcLambdaSampleCdkStack(app, 'AlbVpcLambdaSampleCdkStack');
