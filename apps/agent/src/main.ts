import { NestFactory } from '@nestjs/core';
import { AgentModule } from './agent.module';
import { ConfigService } from '@nestjs/config';
import {
  CustomStrategy,
  MicroserviceOptions,
  Transport,
} from '@nestjs/microservices';
import { GRPC_AGENT } from '@app/common';
import { join } from 'path';
import { NatsJetStreamServer } from '@nestjs-plugins/nestjs-nats-jetstream-transport';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AgentModule, { bufferLogs: true });

  const configService = app.get(ConfigService);

  app.useLogger(app.get(Logger));

  app.connectMicroservice<CustomStrategy>({
    strategy: new NatsJetStreamServer({
      connectionOptions: {
        servers: configService.getOrThrow<string>('NATS_URI'),
        name: 'agent-listener',
      },
      consumerOptions: {
        deliverGroup: 'agent-group',
        durable: 'agent-durable',
        deliverTo: 'agent-messages',
        manualAck: true,
      },
      streamConfig: {
        name: 'agentStream',
        subjects: ['agent.>'],
      },
    }),
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: GRPC_AGENT,
      protoPath: join(__dirname, '../../../proto/agent.proto'),
      url: configService.getOrThrow('AGENT_GRPC_URL'),
    },
  });

  await app.init();
  await app.startAllMicroservices();
}
bootstrap();
