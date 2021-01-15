import * as cdk from '@aws-cdk/core';
import { Vpc, SubnetType, SecurityGroup, Peer, Port } from '@aws-cdk/aws-ec2';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import { LambdaTarget } from '@aws-cdk/aws-elasticloadbalancingv2-targets';
import * as lambda from '@aws-cdk/aws-lambda';

export class AlbVpcLambdaSampleCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const prefix: string = this.node.tryGetContext('projectName');

    const vpc = new Vpc(this, 'Vpc', {
      cidr: '10.0.0.0/16',
      enableDnsHostnames: true,
      enableDnsSupport: true,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'PublicSubnet',
          subnetType: SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'PrivateSubnet',
          subnetType: SubnetType.PRIVATE,
        },
      ],
      natGateways: 2,
      maxAzs: 2,
    });

    const securityGroup = new SecurityGroup(this, 'SecurityGroup', {
      securityGroupName: `${prefix}-sg`,
      vpc,
    });
    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80));

    const alb = new elbv2.ApplicationLoadBalancer(this, 'Alb', {
      vpc,
      vpcSubnets: vpc.selectSubnets({ subnetGroupName: 'PublicSubnet' }),
      loadBalancerName: `${prefix}-alb`,
      internetFacing: true,
      securityGroup,
    });

    const helloWorldFunction = new lambda.Function(this, 'HelloWorldFunction', {
      code: lambda.Code.fromAsset('dist/hello-world'),
      functionName: `${prefix}-hello-world`,
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_12_X,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      vpc,
    });

    const HogeFugaPiyoFunction = new lambda.Function(
      this,
      'HogeFugaPiyoFunction',
      {
        code: lambda.Code.fromAsset('dist/hoge'),
        functionName: `${prefix}-hoge-fuga-piyo`,
        handler: 'index.handler',
        runtime: lambda.Runtime.NODEJS_12_X,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        vpc,
      }
    );

    // const albTargetGroup = new elbv2.ApplicationTargetGroup(
    //   this,
    //   'AlbTargetGroup',
    //   {
    //     vpc,
    //     targetGroupName: `${prefix}-tg`,
    //     targetType: elbv2.TargetType.LAMBDA,
    //     targets: [new LambdaTarget(helloWorldFunction)],
    //   }
    // );

    const listener = alb.addListener('AlbListener', {
      protocol: elbv2.ApplicationProtocol.HTTP,
      port: 80,
      // defaultTargetGroups: [albTargetGroup],
      defaultAction: elbv2.ListenerAction.fixedResponse(404, {
        contentType: elbv2.ContentType.TEXT_PLAIN,
        messageBody: 'NotFound',
      }),
    });

    // listener.addTargetGroups
    // listener.addAction;
    listener.addTargets('AlbListenerTargetHello', {
      priority: 1,
      conditions: [
        elbv2.ListenerCondition.httpRequestMethods(['GET']),
        elbv2.ListenerCondition.pathPatterns(['/hello']),
      ],
      targets: [new LambdaTarget(helloWorldFunction)],
    });
    listener.addTargets('AlbListenerTargetHoge', {
      priority: 2,
      conditions: [
        elbv2.ListenerCondition.httpRequestMethods(['POST']),
        elbv2.ListenerCondition.pathPatterns(['/hoge']),
      ],
      targets: [new LambdaTarget(HogeFugaPiyoFunction)],
    });
  }
}
