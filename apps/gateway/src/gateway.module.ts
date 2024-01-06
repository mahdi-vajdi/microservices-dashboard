import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import {
  AGENT_NATS,
  AUTH_NATS,
  CHANNEL_NATS,
  GRPC_AGENT,
  GRPC_AUTH,
  GRPC_CHANNEL,
} from '@app/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import * as Joi from 'joi';
import { ChannelHttpController } from './http-controllers/channel.controller';
import { AgentHttpController } from './http-controllers/agent.controller';
import { AuthHttpController } from './http-controllers/auth.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        HTTP_PORT: Joi.number().required(),
        NATS_URI: Joi.string().required(),
        AUTH_GRPC_URL: Joi.string().required(),
        CHANNEL_GRPC_URL: Joi.string().required(),
        AGENT_GRPC_URL: Joi.string().required(),
      }),
    }),
    ClientsModule.registerAsync([
      {
        name: AUTH_NATS,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.NATS,
          options: {
            servers: [configService.getOrThrow('NATS_URI')],
            queue: AUTH_NATS,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: GRPC_AUTH,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: GRPC_AUTH,
            protoPath: join(__dirname, '../../../proto/auth.proto'),
            url: configService.getOrThrow('AUTH_GRPC_URL'),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: GRPC_CHANNEL,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: GRPC_CHANNEL,
            protoPath: join(__dirname, '../../../proto/channel.proto'),
            url: configService.getOrThrow('CHANNEL_GRPC_URL'),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: CHANNEL_NATS,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.NATS,
          options: {
            servers: [configService.getOrThrow('NATS_URI')],
            queue: CHANNEL_NATS,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: AGENT_NATS,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.NATS,
          options: {
            servers: [configService.getOrThrow('NATS_URI')],
            queue: AGENT_NATS,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: GRPC_AGENT,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: GRPC_AGENT,
            protoPath: join(__dirname, '../../../proto/agent.proto'),
            url: configService.getOrThrow('AGENT_GRPC_URL'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [AuthHttpController, ChannelHttpController, AgentHttpController],
  providers: [],
})
export class GatewayModule {}
